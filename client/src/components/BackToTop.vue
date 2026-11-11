<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const circumference = 2 * Math.PI * 20
const gradientId = `backtop-gradient-${useId()}`
const progress = ref(0)
const visible = ref(false)

let frame = 0
let reduceMotion = false

const dashOffset = computed(() => circumference * (1 - progress.value / 100))

function updateProgress(): void {
  if (typeof window === 'undefined') return
  const scrollTop = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0)
  const scrollable = document.documentElement.scrollHeight - window.innerHeight

  if (scrollTop <= 0) {
    progress.value = 0
    visible.value = false
    return
  }

  const nextProgress = scrollable > 0 ? Math.round((scrollTop / scrollable) * 100) : 0
  progress.value = Math.min(100, Math.max(1, nextProgress))
  visible.value = true
}

function scheduleUpdate(): void {
  if (frame) return
  frame = window.requestAnimationFrame(() => {
    frame = 0
    updateProgress()
  })
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

watch(
  () => route.fullPath,
  () => {
    void nextTick(updateProgress)
  },
)

onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate, { passive: true })
  updateProgress()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleUpdate)
  window.removeEventListener('resize', scheduleUpdate)
  if (frame) window.cancelAnimationFrame(frame)
})
</script>

<template>
  <Transition name="backtop">
    <button
      v-if="visible"
      type="button"
      class="reading-backtop"
      :aria-label="`返回顶部，当前阅读进度 ${progress}%`"
      :title="`返回顶部 · 阅读进度 ${progress}%`"
      @click="scrollToTop"
    >
      <svg class="reading-backtop__ring" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#66CCFF" />
            <stop offset="1" stop-color="#7AF0FF" />
          </linearGradient>
        </defs>
        <circle class="reading-backtop__track" cx="24" cy="24" r="20" />
        <circle
          class="reading-backtop__value"
          cx="24"
          cy="24"
          r="20"
          :stroke="`url(#${gradientId})`"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
        />
      </svg>

      <span class="reading-backtop__inner">
        <span class="reading-backtop__percent mono">{{ progress }}%</span>
        <svg
          class="reading-backtop__arrow"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
        </svg>
      </span>
    </button>
  </Transition>
</template>

<style scoped>
.reading-backtop {
  position: fixed;
  right: 22px;
  bottom: var(--backtop-bottom, 26px);
  z-index: 64;
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(18px) saturate(1.2);
  transition:
    border-color var(--duration-fast) ease,
    transform var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) ease;
}

.reading-backtop:hover {
  border-color: rgba(var(--brand-rgb), 0.48);
  box-shadow: var(--shadow-md);
  transform: translateY(-3px);
}

.reading-backtop__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.reading-backtop__track,
.reading-backtop__value {
  fill: none;
  stroke-width: 2.4;
}

.reading-backtop__track {
  stroke: var(--border-strong);
  opacity: 0.55;
}

.reading-backtop__value {
  stroke-linecap: round;
  transition: stroke-dashoffset 220ms var(--ease-out);
}

.reading-backtop__inner {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}

.reading-backtop__percent,
.reading-backtop__arrow {
  grid-area: 1 / 1;
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-base) var(--ease-out);
}

.reading-backtop__percent {
  color: var(--brand-deep);
  font-size: 0.59rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  opacity: 1;
  transform: translateY(0);
}

:root[data-theme='dark'] .reading-backtop__percent {
  color: var(--brand);
}

.reading-backtop__arrow {
  color: var(--brand-deep);
  opacity: 0;
  transform: translateY(5px);
}

:root[data-theme='dark'] .reading-backtop__arrow {
  color: var(--brand);
}

.reading-backtop:hover .reading-backtop__percent,
.reading-backtop:focus-visible .reading-backtop__percent {
  opacity: 0;
  transform: translateY(-5px);
}

.reading-backtop:hover .reading-backtop__arrow,
.reading-backtop:focus-visible .reading-backtop__arrow {
  opacity: 1;
  transform: translateY(0);
}

.backtop-enter-active,
.backtop-leave-active {
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-base) var(--ease-out);
}

.backtop-enter-from,
.backtop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.94);
}

@media (hover: none) {
  .reading-backtop__percent {
    opacity: 0;
    transform: translateY(-5px);
  }

  .reading-backtop__arrow {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 680px) {
  .reading-backtop {
    right: 14px;
    width: 50px;
    height: 50px;
  }

  .reading-backtop__percent {
    font-size: 0.55rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reading-backtop,
  .reading-backtop__value,
  .reading-backtop__percent,
  .reading-backtop__arrow,
  .backtop-enter-active,
  .backtop-leave-active {
    transition: none;
  }
}
</style>
