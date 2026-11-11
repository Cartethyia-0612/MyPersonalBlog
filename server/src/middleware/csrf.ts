import type { Request, RequestHandler, Response } from 'express'

import type { AppConfig } from '../config'
import { CSRF_COOKIE, clearAuthCookies, readCookie, setCsrfCookie } from '../lib/cookies'
import { randomToken, timingSafeEqualString } from '../lib/crypto'
import { AppError } from '../lib/errors'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,128}$/

function ensureToken(value: string | undefined): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value)
}

/**
 * Sets an anonymous double-submit token, or keeps the CSRF cookie in sync with
 * the authenticated session. The token is deliberately readable by the SPA;
 * the session cookie remains HttpOnly.
 */
export function createEnsureCsrfMiddleware(config: AppConfig): RequestHandler {
  return (req, res, next) => {
    const existing = readCookie(req, CSRF_COOKIE)
    const sessionToken = req.sessionContext?.csrfToken

    if (sessionToken) {
      if (existing !== sessionToken) setCsrfCookie(res, sessionToken, config)
      res.locals.csrfToken = sessionToken
      return next()
    }

    if (ensureToken(existing)) {
      res.locals.csrfToken = existing
      return next()
    }

    const token = randomToken(24)
    setCsrfCookie(res, token, config)
    res.locals.csrfToken = token
    next()
  }
}

function originAllowed(req: Request, config: AppConfig): boolean {
  const origin = req.get('origin')
  if (!origin) return true

  try {
    return config.allowedOrigins.has(new URL(origin).origin)
  } catch {
    return false
  }
}

function fetchSiteAllowed(req: Request): boolean {
  const site = req.get('sec-fetch-site')
  return !site || site === 'same-origin' || site === 'none'
}

/**
 * Verifies write requests against a token supplied in X-CSRF-Token. For a
 * logged-in session the token must match the server-side session value; for
 * anonymous requests (login) it must match the double-submit cookie. Origin
 * and Fetch Metadata checks add defense in depth.
 */
export function createRequireCsrfMiddleware(config: AppConfig): RequestHandler {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method.toUpperCase())) return next()

    if (!originAllowed(req, config) || !fetchSiteAllowed(req)) {
      clearAuthCookies(res, config)
      return next(new AppError(403, 'CSRF_ORIGIN_REJECTED', '请求来源未通过安全校验'))
    }

    const headerToken = req.get('x-csrf-token')

    if (req.sessionContext) {
      if (!headerToken || !timingSafeEqualString(headerToken, req.sessionContext.csrfToken)) {
        return next(new AppError(403, 'CSRF_INVALID', 'CSRF 校验失败，请刷新页面后重试'))
      }
      return next()
    }

    const cookieToken = readCookie(req, CSRF_COOKIE)
    if (!headerToken || !cookieToken || !timingSafeEqualString(headerToken, cookieToken)) {
      return next(new AppError(403, 'CSRF_INVALID', 'CSRF 校验失败，请刷新页面后重试'))
    }

    next()
  }
}

export function getCsrfToken(req: Request, res: Response): string {
  const token = res.locals.csrfToken as unknown
  if (typeof token === 'string') return token
  return readCookie(req, CSRF_COOKIE) ?? ''
}
