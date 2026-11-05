import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { dataDir, decrypt, encrypt, newId, tokenDigest } from './security.mjs'

const db = new DatabaseSync(path.join(dataDir, 'madar.db'))
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_digest TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS workspaces (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_encrypted TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS social_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    status TEXT NOT NULL,
    token_encrypted TEXT NOT NULL,
    last_sync TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE(user_id, provider, provider_account_id)
  );
  CREATE TABLE IF NOT EXISTS account_pages (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    provider_page_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_encrypted TEXT NOT NULL,
    tasks_json TEXT NOT NULL DEFAULT '[]',
    UNIQUE(account_id, provider_page_id)
  );
`)

const iso = () => new Date().toISOString()
const publicUser = row => row && ({ id: row.id, name: row.name, email: row.email, role: row.role })

export function userCount() {
  return db.prepare('SELECT COUNT(*) AS count FROM users').get().count
}

export function createUser({ name, email, passwordHash }) {
  const user = { id: newId('usr'), name, email: email.toLowerCase(), passwordHash, role: 'admin', createdAt: iso() }
  db.prepare('INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)')
    .run(user.id, user.name, user.email, user.passwordHash, user.role, user.createdAt)
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase())
}

export function findUserById(id) {
  return publicUser(db.prepare('SELECT id,name,email,role FROM users WHERE id = ?').get(id))
}

export function createSession(userId, token) {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO sessions (token_digest,user_id,expires_at,created_at) VALUES (?,?,?,?)')
    .run(tokenDigest(token), userId, expiresAt, iso())
  return expiresAt
}

export function userForSession(token) {
  if (!token) return null
  const row = db.prepare(`SELECT u.id,u.name,u.email,u.role FROM sessions s
    JOIN users u ON u.id = s.user_id WHERE s.token_digest = ? AND s.expires_at > ?`).get(tokenDigest(token), Date.now())
  return publicUser(row)
}

export function deleteSession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_digest = ?').run(tokenDigest(token))
}

export function getWorkspace(userId) {
  const row = db.prepare('SELECT data_json,updated_at FROM workspaces WHERE user_id = ?').get(userId)
  return row ? { data: JSON.parse(row.data_json), updatedAt: row.updated_at } : null
}

export function setWorkspace(userId, value) {
  const updatedAt = iso()
  db.prepare(`INSERT INTO workspaces (user_id,data_json,updated_at) VALUES (?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`)
    .run(userId, JSON.stringify(value), updatedAt)
  return updatedAt
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key,value_encrypted) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value_encrypted=excluded.value_encrypted')
    .run(key, encrypt(value))
}

export function getSetting(key) {
  const row = db.prepare('SELECT value_encrypted FROM settings WHERE key = ?').get(key)
  return row ? decrypt(row.value_encrypted) : null
}

export function createOAuthState(userId, state, expiresAt) {
  db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO oauth_states (state,user_id,expires_at) VALUES (?,?,?)').run(state, userId, expiresAt)
}

export function consumeOAuthState(state, userId) {
  const row = db.prepare('SELECT user_id,expires_at FROM oauth_states WHERE state = ? AND user_id = ?').get(state, userId)
  if (row) db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state)
  return Boolean(row && row.expires_at > Date.now())
}

const accountSelect = `SELECT id,provider,provider_account_id,name,handle,status,last_sync,metadata_json FROM social_accounts`
const publicAccount = row => row && ({
  id: row.id, provider: row.provider, externalId: row.provider_account_id,
  name: row.name, handle: row.handle, status: row.status, lastSync: row.last_sync,
  real: true, connectionType: 'official', metadata: JSON.parse(row.metadata_json || '{}'),
})

export function upsertSocialAccount({ userId, provider, providerAccountId, name, handle, accessToken, metadata = {} }) {
  const now = iso()
  db.prepare(`INSERT INTO social_accounts
    (id,user_id,provider,provider_account_id,name,handle,status,token_encrypted,last_sync,metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id,provider,provider_account_id) DO UPDATE SET
      name=excluded.name,handle=excluded.handle,status='active',token_encrypted=excluded.token_encrypted,
      last_sync=excluded.last_sync,metadata_json=excluded.metadata_json`)
    .run(newId('account'), userId, provider, providerAccountId, name, handle, 'active', encrypt(accessToken), now, JSON.stringify(metadata))
  return publicAccount(db.prepare(`${accountSelect} WHERE user_id=? AND provider=? AND provider_account_id=?`).get(userId, provider, providerAccountId))
}

export function listSocialAccounts(userId, provider = 'facebook') {
  return db.prepare(`${accountSelect} WHERE user_id=? AND provider=? ORDER BY last_sync DESC`).all(userId, provider).map(publicAccount)
}

export function getSocialAccount(id, userId) {
  return db.prepare('SELECT * FROM social_accounts WHERE id=? AND user_id=?').get(id, userId)
}

export function updateAccountStatus(id, userId, status) {
  db.prepare('UPDATE social_accounts SET status=?,last_sync=? WHERE id=? AND user_id=?').run(status, iso(), id, userId)
  return publicAccount(db.prepare(`${accountSelect} WHERE id=? AND user_id=?`).get(id, userId))
}

export function deleteSocialAccount(id, userId) {
  db.prepare('DELETE FROM social_accounts WHERE id=? AND user_id=?').run(id, userId)
}

export function storeAccountPages(accountId, pages) {
  db.prepare('DELETE FROM account_pages WHERE account_id=?').run(accountId)
  const insert = db.prepare(`INSERT INTO account_pages (id,account_id,provider_page_id,name,token_encrypted,tasks_json)
    VALUES (?,?,?,?,?,?) ON CONFLICT(account_id,provider_page_id) DO UPDATE SET
    name=excluded.name,token_encrypted=excluded.token_encrypted,tasks_json=excluded.tasks_json`)
  for (const page of pages) insert.run(newId('page'), accountId, page.id, page.name, encrypt(page.access_token || ''), JSON.stringify(page.tasks || []))
  return listAccountPages(accountId)
}

export function listAccountPages(accountId) {
  return db.prepare('SELECT id,provider_page_id,name,tasks_json FROM account_pages WHERE account_id=?').all(accountId)
    .map(row => ({ id: row.provider_page_id, name: row.name, tasks: JSON.parse(row.tasks_json || '[]') }))
}
