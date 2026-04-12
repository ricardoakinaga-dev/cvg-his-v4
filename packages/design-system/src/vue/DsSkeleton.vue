<template>
  <div
    class="ds-skeleton"
    :class="[`ds-skeleton--${variant}`, { 'ds-skeleton--animate': animate }]"
    :style="style"
    :aria-label="ariaLabel"
    role="status"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DsSkeletonProps {
  variant?: 'text' | 'heading' | 'avatar' | 'button' | 'card' | 'table-row' | 'table-cell';
  width?: string;
  height?: string;
  animate?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<DsSkeletonProps>(), {
  variant: 'text',
  width: undefined,
  height: undefined,
  animate: true,
  ariaLabel: 'Carregando...'
});

const variantHeights: Record<NonNullable<DsSkeletonProps['variant']>, string> = {
  text: '16px',
  heading: '24px',
  avatar: '40px',
  button: '44px',
  card: '120px',
  'table-row': '48px',
  'table-cell': '20px'
};

const variantWidths: Record<NonNullable<DsSkeletonProps['variant']>, string> = {
  text: '100%',
  heading: '60%',
  avatar: '40px',
  button: '120px',
  card: '100%',
  'table-row': '100%',
  'table-cell': '100%'
};

const style = computed(() => ({
  width: props.width ?? variantWidths[props.variant],
  height: props.height ?? variantHeights[props.variant]
}));
</script>

<style scoped>
.ds-skeleton {
  background: var(--color-skeleton, linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%));
  border-radius: 8px;
  background-size: 200% 100%;
}

.ds-skeleton--animate {
  animation: ds-skeleton-shimmer 1.5s ease-in-out infinite;
}

.ds-skeleton--avatar {
  border-radius: 50%;
}

.ds-skeleton--card {
  border: 1px solid var(--color-border, #e2e8f0);
}

@keyframes ds-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@keyframes ds-skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ds-skeleton--animate {
    animation: none;
    background-position: 50% 0;
  }
}
</style>
