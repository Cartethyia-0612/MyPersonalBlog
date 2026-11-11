<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import ArticleCard from '@/components/ArticleCard.vue'
import { publicApi } from '@/lib/api'
import { useSeo } from '@/lib/seo'
import { useSiteStore } from '@/stores/site'
import type { ArticleSummary } from '@/types/content'

const siteStore = useSiteStore()
const latestArticles = ref<ArticleSummary[]>([])
const totalArticles = ref(0)
const loading = ref(true)
const error = ref('')
const currentYear = new Date().getFullYear()

const terminalLines = computed(() => [
  {
    prompt: '$',
    text: 'whoami',
    result: `> ${siteStore.site.author || '饿师傅'} / engineer & daydreamer`,
  },
  {
    prompt: '$',
    text: 'cat ./motto.txt',
    result: `> ${siteStore.site.tagline || '把灵感写成可复用的代码'}`,
  },
  {
    prompt: '$',
    text: 'ls ./notes | wc -l',
    result: `> ${totalArticles.value} entries and counting`,
  },
  { prompt: '$', text: 'grep -r "comments" ./', result: '> no match. quiet is a feature.' },
])

async function loadLatest(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await publicApi.getArticles({ page: 1, pageSize: 3 })
    latestArticles.value = data.items
    totalArticles.value = data.pagination.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : '文章加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadLatest()
})

useSeo(() => ({
  description: siteStore.site.description || siteStore.site.tagline,
  type: 'website',
}))
</script>

<template>
  <div class="home page">
    <section class="hero container">
      <div class="hero__copy">
        <p class="eyebrow">PERSONAL LOGBOOK / {{ currentYear }}</p>
        <h1 class="hero__title">
          把灵感写成
          <br />
          <span class="text-gradient">可复用的代码。</span>
        </h1>
        <p class="hero__lede">
          {{ siteStore.site.description || siteStore.site.tagline }}
        </p>
        <p class="hero__sign mono">{{ siteStore.site.name }} · {{ siteStore.site.tagline }}</p>

        <div class="hero__actions">
          <RouterLink class="btn btn--primary" to="/articles">
            阅读札记
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </RouterLink>
          <RouterLink class="btn btn--ghost" to="/about">关于饿师傅</RouterLink>
        </div>

        <dl class="hero__meta mono">
          <div>
            <dt>LOGS</dt>
            <dd>{{ loading ? '--' : String(totalArticles).padStart(2, '0') }}</dd>
          </div>
          <div>
            <dt>AUTHOR</dt>
            <dd>{{ siteStore.site.author || '饿师傅' }}</dd>
          </div>
          <div>
            <dt>THEME</dt>
            <dd>TIANYI_BLUE</dd>
          </div>
          <div>
            <dt>STATUS</dt>
            <dd class="hero__meta-online">ONLINE</dd>
          </div>
        </dl>
      </div>

      <div class="hero__visual">
        <div class="orbital" aria-hidden="true">
          <span class="orbital__ring orbital__ring--one" />
          <span class="orbital__ring orbital__ring--two" />
          <span class="orbital__dot" />
        </div>

        <div class="terminal card">
          <div class="terminal__bar">
            <span class="terminal__lights"><i /><i /><i /></span>
            <span class="mono">esrs@tianyi: ~/blog</span>
            <span class="mono terminal__status">● ONLINE</span>
          </div>
          <div class="terminal__body mono">
            <template v-for="(line, index) in terminalLines" :key="line.text">
              <p class="terminal__command" :style="{ animationDelay: `${index * 180}ms` }">
                <span class="terminal__prompt">{{ line.prompt }}</span> {{ line.text }}
              </p>
              <p class="terminal__result" :style="{ animationDelay: `${index * 180 + 90}ms` }">
                {{ line.result }}
              </p>
            </template>
            <p class="terminal__command terminal__command--last">
              <span class="terminal__prompt">$</span> <span class="terminal__cursor" />
            </p>
          </div>
        </div>

        <div class="floating-chip floating-chip--one mono">// NO_COMMENTS</div>
        <div class="floating-chip floating-chip--two mono">♪ {{ siteStore.site.tagline }}</div>
      </div>
    </section>

    <section class="latest container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">LATEST LOGS</p>
          <h2>最近写下的</h2>
        </div>
        <RouterLink class="section-heading__link mono" to="/articles">
          VIEW_ALL_LOGS
          <span>→</span>
        </RouterLink>
      </div>

      <div v-if="loading" class="latest__grid" aria-label="文章加载中">
        <div v-for="item in 3" :key="item" class="skeleton-card card" aria-hidden="true">
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
        <h3>文章暂时没有加载出来</h3>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadLatest">重新连接</button>
      </div>

      <div v-else-if="latestArticles.length === 0" class="state-card card state-card--empty">
        <span class="state-card__glyph mono">[ EMPTY_LOG ]</span>
        <h3>第一篇文章，正在草稿箱里发光。</h3>
        <p>内容正在准备中。等一等，或者去关于页认识一下饿师傅。</p>
        <RouterLink class="btn btn--sm" to="/about">关于本站</RouterLink>
      </div>

      <div v-else class="latest__grid">
        <ArticleCard
          v-for="(article, index) in latestArticles"
          :key="article.id"
          :article="article"
          :index="index"
        />
      </div>
    </section>

    <section class="portals container">
      <RouterLink class="portal-card card" to="/about">
        <span class="portal-card__index mono">01 / ABOUT</span>
        <div class="portal-card__content">
          <h3>关于这个博客</h3>
          <p>一个由 Vue、Node 与天依蓝构成的安静角落。没有评论区，只有持续的记录。</p>
        </div>
        <span class="portal-card__arrow" aria-hidden="true">↗</span>
      </RouterLink>
      <RouterLink class="portal-card card" to="/friends">
        <span class="portal-card__index mono">02 / LINKS</span>
        <div class="portal-card__content">
          <h3>友链传输门</h3>
          <p>去看一些同样在认真写字的站点。网络的意义，是彼此连接。</p>
        </div>
        <span class="portal-card__arrow" aria-hidden="true">↗</span>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding-top: 0;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(360px, 0.94fr);
  align-items: center;
  gap: clamp(32px, 6vw, 82px);
  min-height: calc(100vh - var(--header-height) - 40px);
  padding-top: 54px;
  padding-bottom: 58px;
}

