<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'

import { renderMarkdown } from '@/lib/markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minHeight?: string
  }>(),
  {
    placeholder: '在这里写下正文，支持 Markdown…',
    minHeight: '340px',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaId = `markdown-editor-${useId()}`
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const mode = ref<'write' | 'preview'>('write')

function update(value: string): void {
  emit('update:modelValue', value)
}

function insert(before: string, after = '', placeholder = '文本'): void {
  const textarea = textareaRef.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = props.modelValue.slice(start, end) || placeholder
  const next = `${props.modelValue.slice(0, start)}${before}${selected}${after}${props.modelValue.slice(end)}`
  update(next)
  void nextTick(() => {
    textarea.focus()
    const cursorStart = start + before.length
    textarea.setSelectionRange(cursorStart, cursorStart + selected.length)
  })
}

function prefixLine(prefix: string): void {
  const textarea = textareaRef.value
  if (!textarea) return
  const start = textarea.selectionStart
  const lineStart = props.modelValue.lastIndexOf('\n', start - 1) + 1
  const next = `${props.modelValue.slice(0, lineStart)}${prefix}${props.modelValue.slice(lineStart)}`
  update(next)
  void nextTick(() => {
    textarea.focus()
    const cursor = start + prefix.length
    textarea.setSelectionRange(cursor, cursor)
  })
}
</script>

<template>
  <div class="md-editor">
    <div class="md-editor__top">
      <div class="md-editor__tabs" role="tablist" aria-label="Markdown 编辑模式">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'write'"
          class="md-editor__tab"
          :class="{ 'is-active': mode === 'write' }"
          @click="mode = 'write'"
        >
          编辑
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'preview'"
          class="md-editor__tab"
          :class="{ 'is-active': mode === 'preview' }"
          @click="mode = 'preview'"
        >
          预览
        </button>
      </div>
      <span class="md-editor__count mono">{{ modelValue.length }} CHARS</span>
    </div>

    <div v-if="mode === 'write'" class="md-editor__write">
      <div class="md-editor__toolbar" role="toolbar" aria-label="Markdown 快捷工具">
        <button type="button" title="二级标题" @click="prefixLine('## ')">H2</button>
        <button type="button" title="粗体" @click="insert('**', '**', '粗体文本')">B</button>
        <button type="button" title="斜体" @click="insert('*', '*', '斜体文本')"><em>I</em></button>
        <button type="button" title="行内代码" @click="insert('`', '`', 'code')">`</button>
        <button type="button" title="代码块" @click="insert('```ts\n', '\n```', 'const hello = 1')">
          &lt;/&gt;
        </button>
        <button type="button" title="引用" @click="prefixLine('> ')">❝</button>
        <button type="button" title="无序列表" @click="prefixLine('- ')">≡</button>
        <button
          type="button"
          title="链接"
          @click="insert('[', '](https://example.com)', '链接文字')"
        >
          ↗
        </button>
        <button
          type="button"
          title="图片"
          @click="insert('![', '](https://example.com/image.png)', '图片说明')"
        >
          ▧
        </button>
      </div>
      <textarea
        :id="textareaId"
        ref="textareaRef"
        class="md-editor__textarea"
        :value="modelValue"
        :placeholder="placeholder"
        :style="{ minHeight }"
        spellcheck="false"
        @input="update(($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <div v-else class="md-editor__preview" :style="{ minHeight }">
      <div v-if="modelValue.trim()" class="markdown-body" v-html="renderMarkdown(modelValue)" />
      <p v-else class="md-editor__empty">还没有内容。切回编辑模式开始写吧。</p>
    </div>
  </div>
</template>

<style scoped>
.md-editor {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-solid);
}

.md-editor__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 11px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-alt);
}

.md-editor__tabs {
  display: flex;
  gap: 3px;
}

.md-editor__tab {
  padding: 5px 12px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 600;
}

.md-editor__tab.is-active {
  background: var(--surface-solid);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.md-editor__count {
  color: var(--muted);
  font-size: 0.56rem;
  letter-spacing: 0.05em;
}

.md-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 7px 9px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-solid);
}

.md-editor__toolbar button {
  display: inline-flex;
  width: 30px;
  height: 29px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.69rem;
  font-weight: 600;
}

.md-editor__toolbar button:hover {
  background: rgba(var(--brand-rgb), 0.11);
  color: var(--brand-deep);
}

:root[data-theme='dark'] .md-editor__toolbar button:hover {
  color: var(--brand);
}

.md-editor__textarea {
  display: block;
  width: 100%;
  padding: 18px;
  border: 0;
  outline: none;
  background: var(--surface-solid);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.8;
  resize: vertical;
}

.md-editor__textarea::placeholder {
  color: var(--muted);
}

.md-editor__preview {
  overflow: auto;
  padding: 22px;
}

.md-editor__empty {
  color: var(--muted);
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .md-editor__textarea {
    padding: 14px;
    font-size: 0.8rem;
  }

  .md-editor__preview {
    padding: 16px;
  }
}
</style>
