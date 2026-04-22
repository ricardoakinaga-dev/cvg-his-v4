<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Agenda"
      :breadcrumbs="['Relatórios', 'Agenda', 'Relatórios de Agenda']"
      subtitle="Primeira camada de leitura analítica do domínio de agenda"
    />

    <DsAlert variant="info">
      Estrutura inicial do domínio Agenda. Próxima onda pode acoplar ocupação, no-show e capacidade.
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
