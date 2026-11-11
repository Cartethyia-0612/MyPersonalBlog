import crypto from 'node:crypto'

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Constant-time comparison for two strings. Different lengths fail safely. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

interface SignedPayload {
  exp: number
}

/** Create a tamper-proof, expiring token for short-lived challenges. */
export function signPayload(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
): string {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    }),
  ).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifySignedPayload<T extends SignedPayload>(
  token: string,
  secret: string,
): T | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [body, signature] = parts
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (!timingSafeEqualString(signature, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

function deriveTotpKey(secret: string): Buffer {
  return crypto.scryptSync(secret, 'esrs-totp-secret-v1', 32)
}

/** Encrypt a TOTP secret for storage at rest using AES-256-GCM. */
export function encryptText(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveTotpKey(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

export function decryptText(payload: string, secret: string): string {
  const [version, ivPart, tagPart, ciphertextPart] = payload.split('.')
  if (version !== 'v1' || !ivPart || !tagPart || !ciphertextPart) {
    throw new Error('Unsupported encrypted value')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveTotpKey(secret),
    Buffer.from(ivPart, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64url')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
