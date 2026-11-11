import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase } from '../src/db'
import { createTestContext, type TestContext } from './helpers'

let context: TestContext | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
})

describe('health API', () => {
  it('returns a healthy payload', async () => {
    context = createTestContext()
    const response = await request(context.app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.service).toBe('eshi-tech-notes')
  })

  it('returns JSON for unknown API routes', async () => {
    context = createTestContext()
    const response = await request(context.app).get('/api/nope')
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('allows HTTPS external images and media in the CSP', async () => {
    context = createTestContext()
    const response = await request(context.app).get('/api/health')
    const csp = response.headers['content-security-policy'] ?? ''
    expect(csp).toContain("img-src 'self' data: https:")
    expect(csp).toContain("media-src 'self' https:")
    expect(csp).toContain("default-src 'self'")
  })

  it('requires authentication for admin routes', async () => {
    context = createTestContext()
    const response = await request(context.app).get('/api/admin/security')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })
})
