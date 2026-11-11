<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()
const route = useRoute()
const menuOpen = ref(false)
const iconFailed = ref(false)

const navItems = [
  { label: '首页', to: '/', exact: true },
  { label: '文章', to: '/articles', exact: false },
  { label: '友链', to: '/friends', exact: false },
  { label: '关于', to: '/about', exact: false },
]

function isActive(item: (typeof navItems)[number]): boolean {
  if (item.exact) return route.path === '/'
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const siteName = computed(() => siteStore.site.name || '饿师傅的技术札记')
const siteIcon = computed(() => siteStore.site.icon || '/favicon.svg')

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

watch(
  () => siteStore.site.icon,
  () => {
    iconFailed.value = false
  },
)
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <RouterLink class="brand" to="/" :aria-label="`${siteName} 首页`">
        <span class="brand__mark">
          <img
            v-if="siteIcon && !iconFailed"
            :src="siteIcon"
            :alt="`${siteName} 站点图标`"
            width="38"
            height="38"
            @error="iconFailed = true"
          />
          <BrandMark v-else :size="38" />
        </span>
        <span class="brand__text">
          <strong>{{ siteName }}</strong>
          <span class="brand__sub mono">ESRS // TECH NOTES</span>
        </span>
      </RouterLink>

      <nav class="desktop-nav" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': isActive(item) }"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <span class="nav-link__index mono">0{{ navItems.indexOf(item) + 1 }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="site-header__actions">
        <span class="online-badge mono"><i />ONLINE</span>
        <ThemeToggle />
        <RouterLink
          class="icon-btn admin-entry"
          to="/admin"
          aria-label="进入管理后台"
          title="管理后台"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z" />
            <path d="M9.5 12l1.7 1.7L15 10" />
          </svg>
        </RouterLink>
        <button
          type="button"
          class="menu-toggle icon-btn"
          :aria-expanded="menuOpen"
          aria-controls="mobile-nav"
          :aria-label="menuOpen ? '关闭导航菜单' : '打开导航菜单'"
          @click="menuOpen = !menuOpen"
        >
          <svg
            v-if="!menuOpen"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>

    <Transition name="menu">
      <nav v-if="menuOpen" id="mobile-nav" class="mobile-nav" aria-label="移动端导航">
        <div class="container mobile-nav__inner">
          <RouterLink
            v-for="(item, index) in navItems"
            :key="item.to"
            :to="item.to"
            class="mobile-nav__link"
            :class="{ 'is-active': isActive(item) }"
            :aria-current="isActive(item) ? 'page' : undefined"
          >
            <span class="mono">0{{ index + 1 }}</span>
            {{ item.label }}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </RouterLink>
        </div>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 60;
  background: var(--header-bg);
  backdrop-filter: blur(20px) saturate(1.25);
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
  gap: 24px;
}

.brand {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 11px;
  color: var(--text);
}

.brand:hover {
  color: var(--text);
}

.brand__mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  overflow: hidden;
  border-radius: 11px;
}

.brand__mark img {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  object-fit: cover;
}

.brand__text {
  display: grid;
  gap: 1px;
}

.brand__text strong {
  max-width: 230px;
  overflow: hidden;
  font-size: 0.96rem;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand__sub {
  font-size: 0.54rem;
  letter-spacing: 0.17em;
  color: var(--muted);
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: var(--radius-pill);
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 600;
  transition:
    color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.nav-link:hover {
  color: var(--text);
}

.nav-link.is-active {
  background: rgba(var(--brand-rgb), 0.15);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .nav-link.is-active {
  color: var(--brand);
}

.nav-link__index {
  font-size: 0.56rem;
  opacity: 0.65;
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.online-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 0.57rem;
  letter-spacing: 0.12em;
}

.online-badge i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.13);
}

.menu-toggle {
  display: none;
}

.mobile-nav {
  border-top: 1px solid var(--border);
  background: var(--surface-solid);
}

.mobile-nav__inner {
  display: grid;
  gap: 4px;
  padding-top: 10px;
  padding-bottom: 14px;
}

.mobile-nav__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 9px;
  border-radius: var(--radius-sm);
  color: var(--text-soft);
  font-size: 0.94rem;
}

.mobile-nav__link span {
  width: 22px;
  color: var(--muted);
  font-size: 0.62rem;
}

.mobile-nav__link svg {
  margin-left: auto;
  color: var(--muted);
}

.mobile-nav__link.is-active {
  background: rgba(var(--brand-rgb), 0.11);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .mobile-nav__link.is-active {
  color: var(--brand);
}

.menu-enter-active,
.menu-leave-active {
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-fast) var(--ease-out);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 860px) {
  .desktop-nav,
  .online-badge {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
  }
}

@media (max-width: 520px) {
  .brand__sub {
    display: none;
  }

  .brand__text strong {
    max-width: 150px;
    font-size: 0.88rem;
  }

  .site-header__actions {
    gap: 7px;
  }

  .site-header__actions :deep(.theme-switcher__label) {
    display: none;
  }
}
</style>
