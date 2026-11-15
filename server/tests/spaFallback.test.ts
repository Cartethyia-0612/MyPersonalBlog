import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { createApp } from '../src/app'
import { closeDatabase } from '../src/db'
import { clearIndexCache } from '../src/services/spaMeta'
import { createTestContext, type TestContext } from './helpers'

let context: TestContext | undefined
let tempDir: string | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
  clearIndexCache()
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

function setup() {
  context = createTestContext()
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eshi-spa-fallback-'))
  fs.writeFileSync(
    path.join(tempDir, 'index.html'),
    '<!doctype html><html><head><title>默认标题</title></head><body><div id="app"></div></body></html>',
  )
  context.config.clientDistDir = tempDir
  clearIndexCache()
  return createApp({ config: context.config, db: context.db })
}

describe('SPA fallback', () => {
  it('keeps unknown API requests as JSON 404', async () => {
    const app = setup()

    const response = await request(app).get('/api/does-not-exist')
    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('serves the SPA index for unknown paths, including dotted junk', async () => {
    const app = setup()

    for (const pathname of ['/missing-page', '/random.asset.js', '/articles/not-a-real-post']) {
      const response = await request(app).get(pathname)
      expect(response.status, pathname).toBe(200)
      expect(response.headers['content-type'], pathname).toContain('text/html')
      expect(response.text, pathname).toContain('<div id="app"></div>')
    }
  })

  it('keeps SEO meta injection for known pages', async () => {
    const app = setup()

    const home = await request(app).get('/')
    expect(home.status).toBe(200)
    expect(home.text).toContain('<title>饿师傅的技术札记</title>')

    const admin = await request(app).get('/admin/seo')
    expect(admin.status).toBe(200)
    expect(admin.text).toContain('noindex, nofollow')
  })
})
