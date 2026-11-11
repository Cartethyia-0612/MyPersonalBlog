<script setup lang="ts">
import { routeProgress } from '@/lib/progress'
</script>

<template>
  <div class="route-progress" aria-hidden="true">
    <div
      class="route-progress__bar"
      :class="{ 'is-visible': routeProgress.visible }"
      :style="{ width: `${routeProgress.value}%` }"
    />
  </div>
</template>

<style scoped>
.route-progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: 120;
  height: 2px;
  pointer-events: none;
}

.route-progress__bar {
  height: 100%;
  width: 0;
  opacity: 0;
  background: linear-gradient(90deg, var(--brand-strong), var(--brand), var(--accent));
  box-shadow: 0 0 14px rgba(var(--brand-rgb), 0.8);
  transition:
    width 220ms var(--ease-out),
    opacity 200ms ease;
}

.route-progress__bar.is-visible {
  opacity: 1;
}
</style>
