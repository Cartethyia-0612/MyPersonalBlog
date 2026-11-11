<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'

import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import MarkdownEditor from '@/components/admin/MarkdownEditor.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useSeo } from '@/lib/seo'
import { useToastStore } from '@/stores/toast'
import type { ArticleStatus } from '@/types/content'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const isEditing = computed(() => route.name === 'admin-article-edit')
const articleId = computed(() => Number(route.params.id))

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  contentMd: '',
  coverUrl: '',
  status: 'draft' as ArticleStatus,
})
const tagsInput = ref('')
const loading = ref(false)
const loadFailed = ref(false)
const saving = ref(false)
const uploading = ref(false)
const error = ref('')
const initialized = ref(false)
const baseline = ref('')
const coverInput = ref<HTMLInputElement | null>(null)
const publishedAt = ref<string | null>(null)

const currentStatusLabel = computed(() => (form.status === 'published' ? '已发布' : '草稿'))
const pageTitle = computed(() => form.title.trim() || (isEditing.value ? '编辑文章' : '新建文章'))

function snapshot(): string {
  return JSON.stringify({
    title: form.title,
    slug: form.slug,
    summary: form.summary,
    contentMd: form.contentMd,
    coverUrl: form.coverUrl,
    tags: tagsInput.value,
    status: form.status,
  })
}

const dirty = computed(() => initialized.value && snapshot() !== baseline.value)

function markClean(): void {
  baseline.value = snapshot()
}

