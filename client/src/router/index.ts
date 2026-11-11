import { createRouter, createWebHistory } from 'vue-router'

import { beginProgress, completeProgress, failProgress } from '@/lib/progress'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面不存在' },
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach(() => {
  beginProgress()
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
