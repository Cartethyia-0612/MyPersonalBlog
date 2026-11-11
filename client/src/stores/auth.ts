import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { authApi } from '@/lib/adminApi'
import { clearCsrfToken, setCsrfToken } from '@/lib/csrf'
import type { AdminUser, LoginResponse } from '@/types/admin'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后重试'
}

export interface LoginResult {
  requiresTotp: boolean
  challengeToken?: string
  expiresIn?: number
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => Boolean(user.value))

  function applyAuthenticatedSession(
    data: LoginResponse | { user: AdminUser | null; csrfToken: string },
  ): void {
    if (data.user) user.value = data.user
    if ('csrfToken' in data && data.csrfToken) setCsrfToken(data.csrfToken)
  }

  async function fetchSession(force = false): Promise<boolean> {
    if (initialized.value && !force) return Boolean(user.value)
    loading.value = true
    error.value = ''
    try {
      const session = await authApi.getSession()
      setCsrfToken(session.csrfToken)
      user.value = session.user
      initialized.value = true
      return Boolean(session.user)
    } catch (err) {
      initialized.value = true
      error.value = messageOf(err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string): Promise<LoginResult> {
    loading.value = true
    error.value = ''
    try {
      const data = await authApi.login(username.trim(), password)
      if (data.requiresTotp) {
        return {
          requiresTotp: true,
          ...(data.challengeToken ? { challengeToken: data.challengeToken } : {}),
          ...(data.expiresIn ? { expiresIn: data.expiresIn } : {}),
        }
      }
      applyAuthenticatedSession(data)
      initialized.value = true
      return { requiresTotp: false }
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyTotp(challengeToken: string, code: string): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const data = await authApi.verifyTotp(challengeToken, code)
      applyAuthenticatedSession(data)
      initialized.value = true
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true
    try {
      await authApi.logout()
    } catch {
      // Clear local state even if the server session already expired.
    } finally {
      user.value = null
      initialized.value = true
      clearCsrfToken()
      loading.value = false
    }
  }

  function reset(): void {
    user.value = null
    initialized.value = false
    loading.value = false
    error.value = ''
    clearCsrfToken()
  }

  return {
    user,
    initialized,
    loading,
    error,
    isAuthenticated,
    fetchSession,
    login,
    verifyTotp,
    logout,
    reset,
  }
})
