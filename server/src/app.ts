import fs from 'node:fs'
import path from 'node:path'

import cookieParser from 'cookie-parser'
import express, { type ErrorRequestHandler, type Express } from 'express'
import helmet from 'helmet'

import type { AppConfig } from './config'
import type { Db } from './db'
import { isAppError } from './lib/errors'
import { createEnsureCsrfMiddleware, createRequireCsrfMiddleware } from './middleware/csrf'
import { createSessionMiddleware } from './middleware/session'
import { createAdminRouter } from './routes/admin'
import { createAuthRouter } from './routes/auth'
import { createPublicRouter } from './routes/public'

export interface AppDependencies {
  config: AppConfig
  db: Db
}

export function createApp({ config, db }: AppDependencies): Express {
  const app = express()

  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', 1)

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          mediaSrc: ["'self'", 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: false, limit: '128kb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get()
      res.json({
        ok: true,
        service: 'eshi-tech-notes',
        time: new Date().toISOString(),
      })
    } catch {
      res.status(503).json({ ok: false, error: { code: 'DATABASE_UNAVAILABLE' } })
    }
  })

  // Load the signed-in user before CSRF checks so authenticated writes can be
  // bound to the server-side session token.
  app.use(createSessionMiddleware(db, config))
  app.use('/api', createEnsureCsrfMiddleware(config))
  app.use('/api', createRequireCsrfMiddleware(config))

  app.use('/api/auth', createAuthRouter(db, config))
  app.use('/api/admin', createAdminRouter(db, config))
  app.use('/api', createPublicRouter(db))

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } })
  })

  // Uploaded assets are available in both dev and production, independent of
  // whether a built client exists yet.
  fs.mkdirSync(config.uploadDir, { recursive: true })
  app.use(
    '/uploads',
    express.static(config.uploadDir, {
      fallthrough: false,
      maxAge: config.isProduction ? '7d' : 0,
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff')
      },
    }),
  )

  // Serve the built SPA when present. API routes are registered above so a
  // missing API path can never fall back to HTML.
  if (fs.existsSync(path.join(config.clientDistDir, 'index.html'))) {
    app.use(express.static(config.clientDistDir, { index: false, maxAge: '1h' }))
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(config.clientDistDir, 'index.html'))
    })
  } else {
    app.get('/', (_req, res) => {
      res.json({
        name: '饿师傅的技术札记 API',
        status: 'running',
        hint: '前端开发服务器运行在 http://localhost:5173',
      })
    })
  }

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (isAppError(error)) {
      const retryAfter = error.details?.retryAfter
      if (typeof retryAfter === 'number') {
        res.setHeader('Retry-After', String(retryAfter))
      }
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      })
      return
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: '提交的内容过大' },
      })
      return
    }

    if (
      error instanceof SyntaxError &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 400
    ) {
      res.status(400).json({
        error: { code: 'INVALID_JSON', message: '请求体不是合法的 JSON' },
      })
      return
    }

    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: '资源不存在' },
      })
      return
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: '图片不能超过 2MB' },
      })
      return
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'MulterError'
    ) {
      res.status(400).json({
        error: { code: 'UPLOAD_ERROR', message: '上传请求不合法' },
      })
      return
    }

    console.error('[server] unhandled error:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器开小差了' } })
  }
  app.use(errorHandler)

  return app
}
