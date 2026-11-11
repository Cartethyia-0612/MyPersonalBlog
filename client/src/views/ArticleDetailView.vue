<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import { publicApi } from '@/lib/api'
import { formatDate, readingTime } from '@/lib/format'
import { renderMarkdown } from '@/lib/markdown'
import { useSeo } from '@/lib/seo'
import type { ArticleDetail } from '@/types/content'

const route = useRoute()
const article = ref<ArticleDetail | null>(null)
const loading = ref(true)
const error = ref('')
const notFound = ref(false)
let requestId = 0

const slug = computed(() => (typeof route.params.slug === 'string' ? route.params.slug : ''))

const html = computed(() => (article.value ? renderMarkdown(article.value.contentMd) : ''))
const reading = computed(() => (article.value ? readingTime(article.value.contentMd) : ''))

async function loadArticle(): Promise<void> {
  const current = ++requestId
  loading.value = true
  error.value = ''
  notFound.value = false
  article.value = null
  try {
    if (!slug.value) throw new Error('文章地址不完整')
    const result = await publicApi.getArticle(slug.value)
    if (current !== requestId) return
    article.value = result.article
  } catch (err) {
    if (current !== requestId) return
    const status = (err as { status?: number }).status
    if (status === 404) {
      notFound.value = true
      error.value = '这篇文章不存在，或者还没有公开。'
    } else {
      error.value = err instanceof Error ? err.message : '文章加载失败'
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch(slug, () => void loadArticle(), { immediate: true })

useSeo(() => ({
  title: article.value?.title || (notFound.value ? '文章不存在' : '正在读取'),
  description: article.value?.summary || '饿师傅的技术札记',
  image: article.value?.coverUrl,
  type: 'article',
  noindex: notFound.value,
  publishedTime: article.value?.publishedAt,
  modifiedTime: article.value?.updatedAt,
  tags: article.value?.tags,
}))
</script>

<template>
  <div class="article-page page">
    <div class="container article-page__container">
      <RouterLink class="back-link mono" to="/articles">
        <span aria-hidden="true">←</span>
        BACK_TO_LOGS
      </RouterLink>

      <div v-if="loading" class="article-skeleton" aria-label="文章加载中">
        <span class="skeleton-line skeleton-line--short" />
        <h1 class="skeleton-title" />
        <span class="skeleton-line" />
        <span class="skeleton-line skeleton-line--medium" />
        <div class="skeleton-body" />
      </div>

      <div v-else-if="error || !article" class="article-error card">
        <BrandMark :size="48" />
        <p class="mono">LOG_NOT_FOUND</p>
        <h1>{{ notFound ? '这页札记没有被找到。' : '读取札记失败。' }}</h1>
        <p>{{ error }}</p>
        <div class="article-error__actions">
          <button v-if="!notFound" type="button" class="btn btn--primary" @click="loadArticle">
            重新读取
          </button>
          <RouterLink class="btn" to="/articles">回到归档</RouterLink>
        </div>
      </div>

      <template v-else>
        <header class="article-header">
          <p class="eyebrow">LOG_ENTRY / {{ article.slug }}</p>
          <h1>{{ article.title }}</h1>
          <p v-if="article.summary" class="article-header__summary">{{ article.summary }}</p>

          <div class="article-header__meta mono">
            <span>
              <span class="article-header__meta-label">PUBLISHED</span>
              <time :datetime="article.publishedAt ?? undefined">
                {{ formatDate(article.publishedAt) }}
              </time>
            </span>
            <span>
              <span class="article-header__meta-label">READ_TIME</span>
              {{ reading }}
            </span>
            <span v-if="article.updatedAt !== article.createdAt">
              <span class="article-header__meta-label">UPDATED</span>
              <time :datetime="article.updatedAt">{{ formatDate(article.updatedAt) }}</time>
            </span>
          </div>

          <div v-if="article.tags.length" class="article-header__tags">
            <span v-for="tag in article.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
        </header>

        <figure v-if="article.coverUrl" class="article-cover">
          <img :src="article.coverUrl" :alt="article.title" />
        </figure>

        <article class="markdown-body" v-html="html" />

        <div class="article-end">
          <span class="article-end__line" />
          <span class="mono">END_OF_LOG</span>
          <span class="article-end__line" />
        </div>

        <div class="article-footer">
          <div class="article-footer__tags">
            <span v-for="tag in article.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <RouterLink class="btn btn--sm" to="/articles">
            返回全部札记
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.article-page {
  padding-top: 44px;
}

.article-page__container {
  max-width: 840px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 30px;
  color: var(--muted);
  font-size: 0.64rem;
  letter-spacing: 0.07em;
}

.back-link span {
  color: var(--brand-deep);
  font-size: 1rem;
}

.article-header h1 {
  max-width: 760px;
  margin-top: 14px;
  font-size: clamp(2rem, 5vw, 3.35rem);
  line-height: 1.16;
  letter-spacing: -0.04em;
}

.article-header__summary {
  max-width: 690px;
  margin-top: 17px;
  color: var(--text-soft);
  font-size: 1rem;
  line-height: 1.85;
}

.article-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  margin-top: 25px;
  color: var(--muted);
  font-size: 0.64rem;
}

.article-header__meta > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.article-header__meta-label {
  color: var(--border-strong);
  font-size: 0.55rem;
  letter-spacing: 0.1em;
}

.article-header__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 18px;
}

.article-cover {
  margin: 35px 0 10px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.article-cover img {
  width: 100%;
  max-height: 430px;
  object-fit: cover;
}

.markdown-body {
  margin-top: 38px;
}

.article-end {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 54px 0 28px;
  color: var(--muted);
  font-size: 0.56rem;
  letter-spacing: 0.14em;
}

.article-end__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-strong));
}

.article-end__line:last-child {
  background: linear-gradient(90deg, var(--border-strong), transparent);
}

.article-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 6px;
}

.article-footer__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.article-error {
  display: grid;
  max-width: 600px;
  justify-items: start;
  gap: 12px;
  margin: 50px auto;
  padding: 40px;
}

.article-error h1 {
  font-size: 1.65rem;
}

.article-error p:not(.mono) {
  color: var(--muted);
  font-size: 0.88rem;
}

.article-error > .mono {
  color: var(--brand-deep);
  font-size: 0.64rem;
  letter-spacing: 0.12em;
}

:root[data-theme='dark'] .article-error > .mono {
  color: var(--brand);
}

.article-error__actions {
  display: flex;
  gap: 9px;
  margin-top: 8px;
}

.article-skeleton {
  display: grid;
  gap: 17px;
  padding-top: 10px;
}

.skeleton-title {
  width: min(100%, 620px);
  height: 46px;
  margin: 8px 0 4px;
  border-radius: 10px;
  background: var(--surface-alt);
}

.skeleton-line {
  display: block;
  width: 100%;
  height: 11px;
  border-radius: 5px;
  background: var(--surface-alt);
}

.skeleton-line--short {
  width: 28%;
}

.skeleton-line--medium {
  width: 74%;
}

.skeleton-body {
  height: 330px;
  margin-top: 15px;
  border-radius: var(--radius-md);
  background: var(--surface-alt);
}

@media (max-width: 640px) {
  .article-page {
    padding-top: 28px;
  }

  .article-header__meta {
    flex-direction: column;
    gap: 9px;
  }

  .article-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
