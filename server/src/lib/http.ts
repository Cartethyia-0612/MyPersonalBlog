import type { Request } from 'express'
import type { z } from 'zod'

import { AppError } from './errors'

export function parseBody<T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', '提交的内容不合法', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  return result.data
}

export function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

export function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown'
}
