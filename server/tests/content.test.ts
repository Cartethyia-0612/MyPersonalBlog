import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase } from '../src/db'
import {
  ADMIN_USERNAME,
  createTestContext,
  loginAsAdmin,
  seedAdmin,
  type TestContext,
} from './helpers'

let context: TestContext | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
})

async function setupAdmin() {
  const testContext = createTestContext()
  context = testContext
  await seedAdmin(testContext.db)
  const agent = request.agent(testContext.app)
  const session = await agent.get('/api/auth/session')
  const csrfToken = await loginAsAdmin(agent, session.body.csrfToken as string)
  return { testContext, agent, csrfToken }
}

describe('public content APIs', () => {
  it('serves default site, empty article list, friends and about', async () => {
    const testContext = createTestContext()
    context = testContext

    const site = await request(testContext.app).get('/api/site').expect(200)
    expect(site.body.site.name).toBe('饿师傅的技术札记')
    expect(site.body.footer).toHaveProperty('icp')
    expect(site.body.footer).toHaveProperty('policeIcp')
    expect(site.body.footer).toHaveProperty('virtualRecord')
    expect(site.body.footer).toHaveProperty('customText')

    const articles = await request(testContext.app).get('/api/articles').expect(200)
    expect(articles.body.items).toEqual([])
    expect(articles.body.pagination.total).toBe(0)

    const friends = await request(testContext.app).get('/api/friends').expect(200)
    expect(friends.body.items).toEqual([])

    const about = await request(testContext.app).get('/api/about').expect(200)
    expect(about.body.contentMd).toContain('饿师傅')
  })

  it('publishes, updates, unpublishes and deletes an article', async () => {
    const { agent, csrfToken } = await setupAdmin()

    const created = await agent
      .post('/api/admin/articles')
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: '用 Vue 3 构建一个安静的博客',
        summary: '',
        contentMd: '# 正文\n\n这是一次测试。',
        coverUrl: '',
        tags: ['Vue', '工程'],
        status: 'published',
      })

    expect(created.status).toBe(201)
    expect(created.body.article.slug).toMatch(/^[a-z0-9-]+$/)
    expect(created.body.article.status).toBe('published')
    expect(created.body.article.summary).toContain('正文')
    const slug = created.body.article.slug as string
    const id = created.body.article.id as number

    const list = await agent.get('/api/articles')
    expect(list.body.pagination.total).toBe(1)
    expect(list.body.items[0].slug).toBe(slug)

    const tagged = await agent.get('/api/articles?tag=Vue')
    expect(tagged.body.items).toHaveLength(1)

    const detail = await agent.get(`/api/articles/${slug}`)
    expect(detail.status).toBe(200)
    expect(detail.body.article.contentMd).toContain('这是一次测试')

    const draft = await agent.post('/api/admin/articles').set('X-CSRF-Token', csrfToken).send({
      title: 'Draft note',
      slug: 'draft-note',
      contentMd: '暂不发布',
      status: 'draft',
    })
    expect(draft.status).toBe(201)
    expect(draft.body.article.publishedAt).toBeNull()

    const publicAfterDraft = await agent.get('/api/articles')
    expect(publicAfterDraft.body.pagination.total).toBe(1)
    const hiddenDraft = await agent.get('/api/articles/draft-note')
    expect(hiddenDraft.status).toBe(404)

    const updated = await agent
      .put(`/api/admin/articles/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Vue 3 博客：更新版',
        contentMd: '# 更新\n\n新的正文。',
        summary: '更新后的摘要',
        tags: ['Vue'],
        status: 'draft',
      })
    expect(updated.status).toBe(200)
    expect(updated.body.article.title).toBe('Vue 3 博客：更新版')
    expect(updated.body.article.publishedAt).toBeNull()

    const hidden = await agent.get(`/api/articles/${slug}`)
    expect(hidden.status).toBe(404)

    const adminDetail = await agent.get(`/api/admin/articles/${id}`)
    expect(adminDetail.status).toBe(200)
    expect(adminDetail.body.article.contentMd).toContain('新的正文')

    const removed = await agent.delete(`/api/admin/articles/${id}`).set('X-CSRF-Token', csrfToken)
    expect(removed.status).toBe(200)
    const gone = await agent.get(`/api/admin/articles/${id}`)
    expect(gone.status).toBe(404)
  })

  it('rejects duplicate slugs and unsafe cover URLs', async () => {
    const { agent, csrfToken } = await setupAdmin()

    const first = await agent
      .post('/api/admin/articles')
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'First', slug: 'same-slug', status: 'draft' })
    expect(first.status).toBe(201)

    const duplicate = await agent
      .post('/api/admin/articles')
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Second', slug: 'same-slug', status: 'draft' })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('SLUG_EXISTS')

    const unsafe = await agent.post('/api/admin/articles').set('X-CSRF-Token', csrfToken).send({
      title: 'Unsafe image',
      coverUrl: 'javascript:alert(1)',
      status: 'draft',
    })
    expect(unsafe.status).toBe(400)
    expect(unsafe.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 for unauthenticated content management APIs', async () => {
    const testContext = createTestContext()
    context = testContext

    const articles = await request(testContext.app).get('/api/admin/articles')
    expect(articles.status).toBe(401)

    const create = await request(testContext.app)
      .post('/api/admin/articles')
      .set('X-CSRF-Token', 'not-a-real-token')
      .send({ title: 'Nope' })
    expect(create.status).toBe(403)
  })
})

describe('friends APIs', () => {
  it('filters hidden friends publicly and supports admin CRUD', async () => {
    const { testContext, agent, csrfToken } = await setupAdmin()

    const visible = await agent.post('/api/admin/friends').set('X-CSRF-Token', csrfToken).send({
      name: '洛天依的调音台',
      url: 'https://example.com',
      avatarUrl: 'https://example.com/avatar.png',
      description: '朋友站点',
      sortOrder: 2,
      visible: true,
    })
    expect(visible.status).toBe(201)

    const hidden = await agent.post('/api/admin/friends').set('X-CSRF-Token', csrfToken).send({
      name: '隐藏站点',
      url: 'https://hidden.example.com',
      visible: false,
    })
    expect(hidden.status).toBe(201)

    const publicFriends = await request(testContext.app).get('/api/friends')
    expect(publicFriends.body.items).toHaveLength(1)
    expect(publicFriends.body.items[0].name).toBe('洛天依的调音台')

    const adminList = await agent.get('/api/admin/friends')
    expect(adminList.body.items).toHaveLength(2)

    const friendId = visible.body.friend.id as number
    const updated = await agent
      .put(`/api/admin/friends/${friendId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: '更新后的友链',
        url: 'https://example.com/new',
        description: '',
        sortOrder: 1,
        visible: true,
      })
    expect(updated.status).toBe(200)
    expect(updated.body.friend.name).toBe('更新后的友链')

    const deleted = await agent
      .delete(`/api/admin/friends/${friendId}`)
      .set('X-CSRF-Token', csrfToken)
    expect(deleted.status).toBe(200)

    const afterDelete = await request(testContext.app).get('/api/friends')
    expect(afterDelete.body.items).toHaveLength(0)
  })

  it('rejects non-http friend URLs', async () => {
    const { agent, csrfToken } = await setupAdmin()
    const response = await agent
      .post('/api/admin/friends')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Bad', url: 'javascript:alert(1)' })
    expect(response.status).toBe(400)
  })
})

