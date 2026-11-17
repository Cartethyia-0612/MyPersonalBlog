import type { RequestHandler } from 'express'

import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { consumeSensitiveToken, tokenKeyFromToken } from '../services/captcha'

/**
 * Sensitive admin actions need a second, single-use Cap token issued from a
 * dialog while the user is already signed in. The token is bound to that user.
 */
export function requireSensitiveCaptcha(db: Db): RequestHandler {
  return (req, _res, next) => {
    const userId = req.currentUser?.id
    if (!userId) {
      return next(new AppError(401, 'UNAUTHORIZED', '请先登录管理后台'))
    }

    const rawToken = req.get('x-captcha-token')?.trim()
    if (!rawToken) {
      return next(new AppError(403, 'CAPTCHA_REQUIRED', '请先完成人机验证'))
    }

    const tokenKey = tokenKeyFromToken(rawToken)
    if (!tokenKey) {
      return next(new AppError(403, 'CAPTCHA_INVALID', '人机验证无效，请重新验证'))
    }

    if (consumeSensitiveToken(db, tokenKey, userId) !== 'ok') {
      return next(new AppError(403, 'CAPTCHA_INVALID', '人机验证已失效，请重新验证'))
    }

    next()
  }
}
