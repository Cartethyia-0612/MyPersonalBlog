import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type FontMode = 'site' | 'system'

const STORAGE_KEY = 'eshi-theme'
const FONT_STORAGE_KEY = 'eshi-font'
const BLUR_STORAGE_KEY = 'eshi-blur'
const DEFAULT_BLUR_LEVEL = 3

export const BLUR_LEVELS = [
  { level: 0, label: '关闭', factor: 0 },
  { level: 1, label: '轻微', factor: 0.3 },
  { level: 2, label: '柔和', factor: 0.55 },
  { level: 3, label: '标准', factor: 1 },
  { level: 4, label: '较强', factor: 1.3 },
  { level: 5, label: '最强', factor: 1.6 },
] as const

export type BlurLevel = (typeof BLUR_LEVELS)[number]['level']

function blurFactor(level: number): number {
  return BLUR_LEVELS.find((option) => option.level === level)?.factor ?? 1
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function readStoredFont(): FontMode {
  if (typeof window === 'undefined') return 'site'
  return window.localStorage.getItem(FONT_STORAGE_KEY) === 'system' ? 'system' : 'site'
}

function readStoredBlur(): BlurLevel {
  if (typeof window === 'undefined') return DEFAULT_BLUR_LEVEL
  const raw = window.localStorage.getItem(BLUR_STORAGE_KEY)
  if (raw === null) return DEFAULT_BLUR_LEVEL
  const stored = Number(raw)
  return Number.isInteger(stored) && stored >= 0 && stored <= 5
    ? (stored as BlurLevel)
    : DEFAULT_BLUR_LEVEL
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const fontMode = ref<FontMode>(readStoredFont())
  const blurLevel = ref<BlurLevel>(readStoredBlur())
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
    document.documentElement.dataset.blur = String(blurLevel.value)
    document.documentElement.style.setProperty('--blur-factor', String(blurFactor(blurLevel.value)))
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

  function setBlurLevel(next: number): void {
    const clamped = Math.min(5, Math.max(0, Math.trunc(next))) as BlurLevel
    blurLevel.value = clamped
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BLUR_STORAGE_KEY, String(clamped))
    }
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
    blurLevel,
    resolved,
    initialized,
    init,
    setMode,
    setFontMode,
    setBlurLevel,
  }
})
