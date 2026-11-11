<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import MusicNoteIcon from '@/components/MusicNoteIcon.vue'
import { usePlayerStore } from '@/stores/player'

const player = usePlayerStore()
const coverFailed = ref(false)
const mobileVolumeOpen = ref(false)
const mobileVolumeControl = ref<HTMLElement | null>(null)
const mobileVolumePopover = ref<HTMLElement | null>(null)

const progressPercent = computed(() => player.progress)
const durationPercent = computed(() => (player.duration > 0 ? 100 : 0))
const volumePercent = computed(() => Math.round(player.volume * 100))

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function onPlaylistChange(event: Event): void {
  const id = Number((event.target as HTMLSelectElement).value)
  if (!Number.isInteger(id) || id < 1) return
  void player.selectPlaylist(id, player.isPlaying)
}

function onSeek(event: Event): void {
  player.seekRatio(Number((event.target as HTMLInputElement).value) / 100)
}

function onVolume(event: Event): void {
  player.setVolume(Number((event.target as HTMLInputElement).value) / 100)
}

function toggleMobileVolume(): void {
  mobileVolumeOpen.value = !mobileVolumeOpen.value
}

function handleOutsidePointer(event: PointerEvent): void {
  if (!mobileVolumeOpen.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (mobileVolumeControl.value?.contains(target)) return
  if (mobileVolumePopover.value?.contains(target)) return
  mobileVolumeOpen.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') mobileVolumeOpen.value = false
}

function handleResize(): void {
  if (window.innerWidth > 980) mobileVolumeOpen.value = false
}

function selectTrack(index: number): void {
  player.loadIndex(index, true)
}

function modeTitle(): string {
  return `播放模式：${player.modeLabel}，点击切换`
}

watch(
  () => [player.currentTrack?.id, player.currentTrack?.cover],
  () => {
    coverFailed.value = false
  },
)

watch(
  () => player.hidden,
  (hidden) => {
    if (hidden) mobileVolumeOpen.value = false
  },
)

onMounted(() => {
  void player.init()
  document.addEventListener('pointerdown', handleOutsidePointer)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize, { passive: true })
})

