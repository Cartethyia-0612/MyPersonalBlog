<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { decorateCodeBlocks, handleCodeCopyClick } from '@/lib/codeCopy'
import { renderMarkdown } from '@/lib/markdown'

const props = defineProps<{ source: string }>()

const root = ref<HTMLElement | null>(null)
const html = computed(() => renderMarkdown(props.source))

function decorate(): void {
  if (root.value) decorateCodeBlocks(root.value)
}

function onRootClick(event: MouseEvent): void {
  if (root.value) void handleCodeCopyClick(event, root.value)
}

watch(html, decorate, { flush: 'post' })
onMounted(decorate)
</script>

<template>
  <div ref="root" class="markdown-body" @click="onRootClick" v-html="html" />
</template>
