import type { Db } from '../db'
import { AppError } from '../lib/errors'

export type ArticleStatus = 'draft' | 'published'

interface ArticleRow {
  id: number
  slug: string
  title: string
  summary: string
  content_md: string
  cover_url: string
  tags_json: string
  status: ArticleStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ArticleSummary {
  id: number
  slug: string
  title: string
  summary: string
  coverUrl: string
  tags: string[]
  status: ArticleStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ArticleDetail extends ArticleSummary {
  contentMd: string
}

export interface ArticleInput {
  title: string
  slug?: string
  summary: string
  contentMd: string
  coverUrl: string
  tags: string[]
  status: ArticleStatus
}

export interface Paginated<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const SUMMARY_LENGTH = 150

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string')
      : []
  } catch {
    return []
  }
}

function toSummary(row: ArticleRow): ArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.cover_url,
    tags: parseTags(row.tags_json),
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDetail(row: ArticleRow): ArticleDetail {
  return {
    ...toSummary(row),
    contentMd: row.content_md,
  }
}

function deriveSummary(contentMd: string): string {
  const plain = contentMd
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.slice(0, SUMMARY_LENGTH)
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8)
}

export function generateSlug(title: string): string {
  const transliterated = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  if (transliterated) return transliterated
  return `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function slugExists(db: Db, slug: string, excludeId?: number): boolean {
  const row =
    excludeId === undefined
      ? db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug)
      : db.prepare('SELECT id FROM articles WHERE slug = ? AND id <> ?').get(slug, excludeId)
  return Boolean(row)
}

function uniqueGeneratedSlug(db: Db, base: string, excludeId?: number): string {
  let candidate = base
  let counter = 2
  while (slugExists(db, candidate, excludeId)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  return candidate
}

export function createArticle(db: Db, input: ArticleInput): ArticleDetail {
  const now = new Date().toISOString()
  const title = input.title.trim()
  if (!title) throw new AppError(400, 'INVALID_ARTICLE', '文章标题不能为空')

  const requestedSlug = input.slug?.trim() ?? ''
  const slug = requestedSlug ? requestedSlug : uniqueGeneratedSlug(db, generateSlug(title))

  if (requestedSlug && slugExists(db, requestedSlug)) {
    throw new AppError(409, 'SLUG_EXISTS', '该 Slug 已被其他文章使用')
  }

  const status = input.status
  const publishedAt = status === 'published' ? now : null
  const summary = input.summary.trim() || deriveSummary(input.contentMd)

  const result = db
    .prepare(
      `INSERT INTO articles
       (slug, title, summary, content_md, cover_url, tags_json, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      slug,
      title,
      summary,
      input.contentMd,
      input.coverUrl.trim(),
      JSON.stringify(normalizeTags(input.tags)),
      status,
      publishedAt,
      now,
      now,
    )

  const row = db
    .prepare('SELECT * FROM articles WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as ArticleRow
  return toDetail(row)
}

export function updateArticle(db: Db, id: number, input: ArticleInput): ArticleDetail {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as
    ArticleRow | undefined
  if (!existing) throw new AppError(404, 'ARTICLE_NOT_FOUND', '文章不存在')

  const title = input.title.trim()
  if (!title) throw new AppError(400, 'INVALID_ARTICLE', '文章标题不能为空')

  const requestedSlug = input.slug?.trim() ?? ''
  let slug = existing.slug
  if (requestedSlug && requestedSlug !== existing.slug) {
    if (slugExists(db, requestedSlug, id)) {
      throw new AppError(409, 'SLUG_EXISTS', '该 Slug 已被其他文章使用')
    }
    slug = requestedSlug
  }

  const status = input.status
  const publishedAt =
    status === 'published' ? (existing.published_at ?? new Date().toISOString()) : null
  const summary = input.summary.trim() || deriveSummary(input.contentMd)
  const now = new Date().toISOString()

  db.prepare(
    `UPDATE articles
     SET slug = ?, title = ?, summary = ?, content_md = ?, cover_url = ?,
         tags_json = ?, status = ?, published_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    slug,
    title,
    summary,
    input.contentMd,
    input.coverUrl.trim(),
    JSON.stringify(normalizeTags(input.tags)),
    status,
    publishedAt,
    now,
    id,
  )

  return toDetail(db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as ArticleRow)
}

export function deleteArticle(db: Db, id: number): void {
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id)
  if (result.changes === 0) throw new AppError(404, 'ARTICLE_NOT_FOUND', '文章不存在')
}

export function getArticleById(db: Db, id: number): ArticleDetail | undefined {
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as ArticleRow | undefined
  return row ? toDetail(row) : undefined
}

export function getPublishedArticleBySlug(db: Db, slug: string): ArticleDetail | undefined {
  const row = db
    .prepare(
      `SELECT * FROM articles
       WHERE slug = ? AND status = 'published' AND published_at IS NOT NULL`,
    )
    .get(slug) as ArticleRow | undefined
  return row ? toDetail(row) : undefined
}

function pagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export function listPublishedArticles(
  db: Db,
  options: { page: number; pageSize: number; tag?: string },
): Paginated<ArticleSummary> {
  const { page, pageSize } = options
  const where = ["status = 'published'", 'published_at IS NOT NULL']
  const params: unknown[] = []

  if (options.tag) {
    where.push('EXISTS (SELECT 1 FROM json_each(articles.tags_json) AS tag WHERE tag.value = ?)')
    params.push(options.tag)
  }

  const whereSql = where.join(' AND ')
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM articles WHERE ${whereSql}`).get(...params) as {
      count: number
    }
  ).count

  const rows = db
    .prepare(
      `SELECT * FROM articles
       WHERE ${whereSql}
       ORDER BY published_at DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as ArticleRow[]

  return {
    items: rows.map(toSummary),
    pagination: pagination(page, pageSize, total),
  }
}

export function listAllArticles(
  db: Db,
  options: { page: number; pageSize: number; status?: ArticleStatus; query?: string },
): Paginated<ArticleSummary> {
  const { page, pageSize } = options
  const where: string[] = []
  const params: unknown[] = []

  if (options.status) {
    where.push('status = ?')
    params.push(options.status)
  }

  if (options.query) {
    const escaped = options.query.replace(/[\\%_]/g, (char) => `\\${char}`)
    where.push("(title LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')")
    params.push(`%${escaped}%`, `%${escaped}%`)
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM articles ${whereSql}`).get(...params) as {
      count: number
    }
  ).count

  const rows = db
    .prepare(
      `SELECT * FROM articles ${whereSql}
       ORDER BY updated_at DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as ArticleRow[]

  return {
    items: rows.map(toSummary),
    pagination: pagination(page, pageSize, total),
  }
}

export function getArticleStats(db: Db): {
  total: number
  published: number
  drafts: number
} {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
       FROM articles`,
    )
    .get() as { total: number; published: number | null; drafts: number | null }
  return {
    total: row.total,
    published: row.published ?? 0,
    drafts: row.drafts ?? 0,
  }
}