onBeforeUnmount(() => {
  player.pause()
  document.removeEventListener('pointerdown', handleOutsidePointer)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div v-if="player.hasPlaylists" class="music-root">
    <Transition name="player-hide">
      <div v-if="!player.hidden" class="music-player" :class="{ 'is-expanded': player.panelOpen }">
        <Transition name="music-panel">
          <section v-if="player.panelOpen" class="music-panel" aria-label="播放列表">
            <div class="music-panel__inner">
              <header class="music-panel__head">
                <div>
                  <p class="mono">PLAYLIST_QUEUE</p>
                  <h2>{{ player.currentPlaylist?.name || '固定歌单' }}</h2>
                </div>
                <div class="music-panel__actions">
                  <label class="music-panel__select-label">
                    <span class="sr-only">切换歌单</span>
                    <select :value="player.currentPlaylistId ?? ''" @change="onPlaylistChange">
                      <option
                        v-for="playlist in player.playlists"
                        :key="playlist.id"
                        :value="playlist.id"
                      >
                        {{ playlist.name }}
                      </option>
                    </select>
                  </label>
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label="收起播放列表"
                    @click="player.closePanel"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </header>

              <div v-if="player.error" class="music-panel__error">
                <span>{{ player.error }}</span>
                <button type="button" class="btn btn--sm" @click="player.retry">重试</button>
              </div>

              <div v-if="player.loadingTracks" class="music-panel__loading mono">
                <span class="music-loading-dot" /> LOADING_TRACKS…
              </div>

              <div v-else-if="player.tracks.length === 0" class="music-panel__empty">
                <span class="mono">[ NO_TRACKS ]</span>
                <p>这个歌单暂时没有可播放的曲目。</p>
                <button type="button" class="btn btn--sm" @click="player.retry">重新加载</button>
              </div>

              <ol v-else class="track-list">
                <li v-for="(track, index) in player.tracks" :key="`${track.id}-${index}`">
                  <button
                    type="button"
                    class="track-row"
                    :class="{ 'is-current': index === player.currentIndex }"
                    @click="selectTrack(index)"
                  >
                    <span class="track-row__index mono">
                      <span
                        v-if="index === player.currentIndex && player.isPlaying"
                        class="mini-equalizer"
                      >
                        <i /><i /><i />
                      </span>
                      <span v-else>{{ String(index + 1).padStart(2, '0') }}</span>
                    </span>
                    <span class="track-row__copy">
                      <strong>{{ track.name }}</strong>
                      <small>{{ track.artist }}</small>
                    </span>
                    <span v-if="index === player.currentIndex" class="track-row__now mono"
                      >NOW</span
                    >
                    <span class="track-row__play" aria-hidden="true">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </button>
                </li>
              </ol>
            </div>
          </section>
        </Transition>

        <div class="music-bar">
          <div class="music-bar__inner">
            <div class="now-playing">
              <div class="now-playing__cover">
                <img
                  v-if="player.currentTrack?.cover && !coverFailed"
                  :src="player.currentTrack.cover"
                  alt=""
                  loading="lazy"
                  @error="coverFailed = true"
                />
                <span v-else class="now-playing__fallback" aria-hidden="true">
                  <MusicNoteIcon :size="20" />
                </span>
                <span v-if="player.isPlaying" class="cover-equalizer" aria-hidden="true">
                  <i /><i /><i /><i />
                </span>
              </div>
              <div class="now-playing__copy">
                <span class="mono">NOW_PLAYING</span>
                <strong>{{ player.currentTrack?.name || '等待选择曲目' }}</strong>
                <small>
                  {{ player.currentTrack?.artist || player.currentPlaylist?.name || '固定歌单' }}
                </small>
              </div>
            </div>

            <div class="music-controls">
              <button
                type="button"
                class="music-controls__side"
                aria-label="上一首"
                :disabled="player.tracks.length === 0"
                @click="player.previous"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6 5h2v14H6zM20 5v14L9 12z" />
                </svg>
              </button>
              <button
                type="button"
                class="music-controls__play"
                :aria-label="player.isPlaying ? '暂停' : '播放'"
                :disabled="player.loadingTracks"
                @click="player.toggle"
              >
                <span v-if="player.loadingTracks" class="music-spinner" aria-hidden="true" />
                <svg
                  v-else-if="player.isPlaying"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
                <svg
                  v-else
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <button
                type="button"
                class="music-controls__side"
                aria-label="下一首"
                :disabled="player.tracks.length === 0"
                @click="player.next(player.isPlaying)"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
                </svg>
              </button>
            </div>

            <div class="music-progress" :class="{ 'is-empty': durationPercent === 0 }">
              <span class="mono">{{ formatTime(player.currentTime) }}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                :value="progressPercent"
                :style="{ '--progress': `${progressPercent}%` }"
                aria-label="播放进度"
                @input="onSeek"
              />
              <span class="mono">{{ formatTime(player.duration) }}</span>
            </div>

            <div class="music-extra">
              <button
                type="button"
                class="music-mode"
                :title="modeTitle()"
                :aria-label="modeTitle()"
                @click="player.cycleMode"
              >
                <svg
                  v-if="player.mode === 'list'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17 3l4 4-4 4M21 7H7a4 4 0 0 0-4 4v1" />
                  <path d="M7 21l-4-4 4-4M3 17h14a4 4 0 0 0 4-4v-1" />
                </svg>
                <svg
                  v-else-if="player.mode === 'one'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17 3l4 4-4 4M21 7H7a4 4 0 0 0-4 4v1" />
                  <path d="M7 21l-4-4 4-4M3 17h14a4 4 0 0 0 4-4v-1" />
                  <path d="M12 10v4" />
                </svg>
                <svg
                  v-else
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 7h4l10 10h4M21 7h-4L7 17H3" />
                  <path d="m18 14 3 3-3 3M6 7 3 4" />
                </svg>
                <span>{{ player.modeLabel }}</span>
              </button>

              <div class="music-volume">
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
                  <path d="M11 5 6 9H3v6h3l5 4z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="volumePercent"
                  :style="{ '--volume': `${volumePercent}%` }"
                  aria-label="音量"
                  @input="onVolume"
                />
              </div>

              <div ref="mobileVolumeControl" class="mobile-volume-control">
                <button
                  type="button"
                  class="mobile-volume-button"
                  :aria-expanded="mobileVolumeOpen"
                  aria-controls="music-mobile-volume"
                  :aria-label="`调节音量，当前 ${volumePercent}%`"
                  :title="`音量 ${volumePercent}%`"
                  @click="toggleMobileVolume"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M11 5 6 9H3v6h3l5 4z" />
                    <path
                      v-if="volumePercent > 0"
                      d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
                    />
                    <path v-else d="m16 9 5 6M21 9l-5 6" />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                class="music-queue-toggle"
                :aria-expanded="player.panelOpen"
                aria-label="打开或收起播放列表"
                @click="player.togglePanel"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 6h16M4 12h16M4 18h10" />
                  <path d="m17 16 3 3-3 3" />
                </svg>
                <span class="mono">{{ player.tracks.length }}</span>
              </button>

              <button
                type="button"
                class="music-hide"
                aria-label="隐藏音乐播放器，音乐继续播放"
                title="隐藏播放器（音乐继续）"
                @click="player.hidePlayer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 9 7 7 7-7" />
                </svg>
              </button>
            </div>
          </div>
          <div class="music-bar__line" aria-hidden="true" />

          <Transition name="volume-pop">
            <div
              v-if="mobileVolumeOpen"
              id="music-mobile-volume"
              ref="mobileVolumePopover"
              class="mobile-volume-popover"
              role="group"
              aria-label="音量调节"
            >
              <span class="mono mobile-volume-popover__value">{{ volumePercent }}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="volumePercent"
                :style="{ '--volume': `${volumePercent}%` }"
                aria-label="调节音量"
                @input="onVolume"
              />
            </div>
          </Transition>
        </div>
      </div>
    </Transition>

    <Transition name="music-tab">
      <button
        v-if="player.hidden"
        type="button"
        class="music-restore"
        aria-label="显示音乐播放器"
        title="显示音乐播放器"
        @click="player.showPlayer"
      >
        <span class="music-restore__icon" aria-hidden="true">
          <img
            v-if="player.currentTrack?.cover && !coverFailed"
            :src="player.currentTrack.cover"
            alt=""
            loading="lazy"
            @error="coverFailed = true"
          />
          <MusicNoteIcon v-else :size="15" />
        </span>
        <span class="music-restore__copy">
          <small class="mono">MUSIC</small>
          <strong>{{ player.currentTrack?.name || '音乐播放器已隐藏' }}</strong>
        </span>
        <span v-if="player.isPlaying" class="music-restore__eq" aria-hidden="true">
          <i /><i /><i />
        </span>
        <svg
          class="music-restore__chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 15 7-7 7 7" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.music-player {
  position: fixed;
  inset: auto 0 0;
  z-index: 70;
  color: var(--text);
}

.music-bar {
  position: relative;
  border-top: 1px solid var(--border);
  background: var(--header-bg);
  box-shadow: 0 -18px 50px -32px rgba(3, 25, 42, 0.6);
  backdrop-filter: blur(22px) saturate(1.25);
}

.music-bar__inner {
  display: grid;
  width: min(100% - 32px, 1240px);
  margin-inline: auto;
  grid-template-columns: minmax(190px, 1.1fr) auto minmax(220px, 1.1fr) auto;
  align-items: center;
  gap: clamp(12px, 2.4vw, 30px);
  min-height: 74px;
  padding: 9px 0;
}

.music-bar__line {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--brand), var(--accent), transparent);
  opacity: 0.6;
}

