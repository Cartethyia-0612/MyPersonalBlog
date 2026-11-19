import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import LoadingScreen from './LoadingScreen.vue'

const MESSAGE = 'loading fonts, assets & inspiration...'

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('types once, keeps the text, and leaves the caret blinking', async () => {
    const wrapper = mount(LoadingScreen)
    const line = wrapper.find('.loading-screen__typing')

    expect(line.text()).toBe('')
    vi.advanceTimersByTime(320)
    await nextTick()
    expect(line.text().length).toBeGreaterThan(0)
    expect(line.text().length).toBeLessThan(MESSAGE.length)
    expect(line.classes()).not.toContain('is-done')

    vi.advanceTimersByTime(1500)
    await nextTick()
    expect(line.text()).toBe(MESSAGE)
    expect(line.classes()).toContain('is-done')

    vi.advanceTimersByTime(5000)
    await nextTick()
    expect(line.text()).toBe(MESSAGE)
    expect(line.classes()).toContain('is-done')
    wrapper.unmount()
  })
})
