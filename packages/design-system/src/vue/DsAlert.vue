<template>
  <div :class="classes" role="alert" :aria-live="variant === 'danger' ? 'assertive' : 'polite'">
    <span v-if="$slots.icon || icon" class="ds-alert__icon" aria-hidden="true">
      <slot name="icon">{{ icon }}</slot>
    </span>
    <div class="ds-alert__content">
      <p v-if="title" class="ds-alert__title">{{ title }}</p>
      <div class="ds-alert__message">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      class="ds-alert__dismiss"
      type="button"
      @click="$emit('dismiss')"
      aria-label="Fechar alerta"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DsAlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  icon?: string;
  dismissible?: boolean;
}

const props = withDefaults(defineProps<DsAlertProps>(), {
  variant: 'info',
  title: undefined,
  icon: undefined,
  dismissible: false
});

defineEmits<{
  dismiss: [];
}>();

const classes = computed(() => ['ds-alert', `ds-alert--${props.variant}`]);
</script>

<style scoped>
.ds-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md, 6px);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  font-size: 14px;
  line-height: 1.5;
}

.ds-alert--info {
  background: var(--color-info-50, #eff6ff);
  color: var(--color-info-800, #1e40af);
  border: 1px solid var(--color-info-200, #bfdbfe);
}

.ds-alert--success {
  background: var(--color-success-50, #f0fdf4);
  color: var(--color-success-800, #166534);
  border: 1px solid var(--color-success-200, #bbf7d0);
}

.ds-alert--warning {
  background: var(--color-warning-50, #fffbeb);
  color: var(--color-warning-800, #92400e);
  border: 1px solid var(--color-warning-200, #fde68a);
}

.ds-alert--danger {
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-800, #991b1b);
  border: 1px solid var(--color-danger-200, #fecaca);
}

.ds-alert__icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.ds-alert__content {
  flex: 1;
  min-width: 0;
}

.ds-alert__title {
  margin: 0 0 4px;
  font-weight: 600;
  font-size: 14px;
}

.ds-alert__message {
  margin: 0;
}

.ds-alert__dismiss {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: currentColor;
  opacity: 0.6;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
}

.ds-alert__dismiss:hover {
  opacity: 1;
}

/* Dark mode support follows the explicit application theme. */
:global(:root[data-theme='dark'] .ds-alert--info) {
    background: var(--color-info-900, #1e3a8a);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-info-700, #1d4ed8);
}

:global(:root[data-theme='dark'] .ds-alert--success) {
    background: var(--color-success-900, #14532d);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-success-700, #047857);
}

:global(:root[data-theme='dark'] .ds-alert--warning) {
    background: var(--color-warning-900, #78350f);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-warning-700, #b45309);
}

:global(:root[data-theme='dark'] .ds-alert--danger) {
    background: var(--color-danger-900, #7f1d1d);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-danger-700, #b91c1c);
}

/* Keep a system fallback for markup rendered before the theme bootstrap. */
@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme='light']) .ds-alert--info) {
    background: var(--color-info-900, #1e3a8a);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-info-700, #1d4ed8);
  }

  :global(:root:not([data-theme='light']) .ds-alert--success) {
    background: var(--color-success-900, #14532d);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-success-700, #047857);
  }

  :global(:root:not([data-theme='light']) .ds-alert--warning) {
    background: var(--color-warning-900, #78350f);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-warning-700, #b45309);
  }

  :global(:root:not([data-theme='light']) .ds-alert--danger) {
    background: var(--color-danger-900, #7f1d1d);
    color: var(--color-text, #e7eef8);
    border-color: var(--color-danger-700, #b91c1c);
  }
}
</style>