describe('settings and about APIs', () => {
  it('updates site, footer, music and about settings', async () => {
    const { testContext, agent, csrfToken } = await setupAdmin()

    const current = await agent.get('/api/admin/settings')
    expect(current.status).toBe(200)
    expect(current.body.site.name).toBe('饿师傅的技术札记')

    const updated = await agent
      .put('/api/admin/settings')
      .set('X-CSRF-Token', csrfToken)
      .send({
        site: {
          name: '饿师傅的新札记',
          siteUrl: 'https://blog.example.com/',
          tagline: '新副标题',
        },
        footer: {
          icp: '苏ICP备00000000号',
          policeIcp: '苏公网安备00000000号',
          virtualRecord: '萌备20260001号',
          customText: '本站无评论区',
        },
        music: {
          apiBase: 'https://meting.example.com/api',
        },
      })
    expect(updated.status).toBe(200)
    expect(updated.body.site.siteUrl).toBe('https://blog.example.com')
    expect(updated.body.music.apiBase).toBe('https://meting.example.com/api/')
    expect(updated.body.footer.icp).toContain('苏ICP')

    const publicSite = await request(testContext.app).get('/api/site')
    expect(publicSite.body.site.name).toBe('饿师傅的新札记')
    expect(publicSite.body.footer.virtualRecord).toBe('萌备20260001号')

    const aboutUpdate = await agent
      .put('/api/admin/about')
      .set('X-CSRF-Token', csrfToken)
      .send({ contentMd: '## 新的关于页\n\n你好。' })
    expect(aboutUpdate.status).toBe(200)

    const about = await request(testContext.app).get('/api/about')
    expect(about.body.contentMd).toContain('新的关于页')
  })

  it('rejects unsafe site URLs and unauthenticated reads', async () => {
    const { testContext, agent, csrfToken } = await setupAdmin()

    const invalid = await agent
      .put('/api/admin/settings')
      .set('X-CSRF-Token', csrfToken)
      .send({ site: { siteUrl: 'javascript:alert(1)' } })
    expect(invalid.status).toBe(400)

    const unauthenticated = await request(testContext.app).get('/api/admin/settings')
    expect(unauthenticated.status).toBe(401)
  })
})

describe('uploads API', () => {
  it('accepts a real image signature and rejects SVG', async () => {
    const { testContext, agent, csrfToken } = await setupAdmin()
    const tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eshi-upload-test-'))
    testContext.config.uploadDir = tempUploadDir

    const pngBytes = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('fake-but-signature-valid-png-data'),
    ])

    const accepted = await agent
      .post('/api/admin/uploads')
      .set('X-CSRF-Token', csrfToken)
      .field('kind', 'icon')
      .attach('file', pngBytes, { filename: 'icon.png', contentType: 'image/png' })

    expect(accepted.status).toBe(201)
    expect(accepted.body.url).toMatch(/^\/uploads\/icon-\d{8}-[a-f0-9]{16}\.png$/)
    expect(fs.existsSync(path.join(tempUploadDir, accepted.body.filename as string))).toBe(true)

    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    )
    const rejected = await agent
      .post('/api/admin/uploads')
      .set('X-CSRF-Token', csrfToken)
      .attach('file', svg, { filename: 'evil.svg', contentType: 'image/svg+xml' })

    expect(rejected.status).toBe(415)
    expect(rejected.body.error.code).toBe('UNSUPPORTED_IMAGE')

    fs.rmSync(tempUploadDir, { recursive: true, force: true })
  })
})

describe('admin overview', () => {
  it('returns content and security counters', async () => {
    const { agent } = await setupAdmin()
    const overview = await agent.get('/api/admin/overview')
    expect(overview.status).toBe(200)
    expect(overview.body.articles.total).toBe(0)
    expect(overview.body.friends.total).toBe(0)
    expect(overview.body.security.username).toBe(ADMIN_USERNAME)
    expect(overview.body.security.totpEnabled).toBe(false)
  })
})
