<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { useToastStore } from '@/stores/toast'
import type { FriendInput } from '@/types/admin'
import type { Friend } from '@/types/content'

const toast = useToastStore()
const friends = ref<Friend[]>([])
const loading = ref(true)
const error = ref('')
const modalOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive<FriendInput>({
  name: '',
  url: '',
  avatarUrl: '',
  description: '',
  sortOrder: 0,
  visible: true,
})

function resetForm(): void {
  form.name = ''
  form.url = ''
  form.avatarUrl = ''
  form.description = ''
  form.sortOrder = friends.value.length
  form.visible = true
  editingId.value = null
  formError.value = ''
}

async function loadFriends(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listFriends()
    friends.value = result.items
  } catch (err) {
    error.value = toErrorMessage(err, '友链加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  resetForm()
  modalOpen.value = true
}

function openEdit(friend: Friend): void {
  editingId.value = friend.id
  form.name = friend.name
  form.url = friend.url
  form.avatarUrl = friend.avatarUrl
  form.description = friend.description
  form.sortOrder = friend.sortOrder
  form.visible = friend.visible
  formError.value = ''
  modalOpen.value = true
}

function closeModal(): void {
  if (saving.value) return
  modalOpen.value = false
}

function isAllowedAvatar(value: string): boolean {
  if (!value) return true
  if (value.startsWith('/uploads/') || value.startsWith('/assets/') || value === '/favicon.svg') {
    return true
  }
  try {
    const avatar = new URL(value)
    return ['http:', 'https:'].includes(avatar.protocol)
  } catch {
    return false
  }
}

function validate(): boolean {
  if (!form.name.trim()) {
    formError.value = '请填写友链名称'
    return false
  }
  try {
    const url = new URL(form.url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol')
  } catch {
    formError.value = '友链地址必须是有效的 http(s) URL'
    return false
  }
  if (!isAllowedAvatar(form.avatarUrl.trim())) {
    formError.value = '头像地址必须是有效的 http(s) URL 或本站上传路径'
    return false
  }
  return true
}

async function saveFriend(): Promise<void> {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const payload: FriendInput = {
      name: form.name.trim(),
      url: form.url.trim(),
      avatarUrl: form.avatarUrl.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      visible: form.visible,
    }
    if (editingId.value) {
      await adminApi.updateFriend(editingId.value, payload)
      toast.notify('友链已更新', 'success')
    } else {
      await adminApi.createFriend(payload)
      toast.notify('友链已添加', 'success')
    }
    modalOpen.value = false
    await loadFriends()
  } catch (err) {
    formError.value = toErrorMessage(err, '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleVisibility(friend: Friend): Promise<void> {
  try {
    await adminApi.updateFriend(friend.id, {
      name: friend.name,
      url: friend.url,
      avatarUrl: friend.avatarUrl,
      description: friend.description,
      sortOrder: friend.sortOrder,
      visible: !friend.visible,
    })
    friend.visible = !friend.visible
    toast.notify(friend.visible ? '友链已显示' : '友链已隐藏', 'success')
  } catch (err) {
    toast.notify(toErrorMessage(err, '状态更新失败'), 'error')
  }
}

async function deleteFriend(friend: Friend): Promise<void> {
  if (!window.confirm(`确定删除友链「${friend.name}」吗？`)) return
  try {
    await adminApi.deleteFriend(friend.id)
    toast.notify('友链已删除', 'success')
    await loadFriends()
  } catch (err) {
    toast.notify(toErrorMessage(err, '删除失败'), 'error')
  }
}

function avatarLetter(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '友'
}

onMounted(() => {
  void loadFriends()
})

useSeo(() => ({
  title: '友链管理',
  description: '管理友情链接',
  noindex: true,
}))
</script>

<template>
  <div class="admin-friends">
    <AdminPageHeader
      eyebrow="CONTENT / FRIEND_LINKS"
      title="友链管理"
      description="维护站点之间的连接。排序值越小越靠前，隐藏的友链不会出现在前台。"
    >
      <template #actions>
        <button type="button" class="btn btn--primary btn--sm" @click="openCreate">
          <span aria-hidden="true">+</span>
          添加友链
        </button>
      </template>
    </AdminPageHeader>

    <section class="admin-card">
      <div v-if="loading" class="admin-loading" aria-label="加载友链"><span /><span /><span /></div>

      <div v-else-if="error" class="admin-empty">
        <span class="admin-empty__glyph">[ SIGNAL_ERROR ]</span>
        <h2>友链列表加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadFriends">重新加载</button>
      </div>

      <div v-else-if="friends.length === 0" class="admin-empty">
        <span class="admin-empty__glyph">[ NO_NODES ]</span>
        <h2>还没有友链</h2>
        <p>添加第一个朋友站点，让前台的友链传输门亮起来。</p>
        <button type="button" class="btn btn--sm btn--primary" @click="openCreate">添加友链</button>
      </div>

      <div v-else class="admin-table-wrap">
        <table class="admin-table friends-table">
          <thead>
            <tr>
              <th>站点</th>
              <th>描述</th>
              <th>排序</th>
              <th>状态</th>
              <th><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="friend in friends" :key="friend.id">
              <td>
                <div class="friend-cell">
                  <span class="friend-cell__avatar">
                    <img v-if="friend.avatarUrl" :src="friend.avatarUrl" alt="" />
                    <span v-else>{{ avatarLetter(friend.name) }}</span>
                  </span>
                  <span class="friend-cell__copy">
                    <strong>{{ friend.name }}</strong>
                    <a :href="friend.url" target="_blank" rel="noopener noreferrer">
                      {{ friend.url }}
                    </a>
                  </span>
                </div>
              </td>
              <td class="friend-desc">{{ friend.description || '—' }}</td>
              <td class="mono friend-order">{{ friend.sortOrder }}</td>
              <td>
                <button
                  type="button"
                  class="badge-button"
                  :class="friend.visible ? 'is-visible' : 'is-hidden'"
                  :title="friend.visible ? '点击隐藏' : '点击显示'"
                  @click="toggleVisibility(friend)"
                >
                  <span class="admin-badge" :class="friend.visible ? 'admin-badge--published' : ''">
                    {{ friend.visible ? '显示中' : '已隐藏' }}
                  </span>
                </button>
              </td>
              <td>
                <div class="admin-table__actions">
                  <button type="button" class="btn btn--sm btn--ghost" @click="openEdit(friend)">
                    编辑
                  </button>
                  <button
                    type="button"
                    class="btn btn--sm btn--danger"
                    @click="deleteFriend(friend)"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Transition name="admin-modal">
      <div v-if="modalOpen" class="admin-modal-backdrop" @click.self="closeModal">
        <div
          class="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="friend-modal-title"
        >
          <div class="admin-modal__head">
            <h2 id="friend-modal-title">{{ editingId ? '编辑友链' : '添加友链' }}</h2>
            <button type="button" class="icon-btn" aria-label="关闭" @click="closeModal">×</button>
          </div>
          <form class="admin-form admin-modal__body" @submit.prevent="saveFriend">
            <div class="admin-form-row">
              <label class="admin-label">
                站点名称
                <input v-model="form.name" class="input" maxlength="60" placeholder="朋友的站点" />
              </label>
              <label class="admin-label">
                排序值
                <input v-model.number="form.sortOrder" class="input" type="number" />
              </label>
            </div>
            <label class="admin-label">
              站点地址
              <input
                v-model="form.url"
                class="input"
                type="url"
                placeholder="https://example.com"
              />
            </label>
            <label class="admin-label">
              头像地址（可选）
              <input
                v-model="form.avatarUrl"
                class="input"
                type="text"
                placeholder="https://… 或 /uploads/…"
              />
            </label>
            <label class="admin-label">
              简介
              <textarea
                v-model="form.description"
                class="textarea"
                maxlength="300"
                rows="3"
                placeholder="用一句话介绍这个站点"
              />
            </label>
            <label class="admin-check">
              <input v-model="form.visible" type="checkbox" />
              在前台显示这个友链
            </label>
            <p v-if="formError" class="admin-error" role="alert">{{ formError }}</p>
          </form>
          <div class="admin-modal__foot">
            <button type="button" class="btn btn--ghost" :disabled="saving" @click="closeModal">
              取消
            </button>
            <button type="button" class="btn btn--primary" :disabled="saving" @click="saveFriend">
              {{ saving ? '保存中…' : '保存友链' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.friends-table td {
  vertical-align: top;
}

.friend-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
}

.friend-cell__avatar {
  display: grid;
  width: 35px;
  height: 35px;
  flex: none;
  place-items: center;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(var(--brand-rgb), 0.13);
  color: var(--brand-deep);
  font-size: 0.8rem;
  font-weight: 700;
}

:root[data-theme='dark'] .friend-cell__avatar {
  color: var(--brand);
}

.friend-cell__avatar img {
  width: 35px;
  height: 35px;
  object-fit: cover;
}

.friend-cell__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.friend-cell__copy strong {
  color: var(--text);
  font-size: 0.8rem;
}

.friend-cell__copy a {
  overflow: hidden;
  max-width: 240px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-desc {
  max-width: 260px;
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.6;
}

.friend-order {
  color: var(--muted);
  font-size: 0.65rem;
}

.badge-button {
  padding: 0;
  border: 0;
  background: transparent;
}

.badge-button .admin-badge {
  cursor: pointer;
}

@media (max-width: 760px) {
  .friends-table th:nth-child(2),
  .friends-table td:nth-child(2),
  .friends-table th:nth-child(3),
  .friends-table td:nth-child(3) {
    display: none;
  }
}
</style>
