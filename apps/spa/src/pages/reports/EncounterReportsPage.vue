<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Atendimento"
      :breadcrumbs="['Relatórios', 'Atendimento', 'Relatórios de Atendimento']"
      subtitle="Entrada para relatórios de comandas, produção, agenda e atendimento por profissional"
    />

    <DsAlert variant="info">
      Os relatórios específicos de atendimento foram materializados como páginas operacionais, com dados
      conectados ao hub administrativo quando a fonte já existe e estados vazios explícitos quando a fonte
      analítica ainda precisa evoluir.
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
