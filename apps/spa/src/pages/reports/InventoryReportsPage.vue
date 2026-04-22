<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Estoque"
      :breadcrumbs="['Relatórios', 'Estoque', 'Relatórios de Estoque']"
      subtitle="Primeira camada de leitura analítica do domínio de estoque e suprimentos"
    />

    <DsAlert variant="info">
      Estrutura inicial do domínio Estoque. Próxima onda pode acoplar cobertura, validade, giro e consumo.
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
