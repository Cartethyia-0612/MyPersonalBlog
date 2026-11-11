<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <header class="admin-page-header">
    <div>
      <p v-if="eyebrow" class="admin-page-header__eyebrow mono">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="admin-page-header__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.admin-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.admin-page-header__eyebrow {
  margin-bottom: 7px;
  color: var(--brand-deep);
  font-size: 0.58rem;
  letter-spacing: 0.13em;
}

:root[data-theme='dark'] .admin-page-header__eyebrow {
  color: var(--brand);
}

.admin-page-header h1 {
  font-size: clamp(1.55rem, 2.5vw, 2.1rem);
  letter-spacing: -0.03em;
}

.admin-page-header__desc {
  max-width: 620px;
  margin-top: 7px;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.7;
}

.admin-page-header__actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@media (max-width: 700px) {
  .admin-page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 13px;
  }
}
</style>