function parseTags(): string[] {
  return [
    ...new Set(
      tagsInput.value
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ]
}

function fillForm(article: {
  title: string
  slug: string
  summary: string
  contentMd: string
  coverUrl: string
  tags: string[]
  status: ArticleStatus
  publishedAt: string | null
}): void {
  form.title = article.title
  form.slug = article.slug
  form.summary = article.summary
  form.contentMd = article.contentMd
  form.coverUrl = article.coverUrl
  form.status = article.status
  publishedAt.value = article.publishedAt
  tagsInput.value = article.tags.join(', ')
  markClean()
}

async function loadArticle(): Promise<void> {
  loadFailed.value = false
  if (!isEditing.value) {
    initialized.value = true
    markClean()
    return
  }
  if (!Number.isInteger(articleId.value) || articleId.value < 1) {
    error.value = '文章 ID 不合法'
    loadFailed.value = true
    initialized.value = true
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.getArticle(articleId.value)
    fillForm(result.article)
  } catch (err) {
    error.value = toErrorMessage(err, '文章加载失败')
    loadFailed.value = true
  } finally {
    initialized.value = true
    loading.value = false
  }
}

async function save(statusOverride?: ArticleStatus): Promise<void> {
  error.value = ''
  if (!form.title.trim()) {
    error.value = '请先填写文章标题'
    return
  }
  const tags = parseTags()
  if (tags.length > 8) {
    error.value = '最多设置 8 个标签'
    return
  }
  if (tags.some((tag) => tag.length > 24)) {
    error.value = '单个标签不能超过 24 个字符'
    return
  }

  const nextStatus = statusOverride ?? form.status
  saving.value = true
  try {
    const payload = {
      title: form.title,
      slug: form.slug.trim(),
      summary: form.summary,
      contentMd: form.contentMd,
      coverUrl: form.coverUrl,
      tags,
      status: nextStatus,
    }

    if (isEditing.value) {
      const result = await adminApi.updateArticle(articleId.value, payload)
      fillForm(result.article)
      toast.notify(nextStatus === 'published' ? '文章已更新并发布' : '草稿已保存', 'success')
    } else {
      const result = await adminApi.createArticle(payload)
      fillForm(result.article)
      toast.notify(result.article.status === 'published' ? '文章已发布' : '草稿已创建', 'success')
      await router.replace({ name: 'admin-article-edit', params: { id: result.article.id } })
    }
  } catch (err) {
    error.value = toErrorMessage(err, '保存失败')
    toast.notify(error.value, 'error')
  } finally {
    saving.value = false
  }
}

async function removeArticle(): Promise<void> {
  if (!isEditing.value) return
  const confirmed = window.confirm(`确定删除「${form.title || '这篇文章'}」吗？此操作不可撤销。`)
  if (!confirmed) return
  try {
    await adminApi.deleteArticle(articleId.value)
    toast.notify('文章已删除', 'success')
    initialized.value = false
    await router.push({ name: 'admin-articles' })
  } catch (err) {
    toast.notify(toErrorMessage(err, '删除失败'), 'error')
  }
}

function triggerCoverUpload(): void {
  coverInput.value?.click()
}

async function handleCoverFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.notify('请选择图片文件', 'error')
    input.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.notify('封面图片不能超过 2MB', 'error')
    input.value = ''
    return
  }

  uploading.value = true
  try {
    const uploaded = await adminApi.uploadImage(file, 'image')
    form.coverUrl = uploaded.url
    toast.notify('封面已上传', 'success')
  } catch (err) {
    toast.notify(toErrorMessage(err, '封面上传失败'), 'error')
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
  return window.confirm('当前文章有未保存的修改，确定离开吗？')
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  void loadArticle()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

useSeo(() => ({
  title: pageTitle.value,
  description: '编辑文章',
  noindex: true,
}))
</script>

<template>
  <div class="editor-page">
    <AdminPageHeader
      eyebrow="CONTENT / EDITOR"
      :title="pageTitle"
      :description="
        isEditing ? '修改内容并保存，或发布到前台。' : '写下新的札记。可以先存为草稿，稍后发布。'
      "
    >
      <template #actions>
        <RouterLink class="btn btn--ghost btn--sm" to="/admin/articles">返回列表</RouterLink>
        <button
          type="button"
          class="btn btn--sm"
          :disabled="saving || loading"
          @click="save('draft')"
        >
          保存草稿
        </button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          :disabled="saving || loading"
          @click="save('published')"
        >
          {{ saving ? '保存中…' : '发布' }}
        </button>
        <button
          v-if="isEditing"
          type="button"
          class="btn btn--danger btn--sm"
          :disabled="saving || loading"
          @click="removeArticle"
        >
          删除
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="admin-loading admin-card"><span /><span /><span /></div>

    <div v-else-if="loadFailed" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ LOAD_ERROR ]</span>
        <h2>文章读取失败</h2>
        <p>{{ error }}</p>
        <RouterLink class="btn btn--sm" to="/admin/articles">返回列表</RouterLink>
      </div>
    </div>

    <template v-else>
      <div v-if="error" class="admin-error editor-error" role="alert">{{ error }}</div>

      <div class="editor-layout">
        <section class="editor-main admin-card">
          <div class="editor-main__body">
            <label class="admin-label editor-title-field">
              文章标题
              <input
                v-model="form.title"
                class="editor-title input"
                type="text"
                maxlength="120"
                placeholder="给这篇札记一个标题…"
              />
            </label>

            <div class="admin-label">
              正文（Markdown）
              <MarkdownEditor v-model="form.contentMd" min-height="440px" />
            </div>

            <label class="admin-label">
              摘要
              <textarea
                v-model="form.summary"
                class="textarea"
                maxlength="300"
                rows="3"
                placeholder="留空会自动从正文中提取"
              />
              <span class="hint">显示在文章列表与 SEO description 中，建议 80–160 字。</span>
            </label>
          </div>
        </section>

        <aside class="editor-side">
          <section class="admin-card editor-side__block">
            <div class="editor-side__head">
              <span class="mono">STATUS</span>
              <span
                class="admin-badge"
                :class="
                  form.status === 'published' ? 'admin-badge--published' : 'admin-badge--draft'
                "
              >
                {{ currentStatusLabel }}
              </span>
            </div>
            <p v-if="publishedAt" class="editor-side__meta mono">
              PUBLISHED {{ formatDate(publishedAt) }}
            </p>
            <p v-else class="editor-side__meta mono">NOT_PUBLISHED_YET</p>
            <RouterLink
              v-if="form.status === 'published' && form.slug"
              class="editor-side__preview"
              :to="`/articles/${form.slug}`"
              target="_blank"
              rel="noopener"
            >
              查看前台文章 ↗
            </RouterLink>
          </section>

          <section class="admin-card editor-side__block">
            <label class="admin-label">
              Slug
              <input
                v-model="form.slug"
                class="input"
                type="text"
                maxlength="100"
                placeholder="留空自动生成"
              />
              <span class="hint">小写字母、数字与短横线。发布后修改会影响文章链接。</span>
            </label>

            <label class="admin-label">
              标签
              <input v-model="tagsInput" class="input" type="text" placeholder="Vue, 工程实践" />
              <span class="hint">用逗号分隔，最多 8 个。</span>
            </label>
          </section>

          <section class="admin-card editor-side__block">
            <div class="editor-side__head">
              <span class="mono">COVER_IMAGE</span>
              <button
                type="button"
                class="btn btn--sm btn--ghost"
                :disabled="uploading"
                @click="triggerCoverUpload"
              >
                {{ uploading ? '上传中…' : '上传图片' }}
              </button>
              <input
                ref="coverInput"
                class="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/x-icon"
                @change="handleCoverFile"
              />
            </div>

            <div v-if="form.coverUrl" class="cover-preview">
              <img :src="form.coverUrl" alt="文章封面预览" />
              <button type="button" class="cover-preview__remove" @click="form.coverUrl = ''">
                移除
              </button>
            </div>
            <div v-else class="cover-placeholder">
              <span class="mono">NO_COVER</span>
              <p>不使用封面时，前台会自动绘制天依蓝图案。</p>
            </div>

            <label class="admin-label">
              封面地址
              <input
                v-model="form.coverUrl"
                class="input"
                type="text"
                placeholder="https://… 或 /uploads/…"
              />
            </label>
          </section>

          <section class="admin-card editor-side__block editor-actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="saving || loading"
              @click="save(isEditing ? form.status : 'draft')"
            >
              {{ saving ? '保存中…' : '保存当前状态' }}
            </button>
            <button
              type="button"
              class="btn"
              :disabled="saving || loading"
              @click="save('published')"
            >
              发布到前台
            </button>
            <p class="hint">发布后文章会立即出现在前台归档和 sitemap 中。</p>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.editor-page {
  padding-bottom: 20px;
}

