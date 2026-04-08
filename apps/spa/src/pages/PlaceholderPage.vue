<template>
  <div class="placeholder-page">
    <EmptyState
      :icon="icon"
      :title="title"
      description="Este módulo está sendo migrado para a nova interface. Acesse a versão atual pelo sistema legado."
    >
      <template #action>
        <DsButton tag="a" :href="legacyUrl" variant="secondary" target="_blank">
          Abrir no sistema legado →
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
const title = computed(() => (route.meta.title as string) || 'Página');
const legacyUrl = computed(() => (route.path.startsWith('/') ? route.path : '/'));
</script>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>
