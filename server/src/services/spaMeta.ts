import fs from 'node:fs'
import path from 'node:path'

import type { AppConfig } from '../config'
import type { Db } from '../db'
import { getPublishedArticleBySlug } from './articles'
import { getSiteSettings, resolveSiteUrl } from './settings'

export interface PageMeta {
  status: number
  title: string
  description: string
  image: string
  canonical: string
  noindex: boolean
  type: 'website' | 'article'
  publishedTime?: string | null
  modifiedTime?: string | null
  tags?: string[]
}

const SITE_NAME_FALLBACK = '饿师傅的技术札记'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

function normalizeBaseUrl(db: Db, config: AppConfig): string {
  try {
    return new URL(resolveSiteUrl(db, config.siteUrl)).origin
  } catch {
    return new URL(config.siteUrl).origin
  }
}

function absoluteImage(image: string, base: string): string {
  if (!image) return `${base}/favicon.svg`
  if (/^https?:\/\//i.test(image)) return image
  return `${base}${image.startsWith('/') ? '' : '/'}${image}`
}

export function getPageMeta(db: Db, config: AppConfig, pathname: string): PageMeta {
  const site = getSiteSettings(db)
  const base = normalizeBaseUrl(db, config)
  const siteName = site.name || SITE_NAME_FALLBACK
  const description = site.description || site.tagline || '个人技术札记'
  const canonicalPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
  const canonical = `${base}${canonicalPath}`

  if (pathname === '/') {
    return {
      status: 200,
      title: siteName,
      description,
      image: absoluteImage(site.icon, base),
      canonical,
      noindex: false,
      type: 'website',
    }
  }

  if (pathname === '/articles') {
    return {
      status: 200,
      title: `文章归档 · ${siteName}`,
      description: '所有技术札记、工程实践与工具折腾记录。',
      image: absoluteImage(site.icon, base),
      canonical,
      noindex: false,
      type: 'website',
    }
  }

  if (pathname.startsWith('/articles/')) {
    const rawSlug = pathname.slice('/articles/'.length)
    let slug = rawSlug
    try {
      slug = decodeURIComponent(rawSlug)
    } catch {
      // keep raw slug
    }
    const article = getPublishedArticleBySlug(db, slug)
    if (!article) {
      return {
        status: 404,
        title: `文章不存在 · ${siteName}`,
        description: '这篇文章不存在，或者还没有公开。',
        image: absoluteImage(site.icon, base),
        canonical,
        noindex: true,
        type: 'website',
      }
    }
    return {
      status: 200,
      title: `${article.title} · ${siteName}`,
      description: article.summary || stripMarkdown(article.contentMd).slice(0, 160),
      image: absoluteImage(article.coverUrl || site.icon, base),
      canonical,
      noindex: false,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      tags: article.tags,
    }
  }

  if (pathname === '/friends') {
    return {
      status: 200,
      title: `友链 · ${siteName}`,
      description: '与饿师傅互相连接的站点们：技术、设计与认真写字的人。',
      image: absoluteImage(site.icon, base),
      canonical,
      noindex: false,
      type: 'website',
    }
  }

  if (pathname === '/about') {
    return {
      status: 200,
      title: `关于 · ${siteName}`,
      description: '关于饿师傅与这个技术札记。',
      image: absoluteImage(site.icon, base),
      canonical,
      noindex: false,
      type: 'website',
    }
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return {
      status: 200,
      title: `管理后台 · ${siteName}`,
      description: '站点管理后台',
      image: absoluteImage(site.icon, base),
      canonical,
      noindex: true,
      type: 'website',
    }
  }

  return {
    status: 404,
    title: `页面不存在 · ${siteName}`,
    description: '你访问的页面不存在。',
    image: absoluteImage(site.icon, base),
    canonical,
    noindex: true,
    type: 'website',
  }
}

interface IndexCache {
  filePath: string
  mtimeMs: number
  html: string
}

let indexCache: IndexCache | null = null

function readIndexHtml(config: AppConfig): string | null {
  const filePath = path.join(config.clientDistDir, 'index.html')
  if (!fs.existsSync(filePath)) return null

  const stat = fs.statSync(filePath)
  if (indexCache?.filePath === filePath && indexCache.mtimeMs === stat.mtimeMs) {
    return indexCache.html
  }

  const html = fs.readFileSync(filePath, 'utf8')
  indexCache = { filePath, mtimeMs: stat.mtimeMs, html }
  return html
}

function buildMetaTags(meta: PageMeta): string {
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
  ]

  if (meta.noindex) {
    tags.push('<meta name="robots" content="noindex, nofollow" />')
  }
  if (meta.type === 'article' && meta.publishedTime) {
    tags.push(
      `<meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}" />`,
    )
  }
  if (meta.type === 'article' && meta.modifiedTime) {
    tags.push(
      `<meta property="article:modified_time" content="${escapeHtml(meta.modifiedTime)}" />`,
    )
  }
  for (const tag of meta.tags ?? []) {
    tags.push(`<meta property="article:tag" content="${escapeHtml(tag)}" />`)
  }
  return tags.join('\n    ')
}

/**
 * Server-side injection gives crawlers and social previews useful meta tags
 * before the Vue app boots. The SPA then keeps them in sync on navigation.
 */
export function renderSpaHtml(
  db: Db,
  config: AppConfig,
  pathname: string,
): { status: number; html: string } | null {
  const indexHtml = readIndexHtml(config)
  if (!indexHtml) return null

  const meta = getPageMeta(db, config, pathname)
  let html = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')

  html = html.replace('</head>', `    ${buildMetaTags(meta)}\n  </head>`)
  return { status: meta.status, html }
}

export function clearIndexCache(): void {
  indexCache = null
}
