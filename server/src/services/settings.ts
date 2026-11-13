import type { Db } from '../db'

export interface SiteSettings {
  name: string
  tagline: string
  description: string
  icon: string
  author: string
  siteUrl: string
}

export interface FooterSettings {
  icp: string
  policeIcp: string
  policeUrl: string
  virtualRecord: string
  virtualRecordUrl: string
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
  virtualRecord: '',
  virtualRecordUrl: '',
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

export function getFooterSettings(db: Db): FooterSettings {
  return readSetting(db, 'footer', DEFAULT_FOOTER_SETTINGS)
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
  const next = { ...getFooterSettings(db), ...patch }
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
