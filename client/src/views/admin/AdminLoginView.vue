<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import AppearanceSettings from '@/components/AppearanceSettings.vue'
import '@/styles/admin.css'
import { useSeo } from '@/lib/seo'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const code = ref('')
const step = ref<'credentials' | 'totp'>('credentials')
const challengeToken = ref('')
const localError = ref('')
const submitting = ref(false)
const sessionReady = ref(false)

function redirectTarget(): string {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/admin')) return redirect
  return '/admin'
}

async function goToAdmin(): Promise<void> {
  await router.replace(redirectTarget())
}

onMounted(async () => {
  await authStore.fetchSession(true)
  sessionReady.value = true
  if (authStore.user) await goToAdmin()
})

async function submitCredentials(): Promise<void> {
  localError.value = ''
  if (!username.value.trim() || !password.value) {
    localError.value = '请输入用户名和密码'
    return
  }
  submitting.value = true
  try {
    const result = await authStore.login(username.value, password.value)
    if (result.requiresTotp) {
      if (!result.challengeToken) {
        localError.value = '两步验证挑战创建失败，请重新登录'
        return
      }
      challengeToken.value = result.challengeToken
      step.value = 'totp'
      code.value = ''
      return
    }
    await goToAdmin()
  } catch (err) {
    localError.value = authStore.error || (err instanceof Error ? err.message : '登录失败')
  } finally {
    submitting.value = false
  }
}

async function submitTotp(): Promise<void> {
  localError.value = ''
  if (!/^\d{6}$/.test(code.value)) {
    localError.value = '请输入 6 位动态验证码'
    return
  }
  submitting.value = true
  try {
    await authStore.verifyTotp(challengeToken.value, code.value)
    await goToAdmin()
  } catch (err) {
    localError.value = authStore.error || (err instanceof Error ? err.message : '验证失败')
    code.value = ''
  } finally {
    submitting.value = false
  }
}

function backToCredentials(): void {
  step.value = 'credentials'
  code.value = ''
  challengeToken.value = ''
  localError.value = ''
  authStore.error = ''
}

useSeo(() => ({
  title: '管理后台登录',
  description: '饿师傅的技术札记管理后台',
  noindex: true,
}))
</script>

<template>
  <div class="login-page">
    <div class="login-page__grid" aria-hidden="true" />
    <div class="login-page__glow" aria-hidden="true" />

    <div class="login-page__theme">
      <AppearanceSettings />
    </div>

    <section class="login-page__intro">
      <RouterLink class="login-brand" to="/">
        <BrandMark :size="44" />
        <span>
          <strong>饿师傅的技术札记</strong>
          <small class="mono">ESRS // CONTROL_ROOM</small>
        </span>
      </RouterLink>

      <div class="login-page__copy">
        <p class="eyebrow">SECURE CONSOLE / ADMIN</p>
        <h1>
          欢迎回来，
          <br />
          <span class="text-gradient">站长。</span>
        </h1>
        <p>这里是内容、站点与安全的控制室。登录后可以管理文章、关于页、友链、站点配置和播放器。</p>
      </div>

      <div class="login-terminal">
        <div class="login-terminal__bar mono">
          <span class="login-terminal__lights"><i /><i /><i /></span>
          <span>esrs@tianyi: ~/control</span>
          <span class="login-terminal__status">● SECURE</span>
        </div>
        <div class="login-terminal__body mono">
          <p><span>$</span> auth --method=bcrypt</p>
          <p class="login-terminal__result">&gt; password hash: verified locally</p>
          <p><span>$</span> totp --status</p>
          <p class="login-terminal__result">
            &gt; {{ authStore.user?.totpEnabled ? 'enabled' : 'available in security settings' }}
          </p>
          <p><span>$</span> csrf --guard</p>
          <p class="login-terminal__result">&gt; token + origin + same-site cookie</p>
          <p><span>$</span> comments --list</p>
          <p class="login-terminal__result">&gt; 0. no comment system by design.</p>
        </div>
      </div>

      <div class="login-page__features">
        <span class="mono">BCRYPT_HASH</span>
        <span class="mono">CSRF_GUARD</span>
        <span class="mono">RATE_LIMIT</span>
        <span class="mono">TOTP_2FA</span>
      </div>
    </section>

    <section class="login-page__panel">
      <div class="login-card">
        <div class="login-card__head">
          <p class="mono">[ AUTHENTICATION ]</p>
          <h2>{{ step === 'credentials' ? '登录管理后台' : '两步验证' }}</h2>
          <p v-if="step === 'credentials'">使用管理员账号与密码继续。</p>
          <p v-else>打开你的验证器 App，输入当前的 6 位动态验证码。</p>
        </div>

        <div v-if="!sessionReady" class="admin-loading" aria-label="安全检查中">
          <span /><span /><span />
        </div>

        <form
          v-else-if="step === 'credentials'"
          class="admin-form login-form"
          @submit.prevent="submitCredentials"
        >
          <label class="admin-label">
            管理员用户名
            <input
              v-model="username"
              class="input"
              name="username"
              autocomplete="username"
              placeholder="admin"
              :disabled="submitting"
            />
          </label>
          <label class="admin-label">
            密码
            <input
              v-model="password"
              class="input"
              type="password"
              name="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              :disabled="submitting"
            />
          </label>

          <p v-if="localError" class="admin-error" role="alert">{{ localError }}</p>

          <button class="btn btn--primary login-submit" type="submit" :disabled="submitting">
            {{ submitting ? '正在验证…' : '进入控制室' }}
            <svg
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
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>

        <form v-else class="admin-form login-form" @submit.prevent="submitTotp">
          <label class="admin-label">
            动态验证码
            <input
              v-model="code"
              class="input login-code"
              name="totp"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              :disabled="submitting"
              autofocus
            />
          </label>
          <p class="hint">验证码每 30 秒刷新一次，请确保设备时间准确。</p>

          <p v-if="localError" class="admin-error" role="alert">{{ localError }}</p>

          <button class="btn btn--primary login-submit" type="submit" :disabled="submitting">
            {{ submitting ? '正在验证…' : '验证并进入' }}
          </button>
          <button
            type="button"
            class="btn btn--ghost"
            :disabled="submitting"
            @click="backToCredentials"
          >
            返回密码登录
          </button>
        </form>

        <div class="login-card__foot">
          <RouterLink class="mono" to="/">← 返回博客首页</RouterLink>
          <span class="mono">NO_COMMENTS // SECURE_BY_DEFAULT</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1.05fr) minmax(400px, 0.95fr);
  overflow: hidden;
  background: var(--bg);
}

