import { getCsrfToken } from '@/lib/csrf'
import type { ApiErrorPayload } from '@/types/content'

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

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function request<T>(path: string, fetchOptions: RequestInit = {}): Promise<T> {
  const method = (fetchOptions.method ?? 'GET').toUpperCase()
  const headers = new Headers(fetchOptions.headers)
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  if (!SAFE_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers.set('X-CSRF-Token', csrf)
  }

  const response = await fetch(path, {
    credentials: 'same-origin',
    ...fetchOptions,
    headers,
  })

  let data: unknown = null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null)
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.startsWith('/api/auth/') &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new CustomEvent('eshi:unauthorized'))
    }
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

export function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
