<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import AdminIcon from '@/components/admin/AdminIcon.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { adminApi } from '@/lib/adminApi'
import { toErrorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { useToastStore } from '@/stores/toast'
import type { AdminSettings } from '@/types/admin'
import type { AdminMusicPlaylist, MusicPlaylistInput, MusicPlaylistResponse } from '@/types/music'

const toast = useToastStore()
const serverOptions = [
  { value: 'netease', label: '网易云音乐' },
  { value: 'tencent', label: 'QQ 音乐' },
  { value: 'kugou', label: '酷狗音乐' },
  { value: 'kuwo', label: '酷我音乐' },
  { value: 'baidu', label: '百度音乐' },
  { value: 'migu', label: '咪咕音乐' },
]

const playlists = ref<AdminMusicPlaylist[]>([])
const apiBase = ref('')
const savedApiBase = ref('')
const loading = ref(true)
const error = ref('')
const savingApi = ref(false)
const apiError = ref('')

const modalOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive<MusicPlaylistInput>({
  name: '',
  server: 'netease',
  playlistId: '',
  sortOrder: 0,
  visible: true,
})

const previewOpen = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const preview = ref<MusicPlaylistResponse | null>(null)

function serverLabel(value: string): string {
  return serverOptions.find((item) => item.value === value)?.label ?? value
}

async function loadMusicAdmin(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [settings, list] = await Promise.all([
      adminApi.getSettings(),
      adminApi.listMusicPlaylists(),
    ])
    apiBase.value = settings.music.apiBase
    savedApiBase.value = settings.music.apiBase
    playlists.value = list.items
  } catch (err) {
    error.value = toErrorMessage(err, '音乐配置加载失败')
  } finally {
    loading.value = false
  }
}

async function saveApiBase(): Promise<void> {
  apiError.value = ''
  if (!/^https?:\/\//i.test(apiBase.value.trim())) {
    apiError.value = 'Meting API 地址必须是 http(s) URL'
    return
  }
  savingApi.value = true
  try {
    const settings: AdminSettings = await adminApi.updateSettings({
      music: { apiBase: apiBase.value.trim() },
    })
    apiBase.value = settings.music.apiBase
    savedApiBase.value = settings.music.apiBase
    toast.notify('Meting API 地址已保存', 'success')
  } catch (err) {
    apiError.value = toErrorMessage(err, '保存失败')
  } finally {
    savingApi.value = false
  }
}

function resetForm(): void {
  form.name = ''
  form.server = 'netease'
  form.playlistId = ''
  form.sortOrder = playlists.value.length
  form.visible = true
  editingId.value = null
  formError.value = ''
}

function openCreate(): void {
  resetForm()
  modalOpen.value = true
}

function openEdit(playlist: AdminMusicPlaylist): void {
  editingId.value = playlist.id
  form.name = playlist.name
  form.server = playlist.server
  form.playlistId = playlist.playlistId
  form.sortOrder = playlist.sortOrder
  form.visible = playlist.visible
  formError.value = ''
  modalOpen.value = true
}

function closeModal(): void {
  if (saving.value) return
  modalOpen.value = false
}

async function savePlaylist(): Promise<void> {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = '请填写歌单名称'
    return
  }
  if (!form.playlistId.trim()) {
    formError.value = '请填写歌单 ID'
    return
  }
  saving.value = true
  try {
    const payload: MusicPlaylistInput = {
      name: form.name.trim(),
      server: form.server,
      playlistId: form.playlistId.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      visible: form.visible,
    }
    if (editingId.value) {
      await adminApi.updateMusicPlaylist(editingId.value, payload)
      toast.notify('歌单已更新', 'success')
    } else {
      await adminApi.createMusicPlaylist(payload)
      toast.notify('歌单已添加', 'success')
    }
    modalOpen.value = false
    await loadMusicAdmin()
  } catch (err) {
    formError.value = toErrorMessage(err, '保存歌单失败')
  } finally {
    saving.value = false
  }
}

