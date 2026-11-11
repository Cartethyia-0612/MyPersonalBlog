import { authenticator } from 'otplib'
import QRCode from 'qrcode'

import { randomToken, signPayload, verifySignedPayload } from '../lib/crypto'

export const TOTP_ISSUER = '饿师傅的技术札记'
export const TOTP_CHALLENGE_TTL_SECONDS = 5 * 60

authenticator.options = { window: 1 }

interface TotpChallengePayload {
  sub: number
  purpose: 'totp-login'
  jti: string
  exp: number
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

export function buildTotpUri(username: string, secret: string): string {
  return authenticator.keyuri(username, TOTP_ISSUER, secret)
}

export async function buildTotpQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0a2033',
      light: '#ffffff',
    },
  })
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return false
  try {
    return authenticator.verify({ token: normalized, secret })
  } catch {
    return false
  }
}

export function createLoginChallenge(userId: number, appSecret: string): string {
  return signPayload(
    {
      sub: userId,
      purpose: 'totp-login',
      jti: randomToken(12),
    },
    appSecret,
    TOTP_CHALLENGE_TTL_SECONDS,
  )
}

export function verifyLoginChallenge(
  token: string,
  appSecret: string,
): TotpChallengePayload | null {
  const payload = verifySignedPayload<TotpChallengePayload>(token, appSecret)
  if (!payload || payload.purpose !== 'totp-login' || typeof payload.sub !== 'number') {
    return null
  }
  return payload
}
