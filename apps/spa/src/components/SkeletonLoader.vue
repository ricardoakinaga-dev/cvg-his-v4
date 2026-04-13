<template>
  <DsSkeleton v-bind="props">
    <slot />
  </DsSkeleton>
</template>

<script setup lang="ts">
import DsSkeleton from '@cvg-his-v2/design-system/vue/DsSkeleton.vue';

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
</script>
