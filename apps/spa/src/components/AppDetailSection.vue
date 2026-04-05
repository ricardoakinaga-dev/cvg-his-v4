<template>
  <DsCard class="app-detail-section" :title="title">
    <template #title v-if="$slots.title">
      <slot name="title"></slot>
    </template>

    <div class="app-detail-section__content">
      <slot></slot>
    </div>
  </DsCard>
</template>

<script setup lang="ts">
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

defineProps<{
  title?: string;
}>();
</script>

<style scoped>
.app-detail-section {
  width: 100%;
}
.app-detail-section__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
