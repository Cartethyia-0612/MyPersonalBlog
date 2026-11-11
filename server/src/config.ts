import path from 'node:path'

import dotenv from 'dotenv'

// Load the repository-level .env no matter whether this file is run from
// server/src (dev) or server/dist (production).
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true })

const projectRoot = path.resolve(__dirname, '../..')
const isProduction = process.env.NODE_ENV === 'production'

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === '1' || value.toLowerCase() === 'true'
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, received: ${value}`)
  }
  return port
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

const siteUrl = normalizeOrigin(process.env.SITE_URL || 'http://localhost:5173')
const rawSecret = process.env.APP_SECRET?.trim() || ''
const nodeEnv = isProduction
  ? 'production'
  : process.env.NODE_ENV === 'test'
    ? 'test'
    : 'development'

if (nodeEnv !== 'test' && rawSecret.length < 32) {
  throw new Error(
    "APP_SECRET must be set to at least 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
  )
}

const appSecret = rawSecret || 'test-only-secret-that-is-long-enough-for-test-environments'

if (!/^https?:\/\//i.test(siteUrl)) {
  throw new Error('SITE_URL must start with http:// or https://')
}

const allowedOrigins = new Set(
  [
    siteUrl,
    ...(process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map(normalizeOrigin),
  ].filter(Boolean),
)

// Vite's dev server may be opened through either hostname. This convenience is
// never enabled in production.
if (!isProduction) {
  allowedOrigins.add('http://localhost:5173')
  allowedOrigins.add('http://127.0.0.1:5173')
}

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test'
  isProduction: boolean
  port: number
  siteUrl: string
  appSecret: string
  cookieSecure: boolean
  trustProxy: boolean
  projectRoot: string
  clientDistDir: string
  dataDir: string
  dbPath: string
  uploadDir: string
  allowedOrigins: Set<string>
  sessionTtlDays: number
}

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(projectRoot, 'data', 'blog.db')
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(projectRoot, 'uploads')

export const config: AppConfig = {
  nodeEnv,
  isProduction,
  port: readPort(process.env.PORT),
  siteUrl,
  appSecret,
  cookieSecure: readBoolean(process.env.COOKIE_SECURE, isProduction),
  trustProxy: readBoolean(process.env.TRUST_PROXY, false),
  projectRoot,
  clientDistDir: path.join(projectRoot, 'client', 'dist'),
  dataDir: path.dirname(dbPath),
  dbPath,
  uploadDir,
  allowedOrigins,
  sessionTtlDays: 7,
}
