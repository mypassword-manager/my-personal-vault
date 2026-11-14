// Thin client for the Cloudflare Worker.
// The Worker owns username resolution, PIN verification and every transactional email.

const base = String(import.meta.env.VITE_WORKER_URL || '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request(path, options = {}) {
  if (!base) {
    throw new ApiError('The API worker is not configured.', 0, 'not_configured')
  }

  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const response = await fetch(`${base}${path}`, {
    method: options.method || 'POST',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  })

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) || `Request failed with status ${response.status}.`
    throw new ApiError(message, response.status, data && data.code)
  }

  return data || {}
}

export const api = {
  health: () => request('/health', { method: 'GET' }),

  resolveUsername: (username) => request('/auth/resolve', { body: { username } }),

  signupEmailPassword: (payload) => request('/auth/signup/email', { body: payload }),
  signupUsernamePassword: (payload) => request('/auth/signup/username', { body: payload }),
  signupUsernamePin: (payload) => request('/auth/signup/pin', { body: payload }),

  verifySignupCode: (payload) => request('/auth/signup/verify', { body: payload }),
  resendSignupCode: (payload) => request('/auth/signup/resend', { body: payload }),

  startPinSignin: (payload) => request('/auth/pin/start', { body: payload }),
  verifyPinSignin: (payload) => request('/auth/pin/verify', { body: payload }),
  resendPinSignin: (payload) => request('/auth/pin/resend', { body: payload }),

  startPasswordReset: (payload) => request('/auth/recovery/start', { body: payload }),
  resendPasswordReset: (payload) => request('/auth/recovery/resend', { body: payload }),

  startPinReset: (payload) => request('/auth/pin-reset/start', { body: payload }),
  verifyPinReset: (payload) => request('/auth/pin-reset/verify', { body: payload }),
  completePinReset: (payload) => request('/auth/pin-reset/complete', { body: payload })
}