async function toggleVisibility(playlist: AdminMusicPlaylist): Promise<void> {
  try {
    await adminApi.updateMusicPlaylist(playlist.id, {
      name: playlist.name,
      server: playlist.server,
      playlistId: playlist.playlistId,
      sortOrder: playlist.sortOrder,
      visible: !playlist.visible,
    })
    playlist.visible = !playlist.visible
    toast.notify(playlist.visible ? '歌单已在前台显示' : '歌单已隐藏', 'success')
  } catch (err) {
    toast.notify(toErrorMessage(err, '状态更新失败'), 'error')
  }
}

async function deletePlaylist(playlist: AdminMusicPlaylist): Promise<void> {
  if (!window.confirm(`确定删除歌单「${playlist.name}」吗？`)) return
  try {
    await adminApi.deleteMusicPlaylist(playlist.id)
    toast.notify('歌单已删除', 'success')
    await loadMusicAdmin()
  } catch (err) {
    toast.notify(toErrorMessage(err, '删除失败'), 'error')
  }
}

async function previewPlaylist(playlist: AdminMusicPlaylist): Promise<void> {
  previewOpen.value = true
  previewLoading.value = true
  previewError.value = ''
  preview.value = null
  try {
    preview.value = await adminApi.previewMusicPlaylist(playlist.id)
  } catch (err) {
    previewError.value = toErrorMessage(err, '无法读取歌单曲目')
  } finally {
    previewLoading.value = false
  }
}

function closePreview(): void {
  if (previewLoading.value) return
  previewOpen.value = false
}

onMounted(() => {
  void loadMusicAdmin()
})

useSeo(() => ({
  title: '音乐管理',
  description: 'Meting 歌单与播放器设置',
  noindex: true,
}))
</script>

