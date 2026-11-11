import type { RequestHandler } from 'express'

import type { AppConfig } from '../config'
import type { Db } from '../db'
import { clearSessionCookie, readCookie, SESSION_COOKIE } from '../lib/cookies'
import { hashToken } from '../lib/crypto'
import { touchSession } from '../services/users'
import type { SessionRow } from '../types'

export function createSessionMiddleware(db: Db, config: AppConfig): RequestHandler {
  const selectSession = db.prepare(
    `SELECT s.id AS session_id, s.user_id, s.csrf_token, s.expires_at, s.last_seen_at,
            u.username, u.totp_enabled
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
  )
  const deleteSession = db.prepare('DELETE FROM sessions WHERE id = ?')

  return (req, res, next) => {
    const rawToken = readCookie(req, SESSION_COOKIE)
    if (!rawToken) return next()

    const session = selectSession.get(hashToken(rawToken)) as SessionRow | undefined
    if (!session) {
      clearSessionCookie(res, config)
      return next()
    }

    if (Date.parse(session.expires_at) <= Date.now()) {
      deleteSession.run(session.session_id)
      clearSessionCookie(res, config)
      return next()
    }

    req.sessionContext = {
      id: session.session_id,
      userId: session.user_id,
      csrfToken: session.csrf_token,
      expiresAt: session.expires_at,
    }
    req.currentUser = {
      id: session.user_id,
      username: session.username,
      totpEnabled: Boolean(session.totp_enabled),
    }

    touchSession(db, session.session_id, session.last_seen_at)
    next()
  }
}
