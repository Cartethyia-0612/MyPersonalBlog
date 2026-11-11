<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import { publicApi } from '@/lib/api'
import { renderMarkdown } from '@/lib/markdown'
import { useSeo } from '@/lib/seo'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()
const contentMd = ref('')
const loading = ref(true)
const error = ref('')

const html = computed(() => renderMarkdown(contentMd.value))

async function loadAbout(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await publicApi.getAbout()
    contentMd.value = result.contentMd
  } catch (err) {
    error.value = err instanceof Error ? err.message : '关于页加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAbout()
})

useSeo(() => ({
  title: '关于',
  description: siteStore.site.description || '关于饿师傅与这个技术札记。',
}))
</script>

<template>
  <div class="about-page page">
    <header class="about-header container">
      <p class="eyebrow">IDENTITY / ABOUT THIS SITE</p>
      <h1>关于这个安静的角落</h1>
      <p class="about-header__lede">
        一个由代码、音乐和天依蓝构成的个人技术空间。没有评论区，只有持续的记录与自我更新。
      </p>
    </header>

    <div class="about-grid container">
      <main class="about-content card">
        <div v-if="loading" class="about-skeleton" aria-label="关于页加载中">
          <span class="skeleton-line skeleton-line--short" />
          <span class="skeleton-line" />
          <span class="skeleton-line" />
          <span class="skeleton-line skeleton-line--medium" />
          <span class="skeleton-block" />
          <span class="skeleton-line" />
          <span class="skeleton-line skeleton-line--short" />
        </div>

        <div v-else-if="error" class="about-error">
          <p class="mono">SIGNAL_ERROR</p>
          <h2>关于页暂时无法读取</h2>
          <p>{{ error }}</p>
          <button type="button" class="btn btn--sm" @click="loadAbout">重新读取</button>
        </div>

        <template v-else>
          <div v-if="html" class="markdown-body" v-html="html" />
          <div v-else class="empty-state">站长还没有填写关于页。</div>
        </template>
      </main>

      <aside class="about-aside">
        <div class="identity-card card">
          <BrandMark :size="52" />
          <div class="identity-card__head">
            <h2>{{ siteStore.site.name }}</h2>
            <p class="mono">{{ siteStore.site.tagline }}</p>
          </div>
          <dl class="identity-card__facts">
            <div>
              <dt>OWNER</dt>
              <dd>{{ siteStore.site.author || '饿师傅' }}</dd>
            </div>
            <div>
              <dt>STACK</dt>
              <dd>Vue 3 / Node.js / SQLite</dd>
            </div>
            <div>
              <dt>THEME</dt>
              <dd>TIANYI_BLUE #66CCFF</dd>
            </div>
            <div>
              <dt>COMMENTS</dt>
              <dd class="identity-card__disabled">DISABLED_BY_DESIGN</dd>
            </div>
          </dl>
        </div>

        <div class="aside-note card">
          <p class="mono">/ SIDE_NOTE</p>
          <p>这里记录的更多是过程，而不是结论。如果某篇文章恰好帮到你，那它就有了额外的意义。</p>
          <RouterLink class="aside-note__link mono" to="/friends">探索友链 →</RouterLink>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  padding-top: 56px;
}

.about-header {
  margin-bottom: 28px;
}

.about-header h1 {
  margin-top: 11px;
  font-size: clamp(2.1rem, 4.6vw, 3.5rem);
  letter-spacing: -0.045em;
}

.about-header__lede {
  max-width: 650px;
  margin-top: 13px;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.9;
}

.about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.8fr);
  align-items: start;
  gap: 18px;
}

.about-content {
  min-height: 360px;
  padding: clamp(24px, 4.5vw, 46px);
}

.about-aside {
  display: grid;
  gap: 14px;
  position: sticky;
  top: calc(var(--header-height) + 18px);
}

.identity-card {
  padding: 24px;
}

.identity-card__head {
  margin-top: 17px;
}

.identity-card__head h2 {
  font-size: 1.08rem;
}

.identity-card__head p {
  margin-top: 5px;
  color: var(--muted);
  font-size: 0.63rem;
}

.identity-card__facts {
  display: grid;
  gap: 12px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.identity-card__facts div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.identity-card__facts dt {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.57rem;
  letter-spacing: 0.09em;
}

.identity-card__facts dd {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.68rem;
  text-align: right;
}

.identity-card__disabled {
  color: #2f9e6e !important;
  font-family: var(--font-mono);
  font-size: 0.6rem !important;
}

:root[data-theme='dark'] .identity-card__disabled {
  color: #6ee7b7 !important;
}

.aside-note {
  padding: 22px;
}

.aside-note > p:first-child {
  color: var(--brand-deep);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
}

:root[data-theme='dark'] .aside-note > p:first-child {
  color: var(--brand);
}

.aside-note > p:not(:first-child) {
  margin-top: 11px;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.8;
}

.aside-note__link {
  display: inline-block;
  margin-top: 14px;
  color: var(--brand-deep);
  font-size: 0.62rem;
}

:root[data-theme='dark'] .aside-note__link {
  color: var(--brand);
}

.about-error {
  display: grid;
  justify-items: start;
  gap: 10px;
}

.about-error > .mono {
  color: var(--brand-deep);
  font-size: 0.64rem;
}

:root[data-theme='dark'] .about-error > .mono {
  color: var(--brand);
}

.about-error h2 {
  font-size: 1.4rem;
}

.about-error p:not(.mono) {
  color: var(--muted);
  font-size: 0.86rem;
}

.about-skeleton {
  display: grid;
  gap: 16px;
}

.skeleton-line {
  display: block;
  width: 100%;
  height: 11px;
  border-radius: 5px;
  background: var(--surface-alt);
}

.skeleton-line--short {
  width: 32%;
}

.skeleton-line--medium {
  width: 76%;
}

.skeleton-block {
  display: block;
  width: 100%;
  height: 160px;
  border-radius: var(--radius-sm);
  background: var(--surface-alt);
}

@media (max-width: 900px) {
  .about-grid {
    grid-template-columns: 1fr;
  }

  .about-aside {
    position: static;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .about-page {
    padding-top: 38px;
  }

  .about-aside {
    grid-template-columns: 1fr;
  }
}
</style>
