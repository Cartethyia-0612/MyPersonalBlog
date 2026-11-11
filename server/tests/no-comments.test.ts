import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase } from '../src/db'
import { createTestContext, loginAsAdmin, seedAdmin, type TestContext } from './helpers'

let context: TestContext | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
})

async function setupAdminAgent() {
  const testContext = createTestContext()
  context = testContext
  await seedAdmin(testContext.db)
  const agent = request.agent(testContext.app)
  const session = await agent.get('/api/auth/session')
  const csrf = await loginAsAdmin(agent, session.body.csrfToken as string)
  return { testContext, agent, csrf }
}

describe('no comments surface', () => {
  it('has no comment tables in the database schema', () => {
    const testContext = createTestContext()
    context = testContext
    const tables = testContext.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND lower(name) LIKE '%comment%'",
      )
      .all()
    expect(tables).toHaveLength(0)
  })

  it('returns 404 for every plausible comment endpoint, authenticated or not', async () => {
    const { testContext, agent, csrf } = await setupAdminAgent()

    const publicPaths = ['/api/comments', '/api/articles/demo/comments', '/api/admin/comments']

    for (const path of publicPaths) {
      const response = await agent.get(path)
      expect(response.status, path).toBe(404)
      expect(response.body.error?.code, path).toBe('NOT_FOUND')
    }

    for (const path of ['/api/comments', '/api/articles/demo/comments', '/api/admin/comments']) {
      const response = await agent
        .post(path)
        .set('X-CSRF-Token', csrf)
        .send({ content: 'should not exist' })
      expect(response.status, path).toBe(404)
      expect(response.body.error?.code, path).toBe('NOT_FOUND')
    }

    const unauth = await request(testContext.app).get('/api/comments')
    expect(unauth.status).toBe(404)
  })
})