.now-playing {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.now-playing__cover {
  position: relative;
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 11px;
  background:
    radial-gradient(circle at 25% 20%, rgba(255, 255, 255, 0.6), transparent 55%),
    linear-gradient(135deg, rgba(var(--brand-rgb), 0.32), rgba(var(--brand-rgb), 0.06));
}

.now-playing__cover img {
  width: 44px;
  height: 44px;
  object-fit: cover;
}

.now-playing__fallback {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--brand-deep);
}

:root[data-theme='dark'] .now-playing__fallback {
  color: var(--brand);
}

.now-playing__copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.now-playing__copy > .mono {
  color: var(--brand-deep);
  font-size: 0.48rem;
  letter-spacing: 0.12em;
}

:root[data-theme='dark'] .now-playing__copy > .mono {
  color: var(--brand);
}

.now-playing__copy strong {
  overflow: hidden;
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.now-playing__copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 0.62rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-equalizer {
  position: absolute;
  right: 3px;
  bottom: 3px;
  display: flex;
  height: 10px;
  align-items: flex-end;
  gap: 2px;
  padding: 2px 3px;
  border-radius: 3px;
  background: rgba(3, 15, 24, 0.7);
}

.cover-equalizer i,
.mini-equalizer i {
  width: 2px;
  height: 100%;
  border-radius: 2px;
  background: var(--brand);
  transform-origin: bottom;
  animation: equalizer 800ms ease-in-out infinite alternate;
}

.cover-equalizer i:nth-child(2),
.mini-equalizer i:nth-child(2) {
  animation-delay: 180ms;
}

.cover-equalizer i:nth-child(3),
.mini-equalizer i:nth-child(3) {
  animation-delay: 90ms;
}

.cover-equalizer i:nth-child(4) {
  animation-delay: 260ms;
}

.music-controls {
  display: flex;
  align-items: center;
  gap: 5px;
}

.music-controls__side {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-soft);
  transition:
    color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.music-controls__side:hover:not(:disabled) {
  background: rgba(var(--brand-rgb), 0.12);
  color: var(--text);
}

.music-controls__side:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.music-controls__play {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-strong), var(--brand));
  color: #041521;
  box-shadow: 0 8px 22px -12px rgba(var(--brand-rgb), 0.9);
  transition:
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) ease;
}

