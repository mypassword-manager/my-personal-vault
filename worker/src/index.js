// My Personal Vault API worker.
// Owns username resolution, PIN verification, OTP challenges and Mailjet delivery.

const OTP_TTL_SECONDS = 300
const OTP_RESEND_SECONDS = 60
const OTP_MAX_ATTEMPTS = 5
const RESET_TOKEN_TTL_SECONDS = 900
const PIN_MAX_FAILED = 10
const PIN_LOCK_SECONDS = 900

const encoder = new TextEncoder()

/* ------------------------------- utilities ------------------------------- */

function corsHeaders(env) {
  const allowed = String(env.SITE_URL || '').replace(/\/+$/, '')
  return {
    'Access-Control-Allow-Origin': allowed || '*',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  }
}

function json(env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(env) }
  })
}

function fail(env, status, message, code) {
  return json(env, { message, code: code || undefined }, status)
}

function toBase64(bytes) {
  let binary = ''
  const view = new Uint8Array(bytes)
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i])
  return btoa(binary)
}

function toBase64Url(bytes) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64(value) {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

function randomBytes(length) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function randomDigits(length) {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) out += String(bytes[i] % 10)
  return out
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(text))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPin(pin, saltB64, iterations) {
  const base = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, [
    'deriveBits'
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(saltB64), iterations, hash: 'SHA-256' },
    base,
    256
  )
  return toBase64(new Uint8Array(bits))
}

function maskEmail(email) {
  const [local, domain] = String(email).split('@')
  if (!domain) return email
  const head = local.slice(0, 2)
  return `${head}${'•'.repeat(Math.max(local.length - 2, 2))}@${domain}`
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || '0.0.0.0'
}

/* ------------------------------ supabase -------------------------------- */

function sbHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  }
}

async function sb(env, path, options = {}) {
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: sbHeaders(env, options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!response.ok) {
    const message = (data && (data.message || data.error_description || data.error)) || 'Database error'
    throw new Error(message)
  }
  return data
}

async function findIdentity(env, usernameLower) {
  const rows = await sb(
    env,
    `/rest/v1/vault_identities?username_lower=eq.${encodeURIComponent(usernameLower)}&select=user_id,username_lower,login_method,pin_salt,pin_hash,pin_iterations,pin_failed_count,pin_locked_until,email_verified&limit=1`
  )
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

async function findProfile(env, userId) {
  const rows = await sb(
    env,
    `/rest/v1/profiles?id=eq.${userId}&select=id,full_name,username,email&limit=1`
  )
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

async function rateLimit(env, bucket, windowSeconds, max) {
  const allowed = await sb(env, '/rest/v1/rpc/bump_rate_limit', {
    method: 'POST',
    body: { p_bucket: bucket, p_window_seconds: windowSeconds, p_max: max }
  })
  return allowed === true
}

/* --------------------------------- mail --------------------------------- */

async function sendMail(env, { to, subject, html, text }) {
  const auth = btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`)
  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: env.MAILJET_FROM_EMAIL, Name: env.MAILJET_FROM_NAME },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
          HTMLPart: html
        }
      ]
    })
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Mailjet rejected the message: ${detail.slice(0, 200)}`)
  }
}

function codeBlock(code) {
  return `<p style="font-size:32px;letter-spacing:10px;font-weight:700;margin:24px 0">${code}</p>`
}

