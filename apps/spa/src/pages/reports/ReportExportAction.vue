<template>
  <DsButton
    variant="primary"
    :loading="props.loading"
    :disabled="props.disabled"
    @click="emit('export')"
  >
    {{ props.label }}
  </DsButton>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const props = defineProps<{
  label: string;
  loading: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (event: 'export'): void;
}>();
</script>
