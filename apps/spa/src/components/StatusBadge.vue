<template>
  <DsBadge :variant="badgeVariant" :size="size" :aria-label="label">
    <span v-if="icon" class="status-badge__icon">{{ icon }}</span>
    {{ label }}
  </DsBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';

interface Props {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  icon?: string;
  customColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  icon: undefined,
  customColor: undefined
});

const badgeVariant = computed(() => {
  if (props.customColor) return 'default';
  if (props.variant === 'neutral') return 'default';
  return props.variant;
});
</script>

<style scoped>
.status-badge__icon {
  font-size: 0.85em;
}
</style>
