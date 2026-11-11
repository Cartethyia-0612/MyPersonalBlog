let csrfToken = ''

export function setCsrfToken(token: string): void {
  csrfToken = token
}

/**
 * The token is normally kept in memory from /api/auth/session. Reading the
 * readable double-submit cookie is only a fallback for the first request.
 */
export function getCsrfToken(): string {
  if (csrfToken) return csrfToken
  if (typeof document === 'undefined') return ''

  const entry = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('eshi_csrf='))
  return entry ? decodeURIComponent(entry.slice('eshi_csrf='.length)) : ''
}

export function clearCsrfToken(): void {
  csrfToken = ''
}
