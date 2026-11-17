import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ExternalLinkGuard from './ExternalLinkGuard.vue'
import { clearExternalLinkConsent } from '@/lib/externalLink'

function clickLink(href: string, target = ''): boolean {
  const anchor = document.createElement('a')
  anchor.href = href
  if (target) anchor.target = target
  document.body.appendChild(anchor)

  let guardPrevented = false
  anchor.addEventListener('click', (event) => {
    guardPrevented = event.defaultPrevented
    // Keep jsdom from trying to navigate the test document.
    event.preventDefault()
  })

  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
  anchor.dispatchEvent(event)
  return guardPrevented
}

describe('ExternalLinkGuard', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  beforeEach(() => {
    clearExternalLinkConsent()
    document.body.innerHTML = ''
    wrapper = mount(ExternalLinkGuard, { attachTo: document.body })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    clearExternalLinkConsent()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('shows the reminder for an external link and blocks the default navigation', async () => {
    expect(clickLink('https://example.com/read', '_blank')).toBe(true)

    await nextTick()
    const panel = document.querySelector('.external-guard__panel')
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('即将离开本站')
    expect(panel?.textContent).toContain('example.com')
  })

  it('remembers the choice after confirming and allows the next link', async () => {
    let opened: { href: string; target: string; rel: string } | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened = { href: this.href, target: this.target, rel: this.rel }
    })

    expect(clickLink('https://example.com/read', '_blank')).toBe(true)
    await nextTick()

    const checkbox = document.querySelector<HTMLInputElement>(
      '.external-guard__remember input[type="checkbox"]',
    )
    checkbox?.click()
    const confirmButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('继续访问'),
    )
    confirmButton?.click()

    expect(localStorage.getItem('eshi-external-link-consent')).toBe('allow')
    expect(opened).toEqual({
      href: 'https://example.com/read',
      target: '_blank',
      rel: 'noopener noreferrer',
    })
    await nextTick()
    expect(document.querySelector('.external-guard__panel')).toBeNull()

    expect(clickLink('https://example.org/other')).toBe(true)
    await nextTick()
    expect(document.querySelector('.external-guard__panel')).toBeNull()
    expect(opened).toEqual({
      href: 'https://example.org/other',
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })

  it('intercepts the same link again after the user cancels', async () => {
    expect(clickLink('https://example.com/read')).toBe(true)
    await nextTick()

    const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('留在本站'),
    )
    cancel?.click()
    await nextTick()
    expect(document.querySelector('.external-guard__panel')).toBeNull()

    expect(clickLink('https://example.com/read')).toBe(true)
    await nextTick()
    expect(document.querySelector('.external-guard__panel')).not.toBeNull()
  })

  it('opens links without target="_blank" in a new tab too', async () => {
    let opened: { href: string; target: string } | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened = { href: this.href, target: this.target }
    })

    clickLink('https://example.org/plain')
    await nextTick()
    const confirmButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('继续访问'),
    )
    confirmButton?.click()
    await nextTick()

    expect(opened).toEqual({ href: 'https://example.org/plain', target: '_blank' })
  })

  it('does not prompt for internal or exempt links', async () => {
    expect(clickLink('/articles')).toBe(false)
    expect(clickLink('https://beian.miit.gov.cn/')).toBe(false)

    await nextTick()
    expect(document.querySelector('.external-guard__panel')).toBeNull()
  })
})
