import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type FontMode = 'site' | 'system'

const STORAGE_KEY = 'eshi-theme'
const FONT_STORAGE_KEY = 'eshi-font'

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function readStoredFont(): FontMode {
  if (typeof window === 'undefined') return 'site'
  return window.localStorage.getItem(FONT_STORAGE_KEY) === 'system' ? 'system' : 'site'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const fontMode = ref<FontMode>(readStoredFont())
  const systemPrefersDark = ref(false)
  const initialized = ref(false)

  const resolved = computed<ResolvedTheme>(() =>
    mode.value === 'system' ? (systemPrefersDark.value ? 'dark' : 'light') : mode.value,
  )

  let mediaQuery: MediaQueryList | null = null

  function apply(): void {
    if (typeof document === 'undefined') return
    const theme = resolved.value
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themeMode = mode.value
    document.documentElement.dataset.font = fontMode.value
    document.documentElement.style.colorScheme = theme
    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#07121d' : '#66CCFF')
  }

  function setMode(next: ThemeMode): void {
    mode.value = next
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next)
    apply()
  }

  function setFontMode(next: FontMode): void {
    fontMode.value = next
    if (typeof window !== 'undefined') window.localStorage.setItem(FONT_STORAGE_KEY, next)
    apply()
  }

  function init(): void {
    if (initialized.value || typeof window === 'undefined') return
    initialized.value = true
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches
    mediaQuery.addEventListener('change', (event) => {
      systemPrefersDark.value = event.matches
      if (mode.value === 'system') apply()
    })
    apply()
  }

  return {
    mode,
    fontMode,
    resolved,
    initialized,
    init,
    setMode,
    setFontMode,
  }
})
