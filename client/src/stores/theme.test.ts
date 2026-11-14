import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from './theme'

const listeners: Array<(event: MediaQueryListEvent) => void> = []

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.push(listener)
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = ''
    document.documentElement.dataset.font = ''
    listeners.length = 0
    setActivePinia(createPinia())
    mockMatchMedia(false)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to system and resolves to light when the system is light', () => {
    const store = useThemeStore()
    store.init()
    expect(store.mode).toBe('system')
    expect(store.resolved).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('persists manual light/dark selection and applies it', () => {
    const store = useThemeStore()
    store.init()
    store.setMode('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('eshi-theme')).toBe('dark')

    const secondPinia = createPinia()
    setActivePinia(secondPinia)
    const restored = useThemeStore()
    expect(restored.mode).toBe('dark')
  })

  it('defaults to the site font and persists the system font preference', () => {
    const store = useThemeStore()
    store.init()
    expect(store.fontMode).toBe('site')
    expect(document.documentElement.dataset.font).toBe('site')

    store.setFontMode('system')
    expect(document.documentElement.dataset.font).toBe('system')
    expect(localStorage.getItem('eshi-font')).toBe('system')

    const secondPinia = createPinia()
    setActivePinia(secondPinia)
    const restored = useThemeStore()
    expect(restored.fontMode).toBe('system')
  })

  it('reacts to system changes only while in system mode', () => {
    const store = useThemeStore()
    store.init()
    expect(listeners.length).toBeGreaterThan(0)

    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent))
    expect(store.resolved).toBe('dark')

    store.setMode('light')
    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent))
    expect(store.resolved).toBe('light')
  })
})
