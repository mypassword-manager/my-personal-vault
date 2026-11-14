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

/**
 * Determine whether the signed-in account already has vault key material.
 */
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
    const row = await createVaultKey