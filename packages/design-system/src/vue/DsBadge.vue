<template>
  <span :class="classes" :aria-label="ariaLabel">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DsBadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<DsBadgeProps>(), {
  variant: 'default',
  size: 'sm',
  dot: false,
  ariaLabel: undefined
});

const classes = computed(() => [
  'ds-badge',
  `ds-badge--${props.variant}`,
  `ds-badge--${props.size}`,
  { 'ds-badge--dot': props.dot }
]);
</script>

<style scoped>
.ds-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  font-weight: 500;
  border-radius: var(--radius-full, 9999px);
  white-space: nowrap;
  line-height: 1;
}

.ds-badge--sm {
  padding: 2px 8px;
  font-size: 11px;
}

.ds-badge--md {
  padding: 4px 12px;
  font-size: 12px;
}

.ds-badge--default {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-700, #334155);
}

.ds-badge--success {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.ds-badge--warning {
  background: var(--color-warning-100, #fef3c7);
  color: var(--color-warning-700, #b45309);
}

.ds-badge--danger {
  background: var(--color-danger-100, #fee2e2);
  color: var(--color-danger-700, #b91c1c);
}

.ds-badge--info {
  background: var(--color-info-100, #dbeafe);
  color: var(--color-info-700, #1d4ed8);
}

.ds-badge--dot::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
