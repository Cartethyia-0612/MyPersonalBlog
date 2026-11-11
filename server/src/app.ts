import fs from 'node:fs'
import path from 'node:path'

import express, { type ErrorRequestHandler, type Express } from 'express'
import helmet from 'helmet'

import type { AppConfig } from './config'

export interface AppDependencies {
  config: AppConfig
}

export function createApp({ config }: AppDependencies): Express {
  const app = express()

  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', 1)

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '128kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'eshi-tech-notes',
      time: new Date().toISOString(),
    })
  })

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } })
  })

  // Serve uploaded assets and the built SPA once they exist. The API is
  // registered above so a missing API route can never fall through to HTML.
  if (fs.existsSync(path.join(config.clientDistDir, 'index.html'))) {
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
    console.error('[server] unhandled error:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器开小差了' } })
  }
  app.use(errorHandler)

  return app
}
