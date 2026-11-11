<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AdminIcon from '@/components/admin/AdminIcon.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { adminApi } from '@/lib/adminApi'
import { formatDate } from '@/lib/format'
import { useSeo } from '@/lib/seo'
import type { AdminOverview } from '@/types/admin'

const overview = ref<AdminOverview | null>(null)
const loading = ref(true)
const error = ref('')

const stats = computed(() => {
  if (!overview.value) return []
  return [
    {
      label: '全部文章',
      value: overview.value.articles.total,
      meta: `${overview.value.articles.published} PUBLISHED`,
      icon: 'articles',
      to: '/admin/articles',
    },
    {
      label: '草稿',
      value: overview.value.articles.drafts,
      meta: 'WAITING_TO_BE_SEEN',
      icon: 'dashboard',
      to: '/admin/articles',
    },
    {
      label: '友链',
      value: overview.value.friends.total,
      meta: `${overview.value.friends.visible} VISIBLE`,
      icon: 'friends',
      to: '/admin/friends',
    },
    {
      label: '歌单',
      value: overview.value.playlists.total,
      meta: 'MUSIC_NODES',
      icon: 'music',
      to: '/admin/settings',
    },
  ]
})

async function loadOverview(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    overview.value = await adminApi.getOverview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '概览加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOverview()
})

useSeo(() => ({
  title: '仪表盘',
  description: '管理后台概览',
  noindex: true,
}))
</script>

<template>
  <div class="dashboard">
    <AdminPageHeader
      eyebrow="OVERVIEW / CONTROL_ROOM"
      title="站长，欢迎回来。"
      description="这里可以快速了解内容状态、站点安全和最近动作。所有改动会立即同步到前台。"
    >
      <template #actions>
        <RouterLink class="btn btn--primary btn--sm" to="/admin/articles/new">
          <span aria-hidden="true">+</span>
          写一篇札记
        </RouterLink>
        <RouterLink class="btn btn--sm" to="/">查看站点</RouterLink>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="admin-loading admin-card" aria-label="概览加载中">
      <span /><span /><span />
    </div>

    <div v-else-if="error" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ SIGNAL_ERROR ]</span>
        <h2>控制室暂时连不上数据</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadOverview">重新连接</button>
      </div>
    </div>

    <template v-else-if="overview">
      <div class="dashboard__stats">
        <RouterLink
          v-for="stat in stats"
          :key="stat.label"
          :to="stat.to"
          class="stat-card admin-card"
        >
          <div class="stat-card__top">
            <span class="stat-card__icon"><AdminIcon :name="stat.icon" :size="17" /></span>
            <span class="stat-card__label">{{ stat.label }}</span>
          </div>
          <strong class="stat-card__value">{{ String(stat.value).padStart(2, '0') }}</strong>
          <span class="stat-card__meta mono">{{ stat.meta }}</span>
        </RouterLink>
      </div>

      <div class="dashboard__grid">
        <section class="admin-card dashboard__recent">
          <div class="admin-card__head">
            <div>
              <h2 class="admin-card__title">最近更新</h2>
              <p class="admin-card__hint">按后台更新时间排序</p>
            </div>
            <RouterLink class="mono admin-card__link" to="/admin/articles">ALL_LOGS →</RouterLink>
          </div>
          <div v-if="overview.recentArticles.length === 0" class="admin-empty">
            <span class="admin-empty__glyph">[ EMPTY_LOG ]</span>
            <h2>还没有文章</h2>
            <p>写下第一篇札记，让首页开始呼吸。</p>
            <RouterLink class="btn btn--sm btn--primary" to="/admin/articles/new"
              >开始写作</RouterLink
            >
          </div>
          <ul v-else class="recent-list">
            <li v-for="article in overview.recentArticles" :key="article.id">
              <RouterLink
                class="recent-list__link"
                :to="{ name: 'admin-article-edit', params: { id: article.id } }"
              >
                <span class="recent-list__title">{{ article.title }}</span>
                <span class="recent-list__meta mono">
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
                  {{ formatDate(article.updated_at) }}
                </span>
              </RouterLink>
            </li>
          </ul>
        </section>

        <div class="dashboard__side">
          <section class="admin-card security-card">
            <div class="security-card__top">
              <span class="security-card__icon"><AdminIcon name="security" :size="19" /></span>
              <span
                class="admin-badge"
                :class="
                  overview.security.totpEnabled ? 'admin-badge--published' : 'admin-badge--draft'
                "
              >
                {{ overview.security.totpEnabled ? 'TOTP 已开启' : 'TOTP 未开启' }}
              </span>
            </div>
            <h2>账号安全</h2>
            <p>
              {{
                overview.security.totpEnabled
                  ? '两步验证正在保护登录入口。请妥善保管验证器。'
                  : '当前仅使用密码登录，建议开启 TOTP 两步验证。'
              }}
            </p>
            <RouterLink class="btn btn--sm" to="/admin/security">前往安全设置</RouterLink>
          </section>

          <section class="admin-card status-card">
            <div class="admin-card__head">
              <h2 class="admin-card__title">系统自检</h2>
              <span class="mono admin-card__hint">ALL_OK</span>
            </div>
            <ul class="status-list">
              <li><span>SQLite</span><span class="status-list__ok">CONNECTED</span></li>
              <li><span>CSRF Guard</span><span class="status-list__ok">ENABLED</span></li>
              <li><span>Login Rate Limit</span><span class="status-list__ok">ACTIVE</span></li>
              <li><span>Comments</span><span class="status-list__disabled">NONE</span></li>
            </ul>
          </section>
        </div>
      </div>

      <div class="quick-links">
        <RouterLink class="quick-link admin-card" to="/admin/settings">
          <span class="mono">/ SITE_CONFIG</span>
          <strong>修改站点名称、Icon 与页脚备案</strong>
          <span>前往设置 →</span>
        </RouterLink>
        <RouterLink class="quick-link admin-card" to="/admin/about">
          <span class="mono">/ ABOUT_PAGE</span>
          <strong>更新关于页的 Markdown 内容</strong>
          <span>编辑关于页 →</span>
        </RouterLink>
        <RouterLink class="quick-link admin-card" to="/admin/friends">
          <span class="mono">/ FRIEND_LINKS</span>
          <strong>维护友链与展示排序</strong>
          <span>管理友链 →</span>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: grid;
  gap: 4px;
  padding: 17px;
  color: var(--text);
  transition:
    transform var(--duration-base) var(--ease-out),
    border-color var(--duration-base) ease;
}

