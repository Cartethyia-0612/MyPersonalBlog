<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { SecurityInfo, TotpSetupResponse } from '@/types/admin'

const toast = useToastStore()
const authStore = useAuthStore()

const security = ref<SecurityInfo | null>(null)
const loading = ref(true)
const error = ref('')

const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordSaving = ref(false)
const passwordError = ref('')

const setup = ref<TotpSetupResponse | null>(null)
const code = ref('')
const setupLoading = ref(false)
const enableLoading = ref(false)
const totpError = ref('')

const disableForm = reactive({ password: '', code: '' })
const disableLoading = ref(false)
const disableError = ref('')

async function loadSecurity(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    security.value = await adminApi.getSecurity()
  } catch (err) {
    error.value = toErrorMessage(err, '安全信息加载失败')
  } finally {
    loading.value = false
  }
}

async function changePassword(): Promise<void> {
  passwordError.value = ''
  if (!passwordForm.currentPassword) {
    passwordError.value = '请输入当前密码'
    return
  }
  if (passwordForm.newPassword.length < 10) {
    passwordError.value = '新密码至少需要 10 位'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }

  passwordSaving.value = true
  try {
    await adminApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    toast.notify('密码已更新，其他设备的登录状态已失效', 'success')
  } catch (err) {
    passwordError.value = toErrorMessage(err, '密码修改失败')
  } finally {
    passwordSaving.value = false
  }
}

async function generateTotpSetup(): Promise<void> {
  totpError.value = ''
  setupLoading.value = true
  try {
    setup.value = await adminApi.setupTotp()
    code.value = ''
  } catch (err) {
    totpError.value = toErrorMessage(err, '生成两步验证密钥失败')
  } finally {
    setupLoading.value = false
  }
}

async function enableTotp(): Promise<void> {
  totpError.value = ''
  if (!/^\d{6}$/.test(code.value)) {
    totpError.value = '请输入验证器中的 6 位动态验证码'
    return
  }
  enableLoading.value = true
  try {
    await adminApi.enableTotp(code.value)
    setup.value = null
    code.value = ''
    toast.notify('TOTP 两步验证已开启', 'success')
    await Promise.all([loadSecurity(), authStore.fetchSession(true)])
  } catch (err) {
    totpError.value = toErrorMessage(err, '启用失败，请核对验证码')
  } finally {
    enableLoading.value = false
  }
}

async function disableTotp(): Promise<void> {
  disableError.value = ''
  if (!disableForm.password) {
    disableError.value = '请输入当前密码'
    return
  }
  if (!/^\d{6}$/.test(disableForm.code)) {
    disableError.value = '请输入 6 位动态验证码'
    return
  }
  disableLoading.value = true
  try {
    await adminApi.disableTotp(disableForm.password, disableForm.code)
    disableForm.password = ''
    disableForm.code = ''
    toast.notify('TOTP 两步验证已关闭', 'info')
    await Promise.all([loadSecurity(), authStore.fetchSession(true)])
  } catch (err) {
    disableError.value = toErrorMessage(err, '关闭失败，请检查密码与验证码')
  } finally {
    disableLoading.value = false
  }
}

onMounted(() => {
  void loadSecurity()
})

useSeo(() => ({
  title: '登录与安全',
  description: '密码与两步验证设置',
  noindex: true,
}))
</script>

