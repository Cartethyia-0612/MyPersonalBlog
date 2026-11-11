import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { usePlayerStore } from './player'

describe('player visibility', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('hides and restores the player, persisting the preference', () => {
    const player = usePlayerStore()
    player.playlists = [{ id: 1, name: '测试歌单' }]

    expect(player.hidden).toBe(false)
    expect(player.hasVisiblePlayer).toBe(true)

    player.hidePlayer()
    expect(player.hidden).toBe(true)
    expect(player.hasVisiblePlayer).toBe(false)
    expect(localStorage.getItem('eshi-player-hidden')).toBe('1')

    const secondPinia = createPinia()
    setActivePinia(secondPinia)
    const restored = usePlayerStore()
    expect(restored.hidden).toBe(true)

    restored.showPlayer()
    expect(restored.hidden).toBe(false)
    expect(localStorage.getItem('eshi-player-hidden')).toBe('0')
  })

  it('closes the queue panel when hiding', () => {
    const player = usePlayerStore()
    player.panelOpen = true
    player.hidePlayer()
    expect(player.panelOpen).toBe(false)
  })
})
