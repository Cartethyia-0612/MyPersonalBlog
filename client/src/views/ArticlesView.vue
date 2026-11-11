<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import ArticleCard from '@/components/ArticleCard.vue'
import Pagination from '@/components/Pagination.vue'
import { publicApi } from '@/lib/api'
import { useSeo } from '@/lib/seo'
import type { ArticleSummary, Paginated } from '@/types/content'

const route = useRoute()
const router = useRouter()
const data = ref<Paginated<ArticleSummary> | null>(null)
const loading = ref(true)
const error = ref('')
let requestId = 0

const page = computed(() => {
  const parsed = Number(route.query.page)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
})

const activeTag = computed(() =>
  typeof route.query.tag === 'string' ? route.query.tag.trim().slice(0, 24) : '',
)

const availableTags = computed(() => {
  const tags = new Set<string>()
  for (const article of data.value?.items ?? []) {
    for (const tag of article.tags) tags.add(tag)
    if (tags.size >= 12) break
  }
  return [...tags]
})

const total = computed(() => data.value?.pagination.total ?? 0)

async function loadArticles(): Promise<void> {
  const current = ++requestId
  loading.value = true
  error.value = ''
  try {
    const result = await publicApi.getArticles({
      page: page.value,
      pageSize: 9,
      ...(activeTag.value ? { tag: activeTag.value } : {}),
    })
    if (current !== requestId) return
    data.value = result
  } catch (err) {
    if (current !== requestId) return
    error.value = err instanceof Error ? err.message : '文章加载失败'
  } finally {
    if (current === requestId) loading.value = false
  }
}

function goToPage(nextPage: number): void {
  void router.push({
    name: 'articles',
    query: {
      ...(activeTag.value ? { tag: activeTag.value } : {}),
      ...(nextPage > 1 ? { page: String(nextPage) } : {}),
    },
  })
}

function filterByTag(tag: string): void {
  void router.push({
    name: 'articles',
    query: tag ? { tag } : {},
  })
}

watch([page, activeTag], () => void loadArticles(), { immediate: true })

useSeo(() => ({
  title: activeTag.value ? `标签：${activeTag.value}` : '全部札记',
  description: activeTag.value
    ? `浏览标签「${activeTag.value}」下的技术札记。`
    : '所有技术札记、工程实践与工具折腾记录。',
}))
</script>

<template>
  <div class="articles-page page">
    <header class="archive-header container">
      <p class="eyebrow">ARCHIVE / ALL LOGS</p>
      <div class="archive-header__row">
        <div>
          <h1>全部札记</h1>
          <p class="archive-header__desc">把踩过的坑、写过的代码和想明白的事，按时间摆在这里。</p>
        </div>
        <div class="archive-header__count mono">
          <strong>{{ loading ? '--' : total }}</strong>
          <span>ENTRIES</span>
        </div>
      </div>

      <div v-if="availableTags.length || activeTag" class="tag-filter" aria-label="标签筛选">
        <span class="tag-filter__label mono">FILTER_BY_TAG</span>
        <button
          v-if="activeTag"
          type="button"
          class="tag-filter__chip is-active"
          @click="filterByTag('')"
        >
          #{{ activeTag }}
          <span aria-hidden="true">×</span>
        </button>
        <button
          v-for="tag in availableTags.filter((item) => item !== activeTag)"
          :key="tag"
          type="button"
          class="tag-filter__chip"
          @click="filterByTag(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </header>

    <div class="container">
      <div v-if="loading" class="article-grid" aria-label="文章加载中">
        <div v-for="item in 6" :key="item" class="skeleton-card card" aria-hidden="true">
          <div class="skeleton-card__cover" />
          <div class="skeleton-card__body">
            <span class="skeleton-line skeleton-line--short" />
            <span class="skeleton-line" />
            <span class="skeleton-line skeleton-line--medium" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="state-card card">
        <p class="mono">SIGNAL_ERROR</p>
        <h2>连接归档库失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadArticles">再试一次</button>
      </div>

      <div v-else-if="!data || data.items.length === 0" class="state-card card">
        <span class="mono state-card__glyph">[ NO_MATCHES ]</span>
        <h2>{{ activeTag ? `没有找到 #${activeTag} 的札记` : '这里还没有文章' }}</h2>
        <p v-if="activeTag">换一个标签，或者查看全部归档。</p>
        <p v-else>第一篇札记正在路上。你可以先去关于页认识一下这个站点。</p>
        <button v-if="activeTag" type="button" class="btn btn--sm" @click="filterByTag('')">
          清除筛选
        </button>
        <RouterLink v-else class="btn btn--sm" to="/about">关于本站</RouterLink>
      </div>

      <template v-else>
        <div class="article-grid">
          <ArticleCard
            v-for="(article, index) in data.items"
            :key="article.id"
            :article="article"
            :index="(page - 1) * data.pagination.pageSize + index"
          />
        </div>
        <Pagination
          :page="data.pagination.page"
          :total-pages="data.pagination.totalPages"
          @change="goToPage"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.articles-page {
  padding-top: 56px;
}

