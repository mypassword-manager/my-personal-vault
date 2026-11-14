// Neon Auth sends signed, blocking email-delivery events to this endpoint.
// Never log the raw request: it contains verification codes and reset links.
const utf8 = new TextEncoder()

function base64url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function verifyNeonWebhook(request, env) {
  const signature = request.headers.get('x-neon-signature') || ''
  const kid = request.headers.get('x-neon-signature-kid') || ''
  const timestamp = request.headers.get('x-neon-timestamp') || ''
  const time = Number(timestamp)
  if (!/^[0-9]{13}$/.test(timestamp) || Math.abs(Date.now() - time) > 300000) {
    throw new Error('Invalid webhook timestamp')
  }
  const parts = signature.split('.')
  if (parts.length !== 3 || parts[1] !== '' || !kid || !env.NEON_AUTH_URL) {
    throw new Error('Invalid webhook signature headers')
  }
  const header = JSON.parse(new TextDecoder().decode(decodeBase64url(parts[0])))
  if (header.alg !== 'EdDSA' || (header.kid && header.kid !== kid)) {
    throw new Error('Unexpected signature algorithm')
  }

  const url = new URL(env.NEON_AUTH_URL)
  if (url.protocol !== 'https:') throw new Error('Invalid Neon Auth URL')
  const response = await fetch(`${url.href.replace(/\/$/, '')}/.well-known/jwks.json`, {
    signal: AbortSignal.timeout(3000)
  })
  if (!response.ok) throw new Error('Neon webhook key unavailable')
  const jwks = await response.json()
  const jwk = jwks.keys?.find((key) => key.kid === kid && key.kty === 'OKP' && key.crv === 'Ed25519')
  if (!jwk) throw new Error('Neon webhook key not found')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify'])

  const raw = await request.text()
  if (utf8.encode(raw).byteLength > 10240) throw new Error('Webhook body too large')
  const signedPayload = `${timestamp}.${base64url(utf8.encode(raw))}`
  const input = utf8.encode(`${parts[0]}.${base64url(utf8.encode(signedPayload))}`)
  if (!await crypto.subtle.verify('Ed25519', key, decodeBase64url(parts[2]), input)) {
    throw new Error('Invalid webhook signature')
  }
  return JSON.parse(raw)
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char])
}

async function handleNeonWebhook(request, env, sendMail) {
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  let event
  try {
    event = await verifyNeonWebhook(request, env)
  } catch {
    return new Response(null, { status: 401 })
  }
  const email = event.user?.email
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(null, { status: 400 })
  }
  const type = event.event_data?.otp_type || event.event_data?.link_type
  let subject, text, html
  if (event.event_type === 'send.otp' && /^[0-9]{6}$/.test(event.event_data?.otp_code || '')) {
    const code = event.event_data.otp_code
    subject = type === 'forget-password' ? 'Reset your password' :
      type === 'sign-in' ? 'Your sign-in code' : 'Confirm your email address'
    text = `Your My Personal Vault code is ${code}. It expires shortly. If you did not request it, ignore this email.`
    html = `<p>Your My Personal Vault code is:</p><p style="font-size:32px;letter-spacing:8px"><strong>${code}</strong></p><p>It expires shortly. Do not share it.</p>`
  } else if (event.event_type === 'send.magic_link') {
    const link = event.event_data?.link_url
    if (typeof link !== 'string' || !link.startsWith('https://')) return new Response(null, { status: 400 })
    subject = type === 'forget-password' ? 'Reset your password' : 'Your My Personal Vault link'
    text = `Open this link to continue: ${link}\n\nIf you did not request it, ignore this email.`
    html = `<p><a href="${escapeHTML(link)}">Continue to My Personal Vault</a></p><p>This link expires shortly. Do not share it.</p>`
  } else {
    return new Response(null, { status: 400 })
  }
  try {
    await sendMail(env, { to: email, subject, text, html })
  } catch {
    // A non-2xx response lets Neon retry the blocking delivery event.
    return new Response(null, { status: 502 })
  }
  return Response.json({ success: true })
}


async function sendMail(env, { to, subject, text, html }) {
  if (!env.MAILTRAP_API_TOKEN || !env.MAILTRAP_FROM_EMAIL) {
    throw new Error('Mailtrap is not configured')
  }
  const response = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.MAILTRAP_API_TOKEN}`
    },
    body: JSON.stringify({
      from: { email: env.MAILTRAP_FROM_EMAIL, name: 'My Personal Vault' },
      to: [{ email: to }], subject, text, html, category: 'vault-auth'
    }),
    signal: AbortSignal.timeout(8000)
  })
  if (!response.ok) throw new Error(`Mailtrap HTTP ${response.status}`)
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname
    if (path === '/health' && request.method === 'GET') {
      return Response.json({ ok: true, service: 'my-personal-vault-api' })
    }
    if (path === '/webhooks/neon-auth') return handleNeonWebhook(request, env, sendMail)
    return new Response(null, { status: 404 })
  }
}
