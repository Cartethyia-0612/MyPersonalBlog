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
import {
  createLoginChallenge,
  verifyLoginChallenge,
  verifyTotpCodeWithStep,
} from '../services/totp'
import { consumeTotpLoginUse } from '../services/totpLoginUses'
import { consumeLoginToken, tokenKeyFromToken } from '../services/captcha'
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
  captchaToken: z.string().trim().max(4096).optional(),
  rememberBrowser: z.boolean().optional(),
})

function sessionTtlDays(config: AppConfig, remember: boolean): number {
  return remember ? config.rememberSessionTtlDays : config.sessionTtlDays
}

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
    const { username, password, captchaToken, rememberBrowser } = parseBody(loginSchema, req)
    const remember = rememberBrowser === true
    const ip = getClientIp(req)
    const accountKey = buildPasswordAttemptKey(ip, username)
    const ipKey = buildIpAttemptKey(ip)

    if (!captchaToken) {
      throw new AppError(400, 'CAPTCHA_REQUIRED', '请先完成人机验证')
    }
    const captchaKey = tokenKeyFromToken(captchaToken)
    if (!captchaKey) {
      throw new AppError(403, 'CAPTCHA_INVALID', '人机验证无效，请重新验证')
    }
    if (consumeLoginToken(db, captchaKey) !== 'ok') {
      throw new AppError(403, 'CAPTCHA_INVALID', '人机验证已失效，请重新验证')
    }

    db.transaction(() => {
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
      // Reserve the attempt before the expensive bcrypt work so a burst of
      // parallel guesses cannot all pass the limiter before any failure lands.
      recordFailedAttempt(db, accountKey, 'password')
      recordFailedAttempt(db, ipKey, 'password-ip')
    })()

    const user = findUserByUsername(db, username)
    const valid = await verifyPasswordForUser(password, user)

    if (!valid || !user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', '用户名或密码不正确')
    }

    // bcrypt yields to the event loop. Re-read the user so a concurrent
    // password or MFA change cannot be overwritten by this older snapshot.
    const currentUser = findUserById(db, user.id)
    if (!currentUser || currentUser.credential_version !== user.credential_version) {
      throw new AppError(401, 'CREDENTIALS_CHANGED', '登录凭据已变更，请重新验证')
    }

    clearFailedAttempts(db, accountKey)
    clearFailedAttempts(db, ipKey)
    deleteExpiredSessions(db)

    if (currentUser.totp_enabled) {
      if (!currentUser.totp_secret_enc) {
        throw new AppError(500, 'TOTP_MISCONFIGURED', '两步验证配置异常，请联系站点管理员')
      }
      const challengeToken = createLoginChallenge(
        currentUser.id,
        config.appSecret,
        remember,
        currentUser.credential_version,
      )
      return res.json({
        requiresTotp: true,
        challengeToken,
        expiresIn: 300,
      })
    }

    const ttlDays = sessionTtlDays(config, remember)
    const session = createSession(
      db,
      currentUser.id,
      { ip, userAgent: req.get('user-agent') ?? '' },
      ttlDays,
    )
    setSessionCookie(res, session.rawToken, config, ttlDays)
    setCsrfCookie(res, session.csrfToken, config, ttlDays)

    return res.json({
      requiresTotp: false,
      user: toPublicUser(currentUser),
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
    if (user.credential_version !== challenge.credentialVersion) {
      throw new AppError(401, 'CREDENTIALS_CHANGED', '登录凭据已变更，请重新验证')
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

    const timeStep = verifyTotpCodeWithStep(secret, code)
    if (timeStep === null) {
      recordFailedAttempt(db, attemptKey, 'totp')
      throw new AppError(401, 'INVALID_TOTP', '动态验证码不正确')
    }

    clearFailedAttempts(db, attemptKey)
    deleteExpiredSessions(db)

    const remember = challenge.remember
    const ttlDays = sessionTtlDays(config, remember)
    const session = db.transaction(() => {
      if (!consumeTotpLoginUse(db, user.id, challenge.jti, timeStep)) {
        throw new AppError(401, 'TOTP_REPLAY', '该动态验证码已使用，请等待下一次刷新')
      }
      return createSession(db, user.id, { ip, userAgent: req.get('user-agent') ?? '' }, ttlDays)
    })()
    setSessionCookie(res, session.rawToken, config, ttlDays)
    setCsrfCookie(res, session.csrfToken, config, ttlDays)

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