.stat-card:hover {
  border-color: rgba(var(--brand-rgb), 0.4);
  color: var(--text);
  transform: translateY(-3px);
}

.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stat-card__icon {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border-radius: 8px;
  background: rgba(var(--brand-rgb), 0.13);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .stat-card__icon {
  color: var(--brand);
}

.stat-card__label {
  color: var(--muted);
  font-size: 0.7rem;
}

.stat-card__value {
  margin-top: 12px;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 2rem;
  line-height: 1;
  letter-spacing: -0.03em;
}

.stat-card__meta {
  margin-top: 5px;
  color: var(--muted);
  font-size: 0.51rem;
  letter-spacing: 0.08em;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(285px, 0.8fr);
  align-items: start;
  gap: 14px;
  margin-top: 14px;
}

.dashboard__side {
  display: grid;
  gap: 14px;
}

.dashboard__recent {
  overflow: hidden;
}

.admin-card__link {
  color: var(--muted);
  font-size: 0.56rem;
  letter-spacing: 0.06em;
}

.recent-list {
  list-style: none;
}

.recent-list li + li {
  border-top: 1px solid var(--border);
}

.recent-list__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 19px;
  color: var(--text);
  transition: background-color var(--duration-fast) ease;
}

.recent-list__link:hover {
  background: rgba(var(--brand-rgb), 0.05);
  color: var(--text);
}

.recent-list__title {
  overflow: hidden;
  font-size: 0.83rem;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-list__meta {
  display: flex;
  flex: none;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font-size: 0.55rem;
}

.security-card {
  padding: 19px;
}

.security-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.security-card__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: rgba(var(--brand-rgb), 0.13);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .security-card__icon {
  color: var(--brand);
}

.security-card h2 {
  margin-top: 14px;
  font-size: 1.02rem;
}

.security-card p {
  margin-top: 7px;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.75;
}

.security-card .btn {
  margin-top: 15px;
}

.status-card {
  overflow: hidden;
}

.status-card .admin-card__head {
  padding-bottom: 13px;
}

.status-list {
  list-style: none;
  padding: 0 19px 12px;
}

.status-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--border);
  color: var(--muted);
  font-size: 0.72rem;
}

.status-list li:last-child {
  border-bottom: 0;
}

.status-list span:last-child {
  font-family: var(--font-mono);
  font-size: 0.54rem;
  letter-spacing: 0.05em;
}

.status-list__ok {
  color: #2f9e6e;
}

:root[data-theme='dark'] .status-list__ok {
  color: #6ee7b7;
}

.status-list__disabled {
  color: var(--muted);
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.quick-link {
  display: grid;
  gap: 7px;
  padding: 16px 18px;
  color: var(--text);
  transition:
    transform var(--duration-base) var(--ease-out),
    border-color var(--duration-base) ease;
}

.quick-link:hover {
  border-color: rgba(var(--brand-rgb), 0.35);
  color: var(--text);
  transform: translateY(-2px);
}

.quick-link > span:first-child {
  color: var(--muted);
  font-size: 0.53rem;
  letter-spacing: 0.08em;
}

.quick-link strong {
  font-size: 0.8rem;
  font-weight: 550;
}

.quick-link > span:last-child {
  color: var(--brand-deep);
  font-size: 0.66rem;
}

:root[data-theme='dark'] .quick-link > span:last-child {
  color: var(--brand);
}

@media (max-width: 1080px) {
  .dashboard__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard__grid {
    grid-template-columns: 1fr;
  }

  .dashboard__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .dashboard__side,
  .quick-links {
    grid-template-columns: 1fr;
  }

  .recent-list__link {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }

  .recent-list__title {
    white-space: normal;
  }
}

@media (max-width: 420px) {
  .dashboard__stats {
    grid-template-columns: 1fr;
  }
}
</style>
