import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || typeof raw !== 'string') {
    throw new Error('ENCRYPTION_KEY environment variable is required for field encryption')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (base64 encoded)`)
  }
  return key
}

/**
 * Encrypt a string with AES-256-GCM. Output format: base64(iv:authTag:ciphertext).
 */
export function encrypt(plaintext: string): string {
  if (plaintext == null || typeof plaintext !== 'string') {
    return plaintext
  }
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt a string produced by encrypt(). Throws if ciphertext is invalid or tampered.
 */
export function decrypt(ciphertext: string): string {
  if (ciphertext == null || typeof ciphertext !== 'string') {
    return ciphertext
  }
  const key = getKey()
  const combined = Buffer.from(ciphertext, 'base64')
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short')
  }
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

/**
 * Returns true if the value looks like our encrypted format (base64 that decodes to iv+tag+payload).
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const buf = Buffer.from(value, 'base64')
    return buf.length >= IV_LENGTH + AUTH_TAG_LENGTH && /^[A-Za-z0-9+/=]+$/.test(value)
  } catch {
    return false
  }
}

/**
 * SHA-256 hash for lookup fields (emailHash, tokenHash, codeHash). Hex string.
 */
export function hashForLookup(value: string): string {
  if (value == null || typeof value !== 'string') {
    throw new Error('hashForLookup requires a string')
  }
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}
