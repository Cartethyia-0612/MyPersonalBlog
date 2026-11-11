<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { publicApi } from '@/lib/api'
import { useSeo } from '@/lib/seo'
import type { Friend } from '@/types/content'

const friends = ref<Friend[]>([])
const loading = ref(true)
const error = ref('')
const brokenAvatars = ref<Set<number>>(new Set())

async function loadFriends(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await publicApi.getFriends()
    friends.value = result.items
  } catch (err) {
    error.value = err instanceof Error ? err.message : '友链加载失败'
  } finally {
    loading.value = false
  }
}

function markAvatarBroken(id: number): void {
  const next = new Set(brokenAvatars.value)
  next.add(id)
  brokenAvatars.value = next
}

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '友'
}

onMounted(() => {
  void loadFriends()
})

useSeo(() => ({
  title: '友链',
  description: '与饿师傅互相连接的站点们：技术、设计与认真写字的人。',
}))
</script>

<template>
  <div class="friends-page page">
    <header class="friends-header container">
      <p class="eyebrow">NETWORK / FRIEND LINKS</p>
      <div class="friends-header__row">
        <div>
          <h1>友链传输门</h1>
          <p>互联网上的一些锚点。每个名字背后，都是一个认真维护的小世界。</p>
        </div>
        <span class="friends-header__count mono">{{ loading ? '--' : friends.length }} NODES</span>
      </div>
    </header>

    <div class="container">
      <div v-if="loading" class="friends-grid" aria-label="友链加载中">
        <div v-for="item in 6" :key="item" class="friend-skeleton card" aria-hidden="true">
          <span class="friend-skeleton__avatar" />
          <span class="friend-skeleton__line" />
          <span class="friend-skeleton__line friend-skeleton__line--short" />
        </div>
      </div>

      <div v-else-if="error" class="state-card card">
        <p class="mono">SIGNAL_ERROR</p>
        <h2>友链接口暂时没有响应</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadFriends">重新连接</button>
      </div>

      <div v-else-if="friends.length === 0" class="state-card card">
        <span class="mono state-card__glyph">[ NO_NODES ]</span>
        <h2>友链正在等待第一批信号。</h2>
        <p>等站长在后院整理好这些连接，它们就会出现在这里。</p>
        <RouterLink class="btn btn--sm" to="/about">关于本站</RouterLink>
      </div>

      <div v-else class="friends-grid">
        <a
          v-for="(friend, index) in friends"
          :key="friend.id"
          class="friend-card card"
          :href="friend.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="friend-card__top">
            <div class="friend-card__avatar">
              <img
                v-if="friend.avatarUrl && !brokenAvatars.has(friend.id)"
                :src="friend.avatarUrl"
                :alt="`${friend.name} 的头像`"
                width="54"
                height="54"
                loading="lazy"
                @error="markAvatarBroken(friend.id)"
              />
              <span v-else>{{ initial(friend.name) }}</span>
            </div>
            <span class="friend-card__index mono"
              >NODE_{{ String(index + 1).padStart(2, '0') }}</span
            >
          </div>
          <h2>{{ friend.name }}</h2>
          <p>{{ friend.description || '一个值得去看看的站点。' }}</p>
          <div class="friend-card__bottom">
            <span class="friend-card__host mono">{{ friend.url }}</span>
            <span class="friend-card__arrow" aria-hidden="true">↗</span>
          </div>
        </a>
      </div>

      <p class="friends-note mono">// 友链排序与展示由站长在后台维护 · 所有外链均以新窗口打开</p>
    </div>
  </div>
</template>

<style scoped>
.friends-page {
  padding-top: 56px;
}

.friends-header {
  margin-bottom: 30px;
}

.friends-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-top: 11px;
}

.friends-header h1 {
  font-size: clamp(2.1rem, 4.6vw, 3.5rem);
  letter-spacing: -0.045em;
}

.friends-header p:not(.eyebrow) {
  max-width: 560px;
  margin-top: 10px;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.85;
}

.friends-header__count {
  flex: none;
  color: var(--muted);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
}

.friends-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 15px;
}

.friend-card {
  display: flex;
  flex-direction: column;
  padding: 22px;
  color: var(--text);
  transition:
    transform var(--duration-base) var(--ease-out),
    border-color var(--duration-base) ease,
    box-shadow var(--duration-base) ease;
}

.friend-card:hover {
  border-color: rgba(var(--brand-rgb), 0.4);
  color: var(--text);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.friend-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.friend-card__avatar {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8), transparent 50%),
    linear-gradient(135deg, rgba(var(--brand-rgb), 0.38), rgba(var(--brand-rgb), 0.08));
  color: var(--brand-deep);
  font-size: 1.15rem;
  font-weight: 700;
}

:root[data-theme='dark'] .friend-card__avatar {
  background: linear-gradient(135deg, rgba(var(--brand-rgb), 0.26), rgba(7, 29, 46, 0.9));
  color: var(--brand);
}

.friend-card__avatar img {
  width: 54px;
  height: 54px;
  object-fit: cover;
}

.friend-card__index {
  color: var(--muted);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
}

.friend-card h2 {
  margin-top: 17px;
  font-size: 1.08rem;
  letter-spacing: -0.01em;
}

.friend-card > p {
  display: -webkit-box;
  flex: 1;
  margin-top: 7px;
  overflow: hidden;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.friend-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 19px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.friend-card__host {
  overflow: hidden;
  color: var(--muted);
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-card__arrow {
  flex: none;
  color: var(--brand-deep);
  font-size: 1rem;
  transition: transform var(--duration-fast) var(--ease-out);
}

:root[data-theme='dark'] .friend-card__arrow {
  color: var(--brand);
}

.friend-card:hover .friend-card__arrow {
  transform: translate(2px, -2px);
}

.friends-note {
  margin-top: 28px;
  color: var(--muted);
  font-size: 0.58rem;
  letter-spacing: 0.03em;
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

.friend-skeleton {
  display: grid;
  gap: 13px;
  padding: 22px;
}

.friend-skeleton__avatar {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: var(--surface-alt);
}

.friend-skeleton__line {
  width: 100%;
  height: 10px;
  border-radius: 5px;
  background: var(--surface-alt);
}

.friend-skeleton__line--short {
  width: 64%;
}

@media (max-width: 960px) {
  .friends-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .friends-page {
    padding-top: 38px;
  }

  .friends-header__row {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .friends-grid {
    grid-template-columns: 1fr;
  }
}
</style>