function layout(title, bodyHtml) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0b0f14">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="color:#5b6b7c;font-size:12px;margin-top:28px">My Personal Vault</p>
  </div>`
}

async function sendCodeEmail(env, email, code, purpose) {
  const subject =
    purpose === 'signin'
      ? 'Your sign-in code'
      : purpose === 'pin_reset'
        ? 'Your PIN reset code'
        : 'Confirm your email address'
  const intro =
    purpose === 'signin'
      ? 'Use this code to finish signing in. It expires in 5 minutes.'
      : purpose === 'pin_reset'
        ? 'Use this code to reset your PIN. It expires in 5 minutes.'
        : 'Use this code to confirm your email address. It expires in 5 minutes.'

  await sendMail(env, {
    to: email,
    subject,
    text: `${intro}\n\n${code}\n\nIf you did not request this, ignore this email.`,
    html: layout(subject, `<p>${intro}</p>${codeBlock(code)}`)
  })
}

async function sendWelcomeEmail(env, email, fullName) {
  await sendMail(env, {
    to: email,
    subject: 'Welcome to My Personal Vault',
    text: `Hello ${fullName},\n\nYour account is confirmed. Next, set a master passphrase. It is separate from your password or PIN and is the only thing that decrypts your vault.\n\nKeep it somewhere safe: account recovery does not restore it.`,
    html: layout(
      'Welcome to My Personal Vault',
      `<p>Hello ${fullName},</p><p>Your account is confirmed.</p><p>Next, set a <strong>master passphrase</strong>. It is separate from your password or PIN and is the only thing that decrypts your vault.</p><p>Keep it safe: account recovery does not restore it.</p>`
    )
  })
}

async function sendRecoveryEmail(env, email, link) {
  await sendMail(env, {
    to: email,
    subject: 'Reset your password',
    text: `Open this link to choose a new password:\n\n${link}\n\nThe link expires shortly.`,
    html: layout(
      'Reset your password',
      `<p>Open the link below to choose a new password.</p><p><a href="${link}">Reset password</a></p><p>The link expires shortly.</p>`
    )
  })
}

/* -------------------------------- otp ----------------------------------- */

async function createChallenge(env, userId, purpose) {
  const code = randomDigits(6)
  const codeHash = await hmacHex(env.OTP_PEPPER, `${userId}:${purpose}:${code}`)
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString()

  await sb(env, '/rest/v1/pin_challenges', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      user_id: userId,
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: OTP_MAX_ATTEMPTS,
      consumed: false
    }
  })

  return code
}

async function getChallenge(env, challengeId) {
  const rows = await sb(
    env,
    `/rest/v1/pin_challenges?id=eq.${encodeURIComponent(challengeId)}&select=*&limit=1`
  )
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

async function bumpAttempts(env, challengeId, attempts) {
  await sb(env, `/rest/v1/pin_challenges?id=eq.${challengeId}`, {
    method: 'PATCH',
    body: { attempts }
  })
}

async function consumeChallenge(env, challengeId) {
  await sb(env, `/rest/v1/pin_challenges?id=eq.${challengeId}`, {
    method: 'PATCH',
    body: { consumed: true }
  })
}

async function checkChallenge(env, challengeId, code, purpose) {
  const challenge = await getChallenge(env, challengeId)
  if (!challenge) return { ok: false, status: 404, message: 'Unknown challenge. Start again.' }
  if (challenge.purpose !== purpose) {
    return { ok: false, status: 400, message: 'This code belongs to another flow.' }
  }
  if (challenge.consumed) return { ok: false, status: 409, message: 'That code was already used.' }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 410, message: 'That code expired. Request a new one.' }
  }
  if (challenge.attempts >= challenge.max_attempts) {
    return { ok: false, status: 429, message: 'Too many wrong attempts. Request a new code.' }
  }

  const expected = await hmacHex(env.OTP_PEPPER, `${challenge.user_id}:${purpose}:${code}`)
  if (expected !== challenge.code_hash) {
    await bumpAttempts(env, challengeId, challenge.attempts + 1)
    const left = challenge.max_attempts - challenge.attempts - 1
    return {
      ok: false,
      status: 401,
      message: left > 0 ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Wrong code. Request a new one.'
    }
  }

  await consumeChallenge(env, challengeId)
  return { ok: true, challenge }
}

async function cooldownRemaining(env, challengeId) {
  const challenge = await getChallenge(env, challengeId)
  if (!challenge) return 0
  const elapsed = (Date.now() - new Date(challenge.created_at).getTime()) / 1000
  return Math.max(0, Math.ceil(OTP_RESEND_SECONDS - elapsed))
}

/* ------------------------------- magic link ----------------------------- */

async function mintToken(env, email) {
  const redirect = `${String(env.SITE_URL).replace(/\/+$/, '')}/#/app`
  const data = await sb(env, '/auth/v1/admin/generate_link', {
    method: 'POST',
    body: { type: 'magiclink', email, options: { redirect_to: redirect } }
  })
  const tokenHash = data?.properties?.hashed_token || data?.hashed_token
  if (!tokenHash) throw new Error('Could not mint a session token.')
  return tokenHash
}

