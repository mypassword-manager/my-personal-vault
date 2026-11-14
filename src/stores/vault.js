import { createRouter, createWebHashHistory } from 'vue-router'
import { authState } from '../stores/auth.js'
import { isUnlocked, refreshStatus } from '../stores/vault.js'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../pages/LandingPage.vue')
  },
  {
    path: '/signin',
    name: 'signin',
    component: () => import('../pages/SignInPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/create-account',
    name: 'create-account',
    component: () => import('../pages/CreateAccountPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('../pages/VerifyEmailPage.vue')
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../pages/ForgotPasswordPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/update-password',
    name: 'update-password',
    component: () => import('../pages/UpdatePasswordPage.vue')
  },
  {
    path: '/reset-pin',
    name: 'reset-pin',
    component: () => import('../pages/ResetPinPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/unlock',
    name: 'unlock',
    component: () => import('../pages/UnlockPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app',
    name: 'dashboard',
    component: () => import('../pages/DashboardPage.vue'),
    meta: { requiresAuth: true, requiresUnlock: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
    meta: { requiresAuth: true, requiresUnlock: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

async function waitForAuth() {
  if (authState.ready) return
  await new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (authState.ready) {
        window.clearInterval(timer)
        resolve()
      }
    }, 25)
    window.setTimeout(() => {
      window.clearInterval(timer)
      resolve()
    }, 8000)
  })
}

router.beforeEach(async (to) => {
  await waitForAuth()

  const signedIn = Boolean(authState.session)

  if (to.meta.requiresAuth && !signedIn) {
    return { name: 'signin', query: { next: to.fullPath } }
  }

  if (to.meta.guestOnly && signedIn) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresUnlock) {
    const status = await refreshStatus()
    if (status !== 'unlocked' && !isUnlocked.value) {
      return { name: 'unlock' }
    }
  }

  return true
})

export default router

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