import type { CookieOptions, Request, Response } from 'express'

import type { AppConfig } from '../config'

export const SESSION_COOKIE = 'eshi_session'
export const CSRF_COOKIE = 'eshi_csrf'

function baseCookieOptions(config: AppConfig): CookieOptions {
  return {
    secure: config.cookieSecure,
    sameSite: 'strict',
    path: '/',
  }
}

function maxAgeMs(config: AppConfig): number {
  return config.sessionTtlDays * 24 * 60 * 60 * 1000
}

export function setSessionCookie(res: Response, token: string, config: AppConfig): void {
  res.cookie(SESSION_COOKIE, token, {
    ...baseCookieOptions(config),
    httpOnly: true,
    maxAge: maxAgeMs(config),
  })
}

export function clearSessionCookie(res: Response, config: AppConfig): void {
  res.clearCookie(SESSION_COOKIE, baseCookieOptions(config))
}

export function setCsrfCookie(res: Response, token: string, config: AppConfig): void {
  res.cookie(CSRF_COOKIE, token, {
    ...baseCookieOptions(config),
    httpOnly: false,
    maxAge: maxAgeMs(config),
  })
}

export function clearAuthCookies(res: Response, config: AppConfig): void {
  res.clearCookie(SESSION_COOKIE, baseCookieOptions(config))
  res.clearCookie(CSRF_COOKIE, baseCookieOptions(config))
}

export function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined
  const value = cookies?.[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