<template>
  <div class="admin-music">
    <AdminPageHeader
      eyebrow="MEDIA / MUSIC"
      title="音乐管理"
      description="配置 Meting API 与固定歌单。前台播放器通过服务端代理获取曲目，不会直接暴露第三方接口。"
    >
      <template #actions>
        <button type="button" class="btn btn--primary btn--sm" @click="openCreate">
          <span aria-hidden="true">+</span>
          添加歌单
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="admin-loading admin-card"><span /><span /><span /></div>

    <div v-else-if="error" class="admin-card">
      <div class="admin-empty">
        <span class="admin-empty__glyph">[ LOAD_ERROR ]</span>
        <h2>音乐配置加载失败</h2>
        <p>{{ error }}</p>
        <button type="button" class="btn btn--sm" @click="loadMusicAdmin">重新加载</button>
      </div>
    </div>

    <template v-else>
      <section class="admin-card music-api-card">
        <div class="admin-card__head">
          <div>
            <h2 class="admin-card__title">Meting API Base</h2>
            <p class="admin-card__hint">音乐代理服务地址，支持自建 Meting API</p>
          </div>
          <span class="music-api-card__status mono">
            {{ apiBase === savedApiBase ? 'IN_SYNC' : 'UNSAVED' }}
          </span>
        </div>
        <div class="music-api-card__body">
          <div class="music-api-card__row">
            <input
              v-model="apiBase"
              class="input"
              type="url"
              placeholder="https://api.qijieya.cn/meting/"
              aria-label="Meting API Base"
            />
            <button
              type="button"
              class="btn btn--primary"
              :disabled="savingApi"
              @click="saveApiBase"
            >
              {{ savingApi ? '保存中…' : '保存地址' }}
            </button>
          </div>
          <p v-if="apiError" class="admin-error" role="alert">{{ apiError }}</p>
          <p class="hint">
            默认使用 https://api.qijieya.cn/meting/。如果更换 API，请确认其支持
            <code>server</code>、<code>type=playlist</code>、<code>id</code> 参数并返回 JSON。
          </p>
        </div>
      </section>

      <section class="admin-card music-list-card">
        <div class="admin-card__head">
          <div>
            <h2 class="admin-card__title">固定歌单</h2>
            <p class="admin-card__hint">排序值越小越靠前；隐藏歌单不会出现在前台播放器</p>
          </div>
          <span class="mono music-list-card__count">{{ playlists.length }} PLAYLISTS</span>
        </div>

        <div v-if="playlists.length === 0" class="admin-empty">
          <span class="admin-empty__glyph">[ NO_PLAYLISTS ]</span>
          <h2>还没有配置歌单</h2>
          <p>添加一个公开的网易云或 QQ 音乐歌单，让前台播放器开始工作。</p>
          <button type="button" class="btn btn--sm btn--primary" @click="openCreate">
            添加第一个歌单
          </button>
        </div>

        <div v-else class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>歌单</th>
                <th>平台</th>
                <th>歌单 ID</th>
                <th>排序</th>
                <th>状态</th>
                <th><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="playlist in playlists" :key="playlist.id">
                <td>
                  <div class="music-name-cell">
                    <span class="music-name-cell__icon"><AdminIcon name="music" :size="15" /></span>
                    <strong>{{ playlist.name }}</strong>
                  </div>
                </td>
                <td class="music-muted">{{ serverLabel(playlist.server) }}</td>
                <td class="mono music-id">{{ playlist.playlistId }}</td>
                <td class="mono music-muted">{{ playlist.sortOrder }}</td>
                <td>
                  <button
                    type="button"
                    class="music-visibility"
                    :title="playlist.visible ? '点击隐藏' : '点击显示'"
                    @click="toggleVisibility(playlist)"
                  >
                    <span
                      class="admin-badge"
                      :class="playlist.visible ? 'admin-badge--published' : ''"
                    >
                      {{ playlist.visible ? '显示中' : '已隐藏' }}
                    </span>
                  </button>
                </td>
                <td>
                  <div class="admin-table__actions">
                    <button
                      type="button"
                      class="btn btn--sm btn--ghost"
                      @click="previewPlaylist(playlist)"
                    >
                      预览
                    </button>
                    <button
                      type="button"
                      class="btn btn--sm btn--ghost"
                      @click="openEdit(playlist)"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      class="btn btn--sm btn--danger"
                      @click="deletePlaylist(playlist)"
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

      <section class="admin-card music-help">
        <div class="music-help__mark mono">MUSIC_NOTES</div>
        <div>
          <h2>如何获取歌单 ID？</h2>
          <p>
            打开网易云音乐 / QQ 音乐的公开歌单，从分享链接中取出歌单数字 ID（例如
            <code>https://music.163.com/#/playlist?id=3778678</code> 中的
            <code>3778678</code>），填入歌单 ID 即可。歌单需要是公开可访问的。
          </p>
        </div>
      </section>
    </template>

    <Transition name="admin-modal">
      <div v-if="modalOpen" class="admin-modal-backdrop" @click.self="closeModal">
        <div
          class="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="music-modal-title"
        >
          <div class="admin-modal__head">
            <h2 id="music-modal-title">{{ editingId ? '编辑歌单' : '添加歌单' }}</h2>
            <button type="button" class="icon-btn" aria-label="关闭" @click="closeModal">×</button>
          </div>
          <form class="admin-form admin-modal__body" @submit.prevent="savePlaylist">
            <div class="admin-form-row">
              <label class="admin-label">
                歌单名称
                <input
                  v-model="form.name"
                  class="input"
                  maxlength="60"
                  placeholder="例如：夜间编码"
                />
              </label>
              <label class="admin-label">
                排序值
                <input v-model.number="form.sortOrder" class="input" type="number" />
              </label>
            </div>
            <div class="admin-form-row">
              <label class="admin-label">
                音乐平台
                <select v-model="form.server" class="select">
                  <option v-for="option in serverOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="admin-label">
                歌单 ID
                <input v-model="form.playlistId" class="input mono" placeholder="例如 3778678" />
              </label>
            </div>
            <label class="admin-check">
              <input v-model="form.visible" type="checkbox" />
              在前台播放器中显示这个歌单
            </label>
            <p v-if="formError" class="admin-error" role="alert">{{ formError }}</p>
          </form>
          <div class="admin-modal__foot">
            <button type="button" class="btn btn--ghost" :disabled="saving" @click="closeModal">
              取消
            </button>
            <button type="button" class="btn btn--primary" :disabled="saving" @click="savePlaylist">
              {{ saving ? '保存中…' : '保存歌单' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="admin-modal">
      <div v-if="previewOpen" class="admin-modal-backdrop" @click.self="closePreview">
        <div
          class="admin-modal preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label="歌单预览"
        >
          <div class="admin-modal__head">
            <div>
              <p class="mono preview-modal__eyebrow">PLAYLIST_PREVIEW</p>
              <h2>{{ preview?.playlist.name || '正在读取歌单' }}</h2>
            </div>
            <button type="button" class="icon-btn" aria-label="关闭" @click="closePreview">
              ×
            </button>
          </div>
          <div class="admin-modal__body">
            <div v-if="previewLoading" class="admin-loading"><span /><span /><span /></div>
            <p v-else-if="previewError" class="admin-error">{{ previewError }}</p>
            <div v-else-if="preview" class="preview-tracks">
              <p class="mono preview-tracks__count">{{ preview.tracks.length }} TRACKS</p>
              <ol>
                <li v-for="(track, index) in preview.tracks" :key="`${track.id}-${index}`">
                  <span class="mono">{{ String(index + 1).padStart(2, '0') }}</span>
                  <div>
                    <strong>{{ track.name }}</strong>
                    <small>{{ track.artist }}</small>
                  </div>
                </li>
              </ol>
            </div>
          </div>
          <div class="admin-modal__foot">
            <button type="button" class="btn btn--ghost" @click="closePreview">关闭</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.music-api-card__status {
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
}

.music-api-card__body {
  display: grid;
  gap: 8px;
  padding: 17px 19px 19px;
}

.music-api-card__row {
  display: flex;
  gap: 8px;
}

.music-api-card__row .input {
  flex: 1;
}

.music-api-card__row .btn {
  flex: none;
}

.music-list-card {
  margin-top: 14px;
  overflow: hidden;
}

.music-list-card__count {
  color: var(--muted);
  font-size: 0.54rem;
  letter-spacing: 0.06em;
}

.music-name-cell {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text);
  font-size: 0.8rem;
}

.music-name-cell__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: rgba(var(--brand-rgb), 0.12);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .music-name-cell__icon {
  color: var(--brand);
}

.music-muted {
  color: var(--muted);
  font-size: 0.72rem;
}

.music-id {
  color: var(--text-soft);
  font-size: 0.63rem;
}

.music-visibility {
  padding: 0;
  border: 0;
  background: transparent;
}

.music-visibility .admin-badge {
  cursor: pointer;
}

.music-help {
  display: flex;
  align-items: flex-start;
  gap: 22px;
  margin-top: 14px;
  padding: 19px;
}

.music-help__mark {
  flex: none;
  color: var(--brand-deep);
  font-size: 0.56rem;
  letter-spacing: 0.09em;
}

:root[data-theme='dark'] .music-help__mark {
  color: var(--brand);
}

.music-help h2 {
  font-size: 0.88rem;
}

.music-help p {
  max-width: 760px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.75;
}

.music-help code {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--surface-alt);
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.preview-modal {
  width: min(100%, 620px);
}

.preview-modal__eyebrow {
  margin-bottom: 5px;
  color: var(--brand-deep);
  font-size: 0.53rem;
  letter-spacing: 0.1em;
}

:root[data-theme='dark'] .preview-modal__eyebrow {
  color: var(--brand);
}

.preview-tracks__count {
  margin-bottom: 10px;
  color: var(--muted);
  font-size: 0.55rem;
}

.preview-tracks ol {
  display: grid;
  gap: 2px;
  max-height: 46vh;
  overflow-y: auto;
  list-style: none;
}

.preview-tracks li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 6px;
}

.preview-tracks li:hover {
  background: rgba(var(--brand-rgb), 0.06);
}

.preview-tracks li > span {
  width: 22px;
  flex: none;
  color: var(--muted);
  font-size: 0.57rem;
}

.preview-tracks li > div {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.preview-tracks li strong {
  font-size: 0.78rem;
  font-weight: 550;
}

.preview-tracks li small {
  color: var(--muted);
  font-size: 0.64rem;
}

@media (max-width: 900px) {
  .admin-table th:nth-child(3),
  .admin-table td:nth-child(3) {
    display: none;
  }
}

@media (max-width: 640px) {
  .music-api-card__row {
    flex-direction: column;
  }

  .music-help {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
