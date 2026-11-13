import type { MusicPlaylistSummary, MusicTrack } from '@/types/music'

export interface MediaSessionActions {
  play: () => void
  pause: () => void
  previous: () => void
  next: () => void
  seekTo: (seconds: number) => void
  seekBy: (seconds: number) => void
  stop: () => void
}

function getSession(): MediaSession | null {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return null
  return navigator.mediaSession ?? null
}

function canUseMetadata(): boolean {
  return typeof MediaMetadata !== 'undefined'
}

export function updateMediaMetadata(
  track: MusicTrack | null,
  playlist: MusicPlaylistSummary | null,
): void {
  const session = getSession()
  if (!session) return

  if (!track || !canUseMetadata()) {
    session.metadata = null
    try {
      session.playbackState = 'none'
    } catch {
      // Some browsers expose a partial implementation.
    }
    return
  }

  try {
    session.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist || '未知艺术家',
      album: playlist?.name ?? '固定歌单',
      artwork: track.cover ? [{ src: track.cover }] : [],
    })
  } catch {
    session.metadata = null
  }
}

export function setMediaPlaybackState(state: MediaSessionPlaybackState): void {
  const session = getSession()
  if (!session) return
  try {
    session.playbackState = state
  } catch {
    // Ignore partial implementations.
  }
}

export function setMediaPositionState(duration: number, position: number, playbackRate = 1): void {
  const session = getSession()
  if (!session?.setPositionState) return
  if (!Number.isFinite(duration) || duration <= 0) return

  try {
    session.setPositionState({
      duration,
      position: Math.min(Math.max(0, position), duration),
      playbackRate: playbackRate > 0 ? playbackRate : 1,
    })
  } catch {
    // Ignore invalid/unsupported position states.
  }
}

export function registerMediaSessionActions(actions: MediaSessionActions): void {
  const session = getSession()
  if (!session) return

  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null): void => {
    try {
      session.setActionHandler(action, handler)
    } catch {
      // Not every browser supports every action.
    }
  }

  set('play', actions.play)
  set('pause', actions.pause)
  set('previoustrack', actions.previous)
  set('nexttrack', actions.next)
  set('stop', actions.stop)
  set('seekto', (details) => {
    if (typeof details.seekTime === 'number') actions.seekTo(details.seekTime)
  })
  set('seekbackward', (details) => actions.seekBy(-(details.seekOffset ?? 10)))
  set('seekforward', (details) => actions.seekBy(details.seekOffset ?? 10))
}
