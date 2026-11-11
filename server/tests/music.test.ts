import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { closeDatabase } from '../src/db'
import { clearPlaylistCache } from '../src/services/music'
import { createTestContext, loginAsAdmin, seedAdmin, type TestContext } from './helpers'

let context: TestContext | undefined

afterEach(() => {
  if (context) closeDatabase(context.db)
  context = undefined
  clearPlaylistCache()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  clearPlaylistCache()
})

async function setupAdmin() {
  const testContext = createTestContext()
  context = testContext
  await seedAdmin(testContext.db)
  const agent = request.agent(testContext.app)
  const session = await agent.get('/api/auth/session')
  const csrf = await loginAsAdmin(agent, session.body.csrfToken as string)
  return { testContext, agent, csrf }
}

function metingTracks() {
  return [
    {
      id: 101,
      name: '天依的测试曲',
      artist: '洛天依',
      url: 'https://example.com/audio/one.mp3',
      pic: 'https://example.com/cover/one.jpg',
      lrc: 'https://example.com/lrc/one.lrc',
    },
    {
      name: 'Second Track',
      artist: ['Artist A', 'Artist B'],
      url: 'http://example.com/audio/two.mp3',
      pic: 'https://example.com/cover/two.jpg',
    },
  ]
}

describe('music API', () => {
  it('manages playlists in admin and exposes only visible playlists publicly', async () => {
    const { testContext, agent, csrf } = await setupAdmin()

    const created = await agent.post('/api/admin/music/playlists').set('X-CSRF-Token', csrf).send({
      name: '网易云测试歌单',
      server: 'netease',
      playlistId: '3778678',
      sortOrder: 2,
      visible: true,
    })
    expect(created.status).toBe(201)
    expect(created.body.playlist.name).toBe('网易云测试歌单')

    const hidden = await agent.post('/api/admin/music/playlists').set('X-CSRF-Token', csrf).send({
      name: '隐藏歌单',
      server: 'tencent',
      playlistId: 'abc123',
      sortOrder: 1,
      visible: false,
    })
    expect(hidden.status).toBe(201)

    const publicList = await request(testContext.app).get('/api/music/playlists')
    expect(publicList.status).toBe(200)
    expect(publicList.body.items).toEqual([
      { id: created.body.playlist.id, name: '网易云测试歌单' },
    ])

    const hiddenDetail = await request(testContext.app).get(
      `/api/music/playlists/${hidden.body.playlist.id}`,
    )
    expect(hiddenDetail.status).toBe(404)

    const adminList = await agent.get('/api/admin/music/playlists')
    expect(adminList.body.items).toHaveLength(2)
  })

  it('proxies and normalizes Meting playlist tracks with caching', async () => {
    const { testContext, agent, csrf } = await setupAdmin()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(metingTracks()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const created = await agent.post('/api/admin/music/playlists').set('X-CSRF-Token', csrf).send({
      name: '测试歌单',
      server: 'netease',
      playlistId: '3778678',
      visible: true,
    })
    const playlistId = created.body.playlist.id as number

    const first = await request(testContext.app).get(`/api/music/playlists/${playlistId}`)
    expect(first.status).toBe(200)
    expect(first.body.playlist.name).toBe('测试歌单')
    expect(first.body.tracks).toHaveLength(2)
    expect(first.body.tracks[0]).toMatchObject({
      name: '天依的测试曲',
      artist: '洛天依',
      url: 'https://example.com/audio/one.mp3',
    })
    expect(first.body.tracks[1].artist).toBe('Artist A / Artist B')

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string)
    expect(calledUrl.searchParams.get('server')).toBe('netease')
    expect(calledUrl.searchParams.get('type')).toBe('playlist')
    expect(calledUrl.searchParams.get('id')).toBe('3778678')

    const second = await request(testContext.app).get(`/api/music/playlists/${playlistId}`)
    expect(second.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns a friendly error when Meting fails', async () => {
    const { testContext, agent, csrf } = await setupAdmin()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('upstream failure', { status: 503 })),
    )

    const created = await agent
      .post('/api/admin/music/playlists')
      .set('X-CSRF-Token', csrf)
      .send({ name: '故障歌单', server: 'netease', playlistId: 'broken', visible: true })

    const response = await request(testContext.app).get(
      `/api/music/playlists/${created.body.playlist.id}`,
    )
    expect(response.status).toBe(502)
    expect(response.body.error.code).toBe('METING_HTTP_ERROR')
  })

  it('updates, previews and deletes playlists', async () => {
    const { agent, csrf } = await setupAdmin()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(metingTracks()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const created = await agent
      .post('/api/admin/music/playlists')
      .set('X-CSRF-Token', csrf)
      .send({ name: '待更新', server: 'netease', playlistId: '123', visible: false })
    const id = created.body.playlist.id as number

    const updated = await agent
      .put(`/api/admin/music/playlists/${id}`)
      .set('X-CSRF-Token', csrf)
      .send({
        name: '更新后的歌单',
        server: 'kugou',
        playlistId: '456',
        sortOrder: 4,
        visible: true,
      })
    expect(updated.status).toBe(200)
    expect(updated.body.playlist).toMatchObject({
      name: '更新后的歌单',
      server: 'kugou',
      playlistId: '456',
      sortOrder: 4,
      visible: true,
    })

    const preview = await agent.get(`/api/admin/music/playlists/${id}/preview`)
    expect(preview.status).toBe(200)
    expect(preview.body.tracks).toHaveLength(2)

    const removed = await agent.delete(`/api/admin/music/playlists/${id}`).set('X-CSRF-Token', csrf)
    expect(removed.status).toBe(200)

    const missing = await agent.get(`/api/admin/music/playlists/${id}/preview`)
    expect(missing.status).toBe(404)
  })

  it('validates playlist input', async () => {
    const { agent, csrf } = await setupAdmin()
    const response = await agent
      .post('/api/admin/music/playlists')
      .set('X-CSRF-Token', csrf)
      .send({ name: '', server: 'Netease!', playlistId: '../etc/passwd' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})
