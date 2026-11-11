<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()
const year = new Date().getFullYear()

const copyright = computed(
  () => siteStore.footer.copyright || `© ${year} ${siteStore.site.name} · All rights reserved.`,
)

const navLinks = [
  { label: '首页', to: '/' },
  { label: '文章', to: '/articles' },
  { label: '友链', to: '/friends' },
  { label: '关于', to: '/about' },
]
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <RouterLink class="footer-brand__logo" to="/">
            <BrandMark :size="42" />
            <span>
              <strong>{{ siteStore.site.name }}</strong>
              <small class="mono">ESRS // TECH NOTES</small>
            </span>
          </RouterLink>
          <p class="footer-brand__desc">
            {{ siteStore.site.description || siteStore.site.tagline }}
          </p>
          <p class="footer-brand__sign mono">
            {{ siteStore.site.author || '饿师傅' }} · 保持好奇，保持构建
          </p>
        </div>

        <div class="footer-column">
          <p class="footer-column__title mono">NAVIGATION</p>
          <RouterLink v-for="link in navLinks" :key="link.to" :to="link.to">
            {{ link.label }}
          </RouterLink>
        </div>

        <div class="footer-column footer-column--meta">
          <p class="footer-column__title mono">BUILD_INFO</p>
          <span>Vue 3 + Node.js + SQLite</span>
          <span>天依蓝 · TIANYI BLUE #66CCFF</span>
          <span>NO_COMMENTS · 只有文字与代码</span>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="footer-copyright">{{ copyright }}</p>
        <ul class="footer-legal" aria-label="备案与站点信息">
          <li v-if="siteStore.footer.icp">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{{
              siteStore.footer.icp
            }}</a>
          </li>
          <li v-if="siteStore.footer.policeIcp">
            <a
              v-if="siteStore.footer.policeUrl"
              :href="siteStore.footer.policeUrl"
              target="_blank"
              rel="noopener noreferrer"
              >{{ siteStore.footer.policeIcp }}</a
            >
            <span v-else>{{ siteStore.footer.policeIcp }}</span>
          </li>
          <li v-if="siteStore.footer.virtualRecord">
            {{ siteStore.footer.virtualRecord }}
          </li>
          <li v-if="siteStore.footer.customText" class="footer-legal__custom">
            {{ siteStore.footer.customText }}
          </li>
        </ul>
        <p class="footer-stamp mono">EST. RESET // NO COMMENTS, ONLY NOTES.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  margin-top: 80px;
  border-top: 1px solid var(--border);
  background: linear-gradient(180deg, transparent, rgba(var(--brand-rgb), 0.045)), var(--bg);
}

.site-footer::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--brand-rgb), 0.55), transparent);
}

.footer-top {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(120px, 0.65fr) minmax(180px, 1fr);
  gap: clamp(28px, 6vw, 90px);
  padding: 54px 0 44px;
}

.footer-brand__logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
}

.footer-brand__logo:hover {
  color: var(--text);
}

.footer-brand__logo span {
  display: grid;
  gap: 2px;
}

.footer-brand__logo strong {
  font-size: 0.94rem;
}

.footer-brand__logo small {
  font-size: 0.54rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.footer-brand__desc {
  max-width: 390px;
  margin-top: 18px;
  color: var(--muted);
  font-size: 0.84rem;
  line-height: 1.85;
}

.footer-brand__sign {
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
}

.footer-column {
  display: grid;
  align-content: start;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--muted);
}

.footer-column__title {
  margin-bottom: 5px;
  color: var(--text-soft);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
}

.footer-column a {
  width: fit-content;
  color: var(--muted);
}

.footer-column a:hover {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .footer-column a:hover {
  color: var(--brand);
}

.footer-column span {
  line-height: 1.6;
}

.footer-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding: 18px 0 28px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.72rem;
}

.footer-copyright {
  font-size: 0.74rem;
}

.footer-legal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  list-style: none;
}

.footer-legal a,
.footer-legal span {
  color: var(--muted);
  font-size: 0.7rem;
}

.footer-legal a:hover {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .footer-legal a:hover {
  color: var(--brand);
}

.footer-legal__custom {
  white-space: pre-line;
}

.footer-stamp {
  width: 100%;
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  opacity: 0.7;
}

@media (max-width: 780px) {
  .footer-top {
    grid-template-columns: 1fr 1fr;
    padding-top: 40px;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .site-footer {
    margin-top: 56px;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 26px;
  }

  .footer-bottom {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
