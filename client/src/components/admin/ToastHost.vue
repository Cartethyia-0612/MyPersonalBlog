<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <div class="toast-host" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="item in toastStore.items"
        :key="item.id"
        class="toast"
        :class="`toast--${item.kind}`"
        role="status"
      >
        <span class="toast__dot" aria-hidden="true" />
        <span class="toast__message">{{ item.message }}</span>
        <button
          type="button"
          class="toast__close"
          aria-label="关闭提示"
          @click="toastStore.dismiss(item.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 18px;
  right: 20px;
  z-index: 300;
  display: grid;
  width: min(92vw, 360px);
  gap: 9px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  color: var(--text);
  font-size: 0.82rem;
  line-height: 1.5;
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.toast__dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  flex: none;
  border-radius: 50%;
  background: #3fc28a;
}

.toast--error .toast__dot {
  background: #ef6b6b;
}

.toast--info .toast__dot {
  background: var(--brand-strong);
}

.toast__message {
  flex: 1;
}

.toast__close {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-fast) var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
