<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AdminIcon from '@/components/admin/AdminIcon.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import SensitiveActionDialog from '@/components/admin/SensitiveActionDialog.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { LoginDevice } from '@/types/admin'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const devices = ref<LoginDevice[]>([])
const loading = ref(true)
const error = ref('')

type DeviceAction = { type: 'one'; device: LoginDevice } | { type: 'all' }

const action = ref<DeviceAction | null>(null)
const actionOpen = ref(false)
const actionLoading = ref(false)
const actionError = ref('')
const actionDialog = ref<InstanceType<typeof SensitiveActionDialog> | null>(null)

const actionTitle = computed(() => (action.value?.type === 'all' ? '退登所有设备' : '下线该设备'))
const actionDescription = computed(() => {
  if (action.value?.type === 'all') {
    return '这会同时退登当前设备，所有浏览器都需要重新登录。请先完成人机验证。'
  }
  if (action.value?.type === 'one') {
    return `将下线「${action.value.device.label}」（${action.value.device.ip}），该设备上的登录状态会立即失效。`
  }
  return ''
})
const actionConfirmLabel = computed(() =>
  action.value?.type === 'all' ? '验证并全部退登' : '验证并下线',
)

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

async function loadDevices(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.getDevices()
    devices.value = result.items
  } catch (err) {
    error.value = toErrorMessage(err, '登录设备加载失败')
  } finally {
    loading.value = false
  }
}

function requestRevoke(device: LoginDevice): void {
  actionError.value = ''
  action.value = { type: 'one', device }
  actionOpen.value = true
}

function requestRevokeAll(): void {
  actionError.value = ''
  action.value = { type: 'all' }
  actionOpen.value = true
}

function closeAction(): void {
  actionOpen.value = false
  action.value = null
  actionError.value = ''
}

async function onActionConfirm(token: string): Promise<void> {
  const current = action.value
  if (!current) return

  actionLoading.value = true
  actionError.value = ''
  try {
    if (current.type === 'all') {
      const result = await adminApi.revokeAllDevices(token)
      closeAction()
      toast.notify(`已退登 ${result.count} 台设备，请重新登录`, 'success')
      authStore.reset()
      await router.replace({ name: 'admin-login' })
      return
    }

    await adminApi.revokeDevice(current.device.id, token)
    closeAction()
    toast.notify('该设备已下线', 'success')
    await loadDevices()
  } catch (err) {
    actionError.value = toErrorMessage(err, '设备下线失败')
    actionDialog.value?.reset()
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  void loadDevices()
})

useSeo(() => ({
  title: '登录设备',
  description: '查看与管理已登录设备',
  noindex: true,
}))
</script>

<template>
  <div class="admin-devices">
    <AdminPageHeader
      eyebrow="SYSTEM / DEVICES"
      title="登录设备管理"
      description="每次登录都会记录浏览器、系统、IP 与最近活动时间。单独下线或全部退登都需要再次完成人机验证。"
    />

    <div class="devices-toolbar">
      <RouterLink class="btn btn--ghost btn--sm" to="/admin/security">
        <span aria-hidden="true">←</span>
        返回登录与安全
      </RouterLink>
      <button
        type="button"
        class="btn btn--danger btn--sm"
        :disabled="loading || devices.length === 0"
        @click="requestRevokeAll"
      >
        一键退登所有设备
      </button>
    </div>

    <div v-if="loading" class="admin-loading admin-card"><span /><span /><span /></div>

    <div v-else-if="error" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ LOAD_ERROR ]</span>
        <h2>登录设备加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadDevices">重新加载</button>
      </div>
    </div>

    <div v-else-if="devices.length === 0" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ NO_DEVICES ]</span>
        <h2>没有找到有效的登录设备</h2>
        <p>当前会话可能已经过期，请重新登录。</p>
        <RouterLink class="btn btn--sm" to="/admin/login">前往登录</RouterLink>
      </div>
    </div>

    <div v-else class="device-list">
      <article
        v-for="device in devices"
        :key="device.id"
        class="device-card admin-card"
        :class="{ 'is-current': device.current }"
      >
        <div class="device-card__icon" aria-hidden="true">
          <AdminIcon name="devices" :size="22" />
        </div>

        <div class="device-card__main">
          <div class="device-card__head">
            <h2>{{ device.label }}</h2>
            <span v-if="device.current" class="admin-badge admin-badge--published"> 当前设备 </span>
            <span v-else class="admin-badge admin-badge--draft">其他设备</span>
          </div>

          <p class="device-card__meta mono">{{ device.ip }} · {{ device.deviceType }}</p>

          <dl class="device-card__facts">
            <div>
              <dt>登录时间</dt>
              <dd>{{ formatDateTime(device.createdAt) }}</dd>
            </div>
            <div>
              <dt>最近活动</dt>
              <dd>{{ formatDateTime(device.lastSeenAt) }}</dd>
            </div>
            <div>
              <dt>凭据到期</dt>
              <dd>{{ formatDateTime(device.expiresAt) }}</dd>
            </div>
          </dl>

          <details v-if="device.userAgent" class="device-card__ua">
            <summary class="mono">USER_AGENT</summary>
            <code>{{ device.userAgent }}</code>
          </details>
        </div>

        <div class="device-card__actions">
          <span v-if="device.current" class="device-card__current mono">CURRENT_SESSION</span>
          <button
            v-else
            type="button"
            class="btn btn--danger btn--sm"
            @click="requestRevoke(device)"
          >
            下线此设备
          </button>
        </div>
      </article>
    </div>

    <SensitiveActionDialog
      ref="actionDialog"
      :open="actionOpen"
      :title="actionTitle"
      :description="actionDescription"
      :confirm-label="actionConfirmLabel"
      :loading="actionLoading"
      :error="actionError"
      @confirm="onActionConfirm"
      @cancel="closeAction"
    />
  </div>
</template>

<style scoped>
.admin-devices {
  display: grid;
  gap: 14px;
}

.devices-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.device-list {
  display: grid;
  gap: 11px;
}

.device-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 18px 20px;
}

.device-card.is-current {
  border-color: rgba(var(--brand-rgb), 0.4);
  box-shadow: var(--shadow-glow);
}

.device-card__icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 1px solid rgba(var(--brand-rgb), 0.28);
  border-radius: 14px;
  background: rgba(var(--brand-rgb), 0.1);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .device-card__icon {
  color: var(--brand);
}

.device-card__main {
  min-width: 0;
}

.device-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.device-card__head h2 {
  font-size: 1rem;
}

.device-card__meta {
  margin-top: 5px;
  color: var(--muted);
  font-size: 0.62rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.device-card__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 22px;
  margin-top: 12px;
}

.device-card__facts div {
  display: grid;
  gap: 2px;
}

.device-card__facts dt {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.52rem;
  letter-spacing: 0.08em;
}

.device-card__facts dd {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.7rem;
}

.device-card__ua {
  margin-top: 11px;
}

.device-card__ua summary {
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.device-card__ua code {
  display: block;
  margin-top: 6px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface-alt);
  color: var(--text-soft);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.device-card__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.device-card__current {
  color: var(--brand-deep);
  font-size: 0.52rem;
  letter-spacing: 0.08em;
}

:root[data-theme='dark'] .device-card__current {
  color: var(--brand);
}

@media (max-width: 760px) {
  .device-card {
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 16px;
  }

  .device-card__icon {
    width: 40px;
    height: 40px;
  }

  .device-card__actions {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
