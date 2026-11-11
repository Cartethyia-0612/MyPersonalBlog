import { request, queryString } from '@/lib/http'
import type { ArticleDetail, ArticleSummary, Friend, Paginated, SitePayload } from '@/types/content'

export { ApiError } from '@/lib/http'

export const publicApi = {
  getSite(): Promise<SitePayload> {
    return request<SitePayload>('/api/site')
  },
  getArticles(
    params: { page?: number; pageSize?: number; tag?: string } = {},
  ): Promise<Paginated<ArticleSummary>> {
    return request<Paginated<ArticleSummary>>(`/api/articles${queryString(params)}`)
  },
  getArticle(slug: string): Promise<{ article: ArticleDetail }> {
    return request<{ article: ArticleDetail }>(`/api/articles/${encodeURIComponent(slug)}`)
  },
  getFriends(): Promise<{ items: Friend[] }> {
    return request<{ items: Friend[] }>('/api/friends')
  },
  getAbout(): Promise<{ contentMd: string }> {
    return request<{ contentMd: string }>('/api/about')
  },
}