.music-controls__play:hover {
  box-shadow: 0 12px 28px -12px rgba(var(--brand-rgb), 0.9);
  transform: scale(1.04);
}

.music-spinner {
  width: 17px;
  height: 17px;
  border: 2px solid rgba(4, 21, 33, 0.25);
  border-top-color: #041521;
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

.music-progress {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.music-progress > .mono {
  flex: none;
  color: var(--muted);
  font-size: 0.53rem;
  font-variant-numeric: tabular-nums;
}

.music-progress.is-empty {
  opacity: 0.55;
}

input[type='range'] {
  width: 100%;
  height: 15px;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    var(--brand) var(--progress, var(--volume, 0%)),
    var(--border-strong) var(--progress, var(--volume, 0%))
  );
}

input[type='range']::-moz-range-track {
  height: 3px;
  border-radius: 3px;
  background: var(--border-strong);
}

input[type='range']::-moz-range-progress {
  height: 3px;
  border-radius: 3px;
  background: var(--brand);
}

input[type='range']::-webkit-slider-thumb {
  width: 11px;
  height: 11px;
  margin-top: -4px;
  appearance: none;
  border: 2px solid var(--surface-solid);
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 2px rgba(var(--brand-rgb), 0.2);
}

input[type='range']::-moz-range-thumb {
  width: 9px;
  height: 9px;
  border: 2px solid var(--surface-solid);
  border-radius: 50%;
  background: var(--brand);
}

.music-extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.music-mode,
.music-queue-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.6rem;
  white-space: nowrap;
}

.music-mode:hover,
.music-queue-toggle:hover {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .music-mode:hover,
:root[data-theme='dark'] .music-queue-toggle:hover {
  color: var(--brand);
}

.music-mode span {
  display: none;
}

@media (min-width: 1180px) {
  .music-mode span {
    display: inline;
  }
}

.music-queue-toggle {
  padding: 4px 7px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
}

.music-queue-toggle .mono {
  font-size: 0.52rem;
}

.music-hide {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  transition:
    color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.music-hide:hover {
  background: rgba(var(--brand-rgb), 0.11);
  color: var(--text);
}

.player-hide-enter-active,
.player-hide-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

.player-hide-enter-from,
.player-hide-leave-to {
  opacity: 0;
  transform: translateY(24px);
}

.music-tab-enter-active,
.music-tab-leave-active {
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-base) var(--ease-out);
}

.music-tab-enter-from,
.music-tab-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.music-restore {
  position: fixed;
  bottom: 18px;
  left: 20px;
  z-index: 70;
  display: flex;
  max-width: min(300px, calc(100vw - 130px));
  align-items: center;
  gap: 9px;
  padding: 8px 11px 8px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--header-bg);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(20px) saturate(1.2);
  transition:
    border-color var(--duration-fast) ease,
    transform var(--duration-fast) var(--ease-out);
}

