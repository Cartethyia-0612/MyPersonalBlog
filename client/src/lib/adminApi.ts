import { request, queryString } from '@/lib/http'
import type {
  AdminArticleList,
  AdminOverview,
  AdminSettings,
  AdminSettingsPatch,
  ArticleInput,
  Friend,
  FriendInput,
  LoginResponse,
  SecurityInfo,
  SessionResponse,
  TotpSetupResponse,
  UploadResponse,
} from '@/types/admin'
import type { ArticleDetail, ArticleStatus } from '@/types/content'
import type { AdminMusicPlaylist, MusicPlaylistInput, MusicPlaylistResponse } from '@/types/music'
import type { SeoKeyPatch, SeoOverview, SeoPushResponse } from '@/types/seo'

export const authApi = {
  getSession(): Promise<SessionResponse> {
    return request<SessionResponse>('/api/auth/session')
  },
  login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  verifyTotp(challengeToken: string, code: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/auth/login/totp', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code }),
    })
  },
  logout(): Promise<{ ok: true }> {
    return request<{ ok: true }>('/api/auth/logout', { method: 'POST' })
  },
}

export const adminApi = {
  getOverview(): Promise<AdminOverview> {
    return request<AdminOverview>('/api/admin/overview')
  },
  listArticles(params: {
    page?: number
    pageSize?: number
    status?: ArticleStatus
    q?: string
  }): Promise<AdminArticleList> {
    return request<AdminArticleList>(`/api/admin/articles${queryString(params)}`)
  },
  getArticle(id: number): Promise<{ article: ArticleDetail }> {
    return request<{ article: ArticleDetail }>(`/api/admin/articles/${id}`)
  },
  createArticle(payload: ArticleInput): Promise<{ article: ArticleDetail }> {
    return request<{ article: ArticleDetail }>('/api/admin/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateArticle(id: number, payload: ArticleInput): Promise<{ article: ArticleDetail }> {
    return request<{ article: ArticleDetail }>(`/api/admin/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteArticle(id: number): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/admin/articles/${id}`, { method: 'DELETE' })
  },
  getAbout(): Promise<{ contentMd: string }> {
    return request<{ contentMd: string }>('/api/admin/about')
  },
  updateAbout(contentMd: string): Promise<{ contentMd: string }> {
    return request<{ contentMd: string }>('/api/admin/about', {
      method: 'PUT',
      body: JSON.stringify({ contentMd }),
    })
  },
  listFriends(): Promise<{ items: Friend[] }> {
    return request<{ items: Friend[] }>('/api/admin/friends')
  },
  createFriend(payload: FriendInput): Promise<{ friend: Friend }> {
    return request<{ friend: Friend }>('/api/admin/friends', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateFriend(id: number, payload: FriendInput): Promise<{ friend: Friend }> {
    return request<{ friend: Friend }>(`/api/admin/friends/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteFriend(id: number): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/admin/friends/${id}`, { method: 'DELETE' })
  },
  getSettings(): Promise<AdminSettings> {
    return request<AdminSettings>('/api/admin/settings')
  },
  updateSettings(patch: AdminSettingsPatch): Promise<AdminSettings> {
    return request<AdminSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
  },
  uploadImage(file: File, kind: 'icon' | 'image' = 'image'): Promise<UploadResponse> {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return request<UploadResponse>('/api/admin/uploads', {
      method: 'POST',
      body: form,
    })
  },
  getSecurity(): Promise<SecurityInfo> {
    return request<SecurityInfo>('/api/admin/security')
  },
  changePassword(currentPassword: string, newPassword: string): Promise<{ ok: true }> {
    return request<{ ok: true }>('/api/admin/security/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },
  setupTotp(): Promise<TotpSetupResponse> {
    return request<TotpSetupResponse>('/api/admin/security/totp/setup', { method: 'POST' })
  },
  enableTotp(code: string): Promise<{ ok: true; totpEnabled: true }> {
    return request<{ ok: true; totpEnabled: true }>('/api/admin/security/totp/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },
  disableTotp(password: string, code: string): Promise<{ ok: true; totpEnabled: false }> {
    return request<{ ok: true; totpEnabled: false }>('/api/admin/security/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    })
  },
  listMusicPlaylists(): Promise<{ items: AdminMusicPlaylist[] }> {
    return request<{ items: AdminMusicPlaylist[] }>('/api/admin/music/playlists')
  },
  createMusicPlaylist(payload: MusicPlaylistInput): Promise<{ playlist: AdminMusicPlaylist }> {
    return request<{ playlist: AdminMusicPlaylist }>('/api/admin/music/playlists', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateMusicPlaylist(
    id: number,
    payload: MusicPlaylistInput,
  ): Promise<{ playlist: AdminMusicPlaylist }> {
    return request<{ playlist: AdminMusicPlaylist }>(`/api/admin/music/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteMusicPlaylist(id: number): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/admin/music/playlists/${id}`, { method: 'DELETE' })
  },
  previewMusicPlaylist(id: number): Promise<MusicPlaylistResponse> {
    return request<MusicPlaylistResponse>(`/api/admin/music/playlists/${id}/preview`)
  },
  getSeo(): Promise<SeoOverview> {
    return request<SeoOverview>('/api/admin/seo')
  },
  updateSeo(patch: SeoKeyPatch): Promise<SeoOverview> {
    return request<SeoOverview>('/api/admin/seo', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
  },
  pushIndexNow(): Promise<SeoPushResponse> {
    return request<SeoPushResponse>('/api/admin/seo/indexnow', { method: 'POST' })
  },
  pushBaidu(): Promise<SeoPushResponse> {
    return request<SeoPushResponse>('/api/admin/seo/baidu', { method: 'POST' })
  },
}