.login-page__grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.52;
  background-image:
    linear-gradient(to right, var(--border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--border) 1px, transparent 1px);
  background-size: 58px 58px;
  mask-image: linear-gradient(90deg, #000, transparent 72%);
}

.login-page__glow {
  position: fixed;
  top: -240px;
  left: -180px;
  z-index: 0;
  width: 680px;
  height: 680px;
  border-radius: 50%;
  background: rgba(var(--brand-rgb), 0.2);
  filter: blur(100px);
  pointer-events: none;
}

.login-page__theme {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 10;
}

.login-page__intro {
  position: relative;
  z-index: 1;
  display: flex;
  max-width: 720px;
  flex-direction: column;
  justify-content: center;
  padding: 84px clamp(30px, 7vw, 110px) 60px;
}

.login-brand {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 12px;
  color: var(--text);
}

.login-brand:hover {
  color: var(--text);
}

.login-brand span {
  display: grid;
  gap: 2px;
}

.login-brand strong {
  font-size: 0.94rem;
}

.login-brand small {
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.15em;
}

.login-page__copy {
  margin-top: clamp(50px, 8vh, 92px);
}

.login-page__copy h1 {
  margin-top: 15px;
  font-size: clamp(2.35rem, 4.6vw, 4rem);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.login-page__copy > p:last-child {
  max-width: 480px;
  margin-top: 20px;
  color: var(--text-soft);
  font-size: 0.9rem;
  line-height: 1.9;
}

.login-terminal {
  width: min(100%, 480px);
  margin-top: 34px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--code-bg);
  box-shadow: var(--shadow-md);
}

.login-terminal__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  padding: 9px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  color: #7e9cad;
  font-size: 0.57rem;
}

.login-terminal__lights {
  display: inline-flex;
  gap: 4px;
}

.login-terminal__lights i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38566a;
}

.login-terminal__lights i:first-child {
  background: #ff8b8b;
}

.login-terminal__lights i:nth-child(2) {
  background: #ffd37a;
}

.login-terminal__lights i:nth-child(3) {
  background: #77e0aa;
}

.login-terminal__status {
  color: #77e0aa;
}

.login-terminal__body {
  padding: 16px 17px;
  color: #d7edf8;
  font-size: 0.68rem;
  line-height: 1.8;
}

.login-terminal__body p {
  margin: 0;
}

.login-terminal__body p:not(:first-child) {
  margin-top: 7px;
}

.login-terminal__body p > span {
  color: var(--brand);
}

.login-terminal__result {
  padding-left: 12px;
  color: #8fb4c7;
}

.login-page__features {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 16px;
  margin-top: 22px;
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
}

.login-page__panel {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  padding: 84px clamp(24px, 5vw, 76px) 60px;
  border-left: 1px solid var(--border);
  background: rgba(var(--brand-rgb), 0.03);
}

.login-card {
  width: min(100%, 420px);
  padding: clamp(24px, 4vw, 38px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-glow);
  backdrop-filter: blur(24px);
}

.login-card__head > p:first-child {
  color: var(--brand-deep);
  font-size: 0.58rem;
  letter-spacing: 0.11em;
}

:root[data-theme='dark'] .login-card__head > p:first-child {
  color: var(--brand);
}

.login-card__head h2 {
  margin-top: 8px;
  font-size: 1.55rem;
}

.login-card__head > p:last-child {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.7;
}

.login-form {
  margin-top: 24px;
}

.login-submit {
  width: 100%;
  margin-top: 3px;
}

.login-code {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  letter-spacing: 0.4em;
  text-align: center;
}

.login-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  margin-top: 25px;
  padding-top: 17px;
  border-top: 1px solid var(--border);
}

.login-card__foot a {
  color: var(--muted);
  font-size: 0.58rem;
}

.login-card__foot a:hover {
  color: var(--brand-deep);
}

.login-card__foot span {
  color: var(--muted);
  font-size: 0.5rem;
  letter-spacing: 0.04em;
  opacity: 0.75;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-page__intro {
    max-width: none;
    padding: 80px 28px 18px;
  }

  .login-page__copy {
    margin-top: 40px;
  }

  .login-terminal {
    display: none;
  }

  .login-page__panel {
    padding: 24px 28px 60px;
    border-left: 0;
  }

  .login-card {
    margin-inline: auto;
  }
}

@media (max-width: 560px) {
  .login-page__theme {
    top: 14px;
    right: 14px;
  }

  .login-page__intro {
    padding-top: 74px;
  }

  .login-page__copy h1 {
    font-size: 2.2rem;
  }

  .login-card {
    padding: 22px;
  }
}
</style>
