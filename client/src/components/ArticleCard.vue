<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { formatDate } from '@/lib/format'
import type { ArticleSummary } from '@/types/content'

const props = defineProps<{
  article: ArticleSummary
  index?: number
}>()

const logNumber = computed(() => {
  const number = (props.index ?? 0) + 1
  return `LOG_${String(number).padStart(2, '0')}`
})

const coverStyle = computed(() =>
  props.article.coverUrl
    ? { backgroundImage: `url("${props.article.coverUrl.replace(/"/g, '%22')}")` }
    : undefined,
)
</script>

<template>
  <article class="article-card card">
    <RouterLink :to="`/articles/${article.slug}`" class="article-card__link">
      <div
        class="article-card__cover"
        :class="{ 'has-image': Boolean(article.coverUrl) }"
        :style="coverStyle"
      >
        <div v-if="!article.coverUrl" class="article-card__pattern" aria-hidden="true">
          <span class="article-card__staff" />
          <span class="article-card__note article-card__note--one">♪</span>
          <span class="article-card__note article-card__note--two">♫</span>
        </div>
        <span class="article-card__log mono">{{ logNumber }}</span>
        <span class="article-card__arrow" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </span>
      </div>

      <div class="article-card__body">
        <div class="article-card__meta mono">
          <time :datetime="article.publishedAt ?? undefined">{{
            formatDate(article.publishedAt)
          }}</time>
          <span class="article-card__dot" />
          <span>{{ article.tags[0] || '未分类' }}</span>
        </div>
        <h3 class="article-card__title">{{ article.title }}</h3>
        <p class="article-card__summary">
          {{ article.summary || '打开这篇札记，看看留下了什么。' }}
        </p>
        <div v-if="article.tags.length" class="article-card__tags">
          <span v-for="tag in article.tags.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
        </div>
        <span class="article-card__read mono">READ_ENTRY <span>→</span></span>
      </div>
    </RouterLink>
  </article>
</template>

<style scoped>
.article-card {
  position: relative;
  overflow: hidden;
  transition:
    transform var(--duration-base) var(--ease-out),
    border-color var(--duration-base) ease,
    box-shadow var(--duration-base) ease;
}

.article-card:hover {
  border-color: rgba(var(--brand-rgb), 0.4);
  box-shadow: var(--shadow-md);
  transform: translateY(-5px);
}

.article-card__link {
  display: flex;
  height: 100%;
  flex-direction: column;
  color: var(--text);
}

.article-card__link:hover {
  color: var(--text);
}

.article-card__cover {
  position: relative;
  display: flex;
  min-height: 178px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 15px;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  background:
    radial-gradient(circle at 24% 20%, rgba(255, 255, 255, 0.8), transparent 38%),
    linear-gradient(135deg, rgba(var(--brand-rgb), 0.28), rgba(var(--brand-rgb), 0.07));
  background-position: center;
  background-size: cover;
}

.article-card__cover.has-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(4, 20, 32, 0.02), rgba(4, 20, 32, 0.24));
}

:root[data-theme='dark'] .article-card__cover {
  background:
    radial-gradient(circle at 24% 20%, rgba(var(--brand-rgb), 0.14), transparent 38%),
    linear-gradient(135deg, rgba(var(--brand-rgb), 0.18), rgba(5, 16, 26, 0.8));
}

:root[data-theme='dark'] .article-card__cover.has-image::before {
  background: linear-gradient(180deg, rgba(2, 10, 18, 0.2), rgba(2, 10, 18, 0.55));
}

.article-card__pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.article-card__staff {
  position: absolute;
  top: 34%;
  left: 12%;
  width: 72%;
  height: 40%;
  border-top: 1px solid rgba(255, 255, 255, 0.55);
  border-bottom: 1px solid rgba(255, 255, 255, 0.38);
  opacity: 0.5;
  transform: skewY(-7deg);
}

:root[data-theme='dark'] .article-card__staff {
  border-color: rgba(var(--brand-rgb), 0.35);
}

.article-card__note {
  position: absolute;
  color: rgba(12, 79, 110, 0.55);
  font-size: 2.6rem;
  line-height: 1;
  transform: rotate(-10deg);
}

:root[data-theme='dark'] .article-card__note {
  color: rgba(var(--brand-rgb), 0.42);
}

.article-card__note--one {
  right: 18%;
  bottom: 17%;
}

.article-card__note--two {
  top: 14%;
  left: 15%;
  font-size: 1.3rem;
  opacity: 0.7;
  transform: rotate(12deg);
}

.article-card__log {
  position: relative;
  z-index: 1;
  padding: 4px 8px;
  border: 1px solid rgba(15, 86, 119, 0.25);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.38);
  color: var(--brand-deep);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
}

:root[data-theme='dark'] .article-card__log {
  border-color: rgba(var(--brand-rgb), 0.25);
  background: rgba(4, 16, 26, 0.36);
  color: var(--brand);
}

.article-card__arrow {
  position: relative;
  z-index: 1;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid rgba(15, 86, 119, 0.2);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.38);
  color: var(--brand-deep);
  transition:
    color var(--duration-fast) ease,
    background-color var(--duration-fast) ease,
    transform var(--duration-fast) var(--ease-out);
}

:root[data-theme='dark'] .article-card__arrow {
  border-color: rgba(var(--brand-rgb), 0.22);
  background: rgba(4, 16, 26, 0.36);
  color: var(--brand);
}

.article-card:hover .article-card__arrow {
  background: var(--brand);
  color: #041521;
  transform: rotate(8deg);
}

.article-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 20px 20px 18px;
}

.article-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.62rem;
  letter-spacing: 0.03em;
}

.article-card__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border-strong);
}

.article-card__title {
  margin-top: 9px;
  font-size: 1.15rem;
  line-height: 1.45;
  letter-spacing: -0.01em;
  transition: color var(--duration-fast) ease;
}

.article-card:hover .article-card__title {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .article-card:hover .article-card__title {
  color: var(--brand);
}

.article-card__summary {
  display: -webkit-box;
  margin-top: 9px;
  overflow: hidden;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.article-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 15px;
}

.article-card__tags .tag {
  font-size: 0.62rem;
}

.article-card__read {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 18px;
  color: var(--muted);
  font-size: 0.58rem;
  letter-spacing: 0.11em;
}

.article-card__read span {
  color: var(--brand-deep);
  font-size: 0.9rem;
  transition: transform var(--duration-fast) var(--ease-out);
}

:root[data-theme='dark'] .article-card__read span {
  color: var(--brand);
}

.article-card:hover .article-card__read span {
  transform: translateX(4px);
}
</style>
