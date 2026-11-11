import bcrypt from 'bcryptjs'
import type { Db } from '../db'
import { hashToken, randomToken } from '../lib/crypto'
import { AppError } from '../lib/errors'
import type { PublicUser, UserRow } from '../types'

const BCRYPT_ROUNDS = 12

// Used to keep password-check timing roughly uniform when a username does not
// exist, reducing account enumeration via response timing.
const DUMMY_HASH = '$2b$12$qwFk1haIHuvtZUl9VfkNO.aB3Gx19HH8If2Q/BRwLCKtRyV7JKx2K'

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 72
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/

export function assertValidUsername(username: string): string {
  const normalized = username.trim()
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new AppError(400, 'INVALID_USERNAME', '用户名需为 3-32 位字母、数字、下划线或短横线')
  }
  return normalized
}

export function assertValidPassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AppError(400, 'WEAK_PASSWORD', `密码至少需要 ${PASSWORD_MIN_LENGTH} 位`)
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new AppError(400, 'WEAK_PASSWORD', `密码不能超过 ${PASSWORD_MAX_LENGTH} 位`)
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

export async function verifyPasswordForUser(
  password: string,
  user: UserRow | undefined,
): Promise<boolean> {
  if (!user) {
    await verifyPassword(password, DUMMY_HASH)
    return false
  }
  return verifyPassword(password, user.password_hash)
}

export function findUserByUsername(db: Db, username: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as
    UserRow | undefined
}

export function findUserById(db: Db, id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function countUsers(db: Db): number {
  return (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count
}

export async function createUser(db: Db, username: string, password: string): Promise<PublicUser> {
  const safeUsername = assertValidUsername(username)
  assertValidPassword(password)

  if (findUserByUsername(db, safeUsername)) {
    throw new AppError(409, 'USER_EXISTS', '该用户名已存在')
  }

  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash, totp_enabled, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?)`,
    )
    .run(safeUsername, passwordHash, now, now)

  return {
    id: Number(result.lastInsertRowid),
    username: safeUsername,
    totpEnabled: false,
  }
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    username: user.username,
    totpEnabled: Boolean(user.totp_enabled),
  }
}

export interface CreatedSession {
  rawToken: string
  csrfToken: string
  expiresAt: string
}

export function createSession(
  db: Db,
  userId: number,
  meta: { ip: string; userAgent: string },
  ttlDays: number,
): CreatedSession {
  const rawToken = randomToken(32)
  const csrfToken = randomToken(24)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString()

  db.prepare(
    `INSERT INTO sessions (id, user_id, csrf_token, user_agent, ip, created_at, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    hashToken(rawToken),
    userId,
    csrfToken,
    meta.userAgent.slice(0, 400),
    meta.ip,
    now.toISOString(),
    expiresAt,
    now.toISOString(),
  )

  return { rawToken, csrfToken, expiresAt }
}

export function deleteSessionByToken(db: Db, rawToken: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(rawToken))
}

export function deleteExpiredSessions(db: Db): number {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString())
    .changes
}

export function touchSession(db: Db, sessionId: string, lastSeenAt: string): void {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  if (lastSeenAt < tenMinutesAgo) {
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      sessionId,
    )
  }
}

export function revokeOtherSessions(db: Db, userId: number, currentSessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(userId, currentSessionId)
}
