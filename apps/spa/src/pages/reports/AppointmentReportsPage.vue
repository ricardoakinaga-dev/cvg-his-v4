<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Agenda"
      :breadcrumbs="['Relatórios', 'Agenda', 'Relatórios de Agenda']"
      subtitle="Entrada para auditoria de agenda, ocupação operacional e compromissos"
    />

    <DsAlert variant="info">
      A visão de auditoria de agendamentos já está disponível em Relatórios de Auditorias. Indicadores
      operacionais de agenda devem usar os dados do módulo Agenda, sem duplicar cadastros.
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
