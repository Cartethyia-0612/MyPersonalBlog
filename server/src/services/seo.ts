import type { AppConfig } from '../config'
import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { getSeoSettings, resolveSiteUrl, updateSeoSettings, type SeoSettings } from './settings'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const BAIDU_ENDPOINT = 'https://data.zz.baidu.com/urls'
const PUSH_TIMEOUT_MS = 15_000
const MAX_BAIDU_URLS = 2000
const MAX_INDEXNOW_URLS = 10_000

export interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number
  kind: 'page' | 'article'
}

export interface SeoPushLog {
  id: number
  provider: 'indexnow' | 'baidu'
  urlCount: number
  success: boolean
  statusCode: number | null
  message: string
  createdAt: string
}

export interface SeoOverview {
  siteUrl: string
  canPush: boolean
  sitemapUrl: string
  robotsUrl: string
  urlCount: number
  articleCount: number
  indexNow: {
    configured: boolean
    keyPreview: string
    keyLocation: string
  }
  baidu: {
    configured: boolean
    tokenPreview: string
  }
  logs: SeoPushLog[]
}

interface ArticleSitemapRow {
  slug: string
  published_at: string
  updated_at: string
}

interface SeoLogRow {
  id: number
  provider: 'indexnow' | 'baidu'
  url_count: number
  success: number
  status_code: number | null
  message: string
  created_at: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function getBaseSiteUrl(db: Db, config: AppConfig): string {
  const raw = resolveSiteUrl(db, config.siteUrl)
  try {
    return new URL(raw).origin
  } catch {
    throw new AppError(500, 'SEO_SITE_URL_INVALID', '站点 URL 配置无效')
  }
}

export function isPublicSiteUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return false
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
    return true
  } catch {
    return false
  }
}

export function buildSitemapEntries(db: Db, config: AppConfig): SitemapEntry[] {
  const base = getBaseSiteUrl(db, config)
  const entries: SitemapEntry[] = [
    { loc: `${base}/`, changefreq: 'daily', priority: 1, kind: 'page' },
    { loc: `${base}/articles`, changefreq: 'daily', priority: 0.9, kind: 'page' },
    { loc: `${base}/friends`, changefreq: 'weekly', priority: 0.6, kind: 'page' },
    { loc: `${base}/about`, changefreq: 'monthly', priority: 0.6, kind: 'page' },
  ]

  const rows = db
    .prepare(
      `SELECT slug, published_at, updated_at FROM articles
       WHERE status = 'published' AND published_at IS NOT NULL
       ORDER BY published_at DESC`,
    )
    .all() as ArticleSitemapRow[]

  for (const row of rows) {
    entries.push({
      loc: `${base}/articles/${encodeURIComponent(row.slug)}`,
      lastmod: row.updated_at || row.published_at,
      changefreq: 'monthly',
      priority: 0.8,
      kind: 'article',
    })
  }

  return entries
}

export function generateSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [
        '    <url>',
        `      <loc>${escapeXml(entry.loc)}</loc>`,
        ...(entry.lastmod ? [`      <lastmod>${escapeXml(entry.lastmod)}</lastmod>`] : []),
        ...(entry.changefreq
          ? [`      <changefreq>${escapeXml(entry.changefreq)}</changefreq>`]
          : []),
        ...(entry.priority !== undefined
          ? [`      <priority>${entry.priority.toFixed(1)}</priority>`]
          : []),
        '    </url>',
      ]
      return parts.join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

