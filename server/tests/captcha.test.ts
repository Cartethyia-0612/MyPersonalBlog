import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase, type Db } from '../src/db'
import {
  consumeLoginToken,
  consumeNonce,
  storeLoginToken,
  tokenKeyFromToken,
} from '../src/services/captcha'
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  createAgentContext,
  createTestContext,
  issueCaptchaToken,
  seedAdmin,
  type TestContext,
} from './helpers'

let db: Db | undefined
let context: TestContext | undefined

afterEach(() => {
  if (db) closeDatabase(db)
  if (context) closeDatabase(context.db)
  db = undefined
  context = undefined
})

describe('used token replay protection', () => {
  it('consumes a challenge nonce exactly once', () => {
    db = openDatabase(':memory:')
    expect(consumeNonce(db, 'signature-one', 60_000)).toBe(true)
    expect(consumeNonce(db, 'signature-one', 60_000)).toBe(false)
    expect(consumeNonce(db, 'signature-two', 60_000)).toBe(true)
  })

  it('consumes a login token exactly once', () => {
    db = openDatabase(':memory:')
    const token = issueCaptchaToken(db)
    const key = tokenKeyFromToken(token)
    if (!key) throw new Error('token key missing')

    expect(consumeLoginToken(db, key)).toBe('ok')
    expect(consumeLoginToken(db, key)).toBe('used')
    expect(consumeLoginToken(db, 'missing-key')).toBe('missing')
  })

  it('rejects an expired login token', () => {
    db = openDatabase(':memory:')
    const token = issueCaptchaToken(db)
    const key = tokenKeyFromToken(token)
    if (!key) throw new Error('token key missing')

    db.prepare(
      "UPDATE used_tokens SET expires_at = ? WHERE purpose = 'login_token' AND token_hash = ?",
    ).run(Date.now() - 1, key)

    expect(consumeLoginToken(db, key)).toBe('expired')
    expect(consumeLoginToken(db, key)).toBe('missing')
  })

  it('refuses to store a token that is already expired', () => {
    db = openDatabase(':memory:')
    expect(storeLoginToken(db, 'already-expired', Date.now() - 1)).toBe(false)
  })
})

describe('captcha login flow', () => {
  it('issues a HashWX challenge', async () => {
    const agentContext = await createAgentContext()
    context = agentContext.context

    const response = await agentContext.agent
      .post('/api/auth/captcha/challenge')
      .set('X-CSRF-Token', agentContext.csrfToken)
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.format).toBe(2)
    expect(Array.isArray(response.body.challenges)).toBe(true)
    expect(response.body.challenges.length).toBeGreaterThan(0)
    expect(typeof response.body.token).toBe('string')
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('returns a widget-compatible failure for an invalid redeem', async () => {
    const agentContext = await createAgentContext()
    context = agentContext.context

    const response = await agentContext.agent
      .post('/api/auth/captcha/redeem')
      .set('X-CSRF-Token', agentContext.csrfToken)
      .send({ token: 'x'.repeat(64), solutions: [1] })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(typeof response.body.reason).toBe('string')
  })

  it('requires a captcha token on password login', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)
    const agent = request.agent(testContext.app)
    const session = await agent.get('/api/auth/session')

    const missing = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.body.csrfToken as string)
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    expect(missing.status).toBe(400)
    expect(missing.body.error.code).toBe('CAPTCHA_REQUIRED')

    const invalid = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.body.csrfToken as string)
      .send({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        captchaToken: 'fake-id:fake-secret-that-is-long-enough',
      })
    expect(invalid.status).toBe(403)
    expect(invalid.body.error.code).toBe('CAPTCHA_INVALID')
  })

  it('allows one login per token and rejects the replay', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)
    const token = issueCaptchaToken(testContext.db)

    const firstAgent = request.agent(testContext.app)
    const firstSession = await firstAgent.get('/api/auth/session')
    const first = await firstAgent
      .post('/api/auth/login')
      .set('X-CSRF-Token', firstSession.body.csrfToken as string)
      .send({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        captchaToken: token,
      })
    expect(first.status).toBe(200)

    const replayAgent = request.agent(testContext.app)
    const replaySession = await replayAgent.get('/api/auth/session')
    const replay = await replayAgent
      .post('/api/auth/login')
      .set('X-CSRF-Token', replaySession.body.csrfToken as string)
      .send({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        captchaToken: token,
      })
    expect(replay.status).toBe(403)
    expect(replay.body.error.code).toBe('CAPTCHA_INVALID')
  })

  it('consumes the token even when the password is wrong', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)
    const token = issueCaptchaToken(testContext.db)
    const agent = request.agent(testContext.app)
    const session = await agent.get('/api/auth/session')
    const csrf = session.body.csrfToken as string

    const wrong = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({
      username: ADMIN_USERNAME,
      password: 'wrong-password',
      captchaToken: token,
    })
    expect(wrong.status).toBe(401)

    const retry = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      captchaToken: token,
    })
    expect(retry.status).toBe(403)
    expect(retry.body.error.code).toBe('CAPTCHA_INVALID')
  })
})
