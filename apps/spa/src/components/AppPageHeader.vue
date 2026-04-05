<template>
  <div class="app-page-header">
    <div class="app-page-header__content">
      <h1 class="app-page-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <div v-if="subtitle || $slots.subtitle" class="app-page-header__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>
    </div>
    <div v-if="$slots.actions" class="app-page-header__actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.app-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
}

.app-page-header__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-page-header__subtitle {
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.app-page-header__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
