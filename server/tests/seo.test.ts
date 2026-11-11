import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { closeDatabase } from '../src/db'
import { isPublicSiteUrl } from '../src/services/seo'
import { createTestContext, loginAsAdmin, seedAdmin, type TestContext } from './helpers'

let context: TestContext | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
  vi.unstubAllGlobals()
})

async function setupAdmin() {
  const testContext = createTestContext()
  context = testContext
  await seedAdmin(testContext.db)
  const agent = request.agent(testContext.app)
  const session = await agent.get('/api/auth/session')
  const csrf = await loginAsAdmin(agent, session.body.csrfToken as string)
  return { testContext, agent, csrf }
}

async function setPublicSiteUrl(
  agent: ReturnType<typeof request.agent>,
  csrf: string,
): Promise<void> {
  const response = await agent
    .put('/api/admin/settings')
    .set('X-CSRF-Token', csrf)
    .send({ site: { siteUrl: 'https://blog.example.com' } })
  expect(response.status).toBe(200)
}

async function setIndexNowKey(
  agent: ReturnType<typeof request.agent>,
  csrf: string,
  key = 'test-indexnow-key-2026',
): Promise<void> {
  const response = await agent
    .put('/api/admin/seo')
    .set('X-CSRF-Token', csrf)
    .send({ indexNowKey: key })
  expect(response.status).toBe(200)
}

async function publishArticle(
  agent: ReturnType<typeof request.agent>,
  csrf: string,
  title: string,
  slug: string,
): Promise<void> {
  const response = await agent
    .post('/api/admin/articles')
    .set('X-CSRF-Token', csrf)
    .send({
      title,
      slug,
      contentMd: '# 内容',
      summary: '摘要',
      tags: ['SEO'],
      status: 'published',
    })
  expect(response.status).toBe(201)
}

describe('SEO public endpoints', () => {
  it('generates a sitemap containing static pages and published articles only', async () => {
    const { testContext, agent, csrf } = await setupAdmin()
    await setPublicSiteUrl(agent, csrf)
    await publishArticle(agent, csrf, '已发布文章', 'published-entry')

    const draft = await agent
      .post('/api/admin/articles')
      .set('X-CSRF-Token', csrf)
      .send({ title: '草稿文章', slug: 'draft-entry', contentMd: 'draft', status: 'draft' })
    expect(draft.status).toBe(201)

    const response = await request(testContext.app).get('/sitemap.xml')
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/xml')
    expect(response.text).toContain('<urlset')
    expect(response.text).toContain('https://blog.example.com/')
    expect(response.text).toContain('https://blog.example.com/articles')
    expect(response.text).toContain('https://blog.example.com/friends')
    expect(response.text).toContain('https://blog.example.com/about')
    expect(response.text).toContain('https://blog.example.com/articles/published-entry')
    expect(response.text).not.toContain('draft-entry')
    expect(response.text).toContain('<lastmod>')
  })

  it('serves robots.txt with admin/api disallow and sitemap reference', async () => {
    const { testContext, agent, csrf } = await setupAdmin()
    await setPublicSiteUrl(agent, csrf)

    const response = await request(testContext.app).get('/robots.txt')
    expect(response.status).toBe(200)
    expect(response.text).toContain('Disallow: /admin')
    expect(response.text).toContain('Disallow: /api')
    expect(response.text).toContain('Sitemap: https://blog.example.com/sitemap.xml')
  })

  it('serves the IndexNow key file only when the configured key matches', async () => {
    const { testContext, agent, csrf } = await setupAdmin()
    await setPublicSiteUrl(agent, csrf)
    await setIndexNowKey(agent, csrf, 'test-indexnow-key-2026')

    const ok = await request(testContext.app).get('/test-indexnow-key-2026.txt')
    expect(ok.status).toBe(200)
    expect(ok.text).toBe('test-indexnow-key-2026')

    const wrong = await request(testContext.app).get('/another-key-123456.txt')
    expect(wrong.status).toBe(404)
  })

  it('exposes sitemap status and masks configured keys in the admin overview', async () => {
    const { agent, csrf } = await setupAdmin()
    await setPublicSiteUrl(agent, csrf)
    await setIndexNowKey(agent, csrf, 'test-indexnow-key-2026')

    const overview = await agent.get('/api/admin/seo')
    expect(overview.status).toBe(200)
    expect(overview.body.siteUrl).toBe('https://blog.example.com')
    expect(overview.body.canPush).toBe(true)
    expect(overview.body.urlCount).toBeGreaterThanOrEqual(4)
    expect(overview.body.indexNow.configured).toBe(true)
    expect(overview.body.indexNow.keyPreview).toContain('••••')
    expect(overview.body.indexNow.keyPreview).toContain('2026')
    expect(overview.body.indexNow.keyLocation).toBe(
      'https://blog.example.com/test-indexnow-key-2026.txt',
    )
    expect(overview.body.indexNow.keyPreview).not.toBe('test-indexnow-key-2026')
  })
})