/* -------------------------------- handlers ------------------------------ */

async function handleResolve(env, body) {
  const username = String(body.username || '').trim().toLowerCase()
  if (!username) return fail(env, 400, 'Username is required.')

  const identity = await findIdentity(env, username)
  if (!identity) return fail(env, 404, 'No account uses that username.')

  const profile = await findProfile(env, identity.user_id)
  if (!profile) return fail(env, 404, 'No account uses that username.')

  return json(env, { email: profile.email, method: identity.login_method })
}

async function handleSignup(env, request, body, method) {
  const fullName = String(body.fullName || '').trim()
  const username = String(body.username || '').trim().toLowerCase()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const pin = String(body.pin || '')

  if (!fullName || !username || !email) {
    return fail(env, 400, 'Full name, username and email are required.')
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return fail(env, 400, 'Username must be 3–32 characters: a-z, 0-9, dot, dash or underscore.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return fail(env, 400, 'Enter a valid email address.')
  }
  if (method === 'username_pin') {
    if (!/^\d{6}$/.test(pin)) return fail(env, 400, 'PIN must be exactly 6 digits.')
  } else if (password.length < 10) {
    return fail(env, 400, 'Password must be at least 10 characters.')
  }

  const ip = clientIp(request)
  const allowed = await rateLimit(env, `signup:${ip}`, 3600, 10)
  if (!allowed) return fail(env, 429, 'Too many sign-ups from this address. Try later.')

  const existing = await findIdentity(env, username)
  if (existing) return fail(env, 409, 'That username is already taken.')

  const internalPassword =
    method === 'username_pin' ? toBase64Url(randomBytes(32)) : password

  let user
  try {
    user = await sb(env, '/auth/v1/admin/users', {
      method: 'POST',
      body: {
        email,
        password: internalPassword,
        email_confirm: false,
        user_metadata: { full_name: fullName, username }
      }
    })
  } catch (error) {
    if (/already/i.test(error.message)) {
      return fail(env, 409, 'An account already uses that email address.')
    }
    return fail(env, 400, error.message)
  }

  const userId = user.id
  let pinSalt = null
  let pinHash = null
  let pinIterations = null

  if (method === 'username_pin') {
    pinSalt = toBase64(randomBytes(16))
    pinIterations = Number(env.PIN_ITERATIONS || 210000)
    pinHash = await hashPin(pin, pinSalt, pinIterations)
  }

  try {
    await sb(env, '/rest/v1/profiles', {
      method: 'POST',
      body: { id: userId, full_name: fullName, username, username_lower: username, email }
    })

    await sb(env, '/rest/v1/vault_identities', {
      method: 'POST',
      body: {
        user_id: userId,
        username_lower: username,
        login_method: method,
        pin_salt: pinSalt,
        pin_hash: pinHash,
        pin_iterations: pinIterations,
        email_verified: false
      }
    })
  } catch (error) {
    await sb(env, `/auth/v1/admin/users/${userId}`, { method: 'DELETE' }).catch(() => {})
    if (/duplicate|unique/i.test(error.message)) {
      return fail(env, 409, 'That username is already taken.')
    }
    return fail(env, 400, error.message)
  }

  const code = await createChallenge(env, userId, 'signup_verify')
  await sendCodeEmail(env, email, code, 'signup_verify')

  return json(env, { challengeId: await latestChallengeId(env, userId, 'signup_verify'), emailMasked: maskEmail(email) })
}

async function latestChallengeId(env, userId, purpose) {
  const rows = await sb(
    env,
    `/rest/v1/pin_challenges?user_id=eq.${userId}&purpose=eq.${purpose}&select=id&order=created_at.desc&limit=1`
  )
  return Array.isArray(rows) && rows.length ? rows[0].id : null
}

async function handleSignupVerify(env, body) {
  const challengeId = String(body.challengeId || '')
  const code = String(body.code || '').replace(/\D/g, '')
  if (!challengeId || code.length !== 6) return fail(env, 400, 'A 6-digit code is required.')

  const result = await checkChallenge(env, challengeId, code, 'signup_verify')
  if (!result.ok) return fail(env, result.status, result.message)

  const userId = result.challenge.user_id
  const profile = await findProfile(env, userId)

  await sb(env, `/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: { email_confirm: true }
  })
  await sb(env, `/rest/v1/vault_identities?user_id=eq.${userId}`, {
    method: 'PATCH',
    body: { email_verified: true }
  })

  const tokenHash = await mintToken(env, profile.email)
  sendWelcomeEmail(env, profile.email, profile.full_name).catch(() => {})

  return json(env, { tokenHash })
}

async function handleSignupResend(env, body) {
  const challengeId = String(body.challengeId || '')
  const wait = await cooldownRemaining(env, challengeId)
  if (wait > 0) return fail(env, 429, `Wait ${wait}s before requesting another code.`, 'cooldown')

  const challenge = await getChallenge(env, challengeId)
  if (!challenge) return fail(env, 404, 'Unknown challenge.')
  if (challenge.consumed) return fail(env, 409, 'That code was already used.')

  const profile = await findProfile(env, challenge.user_id)
  const code = await createChallenge(env, challenge.user_id, 'signup_verify')
  await sendCodeEmail(env, profile.email, code, 'signup_verify')

  return json(env, { challengeId: await latestChallengeId(env, challenge.user_id, 'signup_verify') })
}

async function handlePinStart(env, request, body) {
  const username = String(body.username || '').trim().toLowerCase()
  const pin = String(body.pin || '')
  if (!username || !/^\d{6}$/.test(pin)) return fail(env, 400, 'Username and 6-digit PIN are required.')

  const ip = clientIp(request)
  if (!(await rateLimit(env, `pin:ip:${ip}`, 300, 15))) {
    return fail(env, 429, 'Too many attempts from this address. Try again shortly.')
  }
  if (!(await rateLimit(env, `pin:user:${username}`, 900, 15))) {
    return fail(env, 429, 'Too many attempts for this username. Try again shortly.')
  }

  const identity = await findIdentity(env, username)
  if (!identity) return fail(env, 401, 'Wrong username or PIN.')
  if (identity.login_method !== 'username_pin') {
    return fail(env, 400, 'That account does not use PIN sign-in.')
  }
  if (identity.pin_locked_until && new Date(identity.pin_locked_until).getTime() > Date.now()) {
    return fail(env, 423, 'PIN temporarily locked after too many failures. Try again later.')
  }

  const computed = await hashPin(pin, identity.pin_salt, identity.pin_iterations)
  if (computed !== identity.pin_hash) {
    const failed = identity.pin_failed_count + 1
    const lock = failed >= PIN_MAX_FAILED
    await sb(env, `/rest/v1/vault_identities?user_id=eq.${identity.user_id}`, {
      method: 'PATCH',
      body: {
        pin_failed_count: lock ? 0 : failed,
        pin_locked_until: lock ? new Date(Date.now() + PIN_LOCK_SECONDS * 1000).toISOString() : null
      }
    })
    return fail(env, 401, 'Wrong username or PIN.')
  }

  await sb(env, `/rest/v1/vault_identities?user_id=eq.${identity.user_id}`, {
    method: 'PATCH',
    body: { pin_failed_count: 0, pin_locked_until: null }
  })

  const profile = await findProfile(env, identity.user_id)
  const code = await createChallenge(env, identity.user_id, 'signin')
  await sendCodeEmail(env, profile.email, code, 'signin')

  return json(env, {
    challengeId: await latestChallengeId(env, identity.user_id, 'signin'),
    emailMasked: maskEmail(profile.email)
  })
}

async function handlePinVerify(env, body) {
  const challengeId = String(body.challengeId || '')
  const code = String(body.code || '').replace(/\D/g, '')
  if (!challengeId || code.length !== 6) return fail(env, 400, 'A 6-digit code is required.')

  const result = await checkChallenge(env, challengeId, code, 'signin')
  if (!result.ok) return fail(env, result.status, result.message)

  const profile = await findProfile(env, result.challenge.user_id)
  const tokenHash = await mintToken(env, profile.email)

  return json(env, { tokenHash })
}

async function handlePinResend(env, body) {
  const challengeId = String(body.challengeId || '')
  const wait = await cooldownRemaining(env, challengeId)
  if (wait > 0) return fail(env, 429, `Wait ${wait}s before requesting another code.`, 'cooldown')

  const challenge = await getChallenge(env, challengeId)
  if (!challenge) return fail(env, 404, 'Unknown challenge.')

  const profile = await findProfile(env, challenge.user_id)
  const code = await createChallenge(env, challenge.user_id, 'signin')
  await sendCodeEmail(env, profile.email, code, 'signin')

  return json(env, { challengeId: await latestChallengeId(env, challenge.user_id, 'signin') })
}

async function handleRecovery(env, request, body) {
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) return fail(env, 400, 'Email address is required.')

  const ip = clientIp(request)
  if (!(await rateLimit(env, `recovery:${email}`, 3600, 5))) {
    return fail(env, 429, 'Too many recovery requests for that address.')
  }
  if (!(await rateLimit(env, `recovery:ip:${ip}`, 3600, 15))) {
    return fail(env, 429, 'Too many recovery requests from this address.')
  }

  try {
    const data = await sb(env, '/auth/v1/admin/generate_link', {
      method: 'POST',
      body: { type: 'recovery', email }
    })
    const tokenHash = data?.properties?.hashed_token || data?.hashed_token
    if (!tokenHash) throw new Error('no token')

    const link = `${String(env.SITE_URL).replace(/\/+$/, '')}/#/update-password?token_hash=${tokenHash}&type=recovery`
    await sendRecoveryEmail(env, email, link)
  } catch {
    // Keep the response identical so addresses cannot be enumerated.
  }

  return json(env, { sent: true })
}

async function handlePinResetStart(env, request, body) {
  const username = String(body.username || '').trim().toLowerCase()
  if (!username) return fail(env, 400, 'Username is required.')

  const ip = clientIp(request)
  if (!(await rateLimit(env, `pinreset:ip:${ip}`, 3600, 15))) {
    return fail(env, 429, 'Too many reset requests from this address.')
  }

  const identity = await findIdentity(env, username)
  if (!identity || identity.login_method !== 'username_pin') {
    return fail(env, 404, 'No PIN account uses that username.')
  }

  const profile = await findProfile(env, identity.user_id)
  const code = await createChallenge(env, identity.user_id, 'pin_reset')
  await sendCodeEmail(env, profile.email, code, 'pin_reset')

  return json(env, {
    challengeId: await latestChallengeId(env, identity.user_id, 'pin_reset'),
    emailMasked: maskEmail(profile.email)
  })
}

async function handlePinResetVerify(env, body) {
  const challengeId = String(body.challengeId || '')
  const code = String(body.code || '').replace(/\D/g, '')
  if (!challengeId || code.length !== 6) return fail(env, 400, 'A 6-digit code is required.')

  const result = await checkChallenge(env, challengeId, code, 'pin_reset')
  if (!result.ok) return fail(env, result.status, result.message)

  const token = toBase64Url(randomBytes(32))
  const tokenHash = await sha256Hex(token)

  await sb(env, '/rest/v1/pin_reset_tokens', {
    method: 'POST',
    body: {
      token_hash: tokenHash,
      user_id: result.challenge.user_id,
      expires_at: new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000).toISOString(),
      used: false
    }
  })

  return json(env, { resetToken: token })
}

