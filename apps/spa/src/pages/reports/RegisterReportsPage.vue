<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Cadastros"
      :breadcrumbs="['Relatórios', 'Cadastros', 'Relatórios de Cadastros']"
      subtitle="Primeira camada de leitura analítica de pacientes, tutores, serviços e base mestre"
    />

    <DsAlert variant="info">
      Estrutura inicial do domínio Cadastros. Próxima onda pode acoplar qualidade da base e cobertura cadastral.
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
