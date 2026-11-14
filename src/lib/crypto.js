// Browser-side cryptography for My Personal Vault.
// Everything here runs locally. No key material is ever sent to a server.

export const ENC_VERSION = 1
export const KDF_NAME = 'PBKDF2-SHA256'
export const KDF_ITERATIONS = 600000
export const ENC_NAME = 'AES-GCM-256'
export const IV_BYTES = 12
export const SALT_BYTES = 16
export const KEY_CHECK_PLAINTEXT = 'my-personal-vault-key-check-v1'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function subtle() {
  const c = globalThis.crypto
  if (!c || !c.subtle) {
    throw new Error('This browser does not expose Web Crypto. Use a current browser over HTTPS.')
  }
  return c.subtle
}

export function randomBytes(length) {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

export function toBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode.apply(null, view.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function fromBase64(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function toBase64Url(bytes) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Hex(text) {
  const digest = await subtle().digest('SHA-256', encoder.encode(text))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Derive an AES-GCM-256 key from a passphrase with PBKDF2-SHA256.
 * @param {string} passphrase
 * @param {Uint8Array} salt
 * @param {number} iterations
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(passphrase, salt, iterations = KDF_ITERATIONS) {
  if (!passphrase) {
    throw new Error('A passphrase is required.')
  }
  const base = await subtle().importKey(
    'raw',
    encoder.encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return subtle().deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a UTF-8 string with a fresh random IV.
 * @returns {Promise<{ iv: string, ct: string, v: number }>}
 */
export async function encryptString(key, plaintext) {
  const iv = randomBytes(IV_BYTES)
  const ciphertext = await subtle().encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)), v: ENC_VERSION }
}

/**
 * Decrypt a base64 IV and ciphertext pair.
 */
export async function decryptString(key, ivB64, ctB64) {
  const iv = fromBase64(ivB64)
  const ciphertext = fromBase64(ctB64)
  const plaintext = await subtle().decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return decoder.decode(plaintext)
}

export async function encryptJson(key, value) {
  return encryptString(key, JSON.stringify(value))
}

export async function decryptJson(key, ivB64, ctB64) {
  return JSON.parse(await decryptString(key, ivB64, ctB64))
}

/**
 * Encrypt a value to a single self-describing string for storage.
 */
export async function sealValue(key, value) {
  const { iv, ct, v } = await encryptString(key, value)
  return JSON.stringify({ v, iv, ct })
}

export async function openValue(key, sealed) {
  const parsed = JSON.parse(sealed)
  if (parsed.v !== ENC_VERSION) {
    throw new Error(`Unsupported encryption version: ${parsed.v}`)
  }
  return decryptString(key, parsed.iv, parsed.ct)
}