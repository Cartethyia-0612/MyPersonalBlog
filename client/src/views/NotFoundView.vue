<script setup lang="ts">
import { RouterLink } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import { useSeo } from '@/lib/seo'

useSeo(() => ({
  title: '页面不存在',
  description: '你访问的页面不在这个博客里。',
  noindex: true,
}))
</script>

<template>
  <div class="not-found page">
    <div class="not-found__panel card">
      <BrandMark :size="56" />
      <p class="eyebrow">SIGNAL LOST / 404</p>
      <h1>这片星域还没有被记录。</h1>
      <p>你访问的页面不存在，或者它还在驶向博客的航线上。</p>
      <div class="not-found__actions">
        <RouterLink class="btn btn--primary" to="/">返回首页</RouterLink>
        <RouterLink class="btn" to="/articles">浏览文章</RouterLink>
      </div>
      <span class="not-found__code mono">ERR_ROUTE_NOT_FOUND</span>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: grid;
  place-items: center;
}

.not-found__panel {
  display: flex;
  width: min(100%, 580px);
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 58px 32px;
  text-align: center;
}

.not-found__panel h1 {
  font-size: clamp(1.7rem, 4vw, 2.4rem);
}

.not-found__panel p:not(.eyebrow) {
  max-width: 380px;
  color: var(--muted);
}

.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 8px;
}

.not-found__code {
  margin-top: 16px;
  color: var(--muted);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
}
</style>