.hero__title {
  max-width: 760px;
  margin-top: 18px;
  font-size: clamp(2.55rem, 5.7vw, 4.7rem);
  line-height: 1.04;
  letter-spacing: -0.05em;
}

.hero__lede {
  max-width: 550px;
  margin-top: 23px;
  color: var(--text-soft);
  font-size: clamp(0.95rem, 1.35vw, 1.05rem);
  line-height: 1.9;
}

.hero__sign {
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.64rem;
  letter-spacing: 0.05em;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 11px;
  margin-top: 28px;
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 26px;
  margin-top: 38px;
}

.hero__meta div {
  display: grid;
  gap: 3px;
}

.hero__meta dt {
  color: var(--muted);
  font-size: 0.56rem;
  letter-spacing: 0.18em;
}

.hero__meta dd {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.67rem;
  letter-spacing: 0.04em;
}

.hero__meta-online {
  color: #2f9e6e !important;
}

:root[data-theme='dark'] .hero__meta-online {
  color: #6ee7b7 !important;
}

.hero__visual {
  position: relative;
  padding: 40px 10px;
}

.orbital {
  position: absolute;
  inset: 2% -7% 4% 12%;
  opacity: 0.75;
  pointer-events: none;
}

.orbital__ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(var(--brand-rgb), 0.26);
  border-radius: 50%;
  transform: rotate(-19deg) scaleY(0.58);
}

.orbital__ring--two {
  inset: 9% -4%;
  opacity: 0.5;
  transform: rotate(24deg) scaleY(0.73);
}

.orbital__dot {
  position: absolute;
  top: 7%;
  right: 9%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 24px 7px rgba(var(--brand-rgb), 0.42);
  animation: dot-orbit 9s linear infinite;
}

.terminal {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
  transform: perspective(1100px) rotateY(-4deg) rotateX(2deg);
  animation: terminal-float 7s ease-in-out infinite;
}

.terminal__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--muted);
  font-size: 0.61rem;
}

.terminal__lights {
  display: inline-flex;
  gap: 5px;
}

.terminal__lights i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border-strong);
}

.terminal__lights i:first-child {
  background: #ff8b8b;
}

.terminal__lights i:nth-child(2) {
  background: #ffd37a;
}

.terminal__lights i:nth-child(3) {
  background: #77e0aa;
}

