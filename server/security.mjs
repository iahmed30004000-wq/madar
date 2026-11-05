import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = path.dirname(fileURLToPath(import.meta.url))
export const dataDir = process.env.MADAR_DATA_DIR || path.join(serverDir, 'data')
fs.mkdirSync(dataDir, { recursive: true })

let encryptionKey
function getEncryptionKey() {
  if (encryptionKey) return encryptionKey
  if (process.env.MADAR_TOKEN_KEY) {
    const value = process.env.MADAR_TOKEN_KEY.trim()
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('MADAR_TOKEN_KEY must contain 64 hexadecimal characters')
    encryptionKey = Buffer.from(value, 'hex')
    return encryptionKey
  }
  const keyPath = path.join(dataDir, 'encryption.key')
  if (fs.existsSync(keyPath)) {
    encryptionKey = Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'hex')
  } else {
    encryptionKey = crypto.randomBytes(32)
    fs.writeFileSync(keyPath, encryptionKey.toString('hex'), { mode: 0o600 })
  }
  return encryptionKey
}

export function encrypt(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.')
}

export function decrypt(value) {
  const [ivValue, tagValue, encryptedValue] = String(value).split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8')
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(String(password), salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password, stored) {
  const [saltValue, hashValue] = String(stored).split(':')
  if (!saltValue || !hashValue) return false
  const actual = crypto.scryptSync(String(password), Buffer.from(saltValue, 'hex'), 64)
  const expected = Buffer.from(hashValue, 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function tokenDigest(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`
}
