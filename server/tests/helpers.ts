import { randomBytes } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'

import type { Express } from 'express'
import request from 'supertest'

import { createApp } from '../src/app'
import type { AppConfig } from '../src/config'
import { openDatabase, type Db } from '../src/db'
import { storeLoginToken, tokenKeyFromToken } from '../src/services/captcha'
import { createUser } from '../src/services/users'

export interface TestContext {
  app: Express
  db: Db
  config: AppConfig
}

export function createTestContext(): TestContext {
  const db = openDatabase(':memory:')
  const config: AppConfig = {
    nodeEnv: 'test',
    isProduction: false,
    port: 3000,
    host: '127.0.0.1',
    siteUrl: 'http://localhost:5173',
    appSecret: 'test-app-secret-that-is-definitely-long-enough',
    capSecret: 'test-cap-secret-that-is-long-enough',
    cookieSecure: false,
    trustProxy: false,
    projectRoot: process.cwd(),
    clientDistDir: path.join(os.tmpdir(), 'eshi-test-no-client-dist'),
    dataDir: os.tmpdir(),
    dbPath: ':memory:',
    uploadDir: path.join(os.tmpdir(), 'eshi-test-uploads'),
    allowedOrigins: new Set(['http://localhost:5173', 'http://127.0.0.1:5173']),
    sessionTtlDays: 7,
  }

  return {
    app: createApp({ config, db }),
    db,
    config,
  }
}

export const ADMIN_USERNAME = 'admin'
export const ADMIN_PASSWORD = 'correct-horse-battery-staple'

export async function seedAdmin(
  db: Db,
  username = ADMIN_USERNAME,
  password = ADMIN_PASSWORD,
): Promise<void> {
  await createUser(db, username, password)
}

export async function createAgentContext(): Promise<{
  agent: ReturnType<typeof request.agent>
  csrfToken: string
  context: TestContext
}> {
  const context = createTestContext()
  const agent = request.agent(context.app)
  const sessionResponse = await agent.get('/api/auth/session').expect(200)
  return {
    agent,
    csrfToken: sessionResponse.body.csrfToken as string,
    context,
  }
}

export async function loginAsAdmin(
  agent: ReturnType<typeof request.agent>,
  csrfToken: string,
  db: Db,
): Promise<string> {
  const response = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrfToken)
    .send({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      captchaToken: issueCaptchaToken(db),
    })
  if (response.status !== 200) {
    throw new Error(`Admin login failed: ${response.status} ${JSON.stringify(response.body)}`)
  }
  return response.body.csrfToken as string
}

/**
 * Insert a redeem-equivalent login token directly into used_tokens. Tests that
 * are not about Cap's proof-of-work can then exercise the single-use path.
 */
export function issueCaptchaToken(db: Db, ttlMs = 10 * 60 * 1000): string {
  const id = randomBytes(8).toString('hex')
  const secret = randomBytes(32).toString('base64url')
  const token = `${id}:${secret}`
  const key = tokenKeyFromToken(token)
  if (!key) throw new Error('Failed to derive a test CAPTCHA token key')
  if (!storeLoginToken(db, key, Date.now() + ttlMs)) {
    throw new Error('Failed to store a test CAPTCHA token')
  }
  return token
}
