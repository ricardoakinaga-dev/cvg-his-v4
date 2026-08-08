<template>
  <component
    :is="resolvedTag"
    :class="classes"
    :href="resolvedTag === 'a' ? href : undefined"
    :aria-label="ariaLabel"
    :tabindex="interactive ? 0 : undefined"
    @click="interactive ? $emit('click') : undefined"
    @keydown="handleKeydown"
  >
    <div v-if="$slots.header || title" class="ds-card__header">
      <slot name="header">
        <h3 v-if="title" class="ds-card__title">{{ title }}</h3>
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
  ariaLabel?: string;
  href?: string;
}

const props = withDefaults(defineProps<DsCardProps>(), {
  variant: 'default',
  interactive: false,
  tag: 'div',
  title: undefined,
  ariaLabel: undefined,
  href: undefined
});

const emit = defineEmits<{
  click: [];
}>();

function handleKeydown(event: KeyboardEvent) {
  if (!props.interactive || event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;

  if (event.key === ' ') event.preventDefault();
  emit('click');
}

const resolvedTag = computed(() => {
  if (props.interactive && props.tag === 'div') return 'button';
  return props.tag;
});

const classes = computed(() => [
  'ds-card',
  `ds-card--${props.variant}`,
  { 'ds-card--interactive': props.interactive }
]);
</script>

<style scoped>
.ds-card {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-lg, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}

.ds-card--elevated {
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  border: none;
}

.ds-card--outlined {
  border-width: 2px;
}

.ds-card--compact .ds-card__body {
  padding: 12px;
}

.ds-card--interactive {
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.ds-card--interactive:hover {
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  border-color: var(--color-primary-300, #93c5fd);
}

.ds-card--interactive:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
  border-color: var(--color-primary-400, #60a5fa);
}

.ds-card__header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.ds-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-card__body {
  padding: 16px;
}

.ds-card__footer {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #f8fafc);
}
</style>
