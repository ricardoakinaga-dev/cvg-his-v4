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
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1, 0.25rem);
  min-height: 24px;
  padding: 0.25rem 0.625rem;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.01em;
  border-radius: var(--radius-full, 9999px);
  white-space: nowrap;
  line-height: 1.25;
  border: 1px solid transparent;
}

.ds-badge--sm {
  min-height: 24px;
  padding: 0.25rem 0.625rem;
  font-size: var(--font-size-xs, 0.75rem);
}

.ds-badge--md {
  min-height: 28px;
  padding: 0.3125rem 0.75rem;
  font-size: var(--font-size-sm, 0.8125rem);
}

.ds-badge--default {
  background: var(--color-neutral-100, #e7eeeb);
  color: var(--color-neutral-800, #1c3142);
  border-color: var(--color-neutral-200, #d5e1df);
}

.ds-badge--success {
  background: var(--color-success-bg, #e8f8f0);
  color: var(--color-success-text, #0e4939);
  border-color: var(--color-success-border, #98dec0);
}

.ds-badge--warning {
  background: var(--color-warning-bg, #fff8e8);
  color: var(--color-warning-text, #5c361b);
  border-color: var(--color-warning-border, #fbdc7a);
}

.ds-badge--danger {
  background: var(--color-danger-bg, #fff0ed);
  color: var(--color-danger-text, #823037);
  border-color: var(--color-danger-border, #fbb7ae);
}

.ds-badge--info {
  background: var(--color-info-bg, #e9f7fb);
  color: var(--color-info-text, #0c4155);
  border-color: var(--color-info-border, #9bd9e5);
}

.ds-badge--dot::before {
  content: '';
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 auto;
}
</style>
