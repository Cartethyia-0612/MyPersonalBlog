import { Router } from 'express'
import { z } from 'zod'

import type { AppConfig } from '../config'
import type { Db } from '../db'
import {
  clearAuthCookies,
  readCookie,
  SESSION_COOKIE,
  setCsrfCookie,
  setSessionCookie,
} from '../lib/cookies'
import { decryptText } from '../lib/crypto'
import { AppError } from '../lib/errors'
import { getClientIp, parseBody } from '../lib/http'
import { getCsrfToken } from '../middleware/csrf'
import {
  buildIpAttemptKey,
  buildPasswordAttemptKey,
  buildTotpAttemptKey,
  clearFailedAttempts,
  enforceAttemptLimit,
  recordFailedAttempt,
} from '../services/loginAttempts'
import { createLoginChallenge, verifyLoginChallenge, verifyTotpCode } from '../services/totp'
import {
  createSession,
  deleteExpiredSessions,
  deleteSessionByToken,
  findUserById,
  findUserByUsername,
  toPublicUser,
  verifyPasswordForUser,
} from '../services/users'

const PASSWORD_WINDOW_MS = 15 * 60 * 1000
const TOTP_WINDOW_MS = 10 * 60 * 1000

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
})

const totpLoginSchema = z.object({
  challengeToken: z.string().min(20).max(2000),
  code: z.string().trim().min(6).max(8),
})

export function createAuthRouter(db: Db, config: AppConfig): Router {
  const router = Router()

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.get('/session', (req, res) => {
    res.json({
      authenticated: Boolean(req.currentUser),
      user: req.currentUser ?? null,
      csrfToken: getCsrfToken(req, res),
    })
  })

  router.post('/login', async (req, res) => {
    const { username, password } = parseBody(loginSchema, req)
    const ip = getClientIp(req)
    const accountKey = buildPasswordAttemptKey(ip, username)
    const ipKey = buildIpAttemptKey(ip)

    enforceAttemptLimit(db, {
      key: accountKey,
      kind: 'password',
      limit: 5,
      windowMs: PASSWORD_WINDOW_MS,
    })
    enforceAttemptLimit(db, {
      key: ipKey,
      kind: 'password-ip',
      limit: 20,
      windowMs: PASSWORD_WINDOW_MS,
    })

    const user = findUserByUsername(db, username)
    const valid = await verifyPasswordForUser(password, user)

    if (!valid || !user) {
      recordFailedAttempt(db, accountKey, 'password')
      recordFailedAttempt(db, ipKey, 'password-ip')
      throw new AppError(401, 'INVALID_CREDENTIALS', '用户名或密码不正确')
    }

    clearFailedAttempts(db, accountKey)
    deleteExpiredSessions(db)

    if (user.totp_enabled) {
      if (!user.totp_secret_enc) {
        throw new AppError(500, 'TOTP_MISCONFIGURED', '两步验证配置异常，请联系站点管理员')
      }
      const challengeToken = createLoginChallenge(user.id, config.appSecret)
      return res.json({
        requiresTotp: true,
        challengeToken,
        expiresIn: 300,
      })
    }

    const session = createSession(
      db,
      user.id,
      { ip, userAgent: req.get('user-agent') ?? '' },
      config.sessionTtlDays,
    )
    setSessionCookie(res, session.rawToken, config)
    setCsrfCookie(res, session.csrfToken, config)

    return res.json({
      requiresTotp: false,
      user: toPublicUser(user),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    })
  })

  router.post('/login/totp', async (req, res) => {
    const { challengeToken, code } = parseBody(totpLoginSchema, req)
    const ip = getClientIp(req)
    const challenge = verifyLoginChallenge(challengeToken, config.appSecret)
    if (!challenge) {
      throw new AppError(401, 'CHALLENGE_EXPIRED', '验证已过期，请重新登录')
    }

    const user = findUserById(db, challenge.sub)
    if (!user || !user.totp_enabled || !user.totp_secret_enc) {
      throw new AppError(401, 'INVALID_CREDENTIALS', '登录验证失败')
    }

    const attemptKey = buildTotpAttemptKey(ip, user.id)
    enforceAttemptLimit(db, {
      key: attemptKey,
      kind: 'totp',
      limit: 5,
      windowMs: TOTP_WINDOW_MS,
    })

    let secret: string
    try {
      secret = decryptText(user.totp_secret_enc, config.appSecret)
    } catch {
      throw new AppError(500, 'TOTP_MISCONFIGURED', '两步验证配置异常，请联系站点管理员')
    }

    if (!verifyTotpCode(secret, code)) {
      recordFailedAttempt(db, attemptKey, 'totp')
      throw new AppError(401, 'INVALID_TOTP', '动态验证码不正确')
    }

    clearFailedAttempts(db, attemptKey)
    deleteExpiredSessions(db)

    const session = createSession(
      db,
      user.id,
      { ip, userAgent: req.get('user-agent') ?? '' },
      config.sessionTtlDays,
    )
    setSessionCookie(res, session.rawToken, config)
    setCsrfCookie(res, session.csrfToken, config)

    return res.json({
      requiresTotp: false,
      user: toPublicUser(user),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    })
  })

  router.post('/logout', (req, res) => {
    const rawToken = readCookie(req, SESSION_COOKIE)
    if (rawToken) deleteSessionByToken(db, rawToken)
    clearAuthCookies(res, config)
    res.json({ ok: true })
  })

  return router
}
