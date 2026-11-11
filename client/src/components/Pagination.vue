<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  totalPages: number
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

const pages = computed(() => {
  const total = Math.max(1, props.totalPages)
  const current = props.page
  const start = Math.max(1, Math.min(current - 2, total - 4))
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

function go(page: number): void {
  if (page < 1 || page > props.totalPages || page === props.page) return
  emit('change', page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="文章分页">
    <button
      type="button"
      class="pagination__button pagination__button--arrow"
      :disabled="page <= 1"
      aria-label="上一页"
      @click="go(page - 1)"
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
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span>上一页</span>
    </button>

    <div class="pagination__pages">
      <button
        v-for="item in pages"
        :key="item"
        type="button"
        class="pagination__button pagination__button--page"
        :class="{ 'is-current': item === page }"
        :aria-current="item === page ? 'page' : undefined"
        @click="go(item)"
      >
        {{ item }}
      </button>
    </div>

    <button
      type="button"
      class="pagination__button pagination__button--arrow"
      :disabled="page >= totalPages"
      aria-label="下一页"
      @click="go(page + 1)"
    >
      <span>下一页</span>
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
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 38px;
}

.pagination__buttons,
.pagination__pages {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination__button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  transition:
    color var(--duration-fast) ease,
    border-color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.pagination__button:hover:not(:disabled) {
  border-color: var(--border-strong);
  color: var(--text);
}

.pagination__button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.pagination__button--page {
  width: 36px;
  justify-content: center;
  padding-inline: 0;
}

.pagination__button--page.is-current {
  border-color: transparent;
  background: var(--brand);
  color: #041521;
  font-weight: 700;
}

.pagination__button--arrow span {
  font-size: 0.72rem;
}

@media (max-width: 560px) {
  .pagination {
    gap: 8px;
  }

  .pagination__button--arrow span {
    display: none;
  }

  .pagination__button--arrow {
    width: 36px;
    justify-content: center;
    padding-inline: 0;
  }

  .pagination__pages {
    gap: 4px;
  }

  .pagination__button--page {
    width: 32px;
    min-height: 32px;
  }
}
</style>
