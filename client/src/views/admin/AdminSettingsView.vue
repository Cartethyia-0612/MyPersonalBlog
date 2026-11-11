<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'

import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import BrandMark from '@/components/BrandMark.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { useSiteStore } from '@/stores/site'
import { useToastStore } from '@/stores/toast'
import type { AdminSettings } from '@/types/admin'

const toast = useToastStore()
const siteStore = useSiteStore()

const form = reactive<AdminSettings>({
  site: { name: '', tagline: '', description: '', icon: '', author: '', siteUrl: '' },
  footer: {
    icp: '',
    policeIcp: '',
    policeUrl: '',
    virtualRecord: '',
    customText: '',
    copyright: '',
  },
  music: { apiBase: '' },
})
const baseline = ref('')
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const error = ref('')
const initialized = ref(false)
const iconInput = ref<HTMLInputElement | null>(null)
const iconFailed = ref(false)

const dirty = computed(() => initialized.value && JSON.stringify(form) !== baseline.value)

function markClean(): void {
  baseline.value = JSON.stringify(form)
}

async function loadSettings(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const settings = await adminApi.getSettings()
    Object.assign(form.site, settings.site)
    Object.assign(form.footer, settings.footer)
    Object.assign(form.music, settings.music)
    initialized.value = true
    iconFailed.value = false
    markClean()
  } catch (err) {
    error.value = toErrorMessage(err, '设置加载失败')
  } finally {
    loading.value = false
  }
}

async function saveSettings(): Promise<void> {
  error.value = ''
  if (!form.site.name.trim()) {
    error.value = '站点名称不能为空'
    return
  }
  saving.value = true
  try {
    const settings = await adminApi.updateSettings({
      site: { ...form.site },
      footer: { ...form.footer },
      music: { ...form.music },
    })
    Object.assign(form.site, settings.site)
    Object.assign(form.footer, settings.footer)
    Object.assign(form.music, settings.music)
    markClean()
    await siteStore.load(true)
    toast.notify('站点设置已保存并同步到前台', 'success')
  } catch (err) {
    error.value = toErrorMessage(err, '保存失败')
    toast.notify(error.value, 'error')
  } finally {
    saving.value = false
  }
}

function triggerIconUpload(): void {
  iconInput.value?.click()
}

