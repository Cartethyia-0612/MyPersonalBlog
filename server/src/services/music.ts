import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { getMusicSettings } from './settings'

interface PlaylistRow {
  id: number
  name: string
  server: string
  playlist_id: string
  sort_order: number
  visible: number
  created_at: string
  updated_at: string
}

export interface MusicPlaylist {
  id: number
  name: string
  server: string
  playlistId: string
  sortOrder: number
  visible: boolean
  createdAt: string
  updatedAt: string
}

export interface MusicPlaylistInput {
  name: string
  server: string
  playlistId: string
  sortOrder: number
  visible: boolean
}

export interface MusicTrack {
  id: string
  name: string
  artist: string
  url: string
  cover: string
  lrc: string
}

export interface PublicPlaylist {
  id: number
  name: string
}

export interface PlaylistTracksResult {
  playlist: PublicPlaylist
  tracks: MusicTrack[]
}

interface CacheEntry {
  expiresAt: number
  result: PlaylistTracksResult
}

const CACHE_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 12_000
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024
const MAX_TRACKS = 500
const cache = new Map<string, CacheEntry>()

export function toMusicPlaylist(row: PlaylistRow): MusicPlaylist {
  return {
    id: row.id,
    name: row.name,
    server: row.server,
    playlistId: row.playlist_id,
    sortOrder: row.sort_order,
    visible: Boolean(row.visible),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listVisiblePlaylists(db: Db): PublicPlaylist[] {
  return (
    db
      .prepare(
        'SELECT id, name FROM music_playlists WHERE visible = 1 ORDER BY sort_order ASC, id ASC',
      )
      .all() as Array<{ id: number; name: string }>
  ).map((row) => ({ id: row.id, name: row.name }))
}

export function listAllPlaylists(db: Db): MusicPlaylist[] {
  const rows = db
    .prepare('SELECT * FROM music_playlists ORDER BY sort_order ASC, id ASC')
    .all() as PlaylistRow[]
  return rows.map(toMusicPlaylist)
}

export function getPlaylistById(db: Db, id: number): MusicPlaylist | undefined {
  const row = db.prepare('SELECT * FROM music_playlists WHERE id = ?').get(id) as
    PlaylistRow | undefined
  return row ? toMusicPlaylist(row) : undefined
}

export function getVisiblePlaylist(db: Db, id: number): MusicPlaylist | undefined {
  const playlist = getPlaylistById(db, id)
  return playlist?.visible ? playlist : undefined
}

export function createPlaylist(db: Db, input: MusicPlaylistInput): MusicPlaylist {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO music_playlists
       (name, server, playlist_id, sort_order, visible, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name.trim(),
      input.server.trim(),
      input.playlistId.trim(),
      input.sortOrder,
      input.visible ? 1 : 0,
      now,
      now,
    )

  return getPlaylistById(db, Number(result.lastInsertRowid)) as MusicPlaylist
}

export function updatePlaylist(db: Db, id: number, input: MusicPlaylistInput): MusicPlaylist {
  const result = db
    .prepare(
      `UPDATE music_playlists
       SET name = ?, server = ?, playlist_id = ?, sort_order = ?, visible = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name.trim(),
      input.server.trim(),
      input.playlistId.trim(),
      input.sortOrder,
      input.visible ? 1 : 0,
      new Date().toISOString(),
      id,
    )
  if (result.changes === 0) throw new AppError(404, 'PLAYLIST_NOT_FOUND', '歌单不存在')
  clearPlaylistCache(id)
  return getPlaylistById(db, id) as MusicPlaylist
}

export function deletePlaylist(db: Db, id: number): void {
  const result = db.prepare('DELETE FROM music_playlists WHERE id = ?').run(id)
  if (result.changes === 0) throw new AppError(404, 'PLAYLIST_NOT_FOUND', '歌单不存在')
  clearPlaylistCache(id)
}

export function clearPlaylistCache(id?: number): void {
  if (id === undefined) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${id}:`)) cache.delete(key)
  }
}

