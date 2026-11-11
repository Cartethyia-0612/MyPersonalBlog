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

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } })
  })

  // Serve uploads and the built SPA when present. API routes are registered
  // above so a missing API path can never fall back to HTML.
  if (fs.existsSync(path.join(config.clientDistDir, 'index.html'))) {
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

    console.error('[server] unhandled error:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器开小差了' } })
  }
  app.use(errorHandler)

  return app
}