<template>
  <div class="admin-security">
    <AdminPageHeader
      eyebrow="SYSTEM / SECURITY"
      title="登录与安全"
      description="管理后台密码与 TOTP 两步验证。密码使用 bcrypt 哈希存储，TOTP 密钥使用 AES-256-GCM 加密后入库。"
    />

    <div v-if="loading" class="admin-loading admin-card"><span /><span /><span /></div>

    <div v-else-if="error && !security" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ LOAD_ERROR ]</span>
        <h2>安全信息加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadSecurity">重新加载</button>
      </div>
    </div>

    <template v-else-if="security">
      <div class="security-grid">
        <section class="admin-card security-panel">
          <div class="security-panel__head">
            <div>
              <p class="mono security-panel__eyebrow">ACCOUNT</p>
              <h2>{{ security.username }}</h2>
            </div>
            <span
              class="admin-badge"
              :class="security.totpEnabled ? 'admin-badge--published' : 'admin-badge--draft'"
            >
              {{ security.totpEnabled ? 'TOTP 已开启' : 'TOTP 未开启' }}
            </span>
          </div>
          <ul class="security-facts">
            <li><span>密码存储</span><span>bcrypt · cost 12</span></li>
            <li><span>会话 Cookie</span><span>HttpOnly · SameSite=Strict</span></li>
            <li><span>CSRF 防护</span><span>Token + Origin 校验</span></li>
            <li><span>登录限流</span><span>5 次失败 / 15 分钟</span></li>
          </ul>
          <p class="security-note">如果怀疑账号泄露，请立即修改密码并重新生成 TOTP 验证器绑定。</p>
        </section>

        <section class="admin-card security-panel">
          <div class="security-panel__head">
            <div>
              <p class="mono security-panel__eyebrow">PASSWORD</p>
              <h2>修改密码</h2>
            </div>
          </div>
          <form class="admin-form" @submit.prevent="changePassword">
            <label class="admin-label">
              当前密码
              <input
                v-model="passwordForm.currentPassword"
                class="input"
                type="password"
                autocomplete="current-password"
              />
            </label>
            <div class="admin-form-row">
              <label class="admin-label">
                新密码
                <input
                  v-model="passwordForm.newPassword"
                  class="input"
                  type="password"
                  autocomplete="new-password"
                  placeholder="至少 10 位"
                />
              </label>
              <label class="admin-label">
                确认新密码
                <input
                  v-model="passwordForm.confirmPassword"
                  class="input"
                  type="password"
                  autocomplete="new-password"
                />
              </label>
            </div>
            <p v-if="passwordError" class="admin-error" role="alert">{{ passwordError }}</p>
            <button type="submit" class="btn btn--primary" :disabled="passwordSaving">
              {{ passwordSaving ? '更新中…' : '更新密码' }}
            </button>
          </form>
        </section>
      </div>

      <section class="admin-card totp-panel">
        <div class="totp-panel__head">
          <div>
            <p class="mono security-panel__eyebrow">TWO-FACTOR AUTHENTICATION</p>
            <h2>TOTP 两步验证</h2>
            <p>
              开启后，登录需要「密码 + 验证器 6 位动态码」。支持 Google
              Authenticator、1Password、Authy 等标准 TOTP 应用。
            </p>
          </div>
          <span
            class="admin-badge"
            :class="security.totpEnabled ? 'admin-badge--published' : 'admin-badge--draft'"
          >
            {{ security.totpEnabled ? 'ENABLED' : 'DISABLED' }}
          </span>
        </div>

        <div v-if="security.totpEnabled" class="totp-disable">
          <div class="totp-disable__tip">
            <strong>两步验证正在保护登录入口。</strong>
            <p>关闭前需要验证当前密码与验证器动态码。关闭后仅密码即可登录。</p>
          </div>
          <form class="admin-form totp-disable__form" @submit.prevent="disableTotp">
            <div class="admin-form-row">
              <label class="admin-label">
                当前密码
                <input
                  v-model="disableForm.password"
                  class="input"
                  type="password"
                  autocomplete="current-password"
                />
              </label>
              <label class="admin-label">
                当前动态验证码
                <input
                  v-model="disableForm.code"
                  class="input totp-code"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="000000"
                  autocomplete="one-time-code"
                />
              </label>
            </div>
            <p v-if="disableError" class="admin-error" role="alert">{{ disableError }}</p>
            <button type="submit" class="btn btn--danger" :disabled="disableLoading">
              {{ disableLoading ? '关闭中…' : '关闭两步验证' }}
            </button>
          </form>
        </div>

        <div v-else class="totp-setup">
          <div v-if="!setup" class="totp-setup__intro">
            <p>点击生成密钥后，用验证器扫描二维码，再将验证器显示的 6 位动态码填入下方完成绑定。</p>
            <button
              type="button"
              class="btn btn--primary"
              :disabled="setupLoading"
              @click="generateTotpSetup"
            >
              {{ setupLoading ? '生成中…' : '生成 TOTP 密钥与二维码' }}
            </button>
          </div>

          <div v-else class="totp-setup__grid">
            <div class="totp-qr">
              <img :src="setup.qrDataUrl" alt="TOTP 绑定二维码" />
              <span class="mono">SCAN_WITH_AUTHENTICATOR</span>
            </div>
            <div class="totp-setup__form">
              <p class="mono">ISSUER: {{ setup.issuer }}</p>
              <p class="mono">ACCOUNT: {{ setup.account }}</p>
              <label class="admin-label">
                手动输入密钥
                <input class="input mono" :value="setup.secret" readonly />
              </label>
              <label class="admin-label">
                验证器动态码
                <input
                  v-model="code"
                  class="input totp-code"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="000000"
                  autocomplete="one-time-code"
                />
              </label>
              <p v-if="totpError" class="admin-error" role="alert">{{ totpError }}</p>
              <div class="totp-setup__actions">
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="enableLoading"
                  @click="enableTotp"
                >
                  {{ enableLoading ? '验证中…' : '验证并开启' }}
                </button>
                <button
                  type="button"
                  class="btn btn--ghost"
                  :disabled="enableLoading"
                  @click="setup = null"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.security-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 14px;
}

