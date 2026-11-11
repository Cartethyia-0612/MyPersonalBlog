import type { Db } from '../db'
import { AppError } from '../lib/errors'

export interface LoginAttemptInput {
  key: string
  kind: string
  limit: number
  windowMs: number
}

interface AttemptSummary {
  count: number
  first_at: string | null
}

export function buildPasswordAttemptKey(ip: string, username: string): string {
  return `password:${ip}:${username.trim().toLowerCase()}`
}

export function buildIpAttemptKey(ip: string): string {
  return `password-ip:${ip}`
}

export function buildTotpAttemptKey(ip: string, userId: number): string {
  return `totp:${ip}:${userId}`
}

function getAttemptSummary(db: Db, key: string, windowMs: number): AttemptSummary {
  const cutoff = new Date(Date.now() - windowMs).toISOString()
  return db
    .prepare(
      `SELECT COUNT(*) AS count, MIN(created_at) AS first_at
       FROM login_attempts
       WHERE attempt_key = ? AND success = 0 AND created_at > ?`,
    )
    .get(key, cutoff) as AttemptSummary
}

/**
 * Throw a 429 when the key has hit its failure budget. The window is sliding:
 * `retryAfter` is derived from the oldest failure still counted.
 */
export function enforceAttemptLimit(db: Db, input: LoginAttemptInput): void {
  const summary = getAttemptSummary(db, input.key, input.windowMs)
  if (summary.count < input.limit) return

  let retryAfter = Math.ceil(input.windowMs / 1000)
  if (summary.first_at) {
    const unlocksAt = Date.parse(summary.first_at) + input.windowMs
    retryAfter = Math.max(1, Math.ceil((unlocksAt - Date.now()) / 1000))
  }

  throw new AppError(429, 'RATE_LIMITED', '尝试次数过多，请稍后再试', { retryAfter })
}

export function recordFailedAttempt(db: Db, key: string, kind: string): void {
  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO login_attempts (attempt_key, kind, success, created_at) VALUES (?, ?, 0, ?)',
  ).run(key, kind, now)
  pruneOldAttempts(db)
}

export function clearFailedAttempts(db: Db, key: string): void {
  db.prepare('DELETE FROM login_attempts WHERE attempt_key = ? AND success = 0').run(key)
}

export function pruneOldAttempts(db: Db): void {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  db.prepare('DELETE FROM login_attempts WHERE created_at < ?').run(cutoff)
}
