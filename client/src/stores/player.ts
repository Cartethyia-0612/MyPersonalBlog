import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { publicApi } from '@/lib/api'
import { toErrorMessage } from '@/lib/errors'
import type { MusicPlaylistSummary, MusicTrack } from '@/types/music'

export type PlayMode = 'list' | 'one' | 'shuffle'

const MODE_KEY = 'eshi-player-mode'
const VOLUME_KEY = 'eshi-player-volume'
const PLAYLIST_KEY = 'eshi-player-playlist'

function readMode(): PlayMode {
  if (typeof window === 'undefined') return 'list'
  const stored = window.localStorage.getItem(MODE_KEY)
  return stored === 'one' || stored === 'shuffle' || stored === 'list' ? stored : 'list'
}

function readVolume(): number {
  if (typeof window === 'undefined') return 0.72
  const stored = Number(window.localStorage.getItem(VOLUME_KEY))
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.72
}

export const usePlayerStore = defineStore('player', () => {
  const playlists = ref<MusicPlaylistSummary[]>([])
  const currentPlaylistId = ref<number | null>(null)
  const tracks = ref<MusicTrack[]>([])
  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const loadingPlaylists = ref(false)
  const loadingTracks = ref(false)
  const initialized = ref(false)
  const panelOpen = ref(false)
  const error = ref('')
  const mode = ref<PlayMode>(readMode())
  const volume = ref(readVolume())
  const currentTime = ref(0)
  const duration = ref(0)

  let audio: HTMLAudioElement | null = null
  let initPromise: Promise<void> | null = null
  let trackRequest = 0

  const currentTrack = computed<MusicTrack | null>(() => tracks.value[currentIndex.value] ?? null)
  const currentPlaylist = computed<MusicPlaylistSummary | null>(
    () => playlists.value.find((playlist) => playlist.id === currentPlaylistId.value) ?? null,
  )
  const hasPlaylists = computed(() => playlists.value.length > 0)
  const progress = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0,
  )
  const modeLabel = computed(() => {
    if (mode.value === 'one') return '单曲循环'
    if (mode.value === 'shuffle') return '随机播放'
    return '列表循环'
  })

  function persistMode(): void {
    if (typeof window !== 'undefined') window.localStorage.setItem(MODE_KEY, mode.value)
  }

  function persistVolume(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOLUME_KEY, String(volume.value))
    }
  }

  function persistPlaylist(): void {
    if (typeof window !== 'undefined' && currentPlaylistId.value !== null) {
      window.localStorage.setItem(PLAYLIST_KEY, String(currentPlaylistId.value))
    }
  }

  function ensureAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (audio) return audio

    audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = volume.value
    audio.addEventListener('timeupdate', () => {
      currentTime.value = Number.isFinite(audio?.currentTime) ? (audio?.currentTime ?? 0) : 0
    })
    audio.addEventListener('loadedmetadata', () => {
      duration.value = Number.isFinite(audio?.duration) ? (audio?.duration ?? 0) : 0
    })
    audio.addEventListener('ended', () => {
      void handleEnded()
    })
    audio.addEventListener('error', () => {
      if (!currentTrack.value) return
      error.value = '当前曲目暂时无法播放，可以试试下一首'
      isPlaying.value = false
    })
    return audio
  }

  function setSource(): void {
    const player = ensureAudio()
    if (!player) return
    const track = currentTrack.value
    currentTime.value = 0
    duration.value = 0
    isPlaying.value = false
    if (!track) {
      player.pause()
      player.removeAttribute('src')
      player.load()
      return
    }
    player.src = track.url
    player.load()
  }

  async function play(): Promise<void> {
    if (!currentTrack.value) {
      if (currentPlaylistId.value === null) return
      await selectPlaylist(currentPlaylistId.value, false)
      if (!currentTrack.value) return
    }
    const player = ensureAudio()
    if (!player) return
    try {
      await player.play()
      isPlaying.value = true
      error.value = ''
    } catch {
      isPlaying.value = false
      error.value = '浏览器阻止了自动播放，请再点一次播放'
    }
  }

  function pause(): void {
    audio?.pause()
    isPlaying.value = false
  }

  function toggle(): void {
    if (isPlaying.value) pause()
    else void play()
  }

  async function selectPlaylist(id: number, autoplay = false): Promise<void> {
    const playlist = playlists.value.find((item) => item.id === id)
    if (!playlist) return
    if (currentPlaylistId.value === id && tracks.value.length > 0) {
      if (autoplay) await play()
      return
    }

    const request = ++trackRequest
    loadingTracks.value = true
    error.value = ''
    try {
      const result = await publicApi.getMusicPlaylist(id)
      if (request !== trackRequest) return
      currentPlaylistId.value = id
      tracks.value = result.tracks
      currentIndex.value = 0
      persistPlaylist()
      setSource()
      if (autoplay) await play()
    } catch (err) {
      if (request !== trackRequest) return
      error.value = toErrorMessage(err, '歌单加载失败')
      tracks.value = []
    } finally {
      if (request === trackRequest) loadingTracks.value = false
    }
  }

  function loadIndex(index: number, autoplay = true): void {
    if (tracks.value.length === 0) return
    const normalized = Math.min(Math.max(index, 0), tracks.value.length - 1)
    currentIndex.value = normalized
    setSource()
    if (autoplay) void play()
  }

  function next(autoplay = true): void {
    if (tracks.value.length === 0) return
    if (mode.value === 'shuffle' && tracks.value.length > 1) {
      let nextIndex = currentIndex.value
      while (nextIndex === currentIndex.value) {
        nextIndex = Math.floor(Math.random() * tracks.value.length)
      }
      loadIndex(nextIndex, autoplay)
      return
    }
    loadIndex((currentIndex.value + 1) % tracks.value.length, autoplay)
  }

  function previous(): void {
    if (tracks.value.length === 0) return
    loadIndex((currentIndex.value - 1 + tracks.value.length) % tracks.value.length, isPlaying.value)
  }

  async function handleEnded(): Promise<void> {
    if (mode.value === 'one') {
      const player = ensureAudio()
      if (!player) return
      player.currentTime = 0
      await play()
      return
    }
    next(true)
  }

  function cycleMode(): void {
    mode.value = mode.value === 'list' ? 'one' : mode.value === 'one' ? 'shuffle' : 'list'
    persistMode()
  }

  function setVolume(value: number): void {
    const normalized = Math.min(1, Math.max(0, value))
    volume.value = normalized
    if (audio) audio.volume = normalized
    persistVolume()
  }

  function seekRatio(ratio: number): void {
    if (!audio || !duration.value) return
    const time = Math.min(duration.value, Math.max(0, ratio * duration.value))
    audio.currentTime = time
    currentTime.value = time
  }

  function togglePanel(): void {
    panelOpen.value = !panelOpen.value
  }

  function closePanel(): void {
    panelOpen.value = false
  }

  async function loadPlaylists(): Promise<void> {
    if (loadingPlaylists.value) return
    loadingPlaylists.value = true
    error.value = ''
    try {
      const result = await publicApi.getMusicPlaylists()
      playlists.value = result.items
      if (playlists.value.length === 0) {
        currentPlaylistId.value = null
        tracks.value = []
        initialized.value = true
        return
      }
      const stored = Number(window.localStorage.getItem(PLAYLIST_KEY))
      const target =
        playlists.value.find((playlist) => playlist.id === stored) ?? playlists.value[0]
      await selectPlaylist(target.id, false)
    } catch (err) {
      error.value = toErrorMessage(err, '音乐歌单加载失败')
    } finally {
      loadingPlaylists.value = false
      initialized.value = true
    }
  }

  function init(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    if (initPromise) return initPromise
    initPromise = loadPlaylists().finally(() => {
      initPromise = null
    })
    return initPromise
  }

  function retry(): Promise<void> {
    if (playlists.value.length === 0) return loadPlaylists()
    if (currentPlaylistId.value !== null)
      return selectPlaylist(currentPlaylistId.value, isPlaying.value)
    return loadPlaylists()
  }

  return {
    playlists,
    currentPlaylistId,
    tracks,
    currentIndex,
    isPlaying,
    loadingPlaylists,
    loadingTracks,
    initialized,
    panelOpen,
    error,
    mode,
    volume,
    currentTime,
    duration,
    currentTrack,
    currentPlaylist,
    hasPlaylists,
    progress,
    modeLabel,
    init,
    retry,
    play,
    pause,
    toggle,
    selectPlaylist,
    loadIndex,
    next,
    previous,
    cycleMode,
    setVolume,
    seekRatio,
    togglePanel,
    closePanel,
  }
})
