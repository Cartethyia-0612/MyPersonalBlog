export interface UserRow {
  id: number
  username: string
  password_hash: string
  totp_secret_enc: string | null
  totp_enabled: number
  created_at: string
  updated_at: string
}

export interface PublicUser {
  id: number
  username: string
  totpEnabled: boolean
}

export interface SessionContext {
  id: string
  userId: number
  csrfToken: string
  expiresAt: string
}

export interface SessionRow {
  session_id: string
  user_id: number
  csrf_token: string
  expires_at: string
  last_seen_at: string
  username: string
  totp_enabled: number
}
