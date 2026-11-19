import type { Db } from '../db'

const RETENTION_MS = 24 * 60 * 60 * 1000

function isConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('SQLITE_CONSTRAINT')
  )
}

/**
 * Record the signed challenge and the accepted 30-second TOTP step. The two
 * unique constraints make replay of either the challenge or the time step fail.
 */
export function consumeTotpLoginUse(
  db: Db,
  userId: number,
  challengeJti: string,
  timeStep: number,
): boolean {
  const now = new Date().toISOString()
  try {
    db.prepare(
      `INSERT INTO totp_login_uses (user_id, challenge_jti, time_step, created_at)
       VALUES (?, ?, ?, ?)`,
    ).run(userId, challengeJti, timeStep, now)
  } catch (error) {
    if (isConstraintError(error)) return false
    throw error
  }

  db.prepare('DELETE FROM totp_login_uses WHERE created_at < ?').run(
    new Date(Date.now() - RETENTION_MS).toISOString(),
  )
  return true
}

export function clearTotpLoginUses(db: Db, userId: number): void {
  db.prepare('DELETE FROM totp_login_uses WHERE user_id = ?').run(userId)
}
