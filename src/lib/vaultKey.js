// Holds the unlocked vault key in memory only.
// Nothing here is persisted except the KDF parameters, which are public.

import {
  KDF_ITERATIONS,
  KEY_CHECK_PLAINTEXT,
  decryptString,
  deriveKey,
  encryptString,
  fromBase64,
  randomBytes,
  SALT_BYTES,
  toBase64
} from './crypto.js'

let activeKey = null
let activeParams = null

export function isUnlocked() {
  return activeKey !== null
}

export function getKey() {
  if (!activeKey) {
    throw new Error('The vault is locked.')
  }
  return activeKey
}

export function getParams() {
  return activeParams
}

/**
 * Build the initial key material for a brand new vault.
 * Returns the row to insert into vault_keys plus the live key.
 */
export async function createVaultKey(passphrase) {
  const salt = randomBytes(SALT_BYTES)
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS)
  const check = await encryptString(key, KEY_CHECK_PLAINTEXT)

  activeKey = key
  activeParams = { iterations: KDF_ITERATIONS, salt: toBase64(salt) }

  return {
    kdf: 'PBKDF2-SHA256',
    iterations: KDF_ITERATIONS,
    salt: toBase64(salt),
    check_iv: check.iv,
    check_ct: check.ct,
    enc_version: check.v
  }
}

/**
 * Unlock using stored KDF parameters and verify against the check blob.
 * @returns {Promise<boolean>} false when the passphrase is wrong.
 */
export async function unlockVaultKey(passphrase, params) {
  const salt = fromBase64(params.salt)
  const key = await deriveKey(passphrase, salt, params.iterations)

  try {
    const plain = await decryptString(key, params.check_iv, params.check_ct)
    if (plain !== KEY_CHECK_PLAINTEXT) {
      return false
    }
  } catch {
    return false
  }

  activeKey = key
  activeParams = { iterations: params.iterations, salt: params.salt }
  return true
}

export function lockVaultKey() {
  activeKey = null
  activeParams = null
}