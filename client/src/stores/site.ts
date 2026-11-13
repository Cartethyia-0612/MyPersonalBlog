import { defineStore } from 'pinia'
import { ref } from 'vue'

import { publicApi } from '@/lib/api'
import type { FooterInfo, SiteInfo } from '@/types/content'

const DEFAULT_SITE: SiteInfo = {
  name: '饿师傅的技术札记',
  tagline: '把灵感写成可复用的代码',
  description: '记录工程实践、工具折腾与灵感的个人技术博客。',
  icon: '/favicon.svg',
  author: '饿师傅',
  siteUrl: '',
}

const DEFAULT_FOOTER: FooterInfo = {
  icp: '',
  policeIcp: '',
  policeUrl: '',
  virtualRecord: '',
  virtualRecordUrl: '',
  customText: '',
  copyright: '',
}

export const useSiteStore = defineStore('site', () => {
  const site = ref<SiteInfo>({ ...DEFAULT_SITE })
  const footer = ref<FooterInfo>({ ...DEFAULT_FOOTER })
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')
  let inflight: Promise<void> | null = null

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return
    if (inflight) return inflight

    loading.value = true
    error.value = ''
    inflight = (async () => {
      try {
        const payload = await publicApi.getSite()
        site.value = { ...DEFAULT_SITE, ...payload.site }
        footer.value = { ...DEFAULT_FOOTER, ...payload.footer }
        loaded.value = true
      } catch (err) {
        error.value = err instanceof Error ? err.message : '站点信息加载失败'
      } finally {
        loading.value = false
        inflight = null
      }
    })()

    return inflight
  }

  return { site, footer, loaded, loading, error, load }
})