describe('SEO public URL guard', () => {
  it('accepts public domains and IPs but rejects local, private and reserved addresses', () => {
    expect(isPublicSiteUrl('https://blog.example.com')).toBe(true)
    expect(isPublicSiteUrl('https://1.1.1.1')).toBe(true)
    expect(isPublicSiteUrl('https://[2606:4700:4700::1111]')).toBe(true)

    for (const url of [
      'http://localhost:3000',
      'http://foo.local',
      'http://127.0.0.1:3000',
      'http://0.0.0.0:3000',
      'http://10.0.0.1',
      'http://172.16.0.1',
      'http://192.168.1.1',
      'http://169.254.169.254',
      'http://100.64.0.1',
      'http://[::1]:3000',
      'http://[fd00::1]',
      'http://[fe80::1]',
      'http://[::ffff:192.168.1.1]',
      'ftp://blog.example.com',
      'not-a-url',
    ]) {
      expect(isPublicSiteUrl(url), url).toBe(false)
    }
  })
})

describe('SEO push', () => {
  it('rejects pushes without keys or with a local site URL', async () => {
    const { agent, csrf } = await setupAdmin()
    await setPublicSiteUrl(agent, csrf)

    const missing = await agent.post('/api/admin/seo/indexnow').set('X-CSRF-Token', csrf).send({})
    expect(missing.status).toBe(400)
    expect(missing.body.error.code).toBe('SEO_KEY_MISSING')

    await agent
      .put('/api/admin/settings')
      .set('X-CSRF-Token', csrf)
      .send({ site: { siteUrl: 'http://localhost:5173' } })
    await setIndexNowKey(agent, csrf)
    const local = await agent.post('/api/admin/seo/indexnow').set('X-CSRF-Token', csrf).send({})
    expect(local.status).toBe(400)
    expect(local.body.error.code).toBe('SEO_LOCAL_URL')
  })

  it('pushes URLs to IndexNow and records the result', async () => {
    const { agent, csrf } = await setupAdmin()
    await setPublicSiteUrl(agent, csrf)
    await setIndexNowKey(agent, csrf, 'push-key-12345678')
    await publishArticle(agent, csrf, '待推送文章', 'push-entry')

    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await agent.post('/api/admin/seo/indexnow').set('X-CSRF-Token', csrf).send({})
    expect(response.status).toBe(200)
    expect(response.body.log.provider).toBe('indexnow')
    expect(response.body.log.success).toBe(true)
    expect(response.body.log.urlCount).toBeGreaterThanOrEqual(5)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.indexnow.org/indexnow')
    const body = JSON.parse(String(options.body)) as {
      host: string
      key: string
      keyLocation: string
      urlList: string[]
    }
    expect(body.host).toBe('blog.example.com')
    expect(body.key).toBe('push-key-12345678')
    expect(body.keyLocation).toBe('https://blog.example.com/push-key-12345678.txt')
    expect(body.urlList).toContain('https://blog.example.com/articles/push-entry')

    const overview = await agent.get('/api/admin/seo')
    expect(overview.body.logs[0].provider).toBe('indexnow')
    expect(overview.body.logs[0].success).toBe(true)
  })

  it('pushes URLs to Baidu, parses quota status, and records the result', async () => {
    const { agent, csrf } = await setupAdmin()
    await setPublicSiteUrl(agent, csrf)
    const tokenResponse = await agent
      .put('/api/admin/seo')
      .set('X-CSRF-Token', csrf)
      .send({ baiduToken: 'baidu-test-token-123' })
    expect(tokenResponse.status).toBe(200)

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: 3, remain: 97 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await agent.post('/api/admin/seo/baidu').set('X-CSRF-Token', csrf).send({})
    expect(response.status).toBe(200)
    expect(response.body.log.provider).toBe('baidu')
    expect(response.body.log.success).toBe(true)
    expect(response.body.log.message).toContain('97')
    expect(response.body.overview.baidu.configured).toBe(true)
    expect(response.body.overview.logs[0].statusCode).toBe(200)

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('data.zz.baidu.com/urls')
    expect(url).toContain('token=baidu-test-token-123')
    expect(url).toContain('site=https%3A%2F%2Fblog.example.com')
  })

  it('validates key formats and supports clear flags', async () => {
    const { agent, csrf } = await setupAdmin()

    const invalid = await agent
      .put('/api/admin/seo')
      .set('X-CSRF-Token', csrf)
      .send({ indexNowKey: 'bad key!' })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('INVALID_INDEXNOW_KEY')

    await setIndexNowKey(agent, csrf)
    const cleared = await agent
      .put('/api/admin/seo')
      .set('X-CSRF-Token', csrf)
      .send({ clearIndexNowKey: true })
    expect(cleared.status).toBe(200)
    expect(cleared.body.indexNow.configured).toBe(false)
  })
})
