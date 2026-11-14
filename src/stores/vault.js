import { computed, reactive } from 'vue'
import { supabase } from '../lib/supabase.js'
import { decryptJson, encryptJson } from '../lib/crypto.js'
import {
  createVaultKey,
  getKey,
  isUnlocked as keyIsUnlocked,
  lockVaultKey,
  unlockVaultKey
} from '../lib/vaultKey.js'
import { buildBackup, readBackup } from '../lib/backup.js'
import { searchRecords } from '../lib/search.js'
import { authState } from './auth.js'

const EMPTY_FORM = {
  id: null,
  record_type: 'login',
  title: '',
  full_name: '',
  national_id: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  url: '',
  username: '',
  password: '',
  notes: '',
  custom_fields: []
}

export const vaultState = reactive({
  status: 'unknown',
  records: [],
  query: '',
  loading: false,
  busy: false,
  lastError: ''
})

export const isUnlocked = computed(() => vaultState.status === 'unlocked')
export const visibleRecords = computed(() => searchRecords(vaultState.records, vaultState.query))
export const hasQuery = computed(() => vaultState.query.trim().length > 0)

export function emptyForm(type = 'login') {
  return { ...EMPTY_FORM, record_type: type, custom_fields: [] }
}

function requireKey() {
  if (!keyIsUnlocked()) {
    throw new Error('The vault is locked.')
  }
  return getKey()
}

function requireUser() {
  const id = authState.user?.id
  if (!id) throw new Error('You are not signed in.')
  return id
}

export async function refreshStatus() {
  const userId = authState.user?.id
  if (!userId) {
    vaultState.status = 'unknown'
    return 'unknown'
  }

  if (keyIsUnlocked()) {
    vaultState.status = 'unlocked'
    return 'unlocked'
  }

  const { data, error } = await supabase
    .from('vault_keys')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    vaultState.status = 'unknown'
    return 'unknown'
  }

  vaultState.status = data ? 'locked' : 'new'
  return vaultState.status
}

export async function getKeyParams() {
  const userId = requireUser()
  const { data, error } = await supabase
    .from('vault_keys')
    .select('iterations, salt, check_iv, check_ct, enc_version')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('This account has no vault yet.')
  return data
}
export async function createVault(passphrase) {
  const userId = requireUser()
  vaultState.busy = true
  try {
    const row = await createVaultKey(passphrase)
    const { error } = await supabase.from('vault_keys').insert({
      user_id: userId,
      kdf: row.kdf,
      iterations: row.iterations,
      salt: row.salt,
      check_iv: row.check_iv,
      check_ct: row.check_ct,
      enc_version: row.enc_version
    })
    if (error) throw new Error(error.message)

    vaultState.status = 'unlocked'
    vaultState.records = []
    vaultState.query = ''
    vaultState.lastError = ''
  } finally {
    vaultState.busy = false
  }
}

export async function unlock(passphrase) {
  vaultState.busy = true
  vaultState.lastError = ''
  try {
    const params = await getKeyParams()
    const ok = await unlockVaultKey(passphrase, params)
    if (!ok) {
      vaultState.lastError = 'Wrong master passphrase.'
      return false
    }
    vaultState.status = 'unlocked'
    await loadRecords()
    return true
  } finally {
    vaultState.busy = false
  }
}

export function lock() {
  lockVaultKey()
  vaultState.records = []
  vaultState.query = ''
  vaultState.lastError = ''
  vaultState.status = 'locked'
}

export function setQuery(value) {
  vaultState.query = String(value ?? '')
}

