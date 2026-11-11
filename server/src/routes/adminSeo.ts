import { Router } from 'express'
import { z } from 'zod'

import type { AppConfig } from '../config'
import type { Db } from '../db'
import { parseBody } from '../lib/http'
import { getSeoOverview, pushToBaidu, pushToIndexNow, updateSeoKeys } from '../services/seo'

const seoPatchSchema = z
  .object({
    indexNowKey: z.string().trim().max(200).optional(),
    baiduToken: z.string().trim().max(200).optional(),
    clearIndexNowKey: z.boolean().optional(),
    clearBaiduToken: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.indexNowKey !== undefined ||
      value.baiduToken !== undefined ||
      value.clearIndexNowKey === true ||
      value.clearBaiduToken === true,
    '至少需要提交一项 SEO 配置',
  )

export function createAdminSeoRouter(db: Db, config: AppConfig): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(getSeoOverview(db, config))
  })

  router.put('/', (req, res) => {
    const patch = parseBody(seoPatchSchema, req)
    updateSeoKeys(db, patch)
    res.json(getSeoOverview(db, config))
  })

  router.post('/indexnow', async (_req, res) => {
    const log = await pushToIndexNow(db, config)
    res.json({ log, overview: getSeoOverview(db, config) })
  })

  router.post('/baidu', async (_req, res) => {
    const log = await pushToBaidu(db, config)
    res.json({ log, overview: getSeoOverview(db, config) })
  })

  return router
}