.editor-error {
  margin-bottom: 14px;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.8fr);
  align-items: start;
  gap: 14px;
}

.editor-main {
  min-width: 0;
}

.editor-main__body {
  display: grid;
  gap: 20px;
  padding: 20px;
}

.editor-title-field {
  gap: 8px;
}

.editor-title {
  min-height: 54px;
  border: 0;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
  padding: 5px 0 12px;
  font-family: var(--font-sans);
  font-size: clamp(1.45rem, 2.7vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.025em;
}

.editor-title:focus {
  box-shadow: none;
  border-color: var(--brand-strong);
}

.editor-title::placeholder {
  color: var(--muted);
  font-weight: 500;
}

.editor-side {
  display: grid;
  gap: 14px;
}

.editor-side__block {
  display: grid;
  gap: 13px;
  padding: 16px;
}

.editor-side__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  color: var(--muted);
  font-size: 0.57rem;
  letter-spacing: 0.08em;
}

.editor-side__meta {
  color: var(--muted);
  font-size: 0.56rem;
  letter-spacing: 0.05em;
}

.editor-side__preview {
  color: var(--brand-deep);
  font-size: 0.72rem;
}

:root[data-theme='dark'] .editor-side__preview {
  color: var(--brand);
}

.cover-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.cover-preview img {
  width: 100%;
  max-height: 150px;
  object-fit: cover;
}

.cover-preview__remove {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--radius-pill);
  background: rgba(4, 16, 26, 0.7);
  color: #fff;
  font-size: 0.62rem;
}

.cover-placeholder {
  padding: 19px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--muted);
  text-align: center;
}

.cover-placeholder .mono {
  display: block;
  color: var(--brand-deep);
  font-size: 0.57rem;
  letter-spacing: 0.09em;
}

:root[data-theme='dark'] .cover-placeholder .mono {
  color: var(--brand);
}

.cover-placeholder p {
  margin-top: 6px;
  font-size: 0.7rem;
  line-height: 1.6;
}

.editor-actions {
  gap: 8px;
}

.editor-actions .btn {
  width: 100%;
}

.editor-actions .hint {
  font-size: 0.68rem;
  line-height: 1.6;
}

@media (max-width: 1050px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-actions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .editor-side {
    grid-template-columns: 1fr;
  }

  .editor-main__body {
    padding: 15px;
  }
}
</style>
