import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { AppConfig } from '../config'
import { AppError } from '../lib/errors'

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

interface DetectedImage {
  extension: string
  mime: string
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])
const GIF87_SIGNATURE = Buffer.from('GIF87a', 'ascii')
const GIF89_SIGNATURE = Buffer.from('GIF89a', 'ascii')
const ICO_SIGNATURE = Buffer.from([0x00, 0x00, 0x01, 0x00])

export function detectImageType(buffer: Buffer): DetectedImage | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { extension: 'png', mime: 'image/png' }
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) {
    return { extension: 'jpg', mime: 'image/jpeg' }
  }
  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).equals(GIF87_SIGNATURE) || buffer.subarray(0, 6).equals(GIF89_SIGNATURE))
  ) {
    return { extension: 'gif', mime: 'image/gif' }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extension: 'webp', mime: 'image/webp' }
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(ICO_SIGNATURE)) {
    return { extension: 'ico', mime: 'image/x-icon' }
  }
  return null
}

/**
 * Validate uploaded bytes by magic number, not by the client-provided MIME type
 * or filename. SVG is intentionally rejected to prevent stored XSS through
 * same-origin asset serving.
 */
export function saveUploadedImage(
  file: Express.Multer.File,
  config: AppConfig,
  kind: 'icon' | 'image' = 'image',
): { url: string; mime: string; size: number; filename: string } {
  if (!file.buffer || file.buffer.length === 0) {
    throw new AppError(400, 'EMPTY_FILE', '上传的文件为空')
  }
  if (file.buffer.length > MAX_UPLOAD_BYTES) {
    throw new AppError(413, 'FILE_TOO_LARGE', '图片不能超过 2MB')
  }

  const detected = detectImageType(file.buffer)
  if (!detected) {
    throw new AppError(
      415,
      'UNSUPPORTED_IMAGE',
      '仅支持 PNG、JPEG、GIF、WebP 或 ICO 图片（不允许 SVG）',
    )
  }

  fs.mkdirSync(config.uploadDir, { recursive: true })
  const prefix = kind === 'icon' ? 'icon' : 'image'
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `${prefix}-${stamp}-${crypto.randomBytes(8).toString('hex')}.${detected.extension}`
  const destination = path.join(config.uploadDir, filename)

  fs.writeFileSync(destination, file.buffer, { mode: 0o644, flag: 'wx' })

  return {
    url: `/uploads/${filename}`,
    mime: detected.mime,
    size: file.buffer.length,
    filename,
  }
}