async function handlePinResetComplete(env, body) {
  const token = String(body.resetToken || '')
  const pin = String(body.pin || '')
  if (!token || !/^\d{6}$/.test(pin)) return fail(env, 400, 'A reset token and 6-digit PIN are required.')

  const tokenHash = await sha256Hex(token)
  const rows = await sb(
    env,
    `/rest/v1/pin_reset_tokens?token_hash=eq.${tokenHash}&select=*&limit=1`
  )
  const row = Array.isArray(rows) && rows.length ? rows[0] : null
  if (!row) return fail(env, 404, 'That reset token is unknown.')
  if (row.used) return fail(env, 409, 'That reset token was already used.')
  if (new Date(row.expires_at).getTime() < Date.now()) return fail(env, 410, 'That reset token expired.')

  const salt = toBase64(randomBytes(16))
  const iterations = Number(env.PIN_ITERATIONS || 210000)
  const hash = await hashPin(pin, salt, iterations)

  await sb(env, `/rest/v1/vault_identities?user_id=eq.${row.user_id}`, {
    method: 'PATCH',
    body: {
      pin_salt: salt,
      pin_hash: hash,
      pin_iterations: iterations,
      pin_failed_count: 0,
      pin_locked_until: null
    }
  })

  await sb(env, `/rest/v1/pin_reset_tokens?token_hash=eq.${tokenHash}`, {
    method: 'PATCH',
    body: { used: true }
  })

  return json(env, { ok: true })
}

