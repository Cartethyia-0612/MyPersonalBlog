import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MusicPlaylistSummary, MusicTrack } from '@/types/music'
import {
  registerMediaSessionActions,
  setMediaPlaybackState,
  setMediaPositionState,
  updateMediaMetadata,
} from './mediaSession'

interface FakeSession {
  metadata: unknown
  playbackState: string
  setActionHandler: (
    action: string,
    handler: ((details: Record<string, unknown>) => void) | null,
  ) => void
  setPositionState: (state: { duration: number; position: number; playbackRate: number }) => void
}

const originalMediaSession = Object.getOwnPropertyDescriptor(navigator, 'mediaSession')
const originalMediaMetadata = globalThis.MediaMetadata
let handlers: Map<string, (details: Record<string, unknown>) => void>
let session: FakeSession

beforeEach(() => {
  handlers = new Map()
  session = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: vi.fn((action, handler) => {
      if (handler) handlers.set(action, handler)
    }),
    setPositionState: vi.fn(),
  }
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: session,
  })
  class FakeMediaMetadata {
    title: string
    artist: string
    album: string
    artwork: { src: string }[]

    constructor(init: {
      title?: string
      artist?: string
      album?: string
      artwork?: { src: string }[]
    }) {
      this.title = init.title ?? ''
      this.artist = init.artist ?? ''
      this.album = init.album ?? ''
      this.artwork = init.artwork ?? []
    }
  }
  vi.stubGlobal('MediaMetadata', FakeMediaMetadata)
})

afterEach(() => {
  vi.unstubAllGlobals()
  globalThis.MediaMetadata = originalMediaMetadata
  if (originalMediaSession) {
    Object.defineProperty(navigator, 'mediaSession', originalMediaSession)
  } else {
    Reflect.deleteProperty(navigator, 'mediaSession')
  }
})

const track: MusicTrack = {
  id: 'track-1',
  name: '测试曲目',
  artist: '测试歌手',
  url: 'https://example.com/audio.mp3',
  cover: 'https://example.com/cover.jpg',
  lrc: '',
}

const playlist: MusicPlaylistSummary = {
  id: 1,
  name: '测试歌单',
}

describe('Media Session helpers', () => {
  it('publishes track metadata including artwork', () => {
    updateMediaMetadata(track, playlist)

    const metadata = session.metadata as {
      title: string
      artist: string
      album: string
      artwork: { src: string }[]
    }
    expect(metadata.title).toBe('测试曲目')
    expect(metadata.artist).toBe('测试歌手')
    expect(metadata.album).toBe('测试歌单')
    expect(metadata.artwork[0]?.src).toBe('https://example.com/cover.jpg')
  })

  it('clears metadata and position when there is no track', () => {
    updateMediaMetadata(track, playlist)
    updateMediaMetadata(null, null)
    expect(session.metadata).toBeNull()
    expect(session.playbackState).toBe('none')
  })

  it('updates playback and position state', () => {
    setMediaPlaybackState('playing')
    expect(session.playbackState).toBe('playing')

    setMediaPositionState(180, 42, 1.25)
    expect(session.setPositionState).toHaveBeenCalledWith({
      duration: 180,
      position: 42,
      playbackRate: 1.25,
    })
  })

  it('registers and dispatches media controls', () => {
    const actions = {
      play: vi.fn(),
      pause: vi.fn(),
      previous: vi.fn(),
      next: vi.fn(),
      seekTo: vi.fn(),
      seekBy: vi.fn(),
      stop: vi.fn(),
    }
    registerMediaSessionActions(actions)

    expect(handlers.get('play')).toBe(actions.play)
    expect(handlers.get('pause')).toBe(actions.pause)
    handlers.get('seekto')?.({ seekTime: 30 })
    handlers.get('seekbackward')?.({ seekOffset: 5 })
    handlers.get('seekforward')?.({})
    expect(actions.seekTo).toHaveBeenCalledWith(30)
    expect(actions.seekBy).toHaveBeenNthCalledWith(1, -5)
    expect(actions.seekBy).toHaveBeenNthCalledWith(2, 10)
  })
})
