import { Router } from 'express'

import type { AppConfig } from '../config'
import type { Db } from '../db'
import { getSeoSettings } from '../services/settings'
import {
  buildSitemapEntries,
  generateRobotsTxt,
  generateSitemapXml,
  getBaseSiteUrl,
} from '../services/seo'

export function createSeoRouter(db: Db, config: AppConfig): Router {
  const router = Router()

  router.get('/sitemap.xml', (req, res) => {
    const entries = buildSitemapEntries(db, config)
    res.type('application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.send(generateSitemapXml(entries))
  })

  router.get('/robots.txt', (req, res) => {
    const base = getBaseSiteUrl(db, config)
    res.type('text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.send(generateRobotsTxt(base))
  })

  // IndexNow requires a key verification file in the site root: /<key>.txt
  router.get(/^\/([A-Za-z0-9-]{8,128})\.txt$/, (req, res, next) => {
    const seo = getSeoSettings(db)
    const key = seo.indexNowKey
    if (!key || req.path !== `/${key}.txt`) return next()
    res.type('text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.send(key)
  })

  return router
}
