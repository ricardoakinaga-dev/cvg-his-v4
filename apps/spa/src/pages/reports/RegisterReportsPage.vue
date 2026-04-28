<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Cadastros"
      :breadcrumbs="['Relatórios', 'Cadastros', 'Relatórios de Cadastros']"
      subtitle="Entrada para relatórios de serviços, clientes, animais, fornecedores e exclusões comerciais"
    />

    <DsAlert variant="info">
      As rotas de cadastros do menu Vetus estão disponíveis com navegação operacional e sem dados simulados.
      Métricas específicas entram quando os endpoints analíticos de cada cadastro forem expostos.
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