export function generateRobotsTxt(baseUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

export function maskSecret(value: string): string {
  if (!value) return ''
  return value.length <= 8 ? '••••••••' : `••••••••${value.slice(-4)}`
}

function recordPushLog(
  db: Db,
  provider: 'indexnow' | 'baidu',
  urlCount: number,
  success: boolean,
  statusCode: number | null,
  message: string,
): SeoPushLog {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO seo_push_logs
       (provider, url_count, success, status_code, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(provider, urlCount, success ? 1 : 0, statusCode, message.slice(0, 500), now)

  return {
    id: Number(result.lastInsertRowid),
    provider,
    urlCount,
    success,
    statusCode,
    message: message.slice(0, 500),
    createdAt: now,
  }
}

export function listPushLogs(db: Db, limit = 12): SeoPushLog[] {
  const rows = db
    .prepare(
      `SELECT id, provider, url_count, success, status_code, message, created_at
       FROM seo_push_logs
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(limit) as SeoLogRow[]

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    urlCount: row.url_count,
    success: Boolean(row.success),
    statusCode: row.status_code,
    message: row.message,
    createdAt: row.created_at,
  }))
}

export function getSeoOverview(db: Db, config: AppConfig): SeoOverview {
  const base = getBaseSiteUrl(db, config)
  const entries = buildSitemapEntries(db, config)
  const seo = getSeoSettings(db)
  const articleCount = entries.filter((entry) => entry.kind === 'article').length

  return {
    siteUrl: base,
    canPush: isPublicSiteUrl(base),
    sitemapUrl: `${base}/sitemap.xml`,
    robotsUrl: `${base}/robots.txt`,
    urlCount: entries.length,
    articleCount,
    indexNow: {
      configured: Boolean(seo.indexNowKey),
      keyPreview: maskSecret(seo.indexNowKey),
      keyLocation: seo.indexNowKey ? `${base}/${seo.indexNowKey}.txt` : '',
    },
    baidu: {
      configured: Boolean(seo.baiduToken),
      tokenPreview: maskSecret(seo.baiduToken),
    },
    logs: listPushLogs(db),
  }
}

export interface SeoKeyPatch {
  indexNowKey?: string
  baiduToken?: string
  clearIndexNowKey?: boolean
  clearBaiduToken?: boolean
}

const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/
const BAIDU_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export function updateSeoKeys(db: Db, patch: SeoKeyPatch): SeoSettings {
  const current = getSeoSettings(db)
  const next: SeoSettings = { ...current }

  if (patch.clearIndexNowKey) {
    next.indexNowKey = ''
  } else if (patch.indexNowKey !== undefined && patch.indexNowKey !== '') {
    const value = patch.indexNowKey.trim()
    if (!INDEXNOW_KEY_PATTERN.test(value)) {
      throw new AppError(
        400,
        'INVALID_INDEXNOW_KEY',
        'IndexNow Key 需为 8-128 位字母、数字或短横线',
      )
    }
    next.indexNowKey = value
  }

  if (patch.clearBaiduToken) {
    next.baiduToken = ''
  } else if (patch.baiduToken !== undefined && patch.baiduToken !== '') {
    const value = patch.baiduToken.trim()
    if (!BAIDU_TOKEN_PATTERN.test(value)) {
      throw new AppError(400, 'INVALID_BAIDU_TOKEN', '百度推送 Token 格式不正确')
    }
    next.baiduToken = value
  }

  updateSeoSettings(db, next)
  return next
}

function assertCanPush(base: string): void {
  if (!isPublicSiteUrl(base)) {
    throw new AppError(400, 'SEO_LOCAL_URL', '请先在站点设置中填写公网域名，再执行搜索引擎推送')
  }
}

function pushTargets(db: Db, config: AppConfig, limit: number): string[] {
  return buildSitemapEntries(db, config)
    .slice(0, limit)
    .map((entry) => entry.loc)
}

export async function pushToIndexNow(db: Db, config: AppConfig): Promise<SeoPushLog> {
  const seo = getSeoSettings(db)
  if (!seo.indexNowKey) {
    throw new AppError(400, 'SEO_KEY_MISSING', '请先配置 IndexNow Key')
  }
  const base = getBaseSiteUrl(db, config)
  assertCanPush(base)
  const urls = pushTargets(db, config, MAX_INDEXNOW_URLS)
  const payload = {
    host: new URL(base).host,
    key: seo.indexNowKey,
    keyLocation: `${base}/${seo.indexNowKey}.txt`,
    urlList: urls,
  }

  let statusCode: number | null = null
  let success = false
  let message = ''
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'EsrsBlog/1.0 (+IndexNow)',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    })
    statusCode = response.status
    const text = (await response.text()).trim()
    success = response.status === 200 || response.status === 202
    message = success
      ? `IndexNow 已接受 ${urls.length} 个 URL（HTTP ${response.status}）`
      : text.slice(0, 300) || `IndexNow 返回 HTTP ${response.status}`
  } catch (error) {
    message = error instanceof Error ? `IndexNow 推送失败：${error.message}` : 'IndexNow 推送失败'
  }

  return recordPushLog(db, 'indexnow', urls.length, success, statusCode, message)
}

export async function pushToBaidu(db: Db, config: AppConfig): Promise<SeoPushLog> {
  const seo = getSeoSettings(db)
  if (!seo.baiduToken) {
    throw new AppError(400, 'SEO_KEY_MISSING', '请先配置百度推送 Token')
  }
  const base = getBaseSiteUrl(db, config)
  assertCanPush(base)
  const urls = pushTargets(db, config, MAX_BAIDU_URLS)
  const endpoint = `${BAIDU_ENDPOINT}?site=${encodeURIComponent(base)}&token=${encodeURIComponent(seo.baiduToken)}`

  let statusCode: number | null = null
  let success = false
  let message = ''
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'user-agent': 'EsrsBlog/1.0 (+Baidu Ziyuan)',
      },
      body: urls.join('\n'),
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    })
    statusCode = response.status
    const text = await response.text()
    let payload: Record<string, unknown> | null = null
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      payload = null
    }

    if (response.status === 200 && payload && !payload.error) {
      success = true
      const successCount = payload.success ?? '?'
      const remain = payload.remain ?? '?'
      message = `百度已接受 ${String(successCount)} 个 URL，剩余配额 ${String(remain)}`
    } else if (payload?.error) {
      message = `百度推送失败：${String(payload.error)}`
    } else {
      message = text.slice(0, 300) || `百度推送返回 HTTP ${response.status}`
    }
  } catch (error) {
    message = error instanceof Error ? `百度推送失败：${error.message}` : '百度推送失败'
  }

  return recordPushLog(db, 'baidu', urls.length, success, statusCode, message)
}
