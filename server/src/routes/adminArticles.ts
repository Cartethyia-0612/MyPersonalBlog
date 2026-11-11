import { Router } from 'express'
import { z } from 'zod'

import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { parseBody, parseNumber } from '../lib/http'
import { imageReferenceSchema, slugSchema, tagsSchema } from '../lib/validation'
import {
  createArticle,
  deleteArticle,
  getArticleById,
  listAllArticles,
  updateArticle,
  type ArticleStatus,
} from '../services/articles'

const articleSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(120),
  slug: z.union([slugSchema, z.literal('')]).optional(),
  summary: z.string().trim().max(300).default(''),
  contentMd: z.string().max(500_000).default(''),
  coverUrl: imageReferenceSchema.default(''),
  tags: tagsSchema.default([]),
  status: z.enum(['draft', 'published']).default('draft'),
})

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(404, 'ARTICLE_NOT_FOUND', '文章不存在')
  }
  return id
}

function parseStatus(value: unknown): ArticleStatus | undefined {
  return value === 'draft' || value === 'published' ? value : undefined
}

export function createAdminArticlesRouter(db: Db): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const page = parseNumber(req.query.page, 1, 1, 100_000)
    const pageSize = parseNumber(req.query.pageSize, 20, 1, 100)
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
    const status = parseStatus(req.query.status)

    res.json(
      listAllArticles(db, {
        page,
        pageSize,
        ...(status ? { status } : {}),
        ...(query ? { query } : {}),
      }),
    )
  })

  router.post('/', (req, res) => {
    const input = parseBody(articleSchema, req)
    const article = createArticle(db, input)
    res.status(201).json({ article })
  })

  router.get('/:id', (req, res) => {
    const article = getArticleById(db, parseId(req.params.id))
    if (!article) throw new AppError(404, 'ARTICLE_NOT_FOUND', '文章不存在')
    res.json({ article })
  })

  router.put('/:id', (req, res) => {
    const input = parseBody(articleSchema, req)
    const article = updateArticle(db, parseId(req.params.id), input)
    res.json({ article })
  })

  router.delete('/:id', (req, res) => {
    deleteArticle(db, parseId(req.params.id))
    res.json({ ok: true })
  })

  return router
}
