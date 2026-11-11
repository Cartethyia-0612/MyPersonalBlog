import type { ArticleStatus, Friend, Paginated, ArticleSummary } from '@/types/content'

export interface AdminUser {
  id: number
  username: string
  totpEnabled: boolean
}

export interface SessionResponse {
  authenticated: boolean
  user: AdminUser | null
  csrfToken: string
}

export interface LoginResponse {
  requiresTotp: boolean
  challengeToken?: string
  expiresIn?: number
  user?: AdminUser
  csrfToken?: string
  expiresAt?: string
}

export type ArticleInput = {
  title: string
  slug?: string
  summary: string
  contentMd: string
  coverUrl: string
  tags: string[]
  status: ArticleStatus
}

export type FriendInput = {
  name: string
  url: string
  avatarUrl: string
  description: string
  sortOrder: number
  visible: boolean
}

export interface AdminOverview {
  articles: { total: number; published: number; drafts: number }
  friends: { total: number; visible: number }
  playlists: { total: number }
  security: { username: string; totpEnabled: boolean }
  recentArticles: Array<{
    id: number
    title: string
    slug: string
    status: ArticleStatus
    updated_at: string
  }>
}

export interface AdminSettings {
  site: {
    name: string
    tagline: string
    description: string
    icon: string
    author: string
    siteUrl: string
  }
  footer: {
    icp: string
    policeIcp: string
    policeUrl: string
    virtualRecord: string
    customText: string
    copyright: string
  }
  music: { apiBase: string }
}

export interface AdminSettingsPatch {
  site?: Partial<AdminSettings['site']>
  footer?: Partial<AdminSettings['footer']>
  music?: Partial<AdminSettings['music']>
}

export interface UploadResponse {
  url: string
  mime: string
  size: number
  filename: string
}

export interface SecurityInfo {
  username: string
  totpEnabled: boolean
  hasPendingTotpSecret: boolean
}

export interface TotpSetupResponse {
  secret: string
  otpauthUrl: string
  qrDataUrl: string
  issuer: string
  account: string
}

export type AdminArticleList = Paginated<ArticleSummary>
export type { Friend }
