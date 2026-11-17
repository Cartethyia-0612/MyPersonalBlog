<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  hasExternalLinkConsent,
  rememberExternalLinkConsent,
  resolveExternalLink,
  type ExternalLinkTarget,
} from '@/lib/externalLink'

const pending = ref<ExternalLinkTarget | null>(null)
const remember = ref(false)
const panel = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)

let lastFocused: HTMLElement | null = null
let previousBodyOverflow = ''

function findAnchor(event: MouseEvent): HTMLAnchorElement | null {
  for (const node of event.composedPath()) {
    if (node instanceof HTMLAnchorElement) return node
  }
  const target = event.target
  return target instanceof Element ? target.closest('a[href]') : null
}

function onDocumentClick(event: MouseEvent): void {
  const isPrimaryClick = event.type === 'click' && event.button === 0
  const isMiddleClick = event.type === 'auxclick' && event.button === 1
  if (!isPrimaryClick && !isMiddleClick) return
  if (event.defaultPrevented) return
  if (hasExternalLinkConsent()) return

  const anchor = findAnchor(event)
  if (!anchor) return

  const target = resolveExternalLink(anchor)
  if (!target) return

  event.preventDefault()
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  pending.value = {
    ...target,
    openInNewTab:
      target.openInNewTab || isMiddleClick || event.metaKey || event.ctrlKey || event.shiftKey,
  }
  remember.value = false
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (!pending.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return

  const focusable = Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

function close(): void {
  pending.value = null
  void nextTick(() => lastFocused?.focus())
}

function cancel(): void {
  close()
}

function confirm(): void {
  const target = pending.value
  if (!target) return

  if (remember.value) rememberExternalLinkConsent()
  pending.value = null

  if (target.openInNewTab) {
    const opened = window.open(target.url, '_blank', 'noopener,noreferrer')
    if (!opened) window.location.assign(target.url)
    return
  }
  window.location.assign(target.url)
}

watch(pending, (value) => {
  if (value) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    void nextTick(() => cancelButton.value?.focus())
    return
  }
  document.body.style.overflow = previousBodyOverflow
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  document.addEventListener('auxclick', onDocumentClick, true)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  document.removeEventListener('auxclick', onDocumentClick, true)
  document.removeEventListener('keydown', onDocumentKeydown)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <Teleport to="body">
    <Transition name="external-guard">
      <div v-if="pending" class="external-guard" @click.self="cancel">
        <section
          ref="panel"
          class="external-guard__panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="external-guard-title"
          aria-describedby="external-guard-description"
        >
          <div class="external-guard__mark" aria-hidden="true">
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
              <path d="M12 3 2.8 20h18.4L12 3Z" />
              <path d="M12 9v5" />
              <path d="M12 17.2v.1" />
            </svg>
          </div>

          <header class="external-guard__head">
            <p class="mono">EXTERNAL_LINK // SAFETY_CHECK</p>
            <h2 id="external-guard-title">即将离开本站</h2>
            <p id="external-guard-description">
              这是一个外部链接。目标站点的内容与隐私政策不受本站控制，请确认后再继续。
            </p>
          </header>

          <div class="external-guard__target">
            <span class="external-guard__host mono">{{ pending.host }}</span>
            <code class="external-guard__url">{{ pending.url }}</code>
          </div>

          <p class="external-guard__warning">请勿在陌生页面输入本站账号、密码或支付信息。</p>

          <label class="external-guard__remember">
            <input v-model="remember" type="checkbox" />
            <span>记住我的选择，下次不再提示</span>
          </label>

          <div class="external-guard__actions">
            <button ref="cancelButton" type="button" class="btn" @click="cancel">留在本站</button>
            <button type="button" class="btn btn--primary" @click="confirm">
              继续访问
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.external-guard {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(3, 12, 20, 0.62);
  backdrop-filter: blur(calc(10px * var(--blur-factor)));
}

.external-guard__panel {
  width: min(100%, 520px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: clamp(24px, 4vw, 34px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
}

.external-guard__mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(var(--brand-rgb), 0.35);
  border-radius: 14px;
  background: rgba(var(--brand-rgb), 0.12);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .external-guard__mark {
  color: var(--brand);
}

.external-guard__head {
  margin-top: 18px;
}

.external-guard__head > p:first-child {
  color: var(--brand-deep);
  font-size: 0.56rem;
  letter-spacing: 0.12em;
}

:root[data-theme='dark'] .external-guard__head > p:first-child {
  color: var(--brand);
}

.external-guard__head h2 {
  margin-top: 9px;
  font-size: 1.5rem;
}

.external-guard__head > p:last-child {
  margin-top: 9px;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.8;
}

.external-guard__target {
  display: grid;
  gap: 6px;
  margin-top: 20px;
  padding: 13px 15px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-alt);
}

.external-guard__host {
  color: var(--text);
  font-size: 0.72rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.external-guard__url {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.external-guard__warning {
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.7;
}

.external-guard__remember {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--text-soft);
  font-size: 0.76rem;
  line-height: 1.55;
  cursor: pointer;
}

.external-guard__remember input {
  width: 15px;
  height: 15px;
  flex: none;
  margin: 2px 0 0;
  accent-color: var(--brand-strong);
}

.external-guard__actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 22px;
}

.external-guard-enter-active,
.external-guard-leave-active {
  transition: opacity 180ms ease;
}

.external-guard-enter-active .external-guard__panel,
.external-guard-leave-active .external-guard__panel {
  transition: transform 220ms var(--ease-out);
}

.external-guard-enter-from,
.external-guard-leave-to {
  opacity: 0;
}

.external-guard-enter-from .external-guard__panel,
.external-guard-leave-to .external-guard__panel {
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 520px) {
  .external-guard {
    padding: 14px;
  }

  .external-guard__panel {
    max-height: calc(100vh - 28px);
    padding: 22px;
  }

  .external-guard__actions {
    flex-direction: column-reverse;
  }

  .external-guard__actions .btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .external-guard-enter-active,
  .external-guard-leave-active,
  .external-guard-enter-active .external-guard__panel,
  .external-guard-leave-active .external-guard__panel {
    transition: none;
  }
}
</style>
