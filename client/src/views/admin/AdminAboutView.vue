<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'

import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import MarkdownEditor from '@/components/admin/MarkdownEditor.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const contentMd = ref('')
const baseline = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const initialized = ref(false)

const dirty = computed(() => initialized.value && contentMd.value !== baseline.value)

async function loadAbout(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.getAbout()
    contentMd.value = result.contentMd
    baseline.value = result.contentMd
    initialized.value = true
  } catch (err) {
    error.value = toErrorMessage(err, '关于页加载失败')
  } finally {
    loading.value = false
  }
}

async function saveAbout(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const result = await adminApi.updateAbout(contentMd.value)
    contentMd.value = result.contentMd
    baseline.value = result.contentMd
    toast.notify('关于页已保存，前台立即生效', 'success')
  } catch (err) {
    error.value = toErrorMessage(err, '保存失败')
    toast.notify(error.value, 'error')
  } finally {
    saving.value = false
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return window.confirm('关于页有未保存的修改，确定离开吗？')
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  void loadAbout()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

useSeo(() => ({
  title: '关于页',
  description: '编辑关于页内容',
  noindex: true,
}))
</script>

<template>
  <div class="about-admin">
    <AdminPageHeader
      eyebrow="CONTENT / ABOUT_PAGE"
      title="关于页"
      description="使用 Markdown 编辑关于页。保存后会立即更新前台 /about 页面。"
    >
      <template #actions>
        <RouterLink class="btn btn--ghost btn--sm" to="/about" target="_blank" rel="noopener">
          查看前台 ↗
        </RouterLink>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          :disabled="saving || loading"
          @click="saveAbout"
        >
          {{ saving ? '保存中…' : '保存关于页' }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="admin-loading admin-card"><span /><span /><span /></div>

    <div v-else-if="error && !initialized" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ LOAD_ERROR ]</span>
        <h2>关于页加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadAbout">重新加载</button>
      </div>
    </div>

    <template v-else>
      <div v-if="error" class="admin-error about-admin__error" role="alert">{{ error }}</div>

      <div class="about-admin__layout">
        <section class="admin-card about-admin__editor">
          <div class="admin-card__head">
            <div>
              <h2 class="admin-card__title">页面正文</h2>
              <p class="admin-card__hint">支持标题、列表、引用、代码块与图片</p>
            </div>
            <span class="mono about-admin__count">{{ contentMd.length }} CHARS</span>
          </div>
          <div class="about-admin__body">
            <MarkdownEditor
              v-model="contentMd"
              min-height="480px"
              placeholder="## 你好，我是…&#10;&#10;在这里介绍你自己和这个站点。"
            />
          </div>
        </section>

        <aside class="about-admin__side">
          <section class="admin-card about-side-card">
            <span class="mono">PAGE_INFO</span>
            <h2>关于页提示</h2>
            <p>关于页是读者了解站长与站点的入口。可以写技术偏好、联系方式和这个博客的由来。</p>
            <ul>
              <li>Markdown 内容会自动清洗后渲染</li>
              <li>建议保留「关于本站」小节</li>
              <li>保存后无需重新构建前台</li>
            </ul>
          </section>
          <section class="admin-card about-side-card">
            <span class="mono">QUICK_ACTIONS</span>
            <RouterLink class="about-side-card__link" to="/admin/settings"
              >编辑站点与页脚 →</RouterLink
            >
            <RouterLink class="about-side-card__link" to="/admin/friends">编辑友链 →</RouterLink>
            <RouterLink class="about-side-card__link" to="/admin/articles">管理文章 →</RouterLink>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.about-admin__error {
  margin-bottom: 14px;
}

.about-admin__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.65fr);
  align-items: start;
  gap: 14px;
}

.about-admin__editor {
  overflow: hidden;
}

.about-admin__count {
  color: var(--muted);
  font-size: 0.56rem;
}

.about-admin__body {
  padding: 17px;
}

.about-admin__side {
  display: grid;
  gap: 14px;
}

.about-side-card {
  display: grid;
  gap: 10px;
  padding: 18px;
}

.about-side-card > .mono {
  color: var(--brand-deep);
  font-size: 0.56rem;
  letter-spacing: 0.1em;
}

:root[data-theme='dark'] .about-side-card > .mono {
  color: var(--brand);
}

.about-side-card h2 {
  font-size: 0.92rem;
}

.about-side-card p {
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.75;
}

.about-side-card ul {
  display: grid;
  gap: 6px;
  padding-left: 1.1em;
  color: var(--muted);
  font-size: 0.73rem;
}

.about-side-card li::marker {
  color: var(--brand-strong);
}

.about-side-card__link {
  color: var(--text-soft);
  font-size: 0.75rem;
}

.about-side-card__link:hover {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .about-side-card__link:hover {
  color: var(--brand);
}

@media (max-width: 900px) {
  .about-admin__layout {
    grid-template-columns: 1fr;
  }

  .about-admin__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .about-admin__side {
    grid-template-columns: 1fr;
  }
}
</style>
