import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import ArticleCard from './ArticleCard.vue'
import type { ArticleSummary } from '@/types/content'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/articles/:slug', component: { template: '<div />' } },
  ],
})

const article: ArticleSummary = {
  id: 1,
  slug: 'test-entry',
  title: '一篇测试札记',
  summary: '摘要内容',
  coverUrl: '',
  tags: ['Vue', '测试'],
  status: 'published',
  publishedAt: '2026-11-09T00:00:00.000Z',
  createdAt: '2026-11-09T00:00:00.000Z',
  updatedAt: '2026-11-09T00:00:00.000Z',
}

describe('ArticleCard', () => {
  it('links to the article and shows its metadata', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(ArticleCard, {
      props: { article, index: 0 },
      global: { plugins: [router] },
    })

    expect(wrapper.find('a[href="/articles/test-entry"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('一篇测试札记')
    expect(wrapper.text()).toContain('#Vue')
    expect(wrapper.text()).toContain('LOG_01')
  })
})