.security-panel {
  padding: 20px;
}

.security-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.security-panel__eyebrow {
  color: var(--brand-deep);
  font-size: 0.56rem;
  letter-spacing: 0.1em;
}

:root[data-theme='dark'] .security-panel__eyebrow {
  color: var(--brand);
}

.security-panel__head h2 {
  margin-top: 5px;
  font-size: 1.1rem;
}

.security-facts {
  display: grid;
  gap: 0;
  margin-top: 18px;
  border-top: 1px solid var(--border);
}

.security-facts li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
  color: var(--muted);
  font-size: 0.72rem;
}

.security-facts li span:last-child {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-align: right;
}

.security-note {
  margin-top: 14px;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.75;
}

.security-panel .admin-form {
  margin-top: 18px;
}

.security-panel .btn {
  justify-self: start;
}

.totp-panel {
  margin-top: 14px;
  padding: 20px;
}

.totp-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.totp-panel__head h2 {
  margin-top: 5px;
  font-size: 1.15rem;
}

.totp-panel__head p:last-child {
  max-width: 680px;
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.8;
}

.totp-setup {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.totp-setup__intro p {
  max-width: 680px;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.8;
}

.totp-setup__intro .btn {
  margin-top: 14px;
}

.totp-setup__grid {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.totp-qr {
  display: grid;
  justify-items: center;
  gap: 9px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-solid);
}

.totp-qr img {
  width: 188px;
  height: 188px;
  border-radius: 6px;
}

.totp-qr span {
  color: var(--muted);
  font-size: 0.5rem;
  letter-spacing: 0.07em;
}

.totp-setup__form {
  display: grid;
  gap: 12px;
}

.totp-setup__form > p {
  color: var(--muted);
  font-size: 0.58rem;
}

.totp-code {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  letter-spacing: 0.32em;
}

.totp-setup__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 3px;
}

.totp-disable {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 24px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.totp-disable__tip strong {
  font-size: 0.84rem;
}

.totp-disable__tip p {
  margin-top: 6px;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.75;
}

.totp-disable__form .btn {
  justify-self: start;
}

@media (max-width: 900px) {
  .security-grid,
  .totp-disable {
    grid-template-columns: 1fr;
  }

  .totp-setup__grid {
    grid-template-columns: 1fr;
  }

  .totp-qr {
    width: 220px;
  }
}
</style>