.music-restore:hover {
  border-color: rgba(var(--brand-rgb), 0.45);
  transform: translateY(-2px);
}

.music-restore__icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(var(--brand-rgb), 0.14);
  color: var(--brand-deep);
}

.music-restore__icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:root[data-theme='dark'] .music-restore__icon {
  color: var(--brand);
}

.music-restore__copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.music-restore__copy small {
  color: var(--brand-deep);
  font-size: 0.46rem;
  letter-spacing: 0.1em;
}

:root[data-theme='dark'] .music-restore__copy small {
  color: var(--brand);
}

.music-restore__copy strong {
  overflow: hidden;
  max-width: 170px;
  color: var(--text-soft);
  font-size: 0.66rem;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-restore__eq {
  display: flex;
  height: 12px;
  flex: none;
  align-items: flex-end;
  gap: 2px;
}

.music-restore__eq i {
  width: 2px;
  height: 100%;
  border-radius: 2px;
  background: var(--brand);
  transform-origin: bottom;
  animation: equalizer 800ms ease-in-out infinite alternate;
}

.music-restore__eq i:nth-child(2) {
  animation-delay: 180ms;
}

.music-restore__eq i:nth-child(3) {
  animation-delay: 90ms;
}

.music-restore__chevron {
  flex: none;
  color: var(--muted);
}

.music-volume {
  display: flex;
  width: 92px;
  align-items: center;
  gap: 5px;
  color: var(--muted);
}

.music-volume input[type='range'] {
  width: 65px;
}

.mobile-volume-control {
  position: relative;
  display: none;
  align-items: center;
}

.mobile-volume-button {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  transition:
    color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.mobile-volume-button:hover,
.mobile-volume-button[aria-expanded='true'] {
  background: rgba(var(--brand-rgb), 0.11);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .mobile-volume-button:hover,
:root[data-theme='dark'] .mobile-volume-button[aria-expanded='true'] {
  color: var(--brand);
}

.mobile-volume-popover {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  z-index: 5;
  display: flex;
  width: min(190px, calc(100vw - 24px));
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  padding: 8px 12px 9px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
}

.mobile-volume-popover__value {
  width: 100%;
  flex: none;
  color: var(--brand-deep);
  font-size: 0.55rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

:root[data-theme='dark'] .mobile-volume-popover__value {
  color: var(--brand);
}

.mobile-volume-popover input[type='range'] {
  width: 100%;
  min-width: 0;
  flex: none;
}

.volume-pop-enter-active,
.volume-pop-leave-active {
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-fast) var(--ease-out);
}

.volume-pop-enter-from,
.volume-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}

@media (min-width: 981px) {
  .mobile-volume-popover {
    display: none;
  }
}

.music-panel {
  width: min(100% - 32px, 1240px);
  max-height: min(48vh, 430px);
  margin: 0 auto 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(24px);
}

.music-panel__inner {
  max-height: inherit;
  overflow-y: auto;
  padding: 16px 18px 12px;
}

.music-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.music-panel__head p {
  color: var(--brand-deep);
  font-size: 0.54rem;
  letter-spacing: 0.1em;
}

:root[data-theme='dark'] .music-panel__head p {
  color: var(--brand);
}

.music-panel__head h2 {
  margin-top: 3px;
  font-size: 1rem;
}

.music-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.music-panel__select-label select {
  min-height: 32px;
  padding: 4px 26px 4px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text-soft);
  font-size: 0.72rem;
}

.music-panel__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding: 8px 11px;
  border: 1px solid rgba(220, 80, 80, 0.2);
  border-radius: var(--radius-sm);
  background: rgba(220, 80, 80, 0.06);
  color: #b83e3e;
  font-size: 0.75rem;
}

:root[data-theme='dark'] .music-panel__error {
  color: #ff9a9a;
}

.music-panel__loading,
.music-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 34px;
  color: var(--muted);
  font-size: 0.64rem;
  text-align: center;
}

.music-panel__empty {
  flex-direction: column;
}

