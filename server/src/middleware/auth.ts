import type { RequestHandler } from 'express'

import { AppError } from '../lib/errors'

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.currentUser) {
    return next(new AppError(401, 'UNAUTHORIZED', '请先登录管理后台'))
  }
  next()
}
