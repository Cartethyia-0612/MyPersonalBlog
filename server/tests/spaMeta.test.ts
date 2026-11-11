import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase } from '../src/db'
import { createArticle } from '../src/services/articles'
import { updateSiteSettings } from '../src/services/settings'
import { clearIndexCache, getPageMeta, renderSpaHtml } from '../src/services/spaMeta'
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
  updateSiteSettings(context.db, {
    name: '饿师傅的技术札记',
    description: '记录工程实践与灵感。',
    siteUrl: 'https://blog.example.com',
  })
  createArticle(context.db, {
    title: '服务端首屏元信息',
    slug: 'server-meta',
    summary: '给爬虫看的摘要。',
    contentMd: '# 正文\n\n内容。',
    coverUrl: '/uploads/cover.png',
    tags: ['SEO', '测试'],
    status: 'published',
  })
  createArticle(context.db, {
    title: '未发布草稿',
    slug: 'draft-meta',
    summary: '草稿摘要',
    contentMd: '',
    coverUrl: '',
    tags: [],
    status: 'draft',
  })
  return context
}

describe('server-side page meta', () => {
  it('builds article metadata, canonical and tags', () => {
    const testContext = setup()
    const meta = getPageMeta(testContext.db, testContext.config, '/articles/server-meta')

    expect(meta.status).toBe(200)
    expect(meta.title).toBe('服务端首屏元信息 · 饿师傅的技术札记')
    expect(meta.description).toBe('给爬虫看的摘要。')
    expect(meta.canonical).toBe('https://blog.example.com/articles/server-meta')
    expect(meta.image).toBe('https://blog.example.com/uploads/cover.png')
    expect(meta.type).toBe('article')
    expect(meta.tags).toEqual(['SEO', '测试'])
  })

  it('returns 404 noindex for drafts and unknown routes', () => {
    const testContext = setup()
    const draft = getPageMeta(testContext.db, testContext.config, '/articles/draft-meta')
    expect(draft.status).toBe(404)
    expect(draft.noindex).toBe(true)

    const missing = getPageMeta(testContext.db, testContext.config, '/missing-page')
    expect(missing.status).toBe(404)
    expect(missing.noindex).toBe(true)
  })

  it('marks admin routes noindex and keeps public pages indexable', () => {
    const testContext = setup()
    const admin = getPageMeta(testContext.db, testContext.config, '/admin/seo')
    expect(admin.status).toBe(200)
    expect(admin.noindex).toBe(true)

    const home = getPageMeta(testContext.db, testContext.config, '/')
    expect(home.status).toBe(200)
    expect(home.noindex).toBe(false)
    expect(home.canonical).toBe('https://blog.example.com/')
  })

  it('injects tags into the built index.html without duplicating description', () => {
    const testContext = setup()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eshi-meta-'))
    fs.writeFileSync(
      path.join(tempDir, 'index.html'),
      '<!doctype html><html><head><title>默认标题</title><meta name="description" content="默认描述" /></head><body><div id="app"></div></body></html>',
    )
    testContext.config.clientDistDir = tempDir
    clearIndexCache()

    const rendered = renderSpaHtml(testContext.db, testContext.config, '/articles/server-meta')
    expect(rendered).not.toBeNull()
    expect(rendered?.status).toBe(200)
    expect(rendered?.html).toContain('<title>服务端首屏元信息 · 饿师傅的技术札记</title>')
    expect(rendered?.html).toContain(
      'rel="canonical" href="https://blog.example.com/articles/server-meta"',
    )
    expect(rendered?.html).toContain('property="article:tag" content="SEO"')
    expect(rendered?.html.match(/name="description"/g)).toHaveLength(1)

    const notFound = renderSpaHtml(testContext.db, testContext.config, '/nope')
    expect(notFound?.status).toBe(404)
    expect(notFound?.html).toContain('noindex, nofollow')
  })
})
