import { createHash } from 'node:crypto'

import {
  generateChallenge,
  validateChallenge,
  type ChallengeResult,
  type ValidateChallengeBody,
} from 'capjs-core'

import type { AppConfig } from '../config'
import type { Db } from '../db'

export const CAPTCHA_SCOPE = 'admin-login'

const NONCE_PURPOSE = 'captcha_nonce'
const LOGIN_PURPOSE = 'login_token'
const TOKEN_PATTERN = /^([A-Za-z0-9_-]{8,128}):([A-Za-z0-9_-]{16,256})$/

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** Derive the opaque key Cap expects us to store for a visitor token. */
export function tokenKeyFromToken(token: string): string | null {
  const match = TOKEN_PATTERN.exec(token.trim())
  if (!match) return null
  return `${match[1]}:${sha256(match[2])}`
}

/**
 * Record a challenge signature. The unique constraint makes this an atomic
 * "use once" operation, so a replayed /redeem request is rejected.
 */
export function consumeNonce(db: Db, signatureHex: string, ttlMs: number): boolean {
  const now = Date.now()
  const timestamp = new Date(now).toISOString()
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO used_tokens
         (purpose, token_hash, expires_at, consumed_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(NONCE_PURPOSE, sha256(signatureHex), now + Math.max(1_000, ttlMs), timestamp, timestamp)
  cleanupExpiredTokens(db, now)
  return result.changes === 1
}

/** Store the token returned by a successful redeem; it is still unconsumed. */
export function storeLoginToken(db: Db, tokenKey: string, expiresAt: number): boolean {
  const now = Date.now()
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false

  const result = db
    .prepare(
      `INSERT OR IGNORE INTO used_tokens
         (purpose, token_hash, expires_at, consumed_at, created_at)
       VALUES (?, ?, ?, NULL, ?)`,
    )
    .run(LOGIN_PURPOSE, tokenKey, expiresAt, new Date(now).toISOString())

  cleanupExpiredTokens(db, now)
  return result.changes === 1
}

export type LoginTokenState = 'ok' | 'missing' | 'expired' | 'used'

/**
 * Atomically consume a login token. Missing, expired and already-consumed
 * tokens never allow a login attempt through.
 */
export function consumeLoginToken(db: Db, tokenKey: string): LoginTokenState {
  const now = Date.now()
  const row = db
    .prepare(
      `SELECT expires_at, consumed_at FROM used_tokens
       WHERE purpose = ? AND token_hash = ?`,
    )
    .get(LOGIN_PURPOSE, tokenKey) as { expires_at: number; consumed_at: string | null } | undefined

  if (!row) return 'missing'

  if (row.expires_at <= now) {
    db.prepare('DELETE FROM used_tokens WHERE purpose = ? AND token_hash = ?').run(
      LOGIN_PURPOSE,
      tokenKey,
    )
    return 'expired'
  }

  if (row.consumed_at) return 'used'

  const result = db
    .prepare(
      `UPDATE used_tokens SET consumed_at = ?
       WHERE purpose = ? AND token_hash = ? AND consumed_at IS NULL AND expires_at > ?`,
    )
    .run(new Date(now).toISOString(), LOGIN_PURPOSE, tokenKey, now)

  return result.changes === 1 ? 'ok' : 'used'
}

export function cleanupExpiredTokens(db: Db, now = Date.now()): void {
  db.prepare('DELETE FROM used_tokens WHERE expires_at <= ?').run(now)
}

export function issueCaptchaChallenge(config: AppConfig): Promise<ChallengeResult> {
  return generateChallenge(config.capSecret, {
    scope: CAPTCHA_SCOPE,
    format: 2,
    protocols: ['hashwx'],
  })
}

export type RedeemCaptchaResult =
  { success: true; token: string; expires: number } | { success: false; reason: string }

export async function redeemCaptcha(
  db: Db,
  config: AppConfig,
  body: ValidateChallengeBody,
): Promise<RedeemCaptchaResult> {
  const result = await validateChallenge(config.capSecret, body, {
    scope: CAPTCHA_SCOPE,
    consumeNonce: (signatureHex, ttlMs) => consumeNonce(db, signatureHex, ttlMs),
  })

  if (!result.success) return { success: false, reason: result.reason }
  if (!result.tokenKey) return { success: false, reason: 'missing_token_key' }

  if (!storeLoginToken(db, result.tokenKey, result.expires)) {
    return { success: false, reason: 'token_store_failed' }
  }

  return { success: true, token: result.token, expires: result.expires }
}