/* --------------------------------- router -------------------------------- */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (path === '/health' && request.method === 'GET') {
      return json(env, { ok: true, service: 'my-personal-vault-api' })
    }

    if (request.method !== 'POST') {
      return fail(env, 405, 'Method not allowed.')
    }

    let body = {}
    try {
      body = await request.json()
    } catch {
      return fail(env, 400, 'Expected a JSON body.')
    }

    try {
      switch (path) {
        case '/auth/resolve':
          return await handleResolve(env, body)
        case '/auth/signup/email':
          return await handleSignup(env, request, body, 'email_password')
        case '/auth/signup/username':
          return await handleSignup(env, request, body, 'username_password')
        case '/auth/signup/pin':
          return await handleSignup(env, request, body, 'username_pin')
        case '/auth/signup/verify':
          return await handleSignupVerify(env, body)
        case '/auth/signup/resend':
          return await handleSignupResend(env, body)
        case '/auth/pin/start':
          return await handlePinStart(env, request, body)
        case '/auth/pin/verify':
          return await handlePinVerify(env, body)
        case '/auth/pin/resend':
          return await handlePinResend(env, body)
        case '/auth/recovery/start':
          return await handleRecovery(env, request, body)
        case '/auth/recovery/resend':
          return await handleRecovery(env, request, body)
        case '/auth/pin-reset/start':
          return await handlePinResetStart(env, request, body)
        case '/auth/pin-reset/verify':
          return await handlePinResetVerify(env, body)
        case '/auth/pin-reset/complete':
          return await handlePinResetComplete(env, body)
        default:
          return fail(env, 404, 'Unknown endpoint.')
      }
    } catch (error) {
      return fail(env, 500, error.message || 'Unexpected server error.')
    }
  }
}