async function handleIconFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.notify('请选择图片文件', 'error')
    input.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.notify('站点图标不能超过 2MB', 'error')
    input.value = ''
    return
  }
  uploading.value = true
  try {
    const result = await adminApi.uploadImage(file, 'icon')
    form.site.icon = result.url
    iconFailed.value = false
    toast.notify('图标已上传，记得点击保存', 'info')
  } catch (err) {
    toast.notify(toErrorMessage(err, '图标上传失败'), 'error')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return window.confirm('站点设置还有未保存的修改，确定离开吗？')
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  void loadSettings()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

useSeo(() => ({
  title: '站点设置',
  description: '站点与页脚设置',
  noindex: true,
}))
</script>

<template>
  <div class="admin-settings">
    <AdminPageHeader
      eyebrow="SYSTEM / SITE_CONFIG"
      title="站点设置"
      description="修改站点身份、站点 Icon、页脚备案信息和音乐 API 地址。保存后前台立即生效。"
    >
      <template #actions>
        <RouterLink class="btn btn--ghost btn--sm" to="/" target="_blank" rel="noopener">
          查看前台 ↗
        </RouterLink>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          :disabled="saving || loading"
          @click="saveSettings"
        >
          {{ saving ? '保存中…' : '保存设置' }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="admin-loading admin-card"><span /><span /><span /></div>

    <div v-else-if="error && !initialized" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ LOAD_ERROR ]</span>
        <h2>站点设置加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadSettings">重新加载</button>
      </div>
    </div>

    <template v-else>
      <div v-if="error" class="admin-error settings-error" role="alert">{{ error }}</div>

      <div class="settings-layout">
        <div class="settings-main">
          <section class="admin-card">
            <div class="admin-card__head">
              <div>
                <h2 class="admin-card__title">站点身份</h2>
                <p class="admin-card__hint">显示在导航、首页和 SEO 元信息中</p>
              </div>
              <span class="mono settings-code">SITE</span>
            </div>
            <div class="admin-form settings-body">
              <div class="admin-form-row">
                <label class="admin-label">
                  站点名称
                  <input v-model="form.site.name" class="input" maxlength="60" />
                </label>
                <label class="admin-label">
                  站长名称
                  <input v-model="form.site.author" class="input" maxlength="60" />
                </label>
              </div>
              <label class="admin-label">
                副标题 / Slogan
                <input v-model="form.site.tagline" class="input" maxlength="100" />
              </label>
              <label class="admin-label">
                站点描述
                <textarea
                  v-model="form.site.description"
                  class="textarea"
                  rows="3"
                  maxlength="300"
                />
                <span class="hint">用于首页与搜索引擎描述，建议 60–160 字。</span>
              </label>
              <label class="admin-label">
                站点 URL
                <input
                  v-model="form.site.siteUrl"
                  class="input"
                  type="url"
                  placeholder="https://blog.example.com"
                />
                <span class="hint"
                  >用于 canonical 与 SEO 推送；留空则使用服务端 SITE_URL 配置。</span
                >
              </label>
            </div>
          </section>

          <section class="admin-card">
            <div class="admin-card__head">
              <div>
                <h2 class="admin-card__title">页脚与备案</h2>
                <p class="admin-card__hint">所有字段留空时，前台不渲染对应占位</p>
              </div>
              <span class="mono settings-code">FOOTER</span>
            </div>
            <div class="admin-form settings-body">
              <div class="admin-form-row">
                <label class="admin-label">
                  ICP 备案号
                  <input v-model="form.footer.icp" class="input" placeholder="苏ICP备…号" />
                </label>
                <label class="admin-label">
                  公安备案号
                  <input
                    v-model="form.footer.policeIcp"
                    class="input"
                    placeholder="苏公网安备…号"
                  />
                </label>
              </div>
              <label class="admin-label">
                公安备案链接（可选）
                <input
                  v-model="form.footer.policeUrl"
                  class="input"
                  type="url"
                  placeholder="https://beian.mps.gov.cn/…"
                />
              </label>
              <div class="admin-form-row">
                <label class="admin-label">
                  虚拟备案号
                  <input v-model="form.footer.virtualRecord" class="input" placeholder="萌备…号" />
                </label>
                <label class="admin-label">
                  版权文本
                  <input v-model="form.footer.copyright" class="input" placeholder="© 2026 …" />
                </label>
              </div>
              <label class="admin-label">
                其他自定义页脚文本
                <textarea
                  v-model="form.footer.customText"
                  class="textarea"
                  rows="2"
                  maxlength="500"
                  placeholder="例如：本站没有评论区，只有安静的阅读。"
                />
              </label>
            </div>
          </section>

          <section class="admin-card">
            <div class="admin-card__head">
              <div>
                <h2 class="admin-card__title">扩展服务</h2>
                <p class="admin-card__hint">音乐播放器使用的 Meting API 地址</p>
              </div>
              <span class="mono settings-code">MUSIC</span>
            </div>
            <div class="admin-form settings-body">
              <label class="admin-label">
                Meting API Base
                <input
                  v-model="form.music.apiBase"
                  class="input"
                  type="url"
                  placeholder="https://api.qijieya.cn/meting/"
                />
                <span class="hint">
                  保存时会自动补齐末尾斜杠。歌单曲目由服务端代理请求，不会把第三方接口直接暴露给前台。
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside class="settings-side">
          <section class="admin-card settings-side__block">
            <div class="settings-side__head">
              <span class="mono">SITE_ICON</span>
              <button
                type="button"
                class="btn btn--sm btn--ghost"
                :disabled="uploading"
                @click="triggerIconUpload"
              >
                {{ uploading ? '上传中…' : '上传图标' }}
              </button>
              <input
                ref="iconInput"
                class="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/x-icon"
                @change="handleIconFile"
              />
            </div>
            <div class="site-icon-preview">
              <img
                v-if="form.site.icon && !iconFailed"
                :src="form.site.icon"
                alt="站点图标预览"
                @error="iconFailed = true"
              />
              <BrandMark v-else :size="48" />
            </div>
            <label class="admin-label">
              图标地址
              <input
                v-model="form.site.icon"
                class="input"
                type="text"
                placeholder="/favicon.svg 或 https://…"
              />
            </label>
            <p class="hint">支持 PNG / JPEG / GIF / WebP / ICO，最大 2MB；不允许 SVG 上传。</p>
          </section>

          <section class="admin-card settings-side__block footer-preview">
            <p class="mono">FOOTER_PREVIEW</p>
            <strong>{{ form.site.name || '站点名称' }}</strong>
            <span>{{ form.footer.copyright || '版权文本将显示在这里' }}</span>
            <div class="footer-preview__legal">
              <span v-if="form.footer.icp">{{ form.footer.icp }}</span>
              <span v-if="form.footer.policeIcp">{{ form.footer.policeIcp }}</span>
              <span v-if="form.footer.virtualRecord">{{ form.footer.virtualRecord }}</span>
              <span v-if="form.footer.customText">{{ form.footer.customText }}</span>
            </div>
          </section>

          <section class="admin-card settings-side__block">
            <p class="mono settings-side__eyebrow">SEO_REMINDER</p>
            <p class="settings-side__tip">
              站点 URL 会用于 sitemap 与搜索引擎推送。上线 HTTPS 后，请务必填写真实域名并在 SEO
              设置中配置 IndexNow 与百度推送 Key。
            </p>
          </section>

          <button
            type="button"
            class="btn btn--primary settings-save-mobile"
            :disabled="saving"
            @click="saveSettings"
          >
            {{ saving ? '保存中…' : '保存全部设置' }}
          </button>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.settings-error {
  margin-bottom: 14px;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.65fr);
  align-items: start;
  gap: 14px;
}

