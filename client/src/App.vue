<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import LoadingScreen from '@/components/LoadingScreen.vue'
import TopProgress from '@/components/TopProgress.vue'
import { waitForBootResources } from '@/lib/boot'

const MIN_BOOT_MS = 1100
const router = useRouter()
const showBootScreen = ref(false)

function markBooted(): void {
  window.sessionStorage.setItem('eshi-booted', '1')
}

onMounted(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const alreadyBooted = window.sessionStorage.getItem('eshi-booted') === '1'

  if (!alreadyBooted && !reduceMotion) {
    showBootScreen.value = true
    const startedAt = Date.now()
    void (async () => {
      try {
        // Resolve the initial route component before deciding that the shell
        // is ready; its chunk may be loaded lazily.
        await router.isReady()
        await nextTick()
        await waitForBootResources()
      } finally {
        const remaining = MIN_BOOT_MS - (Date.now() - startedAt)
        if (remaining > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remaining))
        }
        showBootScreen.value = false
        markBooted()
      }
    })()
  } else {
    markBooted()
  }
})
</script>

<template>
  <TopProgress />
  <Transition name="boot">
    <LoadingScreen v-if="showBootScreen" />
  </Transition>
  <RouterView />
</template>

<style scoped>
.boot-leave-active {
  transition:
    opacity 380ms var(--ease-out),
    transform 380ms var(--ease-out);
}

.boot-leave-to {
  opacity: 0;
  transform: scale(1.015);
}
</style>
