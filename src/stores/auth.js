import { computed, reactive } from 'vue'
import { neon, isConfigured } from '../lib/neon.js'

const PENDING_KEY = 'mpv.pending.signup'

function readPending() {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null') } catch { return null }
}

export const authState = reactive({
  ready: false,
  session: null,
  user: null,
  profile: null,
  busy: false,
  pendingPin: null,
  pendingSignup: typeof sessionStorage === 'undefined' ? null : readPending()
})

export const isAuthenticated = computed(() => Boolean(authState.session))
export const displayName = () => authState.profile?.full_name || authState.user?.name || authState.user?.email || 'Vault owner'
export const username = () => authState.profile?.username || ''

export async function loadProfile() {
  if (!authState.user?.id) { authState.profile = null; return null }
  const { data, error } = await neon.from('profiles')
    .select('id, full_name, username, email, created_at')
    .eq('id', authState.user.id).maybeSingle()
  if (error) throw new Error(error.message)
  authState.profile = data
  return data
}

async function applySession(result) {
  authState.session = result?.session || null
  authState.user = result?.user || result?.session?.user || null
  if (authState.user) await loadProfile()
  else authState.profile = null
}

export async function refreshAuth() {
  const { data, error } = await neon.auth.getSession()
  if (error) throw new Error(error.message)
  await applySession(data)
  return authState.session
}

export async function initAuth() {
  try {
    if (isConfigured) await refreshAuth()
  } catch (error) {
    console.warn('Could not restore the account session:', error.message)
  } finally {
    authState.ready = true
  }
}

export async function signUpWithPassword({ fullName, username: name, email, password, method }) {
  if (method !== 'email_password') {
    throw new Error('This sign-up method needs the secure Worker flow and is not available yet.')
  }
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedUsername = String(name).trim().toLowerCase()
  const { error } = await neon.auth.signUp.email({ email: normalizedEmail, password, name: String(fullName).trim() })
  if (error) throw new Error(error.message)
  const pending = { fullName: String(fullName).trim(), username: normalizedUsername, email: normalizedEmail, method }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  authState.pendingSignup = pending
  return { emailMasked: normalizedEmail.replace(/^(.{2}).*(@.*)$/, '$1••••$2') }
}

export async function completeSignup(code) {
  const pending = authState.pendingSignup
  if (!pending) throw new Error('Start account creation again.')
  const { error } = await neon.auth.emailOtp.verifyEmail({ email: pending.email, otp: String(code) })
  if (error) throw new Error(error.message)
  const session = await refreshAuth()
  if (!session || !authState.user?.id) throw new Error('Email confirmed. Sign in to finish account setup.')
  const { error: profileError } = await neon.from('profiles').insert({
    id: authState.user.id,
    full_name: pending.fullName,
    username: pending.username,
    username_lower: pending.username,
    email: pending.email
  })
  if (profileError && !/duplicate key/i.test(profileError.message)) throw new Error(profileError.message)
  await loadProfile()
  sessionStorage.removeItem(PENDING_KEY)
  authState.pendingSignup = null
  return session
}

export async function resendSignupCode() {
  const email = authState.pendingSignup?.email
  if (!email) throw new Error('Start account creation again.')
  const { error } = await neon.auth.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
  if (error) throw new Error(error.message)
}

export async function resolveUsernameToEmail(rawUsername) {
  throw new Error('Username sign-in needs the secure Worker flow and is not available yet.')
}

export async function signInWithEmail(email, password) {
  const { error } = await neon.auth.signIn.email({ email: String(email).trim().toLowerCase(), password })
  if (error) throw new Error(error.message)
  const session = await refreshAuth()
  if (!session) throw new Error('Sign-in did not create a session.')
  return session
}

export async function signInWithUsernamePassword(rawUsername, password) {
  throw new Error('Username sign-in is not available yet.')
}

export async function beginPinSignIn() {
  throw new Error('PIN sign-in needs the secure Worker flow and is not available yet.')
}
export async function completePinSignIn() { throw new Error('PIN sign-in is not available yet.') }
export async function resendPinCode() { throw new Error('PIN sign-in is not available yet.') }

export function clearPendingFlows() {
  authState.pendingPin = null
  authState.pendingSignup = null
  sessionStorage.removeItem(PENDING_KEY)
}

export async function signOut() {
  clearPendingFlows()
  const { error } = await neon.auth.signOut()
  await applySession(null)
  if (error) throw new Error(error.message)
}
