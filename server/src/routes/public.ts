import { Router } from 'express'

import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { parseNumber } from '../lib/http'
import { listPublishedArticles, getPublishedArticleBySlug } from '../services/articles'
import { listVisibleFriends } from '../services/friends'
import { fetchPlaylistTracks, getVisiblePlaylist, listVisiblePlaylists } from '../services/music'
import { getAboutContent, getFooterSettings, getSiteSettings } from '../services/settings'

export function createPublicRouter(db: Db): Router {
  const router = Router()

  router.get('/site', (_req, res) => {
    res.json({
      site: getSiteSettings(db),
      footer: getFooterSettings(db),
    })
  })

  router.get('/articles', (req, res) => {
    const page = parseNumber(req.query.page, 1, 1, 100_000)
    const pageSize = parseNumber(req.query.pageSize, 10, 1, 24)
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().slice(0, 24) : ''

    res.json(
      listPublishedArticles(db, {
        page,
        pageSize,
        ...(tag ? { tag } : {}),
      }),
    )
  })

  router.get('/articles/:slug', (req, res) => {
    const slug = req.params.slug
    if (!slug || slug.length > 100) {
      throw new AppError(404, 'ARTICLE_NOT_FOUND', '文章不存在')
    }
    const article = getPublishedArticleBySlug(db, slug)
    if (!article) throw new AppError(404, 'ARTICLE_NOT_FOUND', '文章不存在')
    res.json({ article })
  })

  router.get('/friends', (_req, res) => {
    res.json({ items: listVisibleFriends(db) })
  })

  router.get('/about', (_req, res) => {
    res.json({ contentMd: getAboutContent(db) })
  })

  router.get('/music/playlists', (_req, res) => {
    res.json({ items: listVisiblePlaylists(db) })
  })

  router.get('/music/playlists/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(404, 'PLAYLIST_NOT_FOUND', '歌单不存在')
    }
    const playlist = getVisiblePlaylist(db, id)
    if (!playlist) throw new AppError(404, 'PLAYLIST_NOT_FOUND', '歌单不存在')
    const result = await fetchPlaylistTracks(db, playlist)
    res.json(result)
  })

  return router
}
