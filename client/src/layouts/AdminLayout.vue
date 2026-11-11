<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import AdminIcon from '@/components/admin/AdminIcon.vue'
import ToastHost from '@/components/admin/ToastHost.vue'
import BrandMark from '@/components/BrandMark.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import '@/styles/admin.css'
import { useAuthStore } from '@/stores/auth'
import { useSiteStore } from '@/stores/site'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const siteStore = useSiteStore()
const toastStore = useToastStore()
const sidebarOpen = ref(false)
const iconFailed = ref(false)
let notifyTimer: number | undefined

const navGroups = [
  {
    title: 'WORKSPACE',
    items: [
      { label: '仪表盘', to: '/admin', icon: 'dashboard', exact: true },
      { label: '文章管理', to: '/admin/articles', icon: 'articles' },
      { label: '关于页', to: '/admin/about', icon: 'about' },
      { label: '友链管理', to: '/admin/friends', icon: 'friends' },
      { label: '音乐管理', to: '/admin/music', icon: 'music' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: '站点设置', to: '/admin/settings', icon: 'settings' },
      { label: '登录与安全', to: '/admin/security', icon: 'security' },
    ],
  },
]

const siteIcon = computed(() => siteStore.site.icon || '/favicon.svg')
const username = computed(() => authStore.user?.username || 'admin')
const avatarLetter = computed(() => username.value.slice(0, 1).toUpperCase())
const currentTitle = computed(() => {
  const title = route.meta.adminTitle
  return typeof title === 'string' ? title : '控制台'
})

function isActive(item: { to: string; exact?: boolean }): boolean {
  if (item.exact) return route.path === item.to
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

function showToast(message: string): void {
  toastStore.notify(message, 'info')
}

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)

watch(
  () => siteStore.site.icon,
  () => {
    iconFailed.value = false
  },
)

onMounted(() => {
  void siteStore.load()
  const tipShown = window.sessionStorage.getItem('eshi-totp-tip') === '1'
  if (!tipShown && !authStore.user?.totpEnabled) {
    notifyTimer = window.setTimeout(() => {
      window.sessionStorage.setItem('eshi-totp-tip', '1')
      showToast('提示：建议在「登录与安全」中开启 TOTP 两步验证')
    }, 1800)
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(notifyTimer)
})

async function handleLogout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="admin-shell">
    <div class="admin-shell__grid" aria-hidden="true" />

    <Transition name="admin-backdrop">
      <div
        v-if="sidebarOpen"
        class="admin-sidebar-backdrop"
        aria-hidden="true"
        @click="sidebarOpen = false"
      />
    </Transition>

    <aside class="admin-sidebar" :class="{ 'is-open': sidebarOpen }" aria-label="后台侧边栏">
      <RouterLink class="admin-sidebar__brand" to="/admin">
        <span class="admin-sidebar__brand-mark">
          <img
            v-if="siteIcon && !iconFailed"
            :src="siteIcon"
            :alt="`${siteStore.site.name} 图标`"
            width="36"
            height="36"
            @error="iconFailed = true"
          />
          <BrandMark v-else :size="36" />
        </span>
        <span class="admin-sidebar__brand-copy">
          <strong>{{ siteStore.site.name }}</strong>
          <span>ESRS // CONTROL_ROOM</span>
        </span>
      </RouterLink>

      <nav class="admin-sidebar__nav">
        <div v-for="group in navGroups" :key="group.title" class="admin-nav-group">
          <p class="admin-nav-group__title">{{ group.title }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="admin-nav-link"
            :class="{ 'is-active': isActive(item) }"
          >
            <span class="admin-nav-link__icon"><AdminIcon :name="item.icon" /></span>
            {{ item.label }}
            <span v-if="isActive(item)" class="admin-nav-link__meta">●</span>
          </RouterLink>
        </div>
      </nav>

      <div class="admin-sidebar__foot">
        <div class="admin-user">
          <span class="admin-user__avatar">{{ avatarLetter }}</span>
          <span class="admin-user__copy">
            <strong>{{ username }}</strong>
            <span>{{ authStore.user?.totpEnabled ? 'TOTP_ON' : 'TOTP_OFF' }}</span>
          </span>
          <span class="admin-sidebar__actions">
            <button
              type="button"
              class="icon-btn"
              title="退出登录"
              aria-label="退出登录"
              @click="handleLogout"
            >
              <AdminIcon name="logout" :size="15" />
            </button>
          </span>
        </div>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="admin-topbar__left">
          <button
            type="button"
            class="icon-btn admin-menu-toggle"
            :aria-label="sidebarOpen ? '关闭菜单' : '打开菜单'"
            :aria-expanded="sidebarOpen"
            @click="sidebarOpen = !sidebarOpen"
          >
            <AdminIcon :name="sidebarOpen ? 'close' : 'menu'" :size="17" />
          </button>
          <div class="admin-topbar__crumbs mono">
            <span>ADMIN</span>
            <span>/</span>
            <span>{{ currentTitle }}</span>
          </div>
        </div>
        <div class="admin-topbar__right">
          <RouterLink class="btn btn--ghost btn--sm" to="/">
            <AdminIcon name="external" :size="14" />
            <span class="admin-topbar__view-site">查看站点</span>
          </RouterLink>
          <ThemeToggle />
        </div>
      </header>

      <main class="admin-content">
        <RouterView v-slot="{ Component }">
          <Transition name="admin-page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <ToastHost />
  </div>
</template>

<style scoped>
.admin-sidebar__brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  place-items: center;
  overflow: hidden;
  border-radius: 10px;
}

.admin-sidebar__brand-mark img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 10px;
}

.admin-topbar__view-site {
  font-size: 0.75rem;
}

@media (max-width: 520px) {
  .admin-topbar__view-site {
    display: none;
  }
}
</style>
