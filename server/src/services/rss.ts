import type { AppConfig } from '../config'
import type { Db } from '../db'
import { getSiteSettings, resolveSiteUrl } from './settings'

const FEED_LIMIT = 50
const SUMMARY_LENGTH = 160

interface RssArticleRow {
  slug: string
  title: string
  summary: string
  content_md: string
  tags_json: string
  published_at: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function stripMarkdown(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string').slice(0, 8)
      : []
  } catch {
    return []
  }
}

function getBaseUrl(db: Db, config: AppConfig): string {
  try {
    return new URL(resolveSiteUrl(db, config.siteUrl)).origin
  } catch {
    return new URL(config.siteUrl).origin
  }
}

export function buildRssXml(db: Db, config: AppConfig): string {
  const site = getSiteSettings(db)
  const base = getBaseUrl(db, config)
  const siteName = site.name || '饿师傅的技术札记'
  const description = site.description || site.tagline || '个人技术札记'
  const articles = db
    .prepare(
      `SELECT slug, title, summary, content_md, tags_json, published_at
       FROM articles
       WHERE status = 'published' AND published_at IS NOT NULL
       ORDER BY published_at DESC
       LIMIT ?`,
    )
    .all(FEED_LIMIT) as RssArticleRow[]

  const items = articles
    .map((article) => {
      const link = `${base}/articles/${encodeURIComponent(article.slug)}`
      const pubDate = new Date(article.published_at)
      const summary = article.summary || stripMarkdown(article.content_md).slice(0, SUMMARY_LENGTH)
      const lines = [
        '    <item>',
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        ...(Number.isNaN(pubDate.getTime())
          ? []
          : [`      <pubDate>${pubDate.toUTCString()}</pubDate>`]),
        `      <description>${escapeXml(summary)}</description>`,
        ...parseTags(article.tags_json).map(
          (tag) => `      <category>${escapeXml(tag)}</category>`,
        ),
        '    </item>',
      ]
      return lines.join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(siteName)}</title>`,
    `    <link>${escapeXml(base)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>zh-CN</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    '    <generator>ESRS Tech Notes</generator>',
    `    <atom:link href="${escapeXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
