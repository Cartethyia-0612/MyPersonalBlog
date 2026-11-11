<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'

import LoadingScreen from '@/components/LoadingScreen.vue'
import TopProgress from '@/components/TopProgress.vue'

const showBootScreen = ref(false)

onMounted(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const alreadyBooted = window.sessionStorage.getItem('eshi-booted') === '1'

  if (!alreadyBooted && !reduceMotion) {
    showBootScreen.value = true
    window.setTimeout(() => {
      showBootScreen.value = false
      window.sessionStorage.setItem('eshi-booted', '1')
    }, 1100)
  } else {
    window.sessionStorage.setItem('eshi-booted', '1')
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