.archive-header {
  margin-bottom: 30px;
}

.archive-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-top: 11px;
}

.archive-header h1 {
  font-size: clamp(2.1rem, 4.6vw, 3.5rem);
  letter-spacing: -0.045em;
}

.archive-header__desc {
  max-width: 540px;
  margin-top: 10px;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.85;
}

.archive-header__count {
  display: grid;
  gap: 0;
  padding: 12px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  text-align: right;
}

.archive-header__count strong {
  color: var(--text);
  font-size: 1.6rem;
  line-height: 1.2;
}

.archive-header__count span {
  color: var(--muted);
  font-size: 0.56rem;
  letter-spacing: 0.14em;
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 24px;
}

.tag-filter__label {
  margin-right: 4px;
  color: var(--muted);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
}

.tag-filter__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  transition:
    color var(--duration-fast) ease,
    border-color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.tag-filter__chip:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.tag-filter__chip.is-active {
  border-color: rgba(var(--brand-rgb), 0.4);
  background: rgba(var(--brand-rgb), 0.13);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .tag-filter__chip.is-active {
  color: var(--brand);
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 17px;
}

.state-card {
  display: grid;
  max-width: 620px;
  justify-items: start;
  gap: 10px;
  margin: 30px auto 0;
  padding: 38px;
}

.state-card h2 {
  margin: 0;
  font-size: 1.35rem;
}

.state-card p:not(.mono) {
  color: var(--muted);
  font-size: 0.86rem;
}

.state-card .btn {
  margin-top: 8px;
}

.state-card__glyph {
  color: var(--brand-deep);
  font-size: 0.68rem;
}

:root[data-theme='dark'] .state-card__glyph {
  color: var(--brand);
}

.skeleton-card {
  overflow: hidden;
}

.skeleton-card__cover {
  height: 178px;
  background: linear-gradient(
    100deg,
    var(--surface-alt) 20%,
    rgba(var(--brand-rgb), 0.15) 40%,
    var(--surface-alt) 60%
  );
  background-size: 220% 100%;
  animation: shimmer 1.7s ease-in-out infinite;
}

.skeleton-card__body {
  display: grid;
  gap: 13px;
  padding: 20px;
}

.skeleton-line {
  height: 10px;
  border-radius: 5px;
  background: var(--surface-alt);
}

.skeleton-line--short {
  width: 34%;
}

.skeleton-line--medium {
  width: 72%;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -20% 0;
  }
}

@media (max-width: 960px) {
  .article-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .articles-page {
    padding-top: 38px;
  }

  .archive-header__row {
    align-items: flex-start;
    flex-direction: column;
  }

  .archive-header__count {
    align-self: flex-start;
    text-align: left;
  }

  .article-grid {
    grid-template-columns: 1fr;
  }
}
</style>
