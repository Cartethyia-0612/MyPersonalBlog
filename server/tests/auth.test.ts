import { authenticator } from 'otplib'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase } from '../src/db'
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  createAgentContext,
  createTestContext,
  seedAdmin,
  type TestContext,
} from './helpers'

let context: TestContext | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
})

describe('admin authentication', () => {
  it('rejects state-changing requests without a CSRF token', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)

    const response = await request(testContext.app)
      .post('/api/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('CSRF_INVALID')
  })

  it('logs in with a CSRF token, sets safe cookies, and logs out', async () => {
    const { agent, csrfToken, context: testContext } = await createAgentContext()
    context = testContext
    await seedAdmin(testContext.db)

    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', 'http://localhost:5173')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })

    expect(login.status).toBe(200)
    expect(login.body.requiresTotp).toBe(false)
    expect(login.body.user.username).toBe(ADMIN_USERNAME)
    expect(typeof login.body.csrfToken).toBe('string')

    const setCookieHeader = login.headers['set-cookie']
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : []
    expect(cookies.some((cookie) => cookie.includes('eshi_session='))).toBe(true)
    expect(cookies.some((cookie) => cookie.toLowerCase().includes('httponly'))).toBe(true)
    expect(cookies.some((cookie) => cookie.includes('SameSite=Strict'))).toBe(true)

    const session = await agent.get('/api/auth/session').expect(200)
    expect(session.body.authenticated).toBe(true)
    expect(session.body.user.username).toBe(ADMIN_USERNAME)

    const logout = await agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', login.body.csrfToken as string)
      .set('Origin', 'http://localhost:5173')
    expect(logout.status).toBe(200)

    const afterLogout = await agent.get('/api/auth/session')
    expect(afterLogout.body.authenticated).toBe(false)
  })

  it('rate limits repeated failed password attempts', async () => {
    const { agent, csrfToken, context: testContext } = await createAgentContext()
    context = testContext
    await seedAdmin(testContext.db)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({ username: ADMIN_USERNAME, password: 'wrong-password' })
      expect(response.status).toBe(401)
    }

    const blocked = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })

    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('rejects tokens when the Origin is not allowed', async () => {
    const { agent, csrfToken, context: testContext } = await createAgentContext()
    context = testContext
    await seedAdmin(testContext.db)

    const response = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', 'https://evil.example')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('CSRF_ORIGIN_REJECTED')
  })

  it('supports TOTP setup, enablement, and two-step login', async () => {
    const { agent, csrfToken, context: testContext } = await createAgentContext()
    context = testContext
    await seedAdmin(testContext.db)

    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    expect(login.status).toBe(200)
    const authedCsrf = login.body.csrfToken as string

    const setup = await agent
      .post('/api/admin/security/totp/setup')
      .set('X-CSRF-Token', authedCsrf)
      .send({})
    expect(setup.status).toBe(200)
    expect(setup.body.secret).toMatch(/^[A-Z2-7]+=*$/)
    expect(setup.body.otpauthUrl).toContain('otpauth://totp/')
    expect(setup.body.qrDataUrl).toMatch(/^data:image\/png;base64,/)

    const secret = setup.body.secret as string
    const code = authenticator.generate(secret)
    const enable = await agent
      .post('/api/admin/security/totp/enable')
      .set('X-CSRF-Token', authedCsrf)
      .send({ code })
    expect(enable.status).toBe(200)
    expect(enable.body.totpEnabled).toBe(true)

    const security = await agent.get('/api/admin/security')
    expect(security.status).toBe(200)
    expect(security.body.totpEnabled).toBe(true)

    const logout = await agent.post('/api/auth/logout').set('X-CSRF-Token', authedCsrf)
    expect(logout.status).toBe(200)

    const freshSession = await agent.get('/api/auth/session')
    const anonCsrf = freshSession.body.csrfToken as string

    const passwordStep = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', anonCsrf)
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    expect(passwordStep.status).toBe(200)
    expect(passwordStep.body.requiresTotp).toBe(true)
    expect(typeof passwordStep.body.challengeToken).toBe('string')

    const totpLogin = await agent
      .post('/api/auth/login/totp')
      .set('X-CSRF-Token', anonCsrf)
      .send({
        challengeToken: passwordStep.body.challengeToken,
        code: authenticator.generate(secret),
      })
    expect(totpLogin.status).toBe(200)
    expect(totpLogin.body.requiresTotp).toBe(false)
    expect(totpLogin.body.user.totpEnabled).toBe(true)

    const session = await agent.get('/api/auth/session')
    expect(session.body.authenticated).toBe(true)
  })

  it('rejects TOTP login with an invalid code', async () => {
    const { agent, csrfToken, context: testContext } = await createAgentContext()
    context = testContext
    await seedAdmin(testContext.db)

    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    const authedCsrf = login.body.csrfToken as string

    const setup = await agent
      .post('/api/admin/security/totp/setup')
      .set('X-CSRF-Token', authedCsrf)
      .send({})
    const secret = setup.body.secret as string
    await agent
      .post('/api/admin/security/totp/enable')
      .set('X-CSRF-Token', authedCsrf)
      .send({ code: authenticator.generate(secret) })

    await agent.post('/api/auth/logout').set('X-CSRF-Token', authedCsrf)
    const freshSession = await agent.get('/api/auth/session')
    const anonCsrf = freshSession.body.csrfToken as string

    const passwordStep = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', anonCsrf)
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })

    const bad = await agent
      .post('/api/auth/login/totp')
      .set('X-CSRF-Token', anonCsrf)
      .send({ challengeToken: passwordStep.body.challengeToken, code: '000000' })

    // 000000 is astronomically unlikely to be valid, but either way the
    // response must never create an authenticated session.
    expect([400, 401]).toContain(bad.status)
    const session = await agent.get('/api/auth/session')
    expect(session.body.authenticated).toBe(false)
  })
})
