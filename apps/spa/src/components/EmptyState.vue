<template>
  <div class="empty-state" :class="`empty-state--${size}`">
    <div class="empty-state__icon">{{ icon }}</div>
    <h3 class="empty-state__title">{{ title }}</h3>
    <p v-if="description" class="empty-state__desc">{{ description }}</p>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  size: 'md'
});
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.empty-state--sm {
  padding: 24px 16px;
}

.empty-state--lg {
  padding: 72px 32px;
}

.empty-state__icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.empty-state__title {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--color-text, #0f172a);
}

.empty-state__desc {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--color-text-muted, #94a3b8);
}
</style>
