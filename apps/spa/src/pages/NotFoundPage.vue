<template>
  <div class="not-found-page">
    <EmptyState
      icon="🔍"
      title="Página não encontrada"
      description="A página que você procura não existe ou foi removida."
    >
      <template #action>
        <DsButton tag="a" to="/" variant="primary">Voltar ao Dashboard</DsButton>
      </template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
</script>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}
</style>
