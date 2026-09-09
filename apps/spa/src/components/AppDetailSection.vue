<template>
  <DsCard class="app-detail-section">
    <template #header v-if="title || $slots.title">
      <slot name="title">
        <h2 class="ds-card__title">{{ title }}</h2>
      </slot>
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
