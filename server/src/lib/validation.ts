import { z } from 'zod'

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Accept an external http(s) image or a file served from our own uploads. */
export function isImageReference(value: string): boolean {
  if (!value) return true
  if (value.startsWith('/uploads/') || value.startsWith('/assets/')) return true
  if (value === '/favicon.svg') return true
  return isHttpUrl(value)
}

export const optionalHttpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === '' || isHttpUrl(value), '请输入有效的 http(s) 地址')

export const imageReferenceSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => isImageReference(value), '图片地址需为 http(s) 地址或本站上传路径')

export const tagsSchema = z.array(z.string().trim().min(1).max(24)).max(8, '最多设置 8 个标签')

export const slugSchema = z
  .string()
  .trim()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug 只能包含小写字母、数字和短横线')
