import { createRouter, createWebHistory } from 'vue-router'

import AdminLayout from '@/layouts/AdminLayout.vue'
import PublicLayout from '@/layouts/PublicLayout.vue'
import { beginProgress, completeProgress, failProgress } from '@/lib/progress'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/AdminLoginView.vue'),
      meta: { title: '后台登录' },
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboardView.vue'),
          meta: { title: '仪表盘', adminTitle: '仪表盘' },
        },
        {
          path: 'articles',
          name: 'admin-articles',
          component: () => import('@/views/admin/AdminArticlesView.vue'),
          meta: { title: '文章管理', adminTitle: '文章管理' },
        },
        {
          path: 'articles/new',
          name: 'admin-article-new',
          component: () => import('@/views/admin/AdminArticleEditorView.vue'),
          meta: { title: '新建文章', adminTitle: '新建文章' },
        },
        {
          path: 'articles/:id/edit',
          name: 'admin-article-edit',
          component: () => import('@/views/admin/AdminArticleEditorView.vue'),
          meta: { title: '编辑文章', adminTitle: '编辑文章' },
        },
        {
          path: 'about',
          name: 'admin-about',
          component: () => import('@/views/admin/AdminAboutView.vue'),
          meta: { title: '关于页', adminTitle: '关于页' },
        },
        {
          path: 'friends',
          name: 'admin-friends',
          component: () => import('@/views/admin/AdminFriendsView.vue'),
          meta: { title: '友链管理', adminTitle: '友链管理' },
        },
        {
          path: 'music',
          name: 'admin-music',
          component: () => import('@/views/admin/AdminMusicView.vue'),
          meta: { title: '音乐管理', adminTitle: '音乐管理' },
        },
        {
          path: 'seo',
          name: 'admin-seo',
          component: () => import('@/views/admin/AdminSeoView.vue'),
          meta: { title: 'SEO 推送', adminTitle: 'SEO 推送' },
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/views/admin/AdminSettingsView.vue'),
          meta: { title: '站点设置', adminTitle: '站点设置' },
        },
        {
          path: 'security',
          name: 'admin-security',
          component: () => import('@/views/admin/AdminSecurityView.vue'),
          meta: { title: '登录与安全', adminTitle: '登录与安全' },
        },
      ],
    },
    {
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { title: '首页' },
        },
        {
          path: 'articles',
          name: 'articles',
          component: () => import('@/views/ArticlesView.vue'),
          meta: { title: '文章' },
        },
        {
          path: 'articles/:slug',
          name: 'article-detail',
          component: () => import('@/views/ArticleDetailView.vue'),
          meta: { title: '文章' },
        },
        {
          path: 'friends',
          name: 'friends',
          component: () => import('@/views/FriendsView.vue'),
          meta: { title: '友链' },
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/AboutView.vue'),
          meta: { title: '关于' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: '404' },
        },
      ],
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach(async (to) => {
  beginProgress()
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.initialized) await authStore.fetchSession()
    if (!authStore.user) {
      return {
        name: 'admin-login',
        query: { redirect: to.fullPath },
      }
    }
  }

  if (to.name === 'admin-login') {
    if (!authStore.initialized) await authStore.fetchSession(true)
    if (authStore.user) return { name: 'admin-dashboard' }
  }

  return true
})

router.afterEach((to) => {
  completeProgress()
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = pageTitle ? `${pageTitle} · 饿师傅的技术札记` : '饿师傅的技术札记'
})

router.onError(() => {
  failProgress()
})

export default router
