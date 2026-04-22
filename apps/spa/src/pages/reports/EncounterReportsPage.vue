<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Atendimento"
      :breadcrumbs="['Relatórios', 'Atendimento', 'Relatórios de Atendimento']"
      subtitle="Primeira camada de leitura analítica da operação assistencial"
    />

    <DsAlert variant="info">
      Estrutura inicial do domínio Atendimento. Próxima onda pode acoplar triagem, throughput e produtividade clínica.
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
