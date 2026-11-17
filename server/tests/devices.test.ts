import type { Express } from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase, type Db } from '../src/db'
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  createTestContext,
  issueCaptchaToken,
  issueSensitiveCaptchaToken,
  seedAdmin,
  type TestContext,
} from './helpers'

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

let context: TestContext | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
})

async function loginWithAgent(app: Express, db: Db, userAgent: string) {
  const agent = request.agent(app)
  const session = await agent.get('/api/auth/session')
  const login = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', session.body.csrfToken as string)
    .set('User-Agent', userAgent)
    .send({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      captchaToken: issueCaptchaToken(db),
    })
  expect(login.status).toBe(200)
  return { agent, csrfToken: login.body.csrfToken as string }
}

async function listDevices(agent: ReturnType<typeof request.agent>) {
  const response = await agent.get('/api/admin/security/devices')
  expect(response.status).toBe(200)
  return response.body.items as Array<{
    id: string
    current: boolean
    browser: string
    os: string
    deviceType: string
    label: string
    ip: string
  }>
}

describe('login device management', () => {
  it('lists sessions with parsed browser info and marks the current device', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)

    const desktop = await loginWithAgent(testContext.app, testContext.db, DESKTOP_UA)
    await loginWithAgent(testContext.app, testContext.db, IPHONE_UA)

    const devices = await listDevices(desktop.agent)
    expect(devices).toHaveLength(2)
    expect(devices.filter((device) => device.current)).toHaveLength(1)

    const desktopDevice = devices.find((device) => device.browser === 'Chrome 131')
    expect(desktopDevice).toMatchObject({
      os: 'Windows 10/11',
      deviceType: '桌面设备',
      ip: '127.0.0.1',
    })

    const phone = devices.find((device) => device.browser === 'Safari 17')
    expect(phone).toMatchObject({
      os: 'iOS 17',
      deviceType: '手机',
    })
  })

  it('revokes another device with a user-bound captcha token', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)

    const desktop = await loginWithAgent(testContext.app, testContext.db, DESKTOP_UA)
    const phone = await loginWithAgent(testContext.app, testContext.db, IPHONE_UA)
    const devices = await listDevices(desktop.agent)
    const phoneDevice = devices.find((device) => !device.current)
    if (!phoneDevice) throw new Error('phone device missing')

    const missing = await desktop.agent
      .delete(`/api/admin/security/devices/${phoneDevice.id}`)
      .set('X-CSRF-Token', desktop.csrfToken)
    expect(missing.status).toBe(403)
    expect(missing.body.error.code).toBe('CAPTCHA_REQUIRED')

    const wrongUserToken = issueCaptchaToken(testContext.db, 60_000, 999_999)
    const wrongUser = await desktop.agent
      .delete(`/api/admin/security/devices/${phoneDevice.id}`)
      .set('X-CSRF-Token', desktop.csrfToken)
      .set('X-Captcha-Token', wrongUserToken)
    expect(wrongUser.status).toBe(403)
    expect(wrongUser.body.error.code).toBe('CAPTCHA_INVALID')

    const revoked = await desktop.agent
      .delete(`/api/admin/security/devices/${phoneDevice.id}`)
      .set('X-CSRF-Token', desktop.csrfToken)
      .set('X-Captcha-Token', issueSensitiveCaptchaToken(testContext.db))
    expect(revoked.status).toBe(200)

    const phoneSession = await phone.agent.get('/api/auth/session')
    expect(phoneSession.body.authenticated).toBe(false)

    const desktopSession = await desktop.agent.get('/api/auth/session')
    expect(desktopSession.body.authenticated).toBe(true)
  })

  it('refuses to revoke the current device', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)

    const desktop = await loginWithAgent(testContext.app, testContext.db, DESKTOP_UA)
    const [device] = await listDevices(desktop.agent)
    expect(device.current).toBe(true)

    const response = await desktop.agent
      .delete(`/api/admin/security/devices/${device.id}`)
      .set('X-CSRF-Token', desktop.csrfToken)
      .set('X-Captcha-Token', issueSensitiveCaptchaToken(testContext.db))

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('CANNOT_REVOKE_CURRENT')
    const session = await desktop.agent.get('/api/auth/session')
    expect(session.body.authenticated).toBe(true)
  })

  it('revokes every device and clears the current cookie', async () => {
    const testContext = createTestContext()
    context = testContext
    await seedAdmin(testContext.db)

    const desktop = await loginWithAgent(testContext.app, testContext.db, DESKTOP_UA)
    await loginWithAgent(testContext.app, testContext.db, IPHONE_UA)

    const response = await desktop.agent
      .delete('/api/admin/security/devices')
      .set('X-CSRF-Token', desktop.csrfToken)
      .set('X-Captcha-Token', issueSensitiveCaptchaToken(testContext.db))

    expect(response.status).toBe(200)
    expect(response.body.count).toBe(2)

    const session = await desktop.agent.get('/api/auth/session')
    expect(session.body.authenticated).toBe(false)
  })
})
