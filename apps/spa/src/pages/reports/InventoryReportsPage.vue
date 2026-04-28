<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Estoque"
      :breadcrumbs="['Relatórios', 'Estoque', 'Relatórios de Estoque']"
      subtitle="Entrada para estoque, movimentações, entrada de NF e relatório de produtos"
    />

    <DsAlert variant="info">
      As rotas específicas de estoque foram materializadas com filtros, vínculo operacional e estados vazios
      honestos. A visão não inventa giro, validade ou consumo quando a fonte ainda não está disponível.
    </DsAlert>
  </div>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
</script>

<style scoped>
.reports-page { display: grid; gap: 16px; }
</style>