.terminal__status {
  color: #2f9e6e;
  letter-spacing: 0.08em;
}

.terminal__body {
  min-height: 282px;
  padding: 24px 21px;
  background:
    linear-gradient(160deg, rgba(var(--brand-rgb), 0.08), transparent 52%), var(--code-bg);
  color: #d7edf8;
  font-size: 0.7rem;
  line-height: 1.7;
}

.terminal__command,
.terminal__result {
  opacity: 0;
  animation: line-in 380ms var(--ease-out) forwards;
}

.terminal__command {
  margin-top: 14px;
}

.terminal__command:first-child {
  margin-top: 0;
}

.terminal__prompt {
  color: var(--brand);
}

.terminal__result {
  padding-left: 14px;
  color: #8fb4c7;
}

.terminal__command--last {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 20px;
}

.terminal__cursor {
  width: 6px;
  height: 13px;
  background: var(--brand);
  animation: blink 1s step-end infinite;
}

.floating-chip {
  position: absolute;
  z-index: 3;
  max-width: 260px;
  padding: 5px 10px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--muted);
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px);
}

.floating-chip--one {
  right: 3%;
  bottom: 5%;
  transform: rotate(4deg);
}

.floating-chip--two {
  top: 2%;
  left: 0;
  color: var(--brand-deep);
  transform: rotate(-5deg);
}

:root[data-theme='dark'] .floating-chip--two {
  color: var(--brand);
}

.latest {
  padding-bottom: 32px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}

.section-heading h2 {
  margin-top: 8px;
  font-size: clamp(1.8rem, 3.2vw, 2.7rem);
}

.section-heading__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 5px;
  color: var(--muted);
  font-size: 0.62rem;
  letter-spacing: 0.09em;
}

.section-heading__link span {
  font-size: 1rem;
  color: var(--brand-deep);
  transition: transform var(--duration-fast) var(--ease-out);
}

.section-heading__link:hover span {
  transform: translateX(4px);
}

.latest__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 17px;
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

.state-card {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 34px;
}

.state-card p:not(.mono) {
  color: var(--muted);
  font-size: 0.86rem;
}

.state-card h3 {
  font-size: 1.2rem;
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

.portals {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding-top: 40px;
  padding-bottom: 18px;
}

.portal-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 26px;
  color: var(--text);
  transition:
    transform var(--duration-base) var(--ease-out),
    border-color var(--duration-base) ease;
}

.portal-card:hover {
  border-color: rgba(var(--brand-rgb), 0.38);
  color: var(--text);
  transform: translateY(-3px);
}

.portal-card__index {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 0.59rem;
  letter-spacing: 0.1em;
}

.portal-card__content h3 {
  margin-top: 19px;
  font-size: 1.1rem;
}

.portal-card__content p {
  max-width: 460px;
  margin-top: 7px;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.8;
}

.portal-card__arrow {
  align-self: end;
  color: var(--brand-deep);
  font-size: 1.2rem;
}

:root[data-theme='dark'] .portal-card__arrow {
  color: var(--brand);
}

@keyframes terminal-float {
  0%,
  100% {
    transform: perspective(1100px) rotateY(-4deg) rotateX(2deg) translateY(0);
  }
  50% {
    transform: perspective(1100px) rotateY(-2deg) rotateX(1deg) translateY(-7px);
  }
}

@keyframes line-in {
  to {
    opacity: 1;
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@keyframes dot-orbit {
  from {
    transform: translate(0, 0) rotate(0);
  }
  to {
    transform: translate(-200px, 26px) rotate(-360deg);
  }
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
  .hero {
    grid-template-columns: 1fr;
    min-height: auto;
    padding-top: 58px;
  }

  .hero__visual {
    width: min(100%, 570px);
    margin-inline: auto;
    padding-top: 4px;
  }

  .latest__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .latest__grid,
  .portals {
    grid-template-columns: 1fr;
  }

  .terminal {
    transform: none;
    animation: none;
  }

  .orbital {
    display: none;
  }

  .hero__meta {
    gap: 17px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 520px) {
  .hero {
    padding-top: 42px;
  }

  .hero__visual {
    padding-inline: 0;
  }

  .floating-chip {
    display: none;
  }

  .terminal__body {
    min-height: 260px;
    font-size: 0.65rem;
  }
}
</style>
