import { authenticator } from 'otplib'
import QRCode from 'qrcode'

import { randomToken, signPayload, verifySignedPayload } from '../lib/crypto'

export const TOTP_ISSUER = '饿师傅的技术札记'
export const TOTP_CHALLENGE_TTL_SECONDS = 5 * 60
export const TOTP_PERIOD_SECONDS = 30

authenticator.options = { window: 1 }

interface TotpChallengePayload {
  sub: number
  purpose: 'totp-login'
  remember: boolean
  credentialVersion: number
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

export function verifyTotpCodeWithStep(secret: string, code: string): number | null {
  const normalized = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return null
  try {
    const delta = authenticator.checkDelta(normalized, secret)
    if (delta === null) return null
    return Math.floor(Date.now() / (TOTP_PERIOD_SECONDS * 1000)) + delta
  } catch {
    return null
  }
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return verifyTotpCodeWithStep(secret, code) !== null
}

export function createLoginChallenge(
  userId: number,
  appSecret: string,
  remember: boolean,
  credentialVersion: number,
): string {
  return signPayload(
    {
      sub: userId,
      purpose: 'totp-login',
      remember,
      credentialVersion,
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
  return {
    ...payload,
    remember: payload.remember === true,
    credentialVersion:
      typeof payload.credentialVersion === 'number' ? payload.credentialVersion : 0,
  }
}
