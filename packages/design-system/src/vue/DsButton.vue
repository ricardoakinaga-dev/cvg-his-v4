<template>
  <component
    :is="resolvedTag"
    :class="classes"
    :disabled="isDisabled"
    :type="resolvedTag === 'button' ? type : undefined"
    :href="resolvedTag === 'a' ? resolvedHref : undefined"
    :aria-label="ariaLabel"
    :aria-busy="loading"
    @click="onClick"
  >
    <span v-if="loading" class="ds-btn__spinner" aria-hidden="true" />
    <span v-if="$slots.icon || icon" class="ds-btn__icon">
      <slot name="icon">{{ icon }}</slot>
    </span>
    <span v-if="$slots.default" class="ds-btn__label">
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DsButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  tag?: 'button' | 'a';
  href?: string;
  to?: string;
  ariaLabel?: string;
  icon?: string;
}

const props = withDefaults(defineProps<DsButtonProps>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false,
  type: 'button',
  tag: 'button',
  href: undefined,
  to: undefined,
  ariaLabel: undefined,
  icon: undefined
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const resolvedTag = computed(() => {
  if (props.to) return 'a';
  return props.tag;
});

const resolvedHref = computed(() => {
  return props.to || props.href;
});

const isDisabled = computed(() => {
  return props.disabled || props.loading;
});

const classes = computed(() => [
  'ds-btn',
  `ds-btn--${props.variant}`,
  `ds-btn--${props.size}`,
  {
    'ds-btn--full-width': props.fullWidth,
    'ds-btn--loading': props.loading,
    'ds-btn--disabled': props.disabled
  }
]);

function onClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
}
</script>

<style scoped>
.ds-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  transition:
    background 0.15s ease,
    opacity 0.15s ease,
    box-shadow 0.15s ease;
  white-space: nowrap;
  user-select: none;
  text-decoration: none;
  line-height: 1;
}

.ds-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.ds-btn--sm {
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
}

.ds-btn--md {
  padding: 8px 16px;
  font-size: 14px;
  min-height: 40px;
}

.ds-btn--lg {
  padding: 12px 24px;
  font-size: 16px;
  min-height: 48px;
}

.ds-btn--primary {
  background: var(--color-primary-600, #2563eb);
  color: var(--color-neutral-0, #ffffff);
}

.ds-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-700, #1d4ed8);
}

.ds-btn--secondary {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-text, #0f172a);
  border-color: var(--color-border, #e2e8f0);
}

.ds-btn--secondary:hover:not(:disabled) {
  background: var(--color-neutral-200, #e2e8f0);
}

.ds-btn--ghost {
  background: transparent;
  color: var(--color-text-secondary, #475569);
}

.ds-btn--ghost:hover:not(:disabled) {
  background: var(--color-neutral-100, #f1f5f9);
}

.ds-btn--danger {
  background: var(--color-danger-600, #dc2626);
  color: var(--color-neutral-0, #ffffff);
}

.ds-btn--danger:hover:not(:disabled) {
  background: var(--color-danger-700, #b91c1c);
}

.ds-btn--success {
  background: var(--color-success-600, #16a34a);
  color: var(--color-neutral-0, #ffffff);
}

.ds-btn--success:hover:not(:disabled) {
  background: var(--color-success-700, #15803d);
}

.ds-btn:disabled,
.ds-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ds-btn--full-width {
  width: 100%;
}

.ds-btn__icon {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
}

.ds-btn__label {
  display: inline;
}

.ds-btn__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ds-spin 0.6s linear infinite;
}

@keyframes ds-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
