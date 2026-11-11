import { Router } from 'express'
import { z } from 'zod'

import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { parseBody } from '../lib/http'
import {
  createPlaylist,
  deletePlaylist,
  fetchPlaylistTracks,
  getPlaylistById,
  listAllPlaylists,
  updatePlaylist,
} from '../services/music'

const playlistSchema = z.object({
  name: z.string().trim().min(1, '歌单名称不能为空').max(60),
  server: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[a-z0-9_-]+$/, '音乐平台标识只能包含小写字母、数字、下划线和短横线'),
  playlistId: z
    .string()
    .trim()
    .min(1, '歌单 ID 不能为空')
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/, '歌单 ID 格式不正确'),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  visible: z.boolean().default(true),
})

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(404, 'PLAYLIST_NOT_FOUND', '歌单不存在')
  }
  return id
}

export function createAdminMusicRouter(db: Db): Router {
  const router = Router()

  router.get('/playlists', (_req, res) => {
    res.json({ items: listAllPlaylists(db) })
  })

  router.post('/playlists', (req, res) => {
    const input = parseBody(playlistSchema, req)
    res.status(201).json({ playlist: createPlaylist(db, input) })
  })

  router.put('/playlists/:id', (req, res) => {
    const input = parseBody(playlistSchema, req)
    res.json({ playlist: updatePlaylist(db, parseId(req.params.id), input) })
  })

  router.delete('/playlists/:id', (req, res) => {
    deletePlaylist(db, parseId(req.params.id))
    res.json({ ok: true })
  })

  router.get('/playlists/:id/preview', async (req, res) => {
    const playlist = getPlaylistById(db, parseId(req.params.id))
    if (!playlist) throw new AppError(404, 'PLAYLIST_NOT_FOUND', '歌单不存在')
    const result = await fetchPlaylistTracks(db, playlist)
    res.json(result)
  })

  return router
}
