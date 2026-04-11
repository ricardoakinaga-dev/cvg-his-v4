<template>
  <div class="placeholder-page">
    <EmptyState
      :icon="icon"
      :title="title"
      description="Este módulo ainda nao foi disponibilizado no SPA oficial. Volte ao painel para seguir com os fluxos premium ja liberados."
    >
      <template #action>
        <DsButton tag="a" href="/" variant="secondary">
          Voltar ao dashboard →
        </DsButton>
      </template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import EmptyState from '@/components/EmptyState.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const route = useRoute();

const icon = computed(() => (route.meta.icon as string) || '📄');
const title = computed(() => (route.meta.title as string) || 'Pagina em construcao');
</script>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>
