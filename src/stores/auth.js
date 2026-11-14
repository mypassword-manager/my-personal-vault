import { computed, reactive } from 'vue'
import { supabase, isConfigured } from '../lib/supabase.js'
import { api } from '../lib/api.js'

export const authState = reactive({
  ready: false,
  session: null,
  user: null,
  profile: null,
  busy: false,
  pendingPin: null,
  pendingSignup: null
})

export const isAuthenticated = computed(() => Boolean(authState.session))

export function displayName() {
  return authState.profile?.full_name || authState.user?.email || 'Vault owner'
}

export function username() {
  return authState.profile?.username || ''
}

export async function loadProfile() {
  if (!authState.user) {
    authState.profile = null
    return null
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, created_at')
    .eq('id', authState.user.id)
    .maybeSingle()

  if (error) {
    authState.profile = null
    return null
  }
  authState.profile = data
  return data
}

async function applySession(session) {
  authState.session = session || null
  authState.user = session?.user || null
  if (session?.user) {
    await loadProfile()
  } else {
    authState.profile = null
  }
}

export async function initAuth() {
  if (!isConfigured) {
    authState.ready = true
    return
  }

  const { data } = await supabase.auth.getSession()
  await applySession(data?.session || null)
  authState.ready = true

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      applySession(null)
      return
    }
    if (session) {
      applySession(session)
    }
  })
}

export async function resolveUsernameToEmail(rawUsername) {
  const usernameValue = String(rawUsername ?? '').trim().toLowerCase()
  const { email } = await api.resolveUsername(usernameValue)
  if (!email) {
    throw new Error('That username could not be resolved.')
  }
  return email
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password
  })
  if (error) throw new Error(error.message)
  await applySession(data.session)
  return data.session
}

export async function signInWithUsernamePassword(rawUsername, password) {
  const email = await resolveUsernameToEmail(rawUsername)
  return signInWithEmail(email, password)
}

export async function beginPinSignIn(rawUsername, pin) {
  const usernameValue = String(rawUsername ?? '').trim().toLowerCase()
  const result = await api.startPinSignin({ username: usernameValue, pin })
  authState.pendingPin = {
    challengeId: result.challengeId,
    emailMasked: result.emailMasked,
    username: usernameValue
  }
  return authState.pendingPin
}

export async function completePinSignIn(code) {
  if (!authState.pendingPin) {
    throw new Error('Start the PIN sign-in again.')
  }
  const result = await api.verifyPinSignin({
    challengeId: authState.pendingPin.challengeId,
    code: String(code).replace(/\D/g, '')
  })

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: result.tokenHash,
    type: 'magiclink'
  })
  if (error) throw new Error(error.message)

  authState.pendingPin = null
  await applySession(data.session)
  return data.session
}

export async function resendPinCode() {
  if (!authState.pendingPin) {
    throw new Error('Start the PIN sign-in again.')
  }
  return api.resendPinSignin({ challengeId: authState.pendingPin.challengeId })
}

export function clearPendingFlows() {
  authState.pendingPin = null
  authState.pendingSignup = null
}

export async function signOut() {
  clearPendingFlows()
  await supabase.auth.signOut()
  await applySession(null)
}