export interface ExternalLinkTarget {
  url: string
  host: string
  openInNewTab: boolean
}

const EXEMPT_HOSTS = ['beian.miit.gov.cn', 'beian.mps.gov.cn']
const CONSENT_KEY = 'eshi-external-link-consent'

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '')
}

export function isExemptHost(hostname: string): boolean {
  const host = normalizeHost(hostname)
  return EXEMPT_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

export function resolveExternalLink(anchor: HTMLAnchorElement): ExternalLinkTarget | null {
  if (anchor.hasAttribute('download')) return null

  const rawHref = anchor.getAttribute('href')
  if (!rawHref || rawHref.startsWith('#')) return null

  let url: URL
  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (normalizeHost(url.hostname) === normalizeHost(window.location.hostname)) return null
  if (isExemptHost(url.hostname)) return null

  return {
    url: url.href,
    host: url.host,
    openInNewTab: anchor.target.toLowerCase() === '_blank',
  }
}

export function hasExternalLinkConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'allow'
  } catch {
    return false
  }
}

export function rememberExternalLinkConsent(): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, 'allow')
  } catch {
    // Private browsing can make localStorage unavailable; the prompt still works.
  }
}

export function clearExternalLinkConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY)
  } catch {
    // Ignore storage failures.
  }
}
