import {
  deriveKey,
  decryptJson,
  encryptJson,
  KDF_ITERATIONS,
  KDF_NAME,
  ENC_VERSION
} from './crypto.js'
import { getParams } from './vaultKey.js'

const BACKUP_FORMAT = 'my-personal-vault-backup'
const BACKUP_VERSION = 1

const RECORD_FIELDS = [
  'title',
  'full_name',
  'national_id',
  'phone',
  'email',
  'address',
  'website',
  'url',
  'username',
  'password',
  'notes'
]

function normaliseRecords(records) {
  if (!Array.isArray(records)) {
    throw new Error('The backup does not contain a valid records list.')
  }

  return records.map((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('The backup contains an invalid record.')
    }

    const normalised = {
      record_type: record.record_type === 'personal' ? 'personal' : 'login',
      custom_fields: Array.isArray(record.custom_fields)
        ? record.custom_fields.map((field) => ({
            label: String(field?.label ?? ''),
            value: String(field?.value ?? '')
          }))
        : []
    }

    for (const field of RECORD_FIELDS) {
      normalised[field] = String(record[field] ?? '')
    }

    return normalised
  })
}

/**
 * Build an encrypted backup using the already-unlocked vault key.
 * The KDF parameters travel with the encrypted envelope so the vault passphrase
 * can derive the same key when the backup is imported.
 */
export async function buildBackup(key, records) {
  const params = getParams()
  if (!params?.salt || !Number.isInteger(params.iterations)) {
    throw new Error('Vault key parameters are unavailable. Unlock the vault and try again.')
  }

  const payload = {
    version: BACKUP_VERSION,
    records: normaliseRecords(records)
  }
  const encrypted = await encryptJson(key, payload)

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    kdf: KDF_NAME,
    iterations: params.iterations,
    salt: params.salt,
    enc: 'AES-GCM-256',
    enc_version: encrypted.v,
    iv: encrypted.iv,
    ciphertext: encrypted.ct
  }
}

/**
 * Decrypt and validate a backup with the vault's master passphrase.
 * @returns {Promise<Array<object>>} Normalised records ready to import.
 */
export async function readBackup(text, passphrase) {
  let envelope
  try {
    envelope = JSON.parse(String(text))
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (
    !envelope ||
    envelope.format !== BACKUP_FORMAT ||
    envelope.version !== BACKUP_VERSION
  ) {
    throw new Error('This is not a supported My Personal Vault backup.')
  }
  if (envelope.kdf !== KDF_NAME || envelope.enc !== 'AES-GCM-256') {
    throw new Error('This backup uses an unsupported encryption format.')
  }
  if (
    !Number.isInteger(envelope.iterations) ||
    envelope.iterations < 1 ||
    typeof envelope.salt !== 'string' ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.ciphertext !== 'string' ||
    envelope.enc_version !== ENC_VERSION
  ) {
    throw new Error('The backup file is incomplete or damaged.')
  }
  if (!passphrase) {
    throw new Error('Enter the master passphrase used for this backup.')
  }

  try {
    const salt = Uint8Array.from(atob(envelope.salt), (character) => character.charCodeAt(0))
    const key = await deriveKey(passphrase, salt, envelope.iterations)
    const payload = await decryptJson(key, envelope.iv, envelope.ciphertext)

    if (!payload || payload.version !== BACKUP_VERSION) {
      throw new Error('The backup payload has an unsupported version.')
    }
    return normaliseRecords(payload.records)
  } catch (error) {
    if (error instanceof Error && error.message.includes('unsupported version')) {
      throw error
    }
    throw new Error('Could not decrypt this backup. Check the passphrase and file.')
  }
}

export function backupFilename(date = new Date()) {
  const day = date.toISOString().slice(0, 10)
  return `my-personal-vault-backup-${day}.json`
}
