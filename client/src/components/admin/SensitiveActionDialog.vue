<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import CaptchaWidget from '@/components/CaptchaWidget.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    loading?: boolean
    error?: string
  }>(),
  {
    description: '',
    confirmLabel: '验证并继续',
    loading: false,
    error: '',
  },
)

const emit = defineEmits<{
  confirm: [token: string]
  cancel: []
}>()

const token = ref('')
const widgetError = ref('')
const captchaRef = ref<InstanceType<typeof CaptchaWidget> | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

let lastFocused: HTMLElement | null = null
let previousBodyOverflow = ''

function resetCaptcha(): void {
  token.value = ''
  widgetError.value = ''
  captchaRef.value?.reset()
}

function close(): void {
  emit('cancel')
}

function confirm(): void {
  if (!token.value || props.loading) return
  emit('confirm', token.value)
}

function onSolved(value: string): void {
  token.value = value
  widgetError.value = ''
}

function onWidgetError(message: string): void {
  token.value = ''
  widgetError.value = message
}

function onWidgetReset(): void {
  token.value = ''
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return

  const focusable = Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      resetCaptcha()
      await nextTick()
      cancelButton.value?.focus()
      return
    }
    document.body.style.overflow = previousBodyOverflow
    void nextTick(() => lastFocused?.focus())
  },
)

onMounted(() => document.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousBodyOverflow
})

defineExpose({ reset: resetCaptcha })
</script>

<template>
  <Teleport to="body">
    <Transition name="captcha-dialog">
      <div v-if="open" class="captcha-dialog" @click.self="close">
        <section
          ref="panel"
          class="captcha-dialog__panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="captcha-dialog-title"
          aria-describedby="captcha-dialog-description"
        >
          <div class="captcha-dialog__mark" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z" />
              <path d="M9.5 12l1.7 1.7L15 10" />
            </svg>
          </div>

          <header class="captcha-dialog__head">
            <p class="mono">HUMAN_CHECK // SENSITIVE_ACTION</p>
            <h2 id="captcha-dialog-title">{{ title }}</h2>
            <p v-if="description" id="captcha-dialog-description">{{ description }}</p>
          </header>

          <div class="captcha-dialog__widget">
            <CaptchaWidget
              ref="captchaRef"
              @solved="onSolved"
              @error="onWidgetError"
              @reset="onWidgetReset"
            />
          </div>

          <p v-if="token" class="captcha-dialog__ready" role="status">人机验证已完成，可以继续。</p>
          <p v-else class="captcha-dialog__hint">请先完成上方人机验证。</p>
          <p v-if="widgetError || error" class="captcha-dialog__error" role="alert">
            {{ error || widgetError }}
          </p>

          <div class="captcha-dialog__actions">
            <button ref="cancelButton" type="button" class="btn" :disabled="loading" @click="close">
              取消
            </button>
            <button
              type="button"
              class="btn btn--primary"
              :disabled="!token || loading"
              @click="confirm"
            >
              {{ loading ? '验证中…' : confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.captcha-dialog {
  position: fixed;
  inset: 0;
  z-index: 310;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(3, 12, 20, 0.62);
  backdrop-filter: blur(calc(10px * var(--blur-factor)));
}

.captcha-dialog__panel {
  width: min(100%, 460px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: clamp(24px, 4vw, 32px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
}

.captcha-dialog__mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(var(--brand-rgb), 0.35);
  border-radius: 14px;
  background: rgba(var(--brand-rgb), 0.12);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .captcha-dialog__mark {
  color: var(--brand);
}

.captcha-dialog__head {
  margin-top: 17px;
}

.captcha-dialog__head > p:first-child {
  color: var(--brand-deep);
  font-size: 0.56rem;
  letter-spacing: 0.12em;
}

:root[data-theme='dark'] .captcha-dialog__head > p:first-child {
  color: var(--brand);
}

.captcha-dialog__head h2 {
  margin-top: 8px;
  font-size: 1.4rem;
}

.captcha-dialog__head > p:last-child {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.75;
}

.captcha-dialog__widget {
  margin-top: 20px;
}

.captcha-dialog__hint,
.captcha-dialog__ready {
  margin-top: 7px;
  color: var(--muted);
  font-size: 0.68rem;
}

.captcha-dialog__ready {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .captcha-dialog__ready {
  color: var(--brand);
}

.captcha-dialog__error {
  margin-top: 9px;
  color: #c24040;
  font-size: 0.74rem;
  line-height: 1.6;
}

:root[data-theme='dark'] .captcha-dialog__error {
  color: #ff9a9a;
}

.captcha-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 22px;
}

.captcha-dialog-enter-active,
.captcha-dialog-leave-active {
  transition: opacity 180ms ease;
}

.captcha-dialog-enter-active .captcha-dialog__panel,
.captcha-dialog-leave-active .captcha-dialog__panel {
  transition: transform 220ms var(--ease-out);
}

.captcha-dialog-enter-from,
.captcha-dialog-leave-to {
  opacity: 0;
}

.captcha-dialog-enter-from .captcha-dialog__panel,
.captcha-dialog-leave-to .captcha-dialog__panel {
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 520px) {
  .captcha-dialog {
    padding: 14px;
  }

  .captcha-dialog__panel {
    max-height: calc(100vh - 28px);
    padding: 22px;
  }

  .captcha-dialog__actions {
    flex-direction: column-reverse;
  }

  .captcha-dialog__actions .btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .captcha-dialog-enter-active,
  .captcha-dialog-leave-active,
  .captcha-dialog-enter-active .captcha-dialog__panel,
  .captcha-dialog-leave-active .captcha-dialog__panel {
    transition: none;
  }
}
</style>
