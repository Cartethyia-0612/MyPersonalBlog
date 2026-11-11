<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'

import MusicPlayer from '@/components/MusicPlayer.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import SiteHeader from '@/components/SiteHeader.vue'
import { usePlayerStore } from '@/stores/player'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()
const playerStore = usePlayerStore()

const hasPlayer = computed(() => playerStore.hasPlaylists)

onMounted(() => {
  void siteStore.load()
})
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <div class="public-layout" :class="{ 'has-player': hasPlayer }">
    <div class="public-layout__ambient" aria-hidden="true">
      <span class="public-layout__glow public-layout__glow--one" />
      <span class="public-layout__glow public-layout__glow--two" />
    </div>
    <SiteHeader />
    <main id="main-content" class="public-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <SiteFooter />
    <MusicPlayer />
  </div>
</template>

<style scoped>
.public-layout {
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.public-layout.has-player {
  padding-bottom: 82px;
}

.public-layout__ambient {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.public-layout__glow {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.48;
}

.public-layout__glow--one {
  top: -300px;
  right: -120px;
  background: rgba(var(--brand-rgb), 0.24);
}

.public-layout__glow--two {
  top: 58%;
  left: -320px;
  background: rgba(122, 240, 255, 0.12);
}

.public-main {
  position: relative;
  flex: 1;
}

@media (max-width: 680px) {
  .public-layout.has-player {
    padding-bottom: 102px;
  }
}
</style>
