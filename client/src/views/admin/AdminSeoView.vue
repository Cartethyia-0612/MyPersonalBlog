<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { useToastStore } from '@/stores/toast'
import type { SeoOverview, SeoPushLog } from '@/types/seo'

const toast = useToastStore()
const overview = ref<SeoOverview | null>(null)
const loading = ref(true)
const error = ref('')
const refreshing = ref(false)
const indexNowInput = ref('')
const baiduInput = ref('')
const savingProvider = ref<'indexnow' | 'baidu' | null>(null)
const pushingProvider = ref<'indexnow' | 'baidu' | null>(null)
const keyError = ref('')

const canPush = computed(() => Boolean(overview.value?.canPush))

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function providerLabel(provider: SeoPushLog['provider']): string {
  return provider === 'indexnow' ? 'IndexNow' : '百度'
}

function lastLog(provider: SeoPushLog['provider']): SeoPushLog | undefined {
  return overview.value?.logs.find((log) => log.provider === provider)
}

async function loadSeo(refresh = false): Promise<void> {
  if (refresh) refreshing.value = true
  else loading.value = true
  error.value = ''
  try {
    overview.value = await adminApi.getSeo()
  } catch (err) {
    error.value = toErrorMessage(err, 'SEO 信息加载失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function saveKey(provider: 'indexnow' | 'baidu'): Promise<void> {
  keyError.value = ''
  const value = provider === 'indexnow' ? indexNowInput.value.trim() : baiduInput.value.trim()
  if (!value) {
    keyError.value = provider === 'indexnow' ? '请输入 IndexNow Key' : '请输入百度推送 Token'
    return
  }
  savingProvider.value = provider
  try {
    overview.value = await adminApi.updateSeo(
      provider === 'indexnow' ? { indexNowKey: value } : { baiduToken: value },
    )
    if (provider === 'indexnow') indexNowInput.value = ''
    else baiduInput.value = ''
    toast.notify(provider === 'indexnow' ? 'IndexNow Key 已保存' : '百度 Token 已保存', 'success')
  } catch (err) {
    keyError.value = toErrorMessage(err, '保存 Key 失败')
  } finally {
    savingProvider.value = null
  }
}

async function clearKey(provider: 'indexnow' | 'baidu'): Promise<void> {
  const label = provider === 'indexnow' ? 'IndexNow Key' : '百度 Token'
  if (!window.confirm(`确定清除 ${label} 吗？清除后将无法执行对应推送。`)) return
  savingProvider.value = provider
  keyError.value = ''
  try {
    overview.value = await adminApi.updateSeo(
      provider === 'indexnow' ? { clearIndexNowKey: true } : { clearBaiduToken: true },
    )
    toast.notify(`${label} 已清除`, 'info')
  } catch (err) {
    keyError.value = toErrorMessage(err, '清除失败')
  } finally {
    savingProvider.value = null
  }
}

async function push(provider: 'indexnow' | 'baidu'): Promise<void> {
  if (!canPush.value) return
  pushingProvider.value = provider
  try {
    const result =
      provider === 'indexnow' ? await adminApi.pushIndexNow() : await adminApi.pushBaidu()
    overview.value = result.overview
    toast.notify(result.log.message, result.log.success ? 'success' : 'error')
  } catch (err) {
    toast.notify(toErrorMessage(err, '推送失败'), 'error')
  } finally {
    pushingProvider.value = null
  }
}

function generateIndexNowKey(): void {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  indexNowInput.value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  toast.notify('已生成随机 Key，保存后生效', 'info')
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.notify('已复制到剪贴板', 'info')
  } catch {
    toast.notify('复制失败，请手动选择复制', 'error')
  }
}

onMounted(() => {
  void loadSeo()
})

useSeo(() => ({
  title: 'SEO 推送',
  description: 'sitemap、IndexNow 与百度推送',
  noindex: true,
}))
</script>

<template>
  <div class="admin-seo">
    <AdminPageHeader
      eyebrow="GROWTH / SEARCH_ENGINE"
      title="SEO 推送"
      description="自动生成 sitemap.xml，并把已发布 URL 推送给 IndexNow 与百度站长平台。推送结果会记录在下方。"
    >
      <template #actions>
        <RouterLink class="btn btn--ghost btn--sm" to="/admin/settings">站点设置</RouterLink>
        <button
          type="button"
          class="btn btn--sm"
          :disabled="loading || refreshing"
          @click="loadSeo(true)"
        >
          {{ refreshing ? '刷新中…' : '刷新状态' }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="admin-loading admin-card"><span /><span /><span /></div>

    <div v-else-if="error && !overview" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ LOAD_ERROR ]</span>
        <h2>SEO 信息加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadSeo()">重新加载</button>
      </div>
    </div>

    <template v-else-if="overview">
      <div v-if="!overview.canPush" class="seo-warning">
        <span class="seo-warning__icon" aria-hidden="true">!</span>
        <div>
          <strong>当前站点 URL 不是公网地址，搜索引擎推送已禁用。</strong>
          <p>
            当前为 <code>{{ overview.siteUrl }}</code
            >。请先在
            <RouterLink to="/admin/settings">站点设置</RouterLink>
            中填写真实域名（推荐 HTTPS），再回来推送。
          </p>
        </div>
      </div>

      <section class="seo-summary">
        <article class="admin-card seo-summary__card">
          <div class="seo-summary__head">
            <span class="mono">SITEMAP_STATUS</span>
            <span class="admin-badge admin-badge--published">AUTO</span>
          </div>
          <h2>{{ overview.urlCount }} <small>URLS</small></h2>
          <p>
            其中 {{ overview.articleCount }} 篇已发布文章。sitemap
            在请求时由数据库动态生成，无需手动重建。
          </p>
          <div class="seo-summary__links">
            <a :href="overview.sitemapUrl" target="_blank" rel="noopener noreferrer">
              /sitemap.xml ↗
            </a>
            <a :href="overview.robotsUrl" target="_blank" rel="noopener noreferrer">
              /robots.txt ↗
            </a>
          </div>
        </article>

        <article class="admin-card seo-summary__card">
          <div class="seo-summary__head">
            <span class="mono">SITE_ORIGIN</span>
            <span class="mono seo-summary__tiny">CANONICAL_BASE</span>
          </div>
          <h2 class="seo-summary__origin">{{ overview.siteUrl }}</h2>
          <p>
            此地址来自「站点设置 → 站点 URL」。若留空，会回退到服务器环境变量
            <code>SITE_URL</code>。
          </p>
          <RouterLink class="seo-summary__link" to="/admin/settings">修改站点 URL →</RouterLink>
        </article>
      </section>

      <div v-if="keyError" class="admin-error seo-key-error" role="alert">{{ keyError }}</div>

      <div class="seo-providers">
        <section class="admin-card provider-card">
          <div class="provider-card__head">
            <div>
              <p class="mono provider-card__eyebrow">INDEXNOW</p>
              <h2>IndexNow</h2>
            </div>
            <span
              class="admin-badge"
              :class="
                overview.indexNow.configured ? 'admin-badge--published' : 'admin-badge--draft'
              "
            >
              {{ overview.indexNow.configured ? '已配置' : '未配置' }}
            </span>
          </div>
          <p class="provider-card__desc">
            向 IndexNow 端点推送 URL 列表，适用于 Bing、Yandex 等支持该协议的搜索引擎。
          </p>

          <div class="key-row">
            <label class="admin-label key-row__field">
              <span>IndexNow Key</span>
              <input
                v-model="indexNowInput"
                class="input mono"
                type="password"
                autocomplete="off"
                :placeholder="
                  overview.indexNow.configured
                    ? overview.indexNow.keyPreview
                    : '8-128 位字母、数字或短横线'
                "
              />
            </label>
            <button type="button" class="btn btn--sm btn--ghost" @click="generateIndexNowKey">
              生成
            </button>
            <button
              type="button"
              class="btn btn--sm btn--primary"
              :disabled="savingProvider === 'indexnow'"
              @click="saveKey('indexnow')"
            >
              {{ savingProvider === 'indexnow' ? '保存中…' : '保存 Key' }}
            </button>
            <button
              v-if="overview.indexNow.configured"
              type="button"
              class="btn btn--sm btn--danger"
              :disabled="savingProvider === 'indexnow'"
              @click="clearKey('indexnow')"
            >
              清除
            </button>
          </div>

          <div v-if="overview.indexNow.configured" class="key-location">
            <span class="mono">KEY_FILE</span>
            <code>{{ overview.indexNow.keyLocation || '保存站点 URL 后生成验证文件地址' }}</code>
            <button
              v-if="overview.indexNow.keyLocation"
              type="button"
              class="key-location__copy mono"
              @click="copyText(overview.indexNow.keyLocation)"
            >
              复制
            </button>
          </div>

          <div class="provider-card__footer">
            <div class="provider-card__last">
              <span class="mono">LAST_PUSH</span>
              <template v-if="lastLog('indexnow')">
                <span
                  class="admin-badge"
                  :class="
                    lastLog('indexnow')?.success ? 'admin-badge--published' : 'admin-badge--danger'
                  "
                >
                  {{ lastLog('indexnow')?.success ? '成功' : '失败' }}
                </span>
                <span class="provider-card__last-detail">
                  {{ formatDateTime(lastLog('indexnow')!.createdAt) }} ·
                  {{ lastLog('indexnow')!.urlCount }} URLs
                </span>
              </template>
              <span v-else class="provider-card__last-detail">尚未推送</span>
            </div>
            <button
              type="button"
              class="btn btn--sm btn--primary"
              :disabled="!canPush || !overview.indexNow.configured || pushingProvider !== null"
              @click="push('indexnow')"
            >
              {{ pushingProvider === 'indexnow' ? '推送中…' : '推送全部 URL' }}
            </button>
          </div>
        </section>

        <section class="admin-card provider-card">
          <div class="provider-card__head">
            <div>
              <p class="mono provider-card__eyebrow">BAIDU_ZHANZHANG</p>
              <h2>百度站长平台</h2>
            </div>
            <span
              class="admin-badge"
              :class="overview.baidu.configured ? 'admin-badge--published' : 'admin-badge--draft'"
            >
              {{ overview.baidu.configured ? '已配置' : '未配置' }}
            </span>
          </div>
          <p class="provider-card__desc">
            使用百度搜索资源平台的主动推送 Token，将文章 URL 提交给百度。适合中文内容站点。
          </p>

          <div class="key-row">
            <label class="admin-label key-row__field">
              <span>百度推送 Token</span>
              <input
                v-model="baiduInput"
                class="input mono"
                type="password"
                autocomplete="off"
                :placeholder="
                  overview.baidu.configured
                    ? overview.baidu.tokenPreview
                    : '在百度搜索资源平台获取 Token'
                "
              />
            </label>
            <button
              type="button"
              class="btn btn--sm btn--primary"
              :disabled="savingProvider === 'baidu'"
              @click="saveKey('baidu')"
            >
              {{ savingProvider === 'baidu' ? '保存中…' : '保存 Token' }}
            </button>
            <button
              v-if="overview.baidu.configured"
              type="button"
              class="btn btn--sm btn--danger"
              :disabled="savingProvider === 'baidu'"
              @click="clearKey('baidu')"
            >
              清除
            </button>
          </div>

          <div class="provider-card__footer">
            <div class="provider-card__last">
              <span class="mono">LAST_PUSH</span>
              <template v-if="lastLog('baidu')">
                <span
                  class="admin-badge"
                  :class="
                    lastLog('baidu')?.success ? 'admin-badge--published' : 'admin-badge--danger'
                  "
                >
                  {{ lastLog('baidu')?.success ? '成功' : '失败' }}
                </span>
                <span class="provider-card__last-detail">
                  {{ formatDateTime(lastLog('baidu')!.createdAt) }} ·
                  {{ lastLog('baidu')!.urlCount }} URLs
                </span>
              </template>
              <span v-else class="provider-card__last-detail">尚未推送</span>
            </div>
            <button
              type="button"
              class="btn btn--sm btn--primary"
              :disabled="!canPush || !overview.baidu.configured || pushingProvider !== null"
              @click="push('baidu')"
            >
              {{ pushingProvider === 'baidu' ? '推送中…' : '推送全部 URL' }}
            </button>
          </div>
        </section>
      </div>

      <section class="admin-card seo-logs">
        <div class="admin-card__head">
          <div>
            <h2 class="admin-card__title">推送历史</h2>
            <p class="admin-card__hint">保留最近 12 次推送结果</p>
          </div>
          <span class="mono seo-logs__count">{{ overview.logs.length }} RECORDS</span>
        </div>
        <div v-if="overview.logs.length === 0" class="admin-empty seo-logs__empty">
          <span class="admin-empty__glyph">[ NO_PUSH_YET ]</span>
          <p>完成首次推送后，状态和返回信息会显示在这里。</p>
        </div>
        <div v-else class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>服务</th>
                <th>URL</th>
                <th>HTTP</th>
                <th>结果</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in overview.logs" :key="log.id">
                <td class="mono seo-logs__time">{{ formatDateTime(log.createdAt) }}</td>
                <td>{{ providerLabel(log.provider) }}</td>
                <td class="mono">{{ log.urlCount }}</td>
                <td class="mono">{{ log.statusCode ?? '—' }}</td>
                <td>
                  <span
                    class="admin-badge"
                    :class="log.success ? 'admin-badge--published' : 'admin-badge--danger'"
                  >
                    {{ log.success ? '成功' : '失败' }}
                  </span>
                </td>
                <td class="seo-logs__message">{{ log.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="admin-card seo-notes">
        <p class="mono">SEO_NOTES</p>
        <ul>
          <li>sitemap.xml 由 Node 服务动态生成，包含全部已发布文章，草稿不会出现。</li>
          <li>
            IndexNow 的 Key 同时是根目录验证文件名（/&lt;key&gt;.txt），本服务会自动提供该文件。
          </li>
          <li>百度主动推送每日配额有限，建议在发布新文章后推送，而不是频繁重复推送。</li>
          <li>推送前请确保站点域名可公网访问且 canonical、HTTPS 配置正确。</li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.seo-warning {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  padding: 15px 17px;
  border: 1px solid rgba(220, 150, 50, 0.26);
  border-radius: var(--radius-sm);
  background: rgba(220, 150, 50, 0.08);
  color: #8f5d15;
}

:root[data-theme='dark'] .seo-warning {
  color: #f0c478;
}

.seo-warning__icon {
  display: grid;
  width: 22px;
  height: 22px;
  flex: none;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.seo-warning strong {
  font-size: 0.8rem;
}

.seo-warning p {
  margin-top: 5px;
  color: inherit;
  font-size: 0.74rem;
  line-height: 1.7;
  opacity: 0.9;
}

.seo-warning a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.seo-warning code {
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.08);
  font-family: var(--font-mono);
}

.seo-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.seo-summary__card {
  padding: 20px;
}

.seo-summary__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
}

.seo-summary__tiny {
  font-size: 0.48rem;
  opacity: 0.75;
}

.seo-summary__card h2 {
  margin-top: 12px;
  font-family: var(--font-mono);
  font-size: 2rem;
  line-height: 1;
}

.seo-summary__card h2 small {
  color: var(--muted);
  font-size: 0.6rem;
  font-weight: 400;
  letter-spacing: 0.08em;
}

.seo-summary__origin {
  overflow: hidden;
  font-size: 1.1rem !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seo-summary__card > p {
  margin-top: 9px;
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.75;
}

.seo-summary__card code {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--surface-alt);
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.seo-summary__links {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 13px;
}

.seo-summary__links a,
.seo-summary__link {
  color: var(--brand-deep);
  font-family: var(--font-mono);
  font-size: 0.63rem;
}

:root[data-theme='dark'] .seo-summary__links a,
:root[data-theme='dark'] .seo-summary__link {
  color: var(--brand);
}

.seo-key-error {
  margin-top: 14px;
}

.seo-providers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 14px;
  margin-top: 14px;
}

.provider-card {
  padding: 20px;
}

.provider-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.provider-card__eyebrow {
  color: var(--brand-deep);
  font-size: 0.54rem;
  letter-spacing: 0.1em;
}

:root[data-theme='dark'] .provider-card__eyebrow {
  color: var(--brand);
}

.provider-card__head h2 {
  margin-top: 4px;
  font-size: 1.08rem;
}

.provider-card__desc {
  margin-top: 11px;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.75;
}

.key-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 7px;
  margin-top: 17px;
}

.key-row__field {
  min-width: 170px;
  flex: 1;
}

.key-row__field > span {
  font-size: 0.72rem;
}

.key-location {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 11px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--surface-alt);
}

