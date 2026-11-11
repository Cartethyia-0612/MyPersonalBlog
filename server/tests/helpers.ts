import os from 'node:os'
import path from 'node:path'

import type { Express } from 'express'
import request from 'supertest'

import { createApp } from '../src/app'
import type { AppConfig } from '../src/config'
import { openDatabase, type Db } from '../src/db'
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
    siteUrl: 'http://localhost:5173',
    appSecret: 'test-app-secret-that-is-definitely-long-enough',
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
