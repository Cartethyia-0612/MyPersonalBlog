import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearExternalLinkConsent,
  hasExternalLinkConsent,
  isExemptHost,
  rememberExternalLinkConsent,
  resolveExternalLink,
} from './externalLink'

function link(href: string, attributes: Record<string, string> = {}): HTMLAnchorElement {
  const anchor = document.createElement('a')
  anchor.href = href
  for (const [name, value] of Object.entries(attributes)) anchor.setAttribute(name, value)
  document.body.appendChild(anchor)
  return anchor
}

describe('external link guard', () => {
  beforeEach(() => {
    clearExternalLinkConsent()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    clearExternalLinkConsent()
    document.body.innerHTML = ''
  })

  it('exempts the two beian domains and their subdomains', () => {
    expect(isExemptHost('beian.miit.gov.cn')).toBe(true)
    expect(isExemptHost('www.beian.mps.gov.cn')).toBe(true)
    expect(isExemptHost('example.com')).toBe(false)
  })

  it('ignores same-site, hash, mail and download links', () => {
    expect(resolveExternalLink(link('/articles'))).toBeNull()
    expect(resolveExternalLink(link('#section'))).toBeNull()
    expect(resolveExternalLink(link('mailto:hi@example.com'))).toBeNull()
    expect(resolveExternalLink(link('https://example.com/file.zip', { download: '' }))).toBeNull()
    expect(resolveExternalLink(link('https://beian.miit.gov.cn/'))).toBeNull()
  })

  it('returns the target for a genuine external link', () => {
    const target = resolveExternalLink(link('https://example.com/path?q=1', { target: '_blank' }))
    expect(target).toEqual({
      url: 'https://example.com/path?q=1',
      host: 'example.com',
    })
  })

  it('remembers and clears the allow choice', () => {
    expect(hasExternalLinkConsent()).toBe(false)
    rememberExternalLinkConsent()
    expect(hasExternalLinkConsent()).toBe(true)
    clearExternalLinkConsent()
    expect(hasExternalLinkConsent()).toBe(false)
  })
})
