import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app'
import type { AppConfig } from '../src/config'

const testConfig: AppConfig = {
  nodeEnv: 'test',
  isProduction: false,
  port: 3000,
  siteUrl: 'http://localhost:5173',
  appSecret: 'test-secret-that-is-long-enough-for-tests',
  cookieSecure: false,
  trustProxy: false,
  projectRoot: process.cwd(),
  clientDistDir: '/tmp/does-not-exist',
  dataDir: '/tmp',
  dbPath: '/tmp/test.db',
  uploadDir: '/tmp/uploads',
  allowedOrigins: new Set(['http://localhost:5173']),
  sessionTtlDays: 7,
}

describe('health API', () => {
  it('returns a healthy payload', async () => {
    const app = createApp({ config: testConfig })
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.service).toBe('eshi-tech-notes')
  })

  it('returns JSON for unknown API routes', async () => {
    const app = createApp({ config: testConfig })
    const response = await request(app).get('/api/nope')
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})
