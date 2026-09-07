<template>
  <component
    :is="resolvedTag"
    :class="classes"
    :disabled="isDisabled"
    :type="resolvedTag === 'button' ? type : undefined"
    :href="resolvedTag === 'a' && !isDisabled ? resolvedHref : undefined"
    :aria-label="resolvedAriaLabel"
    :aria-disabled="resolvedTag === 'a' && isDisabled ? 'true' : undefined"
    :tabindex="resolvedTag === 'a' && isDisabled ? -1 : undefined"
    :aria-busy="loading"
    @click="onClick"
    @auxclick="onAuxClick"
  >
    <span v-if="loading" class="ds-btn__spinner" aria-hidden="true" />
    <span v-if="$slots.icon || icon" class="ds-btn__icon" aria-hidden="true">
      <slot name="icon">
        <DsIcon :name="icon" size="sm" />
      </slot>
    </span>
    <span v-if="$slots.default" class="ds-btn__label">
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, useSlots } from 'vue';
import type { Router } from 'vue-router';
import DsIcon from './DsIcon.vue';

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

const slots = useSlots();
// Read the installed router through Vue's public app context instead of
// importing vue-router's runtime injection symbol. This keeps the design
// system usable in isolated mounts/storybooks and in tests with partial
// vue-router mocks, while retaining SPA navigation when a router is present.
const router = (getCurrentInstance()?.proxy as { $router?: Router } | null)?.$router;

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const resolvedTag = computed(() => {
  if (props.to || props.href) return 'a';
  return props.tag;
});

const isRouterDestination = computed(() =>
  Boolean(router && props.to && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(props.to))
);

const resolvedHref = computed(() => {
  if (isRouterDestination.value) return router!.resolve(props.to!).href;
  return props.to || props.href;
});

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  return !slots.default && props.icon ? props.icon : undefined;
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
  if (isDisabled.value) {
    event.preventDefault();
    return;
  }
  emit('click', event);

  const anchor = event.currentTarget as HTMLAnchorElement;
  const target = anchor.getAttribute('target');
  if (
    !isRouterDestination.value ||
    event.defaultPrevented ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0 ||
    anchor.hasAttribute('download') ||
    (target && target.toLowerCase() !== '_self')
  )
    return;

  event.preventDefault();
  return router!.push(props.to!);
}

function onAuxClick(event: MouseEvent) {
  if (isDisabled.value) event.preventDefault();
}
</script>

<style scoped>
.ds-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2, 0.5rem);
  min-width: var(--touch-min, 44px);
  min-height: var(--touch-min, 44px);
  padding: 0.625rem 1rem;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-size: var(--font-size-sm, 0.8125rem);
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 0.5rem);
  cursor: pointer;
  transition:
    background-color var(--duration-fast, 150ms) var(--ease-default, ease),
    border-color var(--duration-fast, 150ms) var(--ease-default, ease),
    box-shadow var(--duration-fast, 150ms) var(--ease-default, ease),
    transform var(--duration-fast, 150ms) var(--ease-default, ease),
    opacity var(--duration-fast, 150ms) var(--ease-default, ease);
  white-space: nowrap;
  user-select: none;
  text-decoration: none;
  line-height: 1.2;
}

.ds-btn:hover:not(:disabled):not(.ds-btn--loading) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(20, 34, 56, 0.07));
}

.ds-btn:active:not(:disabled):not(.ds-btn--loading) {
  transform: translateY(0);
}

.ds-btn:focus {
  outline: none;
}

.ds-btn:focus-visible {
  outline: 3px solid var(--color-focus-ring, #075f70);
  outline-offset: 2px;
}

.ds-btn--sm {
  padding: 0.5rem 0.75rem;
  font-size: var(--font-size-xs, 0.75rem);
  min-height: var(--touch-min, 44px);
}

.ds-btn--md {
  padding: 0.625rem 1rem;
  font-size: var(--font-size-sm, 0.8125rem);
  min-height: var(--touch-min, 44px);
}

.ds-btn--lg {
  padding: 0.75rem 1.25rem;
  font-size: var(--font-size-base, 0.9375rem);
  min-height: 52px;
}

.ds-btn--primary {
  background: var(--color-primary-600, #2563eb);
  color: var(--color-text-inverse, #ffffff);
  border-color: var(--color-primary-600, #2563eb);
}

.ds-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-700, #1d4ed8);
  border-color: var(--color-primary-700, #1d4ed8);
}

.ds-btn--secondary {
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #142238);
  border-color: var(--color-border-strong, #b8cac7);
}

.ds-btn--secondary:hover:not(:disabled) {
  background: var(--color-surface-hover, #f8fafc);
  border-color: var(--color-primary-300, #5bd2d9);
}

.ds-btn--ghost {
  background: transparent;
  color: var(--color-text-secondary, #475b6d);
  border-color: transparent;
}

.ds-btn--ghost:hover:not(:disabled) {
  background: var(--color-primary-subtle, #e0f7f7);
  color: var(--color-text, #142238);
}

.ds-btn--danger {
  background: var(--color-danger-600, #dc2626);
  color: var(--color-text-inverse, #ffffff);
  border-color: var(--color-danger-600, #dc2626);
}

.ds-btn--danger:hover:not(:disabled) {
  background: var(--color-danger-700, #b91c1c);
  border-color: var(--color-danger-700, #b91c1c);
}

.ds-btn--success {
  background: var(--color-success-600, #17775a);
  color: var(--color-text-inverse, #ffffff);
  border-color: var(--color-success-600, #17775a);
}

.ds-btn--success:hover:not(:disabled) {
  background: var(--color-success-700, #125c47);
  border-color: var(--color-success-700, #125c47);
}

.ds-btn:disabled,
.ds-btn--disabled,
.ds-btn--loading {
  opacity: 0.58;
  cursor: not-allowed;
}

.ds-btn--loading {
  cursor: wait;
}

.ds-btn--full-width {
  width: 100%;
}

.ds-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  font-size: 1rem;
  line-height: 1;
  flex: 0 0 auto;
}

.ds-btn__label {
  display: inline;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ds-btn__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ds-spin var(--duration-normal, 250ms) linear infinite;
  flex: 0 0 auto;
}

@keyframes ds-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ds-btn,
  .ds-btn:hover,
  .ds-btn:active {
    transition: none;
    transform: none;
  }

  .ds-btn__spinner {
    animation: none;
  }
}
</style>
