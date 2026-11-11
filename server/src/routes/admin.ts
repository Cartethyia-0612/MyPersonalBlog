import { Router } from 'express'
import { z } from 'zod'

import type { AppConfig } from '../config'
import type { Db } from '../db'
import { decryptText, encryptText } from '../lib/crypto'
import { AppError } from '../lib/errors'
import { parseBody } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import { getArticleStats } from '../services/articles'
import { getFriendStats } from '../services/friends'
import { createAdminArticlesRouter } from './adminArticles'
import { createAdminFriendsRouter } from './adminFriends'
import { createAdminSettingsRouter } from './adminSettings'
import { createAdminUploadsRouter } from './adminUploads'
import {
  buildTotpQrDataUrl,
  buildTotpUri,
  generateTotpSecret,
  verifyTotpCode,
} from '../services/totp'
import {
  assertValidPassword,
  findUserById,
  hashPassword,
  revokeOtherSessions,
  verifyPassword,
} from '../services/users'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
})

const totpEnableSchema = z.object({
  code: z.string().trim().min(6).max(8),
})

const totpDisableSchema = z.object({
  password: z.string().min(1).max(200),
  code: z.string().trim().min(6).max(8),
})

function getCurrentUserOrThrow(db: Db, userId: number | undefined) {
  if (!userId) throw new AppError(401, 'UNAUTHORIZED', '请先登录管理后台')
  const user = findUserById(db, userId)
  if (!user) throw new AppError(401, 'UNAUTHORIZED', '登录状态已失效')
  return user
}

export function createAdminRouter(db: Db, config: AppConfig): Router {
  const router = Router()
  router.use(requireAuth)
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.get('/security', (req, res) => {
    const user = getCurrentUserOrThrow(db, req.currentUser?.id)
    res.json({
      username: user.username,
      totpEnabled: Boolean(user.totp_enabled),
      hasPendingTotpSecret: Boolean(user.totp_secret_enc) && !user.totp_enabled,
    })
  })

  router.get('/overview', (req, res) => {
    const user = getCurrentUserOrThrow(db, req.currentUser?.id)
    const articleStats = getArticleStats(db)
    const friendStats = getFriendStats(db)
    const playlistCount = (
      db.prepare('SELECT COUNT(*) AS count FROM music_playlists').get() as { count: number }
    ).count

    const recentArticles = db
      .prepare(
        `SELECT id, title, slug, status, updated_at FROM articles
         ORDER BY updated_at DESC, id DESC LIMIT 5`,
      )
      .all()

    res.json({
      articles: articleStats,
      friends: friendStats,
      playlists: { total: playlistCount },
      security: {
        username: user.username,
        totpEnabled: Boolean(user.totp_enabled),
      },
      recentArticles,
    })
  })

  router.use('/articles', createAdminArticlesRouter(db))
  router.use('/friends', createAdminFriendsRouter(db))
  router.use(createAdminSettingsRouter(db))
  router.use('/uploads', createAdminUploadsRouter(config))

  router.post('/security/password', async (req, res) => {
    const { currentPassword, newPassword } = parseBody(changePasswordSchema, req)
    const user = getCurrentUserOrThrow(db, req.currentUser?.id)

    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      throw new AppError(400, 'INVALID_PASSWORD', '当前密码不正确')
    }

    assertValidPassword(newPassword)
    const newHash = await hashPassword(newPassword)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      newHash,
      new Date().toISOString(),
      user.id,
    )

    if (req.sessionContext) {
      revokeOtherSessions(db, user.id, req.sessionContext.id)
    }

    res.json({ ok: true, message: '密码已更新，其他设备的登录状态已失效' })
  })

  router.post('/security/totp/setup', async (req, res) => {
    const user = getCurrentUserOrThrow(db, req.currentUser?.id)
    if (user.totp_enabled) {
      throw new AppError(409, 'TOTP_ALREADY_ENABLED', '两步验证已启用，请先关闭再重新配置')
    }

    const secret = generateTotpSecret()
    const otpauthUrl = buildTotpUri(user.username, secret)
    const encrypted = encryptText(secret, config.appSecret)
    db.prepare(
      'UPDATE users SET totp_secret_enc = ?, totp_enabled = 0, updated_at = ? WHERE id = ?',
    ).run(encrypted, new Date().toISOString(), user.id)

    const qrDataUrl = await buildTotpQrDataUrl(otpauthUrl)
    res.json({
      secret,
      otpauthUrl,
      qrDataUrl,
      issuer: '饿师傅的技术札记',
      account: user.username,
    })
  })

  router.post('/security/totp/enable', (req, res) => {
    const { code } = parseBody(totpEnableSchema, req)
    const user = getCurrentUserOrThrow(db, req.currentUser?.id)

    if (user.totp_enabled) {
      throw new AppError(409, 'TOTP_ALREADY_ENABLED', '两步验证已处于启用状态')
    }
    if (!user.totp_secret_enc) {
      throw new AppError(409, 'TOTP_NOT_SETUP', '请先生成两步验证密钥')
    }

    let secret: string
    try {
      secret = decryptText(user.totp_secret_enc, config.appSecret)
    } catch {
      throw new AppError(500, 'TOTP_MISCONFIGURED', '两步验证密钥无法读取')
    }

    if (!verifyTotpCode(secret, code)) {
      throw new AppError(400, 'INVALID_TOTP', '动态验证码不正确，请检查设备时间后重试')
    }

    db.prepare('UPDATE users SET totp_enabled = 1, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      user.id,
    )
    res.json({ ok: true, totpEnabled: true })
  })

  router.post('/security/totp/disable', async (req, res) => {
    const { password, code } = parseBody(totpDisableSchema, req)
    const user = getCurrentUserOrThrow(db, req.currentUser?.id)

    if (!user.totp_enabled || !user.totp_secret_enc) {
      throw new AppError(409, 'TOTP_NOT_ENABLED', '两步验证当前未启用')
    }

    if (!(await verifyPassword(password, user.password_hash))) {
      throw new AppError(400, 'INVALID_PASSWORD', '当前密码不正确')
    }

    let secret: string
    try {
      secret = decryptText(user.totp_secret_enc, config.appSecret)
    } catch {
      throw new AppError(500, 'TOTP_MISCONFIGURED', '两步验证密钥无法读取')
    }

    if (!verifyTotpCode(secret, code)) {
      throw new AppError(400, 'INVALID_TOTP', '动态验证码不正确')
    }

    db.prepare(
      'UPDATE users SET totp_enabled = 0, totp_secret_enc = NULL, updated_at = ? WHERE id = ?',
    ).run(new Date().toISOString(), user.id)

    res.json({ ok: true, totpEnabled: false })
  })

  return router
}