.settings-main {
  display: grid;
  gap: 14px;
}

.settings-body {
  padding: 19px;
}

.settings-code {
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
}

.settings-side {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 84px;
}

.settings-side__block {
  display: grid;
  gap: 12px;
  padding: 17px;
}

.settings-side__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 0.57rem;
  letter-spacing: 0.08em;
}

.site-icon-preview {
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface-alt);
}

.site-icon-preview img {
  width: 88px;
  height: 88px;
  object-fit: cover;
}

.footer-preview {
  gap: 6px;
}

.footer-preview > p {
  margin-bottom: 2px;
  color: var(--brand-deep);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
}

:root[data-theme='dark'] .footer-preview > p {
  color: var(--brand);
}

.footer-preview > strong {
  font-size: 0.86rem;
}

.footer-preview > span {
  color: var(--muted);
  font-size: 0.65rem;
}

.footer-preview__legal {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 9px;
  margin-top: 5px;
  padding-top: 9px;
  border-top: 1px solid var(--border);
}

.footer-preview__legal span {
  color: var(--muted);
  font-size: 0.58rem;
}

.settings-side__eyebrow {
  color: var(--muted);
  font-size: 0.55rem;
  letter-spacing: 0.09em;
}

.settings-side__tip {
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.75;
}

.settings-save-mobile {
  display: none;
}

@media (max-width: 1000px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-side {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-save-mobile {
    display: inline-flex;
    grid-column: 1 / -1;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .settings-side {
    grid-template-columns: 1fr;
  }

  .settings-body {
    padding: 15px;
  }
}
</style>
