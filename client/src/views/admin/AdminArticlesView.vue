<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import Pagination from '@/components/Pagination.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useSeo } from '@/lib/seo'
import { useToastStore } from '@/stores/toast'
import type { ArticleStatus, Paginated } from '@/types/content'
import type { ArticleSummary } from '@/types/content'

const toast = useToastStore()
const data = ref<Paginated<ArticleSummary> | null>(null)
const loading = ref(true)
const error = ref('')
const page = ref(1)
const pageSize = 20
const statusFilter = ref<'all' | ArticleStatus>('all')
const search = ref('')
let searchTimer: number | undefined
let requestId = 0

async function loadArticles(): Promise<void> {
  const current = ++requestId
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listArticles({
      page: page.value,
      pageSize,
      ...(statusFilter.value === 'all' ? {} : { status: statusFilter.value }),
      ...(search.value.trim() ? { q: search.value.trim() } : {}),
    })
    if (current !== requestId) return
    data.value = result
  } catch (err) {
    if (current !== requestId) return
    error.value = toErrorMessage(err, '文章列表加载失败')
  } finally {
    if (current === requestId) loading.value = false
  }
}

function changeStatus(status: 'all' | ArticleStatus): void {
  if (statusFilter.value === status) return
  statusFilter.value = status
  page.value = 1
  void loadArticles()
}

function changePage(next: number): void {
  if (next === page.value) return
  page.value = next
  void loadArticles()
}

async function deleteArticle(article: ArticleSummary): Promise<void> {
  const confirmed = window.confirm(`确定删除文章「${article.title}」吗？此操作不可撤销。`)
  if (!confirmed) return
  try {
    await adminApi.deleteArticle(article.id)
    toast.notify('文章已删除', 'success')
    if (data.value && data.value.items.length === 1 && page.value > 1) page.value -= 1
    await loadArticles()
  } catch (err) {
    toast.notify(toErrorMessage(err, '删除失败'), 'error')
  }
}

watch(search, () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
    void loadArticles()
  }, 320)
})

onMounted(() => {
  void loadArticles()
})

onBeforeUnmount(() => {
  window.clearTimeout(searchTimer)
})

useSeo(() => ({
  title: '文章管理',
  description: '管理所有文章与草稿',
  noindex: true,
}))
</script>

<template>
  <div class="admin-articles">
    <AdminPageHeader
      eyebrow="CONTENT / ARTICLES"
      title="文章管理"
      description="管理草稿与已发布内容。发布后会立即出现在前台文章归档中。"
    >
      <template #actions>
        <RouterLink class="btn btn--primary btn--sm" to="/admin/articles/new">
          <span aria-hidden="true">+</span>
          新建文章
        </RouterLink>
      </template>
    </AdminPageHeader>

    <section class="admin-card">
      <div class="articles-toolbar">
        <div class="admin-filter-tabs" aria-label="按状态筛选">
          <button
            type="button"
            :class="{ 'is-active': statusFilter === 'all' }"
            @click="changeStatus('all')"
          >
            全部
          </button>
          <button
            type="button"
            :class="{ 'is-active': statusFilter === 'published' }"
            @click="changeStatus('published')"
          >
            已发布
          </button>
          <button
            type="button"
            :class="{ 'is-active': statusFilter === 'draft' }"
            @click="changeStatus('draft')"
          >
            草稿
          </button>
        </div>

        <label class="admin-search">
          <span class="admin-search__icon" aria-hidden="true">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </span>
          <span class="sr-only">搜索文章</span>
          <input v-model="search" class="input" type="search" placeholder="按标题或 slug 搜索…" />
        </label>
      </div>

      <div v-if="loading" class="admin-loading" aria-label="加载文章列表">
        <span /><span /><span />
      </div>

      <div v-else-if="error" class="admin-empty">
        <span class="admin-empty__glyph">[ SIGNAL_ERROR ]</span>
        <h2>文章列表加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadArticles">重新加载</button>
      </div>

      <div v-else-if="!data || data.items.length === 0" class="admin-empty">
        <span class="admin-empty__glyph">[ NO_ARTICLES ]</span>
        <h2>{{ search ? '没有匹配的文章' : '还没有文章' }}</h2>
        <p>{{ search ? '换一个关键词试试。' : '从第一篇札记开始，把想法留在互联网上。' }}</p>
        <RouterLink v-if="!search" class="btn btn--sm btn--primary" to="/admin/articles/new">
          开始写作
        </RouterLink>
        <button v-else type="button" class="btn btn--sm" @click="search = ''">清除搜索</button>
      </div>

      <template v-else>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>文章</th>
                <th>状态</th>
                <th>标签</th>
                <th>更新时间</th>
                <th><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="article in data.items" :key="article.id">
                <td>
                  <div class="admin-table__title">
                    <RouterLink
                      :to="{ name: 'admin-article-edit', params: { id: article.id } }"
                      class="admin-table__article-link"
                    >
                      {{ article.title }}
                    </RouterLink>
                    <span>/{{ article.slug }}</span>
                  </div>
                </td>
                <td>
                  <span
                    class="admin-badge"
                    :class="
                      article.status === 'published'
                        ? 'admin-badge--published'
                        : 'admin-badge--draft'
                    "
                  >
                    {{ article.status === 'published' ? '已发布' : '草稿' }}
                  </span>
                </td>
                <td>
                  <div class="table-tags">
                    <span v-for="tag in article.tags.slice(0, 2)" :key="tag" class="tag"
                      >#{{ tag }}</span
                    >
                    <span v-if="article.tags.length > 2" class="table-tags__more mono">
                      +{{ article.tags.length - 2 }}
                    </span>
                    <span v-if="article.tags.length === 0" class="table-tags__empty">—</span>
                  </div>
                </td>
                <td class="admin-table__date mono">{{ formatDate(article.updatedAt) }}</td>
                <td>
                  <div class="admin-table__actions">
                    <RouterLink
                      class="btn btn--sm btn--ghost"
                      :to="{ name: 'admin-article-edit', params: { id: article.id } }"
                    >
                      编辑
                    </RouterLink>
                    <button
                      type="button"
                      class="btn btn--sm btn--danger"
                      @click="deleteArticle(article)"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="articles-footer">
          <span class="mono">
            {{ data.pagination.total }} ENTRIES · PAGE {{ data.pagination.page }}/{{
              data.pagination.totalPages
            }}
          </span>
          <Pagination
            :page="data.pagination.page"
            :total-pages="data.pagination.totalPages"
            @change="changePage"
          />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.articles-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--border);
}

.admin-search {
  max-width: 310px;
}

.admin-table__article-link {
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
}

.admin-table__article-link:hover {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .admin-table__article-link:hover {
  color: var(--brand);
}

.admin-table__date {
  color: var(--muted);
  font-size: 0.62rem;
  white-space: nowrap;
}

.table-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.table-tags .tag {
  font-size: 0.57rem;
}

.table-tags__more {
  color: var(--muted);
  font-size: 0.56rem;
}

.table-tags__empty {
  color: var(--muted);
}

.articles-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 18px;
  border-top: 1px solid var(--border);
}

.articles-footer > .mono {
  color: var(--muted);
  font-size: 0.55rem;
  letter-spacing: 0.04em;
}

.articles-footer :deep(.pagination) {
  margin-top: 0;
}

@media (max-width: 860px) {
  .admin-search {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .articles-footer {
    justify-content: center;
  }
}
</style>
