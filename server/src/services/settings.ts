import type { Db } from '../db'

export interface SiteSettings {
  name: string
  tagline: string
  description: string
  icon: string
  author: string
  siteUrl: string
}

export interface FooterLink {
  text: string
  url: string
}

export interface FooterSettings {
  icp: string
  policeIcp: string
  policeUrl: string
  virtualRecords: FooterLink[]
  customText: string
  copyright: string
}

export interface MusicSettings {
  apiBase: string
}

export interface SeoSettings {
  indexNowKey: string
  baiduToken: string
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  name: '饿师傅的技术札记',
  tagline: '把灵感写成可复用的代码',
  description: '记录工程实践、工具折腾与灵感的个人技术博客。',
  icon: '/favicon.svg',
  author: '饿师傅',
  siteUrl: '',
}

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  icp: '',
  policeIcp: '',
  policeUrl: '',
  virtualRecords: [],
  customText: '',
  copyright: '',
}

export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  apiBase: 'https://api.qijieya.cn/meting/',
}

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  indexNowKey: '',
  baiduToken: '',
}

function readSetting<T extends object>(db: Db, key: string, fallback: T): T {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get(key) as
    { value_json: string } | undefined

  if (!row) return { ...fallback }

  try {
    const parsed = JSON.parse(row.value_json) as Partial<T>
    return { ...fallback, ...parsed }
  } catch {
    return { ...fallback }
  }
}

export function getSiteSettings(db: Db): SiteSettings {
  return readSetting(db, 'site', DEFAULT_SITE_SETTINGS)
}

interface StoredFooterSettings extends Partial<FooterSettings> {
  /** Legacy single virtual-record fields, migrated on read. */
  virtualRecord?: unknown
  virtualRecordUrl?: unknown
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeVirtualUrl(value: unknown): string {
  const url = stringValue(value).trim()
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : ''
  } catch {
    return ''
  }
}

function normalizeVirtualRecords(value: unknown): FooterLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const text = stringValue(record.text).trim()
    if (!text) return []
    return [{ text, url: normalizeVirtualUrl(record.url) }]
  })
}

export function getFooterSettings(db: Db): FooterSettings {
  const stored = readSetting<StoredFooterSettings>(
    db,
    'footer',
    DEFAULT_FOOTER_SETTINGS as StoredFooterSettings,
  )
  const virtualRecords = normalizeVirtualRecords(stored.virtualRecords)
  if (virtualRecords.length === 0) {
    const legacyText = stringValue(stored.virtualRecord).trim()
    if (legacyText) {
      virtualRecords.push({
        text: legacyText,
        url: normalizeVirtualUrl(stored.virtualRecordUrl),
      })
    }
  }

  return {
    icp: stringValue(stored.icp),
    policeIcp: stringValue(stored.policeIcp),
    policeUrl: stringValue(stored.policeUrl),
    virtualRecords,
    customText: stringValue(stored.customText),
    copyright: stringValue(stored.copyright),
  }
}

export function getMusicSettings(db: Db): MusicSettings {
  return readSetting(db, 'music', DEFAULT_MUSIC_SETTINGS)
}

export function getSeoSettings(db: Db): SeoSettings {
  return readSetting(db, 'seo', DEFAULT_SEO_SETTINGS)
}

export function getAboutContent(db: Db): string {
  return readSetting(db, 'about', { contentMd: '' }).contentMd
}

export function saveSetting<T extends object>(db: Db, key: string, value: T): void {
  db.prepare(
    `INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
  ).run(key, JSON.stringify(value), new Date().toISOString())
}

export function updateSiteSettings(db: Db, patch: Partial<SiteSettings>): SiteSettings {
  const next = { ...getSiteSettings(db), ...patch }
  saveSetting(db, 'site', next)
  return next
}

export function updateFooterSettings(db: Db, patch: Partial<FooterSettings>): FooterSettings {
  const current = getFooterSettings(db)
  const next: FooterSettings = {
    ...current,
    ...patch,
    virtualRecords: normalizeVirtualRecords(
      patch.virtualRecords === undefined ? current.virtualRecords : patch.virtualRecords,
    ),
  }
  saveSetting(db, 'footer', next)
  return next
}

export function updateMusicSettings(db: Db, patch: Partial<MusicSettings>): MusicSettings {
  const next = { ...getMusicSettings(db), ...patch }
  saveSetting(db, 'music', next)
  return next
}

export function updateSeoSettings(db: Db, patch: Partial<SeoSettings>): SeoSettings {
  const next = { ...getSeoSettings(db), ...patch }
  saveSetting(db, 'seo', next)
  return next
}

export function saveAboutContent(db: Db, contentMd: string): void {
  saveSetting(db, 'about', { contentMd })
}

/** Public URL used by canonical links, sitemap and SEO push. */
export function resolveSiteUrl(db: Db, fallback: string): string {
  const configured = getSiteSettings(db).siteUrl.trim()
  if (configured) return configured.replace(/\/+$/, '')
  return fallback.replace(/\/+$/, '')
}
