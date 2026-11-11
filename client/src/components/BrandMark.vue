<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    size?: number
    animated?: boolean
  }>(),
  {
    size: 44,
    animated: false,
  },
)

const gradientId = `brand-gradient-${useId()}`
</script>

<template>
  <svg
    class="brand-mark"
    :class="{ 'brand-mark--animated': animated }"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c4f3ff" />
        <stop offset="0.5" stop-color="#66ccff" />
        <stop offset="1" stop-color="#258ec4" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill="#07121d" />
    <rect
      x="1.5"
      y="1.5"
      width="61"
      height="61"
      rx="17"
      :stroke="`url(#${gradientId})`"
      stroke-opacity="0.45"
      stroke-width="1.5"
    />
    <path
      d="M18 21 32 13l14 8v22l-14 8-14-8V21Z"
      :stroke="`url(#${gradientId})`"
      stroke-width="2.2"
      stroke-linejoin="round"
    />
    <path
      class="brand-mark__staff"
      d="M23.5 39V27.5l17-3.2v11"
      :stroke="`url(#${gradientId})`"
      stroke-width="2.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle class="brand-mark__note" cx="21" cy="40" r="3.4" fill="#66ccff" />
    <circle
      class="brand-mark__note brand-mark__note--delay"
      cx="38"
      cy="36.8"
      r="3.4"
      fill="#b9efff"
    />
    <path d="M47 16v10M42 21h10" stroke="#66ccff" stroke-width="1.8" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.brand-mark {
  flex: none;
  filter: drop-shadow(0 8px 18px rgba(24, 138, 190, 0.28));
}

.brand-mark--animated .brand-mark__note {
  animation: note-bounce 1.15s var(--ease-out) infinite;
}

.brand-mark--animated .brand-mark__note--delay {
  animation-delay: 180ms;
}

.brand-mark--animated .brand-mark__staff {
  animation: staff-pulse 2s ease-in-out infinite;
}

@keyframes note-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  45% {
    transform: translateY(-3px);
  }
}

@keyframes staff-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.65;
  }
}
</style>
