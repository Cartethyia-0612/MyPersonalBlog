<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import TopProgress from '@/components/TopProgress.vue'

const showBootScreen = ref(false)
const currentYear = new Date().getFullYear()

onMounted(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const alreadyBooted = window.sessionStorage.getItem('eshi-booted') === '1'

  if (!alreadyBooted && !reduceMotion) {
    showBootScreen.value = true
    window.setTimeout(() => {
      showBootScreen.value = false
      window.sessionStorage.setItem('eshi-booted', '1')
    }, 1050)
  } else {
    window.sessionStorage.setItem('eshi-booted', '1')
  }
})
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <TopProgress />

  <Transition name="boot">
    <LoadingScreen v-if="showBootScreen" />
  </Transition>

  <div class="app-shell">
    <header class="site-header">
      <div class="container site-header__inner">
        <RouterLink class="brand" to="/" aria-label="饿师傅的技术札记首页">
          <BrandMark :size="36" />
          <span class="brand__text">
            <strong>饿师傅的技术札记</strong>
            <span class="brand__sub mono">ESRS // TECH NOTES</span>
          </span>
        </RouterLink>

        <div class="site-header__actions">
          <span class="build-badge mono"><i class="build-badge__dot" />BUILDING</span>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main id="main-content" class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="site-footer">
      <div class="container site-footer__inner">
        <div class="site-footer__brand">
          <BrandMark :size="24" />
          <span>饿师傅的技术札记</span>
        </div>
        <p class="mono">© {{ currentYear }} ESRS · BUILT WITH VUE + NODE + SQLITE</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid transparent;
  background: var(--header-bg);
  backdrop-filter: blur(18px) saturate(1.2);
  transition: border-color var(--duration-base) ease;
}

.site-header::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-strong), transparent);
}

.site-header__inner {
  display: flex;
  min-height: var(--header-height);
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
}

.brand:hover {
  color: var(--text);
}

.brand__text {
  display: grid;
  gap: 2px;
}

.brand__text strong {
  font-size: 0.98rem;
  letter-spacing: 0.01em;
}

.brand__sub {
  font-size: 0.56rem;
  letter-spacing: 0.17em;
  color: var(--muted);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.build-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.build-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.13);
  animation: status-pulse 2.4s ease-in-out infinite;
}

.app-main {
  flex: 1;
}

.site-footer {
  border-top: 1px solid var(--border);
  padding: 28px 0;
}

.site-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font-size: 0.72rem;
}

.site-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--text-soft);
  font-size: 0.8rem;
}

.site-footer p {
  font-size: 0.64rem;
  letter-spacing: 0.08em;
}

.boot-leave-active {
  transition:
    opacity 360ms var(--ease-out),
    transform 360ms var(--ease-out);
}

.boot-leave-to {
  opacity: 0;
  transform: scale(1.015);
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@media (max-width: 640px) {
  .build-badge {
    display: none;
  }

  .brand__sub {
    display: none;
  }

  .site-footer__inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
