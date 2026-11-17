import { Router } from 'express'
import type { ValidateChallengeBody } from 'capjs-core'

import type { AppConfig } from '../config'
import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { issueCaptchaChallenge, redeemCaptcha } from '../services/captcha'

export function createCaptchaRouter(db: Db, config: AppConfig): Router {
  const router = Router()

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.post('/challenge', async (_req, res) => {
    const challenge = await issueCaptchaChallenge(config)
    res.json(challenge)
  })

  router.post('/redeem', async (req, res) => {
    const body = req.body as { token?: unknown; solutions?: unknown; instr?: unknown } | undefined

    if (
      !body ||
      typeof body.token !== 'string' ||
      body.token.length < 20 ||
      body.token.length > 8192 ||
      !Array.isArray(body.solutions) ||
      body.solutions.length > 256
    ) {
      throw new AppError(400, 'CAPTCHA_INVALID_REQUEST', '人机验证请求不合法')
    }

    const result = await redeemCaptcha(
      db,
      config,
      {
        token: body.token,
        solutions: body.solutions as ValidateChallengeBody['solutions'],
        ...(body.instr !== undefined
          ? { instr: body.instr as ValidateChallengeBody['instr'] }
          : {}),
      },
      req.currentUser?.id ?? null,
    )

    if (!result.success) {
      res.status(400).json({ success: false, reason: result.reason })
      return
    }

    res.json({ success: true, token: result.token, expires: result.expires })
  })

  return router
}
