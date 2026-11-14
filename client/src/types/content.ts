export interface SiteInfo {
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

export interface FooterInfo {
  icp: string
  policeIcp: string
  policeUrl: string
  virtualRecords: FooterLink[]
  customText: string
  copyright: string
}

export interface SitePayload {
  site: SiteInfo
  footer: FooterInfo
}

export type ArticleStatus = 'draft' | 'published'

export interface ArticleSummary {
  id: number
  slug: string
  title: string
  summary: string
  coverUrl: string
  tags: string[]
  status: ArticleStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ArticleDetail extends ArticleSummary {
  contentMd: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  items: T[]
  pagination: Pagination
}

export interface Friend {
  id: number
  name: string
  url: string
  avatarUrl: string
  description: string
  sortOrder: number
  visible: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}
