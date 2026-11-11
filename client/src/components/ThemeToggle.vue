<script setup lang="ts">
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const options: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'light', label: '浅色' },
  { mode: 'dark', label: '深色' },
  { mode: 'system', label: '跟随系统' },
]

const theme = useThemeStore()
</script>

<template>
  <div class="theme-switcher" role="group" aria-label="主题模式">
    <button
      v-for="option in options"
      :key="option.mode"
      type="button"
      class="theme-switcher__button"
      :class="{ 'is-active': theme.mode === option.mode }"
      :aria-pressed="theme.mode === option.mode"
      :title="option.label"
      @click="theme.setMode(option.mode)"
    >
      <svg
        v-if="option.mode === 'light'"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
        />
      </svg>
      <svg
        v-else-if="option.mode === 'dark'"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg
        v-else
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
      <span class="theme-switcher__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  backdrop-filter: blur(16px);
}

.theme-switcher__button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 600;
  transition:
    background-color var(--duration-fast) ease,
    color var(--duration-fast) ease;
}

.theme-switcher__button:hover {
  color: var(--text);
}

.theme-switcher__button.is-active {
  background: rgba(var(--brand-rgb), 0.17);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .theme-switcher__button.is-active {
  color: var(--brand);
}

.theme-switcher__label {
  display: none;
}

@media (min-width: 680px) {
  .theme-switcher__label {
    display: inline;
  }
}
</style>