export async function loadRecords() {
  const userId = requireUser()
  const key = requireKey()

  vaultState.loading = true
  try {
    const { data, error } = await supabase
      .from('vault_records')
      .select('id, record_type, iv, ciphertext, enc_version, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    const decrypted = []
    for (const row of data || []) {
      try {
        const payload = await decryptJson(key, row.iv, row.ciphertext)
        decrypted.push({
          id: row.id,
          record_type: row.record_type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          ...payload
        })
      } catch {
        decrypted.push({
          id: row.id,
          record_type: row.record_type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          title: 'Unreadable record',
          custom_fields: [],
          broken: true
        })
      }
    }

    vaultState.records = decrypted
  } finally {
    vaultState.loading = false
  }
}

function formToPayload(form) {
  return {
    title: String(form.title ?? '').trim(),
    full_name: String(form.full_name ?? '').trim(),
    national_id: String(form.national_id ?? '').trim(),
    phone: String(form.phone ?? '').trim(),
    email: String(form.email ?? '').trim(),
    address: String(form.address ?? '').trim(),
    website: String(form.website ?? '').trim(),
    url: String(form.url ?? '').trim(),
    username: String(form.username ?? '').trim(),
    password: String(form.password ?? ''),
    notes: String(form.notes ?? ''),
    custom_fields: Array.isArray(form.custom_fields)
      ? form.custom_fields
          .map((field) => ({
            label: String(field?.label ?? '').trim(),
            value: String(field?.value ?? '')
          }))
          .filter((field) => field.label || field.value)
      : []
  }
}

export async function saveRecord(form) {
  const userId = requireUser()
  const key = requireKey()

  const payload = formToPayload(form)
  const { iv, ct, v } = await encryptJson(key, payload)
  const recordType = form.record_type === 'personal' ? 'personal' : 'login'

  vaultState.busy = true
  try {
    if (form.id) {
      const { error } = await supabase
        .from('vault_records')
        .update({
          record_type: recordType,
          iv,
          ciphertext: ct,
          enc_version: v,
          updated_at: new Date().toISOString()
        })
        .eq('id', form.id)
        .eq('user_id', userId)
      if (error) throw new Error(error.message)

      const index = vaultState.records.findIndex((item) => item.id === form.id)
      if (index !== -1) {
        vaultState.records[index] = {
          ...vaultState.records[index],
          ...payload,
          record_type: recordType,
          updated_at: new Date().toISOString()
        }
      }
      return form.id
    }

    const { data, error } = await supabase
      .from('vault_records')
      .insert({
        user_id: userId,
        record_type: recordType,
        iv,
        ciphertext: ct,
        enc_version: v
      })
      .select('id, created_at, updated_at')
      .single()

    if (error) throw new Error(error.message)

    vaultState.records.unshift({
      id: data.id,
      record_type: recordType,
      created_at: data.created_at,
      updated_at: data.updated_at,
      ...payload
    })

    return data.id
  } finally {
    vaultState.busy = false
  }
}

export async function deleteRecord(id) {
  const userId = requireUser()
  vaultState.busy = true
  try {
    const { error } = await supabase
      .from('vault_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    vaultState.records = vaultState.records.filter((item) => item.id !== id)
  } finally {
    vaultState.busy = false
  }
}

export async function exportBackup() {
  const key = requireKey()
  const envelope = await buildBackup(key, vaultState.records)
  return envelope
}

/**
 * Import records from a decrypted backup.
 * @param {Array<object>} records already normalised by readBackup
 */
export async function importRecords(records) {
  const userId = requireUser()
  const key = requireKey()
  vaultState.busy = true
  let imported = 0

  try {
    for (const record of records) {
      const payload = formToPayload(record)
      const { iv, ct, v } = await encryptJson(key, payload)
      const recordType = record.record_type === 'personal' ? 'personal' : 'login'

      const { data, error } = await supabase
        .from('vault_records')
        .insert({
          user_id: userId,
          record_type: recordType,
          iv,
          ciphertext: ct,
          enc_version: v
        })
        .select('id, created_at, updated_at')
        .single()

      if (error) throw new Error(error.message)

      vaultState.records.unshift({
        id: data.id,
        record_type: recordType,
        created_at: data.created_at,
        updated_at: data.updated_at,
        ...payload
      })
      imported += 1
    }
    return imported
  } finally {
    vaultState.busy = false
  }
}

export async function importFromText(text, passphrase) {
  const records = await readBackup(text, passphrase)
  return importRecords(records)
}

/**
 * Wipe every trace of decrypted state. Called on lock, sign-out and idle timeout.
 */
export function clearAll() {
  lockVaultKey()
  vaultState.records = []
  vaultState.query = ''
  vaultState.lastError = ''
  vaultState.loading = false
  vaultState.busy = false
  vaultState.status = 'unknown'
}

export function findRecord(id) {
  return vaultState.records.find((item) => item.id === id) || null
}
