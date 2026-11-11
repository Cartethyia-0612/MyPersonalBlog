import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import BackToTop from './BackToTop.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

const originalDescriptors = {
  scrollY: Object.getOwnPropertyDescriptor(window, 'scrollY'),
  innerHeight: Object.getOwnPropertyDescriptor(window, 'innerHeight'),
  scrollHeight: Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight'),
}

function setViewport(scrollY: number, innerHeight: number, scrollHeight: number): void {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
}

describe('BackToTop', () => {
  let scrollToMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    document.documentElement.scrollTop = 0
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
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
    scrollToMock = vi.fn()
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: scrollToMock,
    })
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0)
        // A real rAF assigns its id before running; returning 0 here mirrors
        // the "frame cleared" state after this synchronous test callback.
        return 0
      },
    })
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      writable: true,
      value: () => undefined,
    })
    await router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    if (originalDescriptors.scrollY) {
      Object.defineProperty(window, 'scrollY', originalDescriptors.scrollY)
    }
    if (originalDescriptors.innerHeight) {
      Object.defineProperty(window, 'innerHeight', originalDescriptors.innerHeight)
    }
    if (originalDescriptors.scrollHeight) {
      Object.defineProperty(
        document.documentElement,
        'scrollHeight',
        originalDescriptors.scrollHeight,
      )
    }
    vi.restoreAllMocks()
  })

  it('stays hidden at the top of the page', async () => {
    setViewport(0, 800, 2000)
    const wrapper = mount(BackToTop, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.reading-backtop').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows scroll progress and returns to the top when clicked', async () => {
    setViewport(0, 800, 2000)
    const wrapper = mount(BackToTop, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()

    setViewport(500, 800, 2000)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    const button = wrapper.find('.reading-backtop')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('42%')
    expect(button.attributes('aria-label')).toContain('42%')

    await button.trigger('click')
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    wrapper.unmount()
  })

  it('hides again once the page is back at the top', async () => {
    setViewport(0, 800, 2000)
    const wrapper = mount(BackToTop, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()

    setViewport(500, 800, 2000)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.reading-backtop').exists()).toBe(true)

    setViewport(0, 800, 2000)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.reading-backtop').exists()).toBe(false)

    wrapper.unmount()
  })
})
