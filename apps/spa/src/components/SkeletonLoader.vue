<template>
  <div
    class="skeleton-loader"
    :class="[`skeleton-loader--${variant}`, { 'skeleton-loader--animate': animate }]"
    :style="style"
    :aria-label="ariaLabel"
    role="status"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'text' | 'heading' | 'avatar' | 'button' | 'card' | 'table-row' | 'table-cell';
  width?: string;
  height?: string;
  animate?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  width: undefined,
  height: undefined,
  animate: true,
  ariaLabel: 'Carregando...'
});

const variantHeights: Record<string, string> = {
  text: '16px',
  heading: '24px',
  avatar: '40px',
  button: '44px',
  card: '120px',
  'table-row': '48px',
  'table-cell': '20px'
};

const variantWidths: Record<string, string> = {
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
.skeleton-loader {
  background: var(--color-skeleton, linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%));
  border-radius: 6px;
  background-size: 200% 100%;
}

.skeleton-loader--animate {
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-loader--avatar {
  border-radius: 50%;
}

.skeleton-loader--card {
  border: 1px solid var(--color-border, #e2e8f0);
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