function buildMetingUrl(apiBase: string, playlist: MusicPlaylist): string {
  let url: URL
  try {
    url = new URL(apiBase)
  } catch {
    throw new AppError(500, 'METING_NOT_CONFIGURED', 'Meting API 地址配置无效')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError(500, 'METING_NOT_CONFIGURED', 'Meting API 必须使用 http(s) 协议')
  }
  url.searchParams.set('server', playlist.server)
  url.searchParams.set('type', 'playlist')
  url.searchParams.set('id', playlist.playlistId)
  return url.toString()
}

function normalizeArtist(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(' / ')
  }
  return typeof value === 'string' && value.trim() ? value.trim() : '未知艺术家'
}

function normalizeTracks(payload: unknown, playlistId: string): MusicTrack[] {
  let items: unknown[] = []
  if (Array.isArray(payload)) {
    items = payload
  } else if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    for (const key of ['data', 'songs', 'tracks', 'result']) {
      if (Array.isArray(record[key])) {
        items = record[key] as unknown[]
        break
      }
    }
  }

  const tracks: MusicTrack[] = []
  for (let index = 0; index < items.length && tracks.length < MAX_TRACKS; index += 1) {
    const item = items[index]
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>
    const url = typeof record.url === 'string' ? record.url.trim() : ''
    if (!url || !/^https?:\/\//i.test(url)) continue

    const name =
      typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : typeof record.title === 'string' && record.title.trim()
          ? record.title.trim()
          : `Track ${index + 1}`
    const artist = normalizeArtist(record.artist ?? record.singer ?? record.author)
    const cover =
      typeof record.pic === 'string'
        ? record.pic
        : typeof record.cover === 'string'
          ? record.cover
          : ''
    const lrc =
      typeof record.lrc === 'string'
        ? record.lrc
        : typeof record.lyric === 'string'
          ? record.lyric
          : ''
    const id =
      typeof record.id === 'string' || typeof record.id === 'number'
        ? String(record.id)
        : `${playlistId}-${index}`

    tracks.push({ id, name, artist, url, cover, lrc })
  }

  return tracks
}

async function readResponseText(response: Response): Promise<string> {
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length && length > MAX_RESPONSE_BYTES) {
    throw new AppError(502, 'METING_TOO_LARGE', '音乐服务返回的数据过大')
  }
  const text = await response.text()
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new AppError(502, 'METING_TOO_LARGE', '音乐服务返回的数据过大')
  }
  return text
}

/**
 * Fetch a Meting playlist through the server. The public browser never talks to
 * the third-party API directly, which avoids CORS and keeps the configured API
 * endpoint on the server side.
 */
export async function fetchPlaylistTracks(
  db: Db,
  playlist: MusicPlaylist,
): Promise<PlaylistTracksResult> {
  const settings = getMusicSettings(db)
  const cacheKey = `${playlist.id}:${playlist.updatedAt}:${settings.apiBase}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  const endpoint = buildMetingUrl(settings.apiBase, playlist)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'EsrsBlog/1.0 (+personal music player)',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, 'METING_TIMEOUT', '音乐服务响应超时，请稍后重试')
    }
    throw new AppError(502, 'METING_UNAVAILABLE', '音乐服务暂时不可用')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    throw new AppError(502, 'METING_HTTP_ERROR', `音乐服务返回异常状态（${response.status}）`)
  }

  const text = await readResponseText(response)
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    throw new AppError(502, 'METING_INVALID_RESPONSE', '音乐服务返回了无法解析的数据')
  }

  const tracks = normalizeTracks(payload, playlist.playlistId)
  if (tracks.length === 0) {
    throw new AppError(502, 'METING_EMPTY', '音乐服务没有返回可播放曲目')
  }

  const result: PlaylistTracksResult = {
    playlist: { id: playlist.id, name: playlist.name },
    tracks,
  }
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result })
  return result
}