.music-panel__empty .mono {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .music-panel__empty .mono {
  color: var(--brand);
}

.music-panel__empty p {
  font-size: 0.76rem;
}

.music-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  animation: pulse 900ms ease-in-out infinite;
}

.track-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 12px;
  margin-top: 9px;
  list-style: none;
}

.track-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-soft);
  text-align: left;
}

.track-row:hover {
  background: rgba(var(--brand-rgb), 0.08);
}

.track-row.is-current {
  background: rgba(var(--brand-rgb), 0.12);
  color: var(--text);
}

.track-row__index {
  display: grid;
  width: 22px;
  flex: none;
  place-items: center;
  color: var(--muted);
  font-size: 0.56rem;
}

.track-row.is-current .track-row__index {
  color: var(--brand-deep);
}

:root[data-theme='dark'] .track-row.is-current .track-row__index {
  color: var(--brand);
}

.track-row__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 1px;
}

.track-row__copy strong {
  overflow: hidden;
  font-size: 0.75rem;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-row__copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 0.61rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-row__now {
  color: var(--brand-deep);
  font-size: 0.48rem;
  letter-spacing: 0.08em;
}

:root[data-theme='dark'] .track-row__now {
  color: var(--brand);
}

.track-row__play {
  display: none;
  color: var(--brand-deep);
}

.track-row:hover .track-row__play {
  display: grid;
}

.mini-equalizer {
  display: flex;
  height: 11px;
  align-items: flex-end;
  gap: 2px;
}

.mini-equalizer i {
  width: 2px;
}

.music-panel-enter-active,
.music-panel-leave-active {
  transition:
    opacity var(--duration-fast) ease,
    transform var(--duration-base) var(--ease-out);
}

.music-panel-enter-from,
.music-panel-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

@keyframes equalizer {
  from {
    transform: scaleY(0.3);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 980px) {
  .music-bar__inner {
    grid-template-columns: minmax(150px, 1fr) auto minmax(120px, 0.7fr) auto;
    gap: 10px;
  }

  .music-mode span,
  .music-volume {
    display: none;
  }

  .mobile-volume-control {
    display: inline-flex;
  }

  .now-playing__copy > .mono {
    display: none;
  }

  .track-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .music-bar__inner {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 12px;
    padding: 8px 0 7px;
  }

  .music-progress {
    grid-column: 1;
    grid-row: 2;
    padding: 0 2px 2px;
  }

  .music-extra {
    grid-column: 2;
    grid-row: 2;
    justify-content: flex-end;
    gap: 4px;
  }

  .music-progress > .mono {
    font-size: 0.48rem;
  }

  .now-playing__cover {
    width: 38px;
    height: 38px;
    border-radius: 9px;
  }

  .now-playing__cover img {
    width: 38px;
    height: 38px;
  }

  .now-playing__copy strong {
    max-width: 45vw;
    font-size: 0.72rem;
  }

  .now-playing__copy small {
    max-width: 45vw;
    font-size: 0.56rem;
  }

  .music-hide {
    width: 24px;
    height: 24px;
  }

  .mobile-volume-button {
    width: 24px;
    height: 24px;
  }

  .mobile-volume-popover {
    width: min(178px, calc(100vw - 24px));
    padding: 8px 11px;
  }
  .music-restore {
    bottom: 13px;
    left: 13px;
    max-width: min(260px, calc(100vw - 90px));
    padding: 7px 9px 7px 7px;
  }

  .music-restore__copy strong {
    max-width: 120px;
  }

  .music-mode span {
    display: none;
  }

  .music-controls__side {
    width: 29px;
    height: 29px;
  }

  .music-controls__play {
    width: 37px;
    height: 37px;
  }

  .music-panel {
    width: calc(100% - 18px);
    max-height: 58vh;
  }

  .music-panel__inner {
    padding: 13px 12px 10px;
  }

  .music-panel__head {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
  }

  .music-panel__actions {
    width: 100%;
    justify-content: space-between;
  }

  .music-panel__select-label {
    flex: 1;
  }

  .music-panel__select-label select {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover-equalizer i,
  .mini-equalizer i,
  .music-restore__eq i,
  .music-spinner,
  .music-loading-dot {
    animation: none;
  }

  .volume-pop-enter-active,
  .volume-pop-leave-active {
    transition: none;
  }
}
</style>
