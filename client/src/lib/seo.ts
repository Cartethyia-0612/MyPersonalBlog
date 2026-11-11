import { watchEffect } from 'vue'

import { absoluteUrl } from '@/lib/format'
import { useSiteStore } from '@/stores/site'

export interface SeoOptions {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  publishedTime?: string | null
  modifiedTime?: string | null
  tags?: string[]
}

function ensureMeta(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  return element
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  ensureMeta(attr, key).setAttribute('content', content)
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.remove()
}

function ensureCanonical(): HTMLLinkElement {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  return link
}

export function useSeo(getOptions: () => SeoOptions): void {
  const siteStore = useSiteStore()

  watchEffect(() => {
    if (typeof document === 'undefined') return
    const options = getOptions()
    const site = siteStore.site
    const siteName = site.name || '饿师傅的技术札记'
    const title = options.title ? `${options.title} · ${siteName}` : siteName
    const description = (options.description || site.description || site.tagline).slice(0, 160)
    const base = site.siteUrl || window.location.origin
    const canonical = absoluteUrl(window.location.pathname, base)
    const image = absoluteUrl(options.image || site.icon || '/favicon.svg', base)

    document.title = title
    setMeta('name', 'description', description)
    ensureCanonical().setAttribute('href', canonical)

    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', options.type ?? 'website')
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:site_name', siteName)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)

    if (options.noindex) {
      setMeta('name', 'robots', 'noindex, nofollow')
    } else {
      removeMeta('name', 'robots')
    }

    if (options.publishedTime) {
      setMeta('property', 'article:published_time', options.publishedTime)
    } else {
      removeMeta('property', 'article:published_time')
    }
    if (options.modifiedTime) {
      setMeta('property', 'article:modified_time', options.modifiedTime)
    } else {
      removeMeta('property', 'article:modified_time')
    }
    document.head
      .querySelectorAll('meta[property="article:tag"]')
      .forEach((element) => element.remove())
    for (const tag of options.tags ?? []) {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'article:tag')
      meta.setAttribute('content', tag)
      document.head.appendChild(meta)
    }
  })
}
