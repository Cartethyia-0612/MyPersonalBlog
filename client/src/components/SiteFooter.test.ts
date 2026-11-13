import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import SiteFooter from './SiteFooter.vue'
import { useSiteStore } from '@/stores/site'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/articles', component: { template: '<div />' } },
    { path: '/friends', component: { template: '<div />' } },
    { path: '/about', component: { template: '<div />' } },
  ],
})

describe('SiteFooter', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/')
    await router.isReady()
  })

  it('renders all configured compliance fields and custom text', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSiteStore()
    store.footer = {
      icp: '苏ICP备2026000001号',
      policeIcp: '苏公网安备32050000000001号',
      policeUrl: 'https://beian.mps.gov.cn/',
      virtualRecord: '萌备20260001号',
      virtualRecordUrl: 'https://moe.example.com/record/20260001',
      customText: '自定义页脚文本',
      copyright: '© 2026 测试版权',
    }

    const wrapper = mount(SiteFooter, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.text()).toContain('苏ICP备2026000001号')
    expect(wrapper.text()).toContain('苏公网安备32050000000001号')
    expect(wrapper.text()).toContain('萌备20260001号')
    expect(wrapper.text()).toContain('自定义页脚文本')
    expect(wrapper.text()).toContain('© 2026 测试版权')
    expect(wrapper.text()).toContain('VERSION vtest-build')
    expect(wrapper.text()).toContain('BUILD')
    expect(wrapper.find('a[href="https://beian.mps.gov.cn/"]').exists()).toBe(true)
    expect(wrapper.find('a[href="https://moe.example.com/record/20260001"]').exists()).toBe(true)
  })

  it('does not render empty compliance placeholders', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSiteStore()
    store.footer = {
      icp: '',
      policeIcp: '',
      policeUrl: '',
      virtualRecord: '',
      virtualRecordUrl: '',
      customText: '',
      copyright: '',
    }

    const wrapper = mount(SiteFooter, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.findAll('.footer-legal li')).toHaveLength(0)
  })
})
