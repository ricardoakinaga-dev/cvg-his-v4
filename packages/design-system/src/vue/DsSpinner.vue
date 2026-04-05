<template>
  <span v-if="hasText" class="ds-spinner-wrapper" :class="{ 'ds-spinner-wrapper--inline': inline }" role="status" aria-live="polite">
    <span :class="spinnerClasses" aria-hidden="true"></span>
    <span class="ds-spinner-text">
      <slot>{{ label }}</slot>
    </span>
  </span>
  <span v-else :class="spinnerClasses" role="status" :aria-label="ariaLabel"></span>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

export interface DsSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
  ariaLabel?: string;
  label?: string;
}

const props = withDefaults(defineProps<DsSpinnerProps>(), {
  size: 'md',
  inline: false,
  ariaLabel: 'Carregando...'
});

const slots = useSlots();

const hasText = computed(() => !!props.label || !!slots.default);

const spinnerClasses = computed(() => [
  'ds-spinner',
  `ds-spinner--${props.size}`,
  { 'ds-spinner--inline': props.inline && !hasText.value }
]);
</script>

<style scoped>
.ds-spinner-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ds-spinner-wrapper--inline {
  vertical-align: middle;
}

.ds-spinner-text {
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
  user-select: none;
}

.ds-spinner {
  display: inline-block;
  border: 2px solid var(--color-neutral-200, #e2e8f0);
  border-top-color: var(--color-primary-600, #2563eb);
  border-radius: 50%;
  animation: ds-spin 0.8s linear infinite;
  flex-shrink: 0;
}

.ds-spinner--sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.ds-spinner--md {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

.ds-spinner--lg {
  width: 36px;
  height: 36px;
  border-width: 3px;
}

.ds-spinner--inline {
  vertical-align: middle;
}

@keyframes ds-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