.key-location > .mono {
  color: var(--muted);
  font-size: 0.5rem;
  letter-spacing: 0.05em;
}

.key-location code {
  overflow: hidden;
  flex: 1;
  min-width: 120px;
  color: var(--text-soft);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.key-location__copy {
  border: 0;
  background: transparent;
  color: var(--brand-deep);
  font-size: 0.56rem;
}

:root[data-theme='dark'] .key-location__copy {
  color: var(--brand);
}

.provider-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.provider-card__last {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.provider-card__last > .mono {
  color: var(--muted);
  font-size: 0.5rem;
  letter-spacing: 0.05em;
}

.provider-card__last-detail {
  color: var(--muted);
  font-size: 0.63rem;
}

.seo-logs {
  margin-top: 14px;
  overflow: hidden;
}

.seo-logs__count {
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.06em;
}

.seo-logs__empty {
  padding: 30px 20px;
}

.seo-logs__time {
  color: var(--muted);
  font-size: 0.58rem;
  white-space: nowrap;
}

.seo-logs__message {
  max-width: 360px;
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.5;
}

.seo-notes {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 19px;
}

.seo-notes > p {
  color: var(--brand-deep);
  font-size: 0.53rem;
  letter-spacing: 0.09em;
}

:root[data-theme='dark'] .seo-notes > p {
  color: var(--brand);
}

.seo-notes ul {
  display: grid;
  gap: 5px;
  padding-left: 1.1em;
  color: var(--muted);
  font-size: 0.73rem;
  line-height: 1.7;
}

.seo-notes li::marker {
  color: var(--brand-strong);
}

@media (max-width: 980px) {
  .seo-providers {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .seo-summary {
    grid-template-columns: 1fr;
  }

  .key-row {
    flex-direction: column;
    align-items: stretch;
  }

  .key-row .btn {
    justify-content: center;
  }

  .provider-card__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-table th:nth-child(4),
  .admin-table td:nth-child(4) {
    display: none;
  }
}
</style>
