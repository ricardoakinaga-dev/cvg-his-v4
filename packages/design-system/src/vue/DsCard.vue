<template>
  <component
    :is="resolvedTag"
    :class="classes"
    :href="resolvedTag === 'a' ? href : undefined"
    :type="resolvedTag === 'button' ? 'button' : undefined"
    :aria-label="ariaLabel"
    :role="interactive && !hasNativeAnchor && resolvedTag !== 'button' ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <div v-if="$slots.header || $slots.title || title" class="ds-card__header">
      <slot name="header">
        <slot name="title">
          <component v-if="title" :is="titleTag" class="ds-card__title">{{ title }}</component>
        </slot>
      </slot>
    </div>
    <div class="ds-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="ds-card__footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DsCardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'compact';
  interactive?: boolean;
  tag?: 'div' | 'article' | 'section' | 'a';
  title?: string;
  titleTag?: 'h2' | 'h3' | 'h4';
  ariaLabel?: string;
  href?: string;
}

const props = withDefaults(defineProps<DsCardProps>(), {
  variant: 'default',
  interactive: false,
  tag: 'div',
  title: undefined,
  titleTag: 'h3',
  ariaLabel: undefined,
  href: undefined
});

const emit = defineEmits<{
  click: [];
}>();

function handleClick() {
  if (props.interactive) emit('click');
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.interactive || event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;

  // Native buttons/links receive their own activation click. Preventing the
  // key's default keeps this explicit event from being dispatched twice.
  if (!hasNativeAnchor.value || event.key === ' ') event.preventDefault();
  if (hasNativeAnchor.value && event.key === 'Enter') return;
  emit('click');
}

const resolvedTag = computed(() => {
  if (props.interactive && props.tag === 'div') return 'button';
  return props.tag;
});

const hasNativeAnchor = computed(() => resolvedTag.value === 'a' && !!props.href);

const classes = computed(() => [
  'ds-card',
  `ds-card--${props.variant}`,
  { 'ds-card--interactive': props.interactive }
]);
</script>

<style scoped>
.ds-card {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-width: 0;
  color: var(--color-text, #142238);
  font: inherit;
  text-align: left;
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-xl, 1rem);
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
  transition:
    border-color var(--duration-fast, 150ms) var(--ease-default, ease),
    box-shadow var(--duration-fast, 150ms) var(--ease-default, ease),
    transform var(--duration-fast, 150ms) var(--ease-default, ease);
}

button.ds-card {
  appearance: none;
}

a.ds-card {
  text-decoration: none;
}

.ds-card--elevated {
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  border-color: transparent;
}

.ds-card--outlined {
  border-width: 2px;
}

.ds-card--compact .ds-card__body {
  padding: 12px;
}

.ds-card--interactive {
  cursor: pointer;
}

.ds-card--interactive:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(20, 34, 56, 0.1));
  border-color: var(--color-primary-300, #5bd2d9);
  transform: translateY(-1px);
}

.ds-card--interactive:active {
  transform: translateY(0);
}

.ds-card--interactive:focus {
  outline: none;
}

.ds-card--interactive:focus-visible {
  outline: 3px solid var(--color-focus-ring, #075f70);
  outline-offset: 2px;
  border-color: var(--color-primary-400, #27bdc8);
}

.ds-card__header {
  padding: 1rem 1.125rem 0.875rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.ds-card__title {
  margin: 0;
  color: var(--color-text, #142238);
  font-family: var(--font-family-display, ui-serif, Georgia, serif);
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: var(--letter-spacing-tight, -0.025em);
  line-height: var(--line-height-tight, 1.25);
  overflow-wrap: anywhere;
}

.ds-card__body {
  padding: 1.125rem;
}

.ds-card--compact .ds-card__header {
  padding: 0.75rem 0.875rem 0.625rem;
}

.ds-card__footer {
  padding: 0.75rem 1.125rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #eef4f1);
}

@media (prefers-reduced-motion: reduce) {
  .ds-card,
  .ds-card--interactive:hover,
  .ds-card--interactive:active {
    transition: none;
    transform: none;
  }
}
</style>
