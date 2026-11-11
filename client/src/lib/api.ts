import type {
  ApiErrorPayload,
  ArticleDetail,
  Friend,
  Paginated,
  ArticleSummary,
  SitePayload,
} from '@/types/content'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface RequestOptions extends RequestInit {
  skipJson?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers,
  })

  let data: unknown = null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null)
  }

  if (!response.ok) {
    const payload = (data ?? {}) as ApiErrorPayload
    throw new ApiError(
      response.status,
      payload.error?.code ?? 'REQUEST_FAILED',
      payload.error?.message ?? '请求失败，请稍后重试',
      payload.error?.details,
    )
  }

  return data as T
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

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
