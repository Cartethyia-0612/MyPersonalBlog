<script setup lang="ts">
import type { CapWidget } from 'cap-widget'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { loadCapWidget } from '@/lib/captcha'

const emit = defineEmits<{
  solved: [token: string]
  error: [message: string]
  reset: []
}>()

const container = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')

let widget: CapWidget | null = null
let disposed = false

function mountWidget(): void {
  loading.value = true
  loadError.value = ''

  void loadCapWidget()
    .then(() => {
      if (disposed || !container.value) return

      widget?.remove()
      const element = document.createElement('cap-widget')
      element.setAttribute('data-cap-api-endpoint', '/api/auth/captcha/')
      element.setAttribute('data-cap-lang', 'zh-cn')

      element.addEventListener('solve', (event) => {
        const token = event.detail?.token
        if (token) emit('solved', token)
      })
      element.addEventListener('error', (event) => {
        emit('error', event.detail?.message || '人机验证未通过，请重试。')
      })
      element.addEventListener('reset', () => emit('reset'))

      container.value.replaceChildren(element)
      widget = element
      loading.value = false
    })
    .catch(() => {
      if (disposed) return
      loading.value = false
      loadError.value = '人机验证组件加载失败，请检查网络后重试。'
    })
}

function reset(): void {
  widget?.reset()
}

onMounted(mountWidget)

onBeforeUnmount(() => {
  disposed = true
  widget?.remove()
  widget = null
})

defineExpose({ reset })
</script>

<template>
  <div class="captcha-widget">
    <div ref="container" class="captcha-widget__mount" />

    <p v-if="loading" class="captcha-widget__status mono">HUMAN_CHECK // LOADING...</p>

    <p v-else-if="loadError" class="captcha-widget__error" role="status">
      {{ loadError }}
      <button type="button" class="captcha-widget__retry" @click="mountWidget">重试</button>
    </p>
  </div>
</template>

<style scoped>
.captcha-widget {
  display: grid;
  gap: 7px;
}

.captcha-widget__mount {
  display: flex;
  min-height: 46px;
  align-items: center;
}

.captcha-widget__mount :deep(cap-widget) {
  display: block;
  width: 100%;
  max-width: 100%;
  --cap-widget-width: 100%;
  --cap-widget-height: 41px;
}

.captcha-widget__status {
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
}

.captcha-widget__error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #c24040;
  font-size: 0.72rem;
  line-height: 1.6;
}

:root[data-theme='dark'] .captcha-widget__error {
  color: #ff9a9a;
}

.captcha-widget__retry {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--brand-deep);
  font-size: 0.7rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}

:root[data-theme='dark'] .captcha-widget__retry {
  color: var(--brand);
}
</style>
