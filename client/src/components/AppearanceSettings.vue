<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useThemeStore, type FontMode, type ThemeMode } from '@/stores/theme'

const theme = useThemeStore()
const route = useRoute()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const themeOptions: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'light', label: '浅色' },
  { mode: 'dark', label: '深色' },
  { mode: 'system', label: '跟随系统' },
]

const fontOptions: Array<{ mode: FontMode; label: string; description: string }> = [
  {
    mode: 'site',
    label: '网站字体',
    description: '霞鹜文楷 GB · Maple Mono',
  },
  {
    mode: 'system',
    label: '系统字体',
    description: '跟随设备默认字体',
  },
]

function toggle(): void {
  open.value = !open.value
}

function close(): void {
  open.value = false
}

function onPointerDown(event: PointerEvent): void {
  if (!open.value) return
  const target = event.target
  if (target instanceof Node && root.value?.contains(target)) return
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(
  () => route.fullPath,
  () => close(),
)

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="appearance-settings">
    <button
      type="button"
      class="icon-btn appearance-settings__trigger"
      :class="{ 'is-open': open }"
      :aria-expanded="open"
      aria-controls="appearance-settings-panel"
      aria-label="显示设置"
      title="显示设置"
      @click="toggle"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h7M15 7h5M4 17h3M11 17h9" />
        <circle cx="13" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </svg>
    </button>

    <Transition name="appearance-pop">
      <section
        v-if="open"
        id="appearance-settings-panel"
        class="appearance-settings__panel"
        role="group"
        aria-label="显示与字体设置"
      >
        <header class="appearance-settings__head">
          <p class="mono">APPEARANCE</p>
          <h2>显示设置</h2>
        </header>

        <div class="appearance-settings__group">
          <p class="appearance-settings__label mono">THEME / 主题</p>
          <div class="appearance-settings__theme">
            <button
              v-for="option in themeOptions"
              :key="option.mode"
              type="button"
              class="appearance-settings__theme-button"
              :class="{ 'is-active': theme.mode === option.mode }"
              :aria-pressed="theme.mode === option.mode"
              @click="theme.setMode(option.mode)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="appearance-settings__group">
          <p class="appearance-settings__label mono">FONT / 字体</p>
          <div class="appearance-settings__fonts">
            <button
              v-for="option in fontOptions"
              :key="option.mode"
              type="button"
              class="appearance-settings__font-button"
              :class="{ 'is-active': theme.fontMode === option.mode }"
              :aria-pressed="theme.fontMode === option.mode"
              @click="theme.setFontMode(option.mode)"
            >
              <span
                class="appearance-settings__sample"
                :class="option.mode === 'site' ? 'is-site-font' : 'is-system-font'"
                aria-hidden="true"
                >Aa 字</span
              >
              <span class="appearance-settings__font-copy">
                <strong>{{ option.label }}</strong>
                <small>{{ option.description }}</small>
              </span>
              <svg
                v-if="theme.fontMode === option.mode"
                class="appearance-settings__check"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </button>
          </div>
          <p class="appearance-settings__hint">
            网站字体为子集化文件，未覆盖的字符会自动回退到系统字体。
          </p>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.appearance-settings {
  position: relative;
}

.appearance-settings__trigger.is-open {
  border-color: rgba(var(--brand-rgb), 0.45);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .appearance-settings__trigger.is-open {
  color: var(--brand);
}

.appearance-settings__panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 80;
  width: min(332px, calc(100vw - 28px));
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
  text-align: left;
}

.appearance-settings__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.appearance-settings__head p {
  color: var(--brand-deep);
  font-size: 0.52rem;
  letter-spacing: 0.12em;
}

:root[data-theme='dark'] .appearance-settings__head p {
  color: var(--brand);
}

.appearance-settings__head h2 {
  color: var(--text);
  font-size: 0.95rem;
}

.appearance-settings__group {
  display: grid;
  gap: 8px;
  padding-top: 13px;
}

.appearance-settings__label {
  color: var(--muted);
  font-size: 0.52rem;
  letter-spacing: 0.1em;
}

.appearance-settings__theme {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
}

.appearance-settings__theme-button {
  min-height: 30px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
}

.appearance-settings__theme-button:hover {
  color: var(--text);
}

.appearance-settings__theme-button.is-active {
  background: rgba(var(--brand-rgb), 0.16);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .appearance-settings__theme-button.is-active {
  color: var(--brand);
}

.appearance-settings__fonts {
  display: grid;
  gap: 5px;
}

.appearance-settings__font-button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-soft);
  text-align: left;
}

.appearance-settings__font-button:hover,
.appearance-settings__font-button.is-active {
  border-color: rgba(var(--brand-rgb), 0.4);
  background: rgba(var(--brand-rgb), 0.07);
}

.appearance-settings__sample {
  display: grid;
  width: 38px;
  height: 32px;
  flex: none;
  place-items: center;
  border-radius: 7px;
  background: var(--surface-alt);
  color: var(--text);
  font-size: 0.84rem;
}

.appearance-settings__sample.is-site-font {
  font-family: 'ESRS WenKai', serif;
}

.appearance-settings__sample.is-system-font {
  font-family: var(--font-system-sans);
}

.appearance-settings__font-copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.appearance-settings__font-copy strong {
  color: var(--text);
  font-size: 0.72rem;
  font-weight: 600;
}

.appearance-settings__font-copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appearance-settings__check {
  flex: none;
  margin-left: auto;
  color: var(--brand-deep);
}

:root[data-theme='dark'] .appearance-settings__check {
  color: var(--brand);
}

.appearance-settings__hint {
  color: var(--muted);
  font-size: 0.56rem;
  line-height: 1.6;
}

.appearance-pop-enter-active,
.appearance-pop-leave-active {
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-base) var(--ease-out);
}

.appearance-pop-enter-from,
.appearance-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

@media (max-width: 520px) {
  .appearance-settings__panel {
    position: fixed;
    top: calc(var(--header-height) + 8px);
    right: 14px;
    left: 14px;
    width: auto;
    max-width: none;
    max-height: calc(100vh - var(--header-height) - 100px);
    overflow-y: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .appearance-pop-enter-active,
  .appearance-pop-leave-active {
    transition: none;
  }
}
</style>
