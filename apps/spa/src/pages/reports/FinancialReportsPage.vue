<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios Financeiros"
      :breadcrumbs="['Relatórios', 'Financeiro', 'Relatórios Financeiros']"
      subtitle="Primeira camada de leitura analítica do domínio financeiro"
    />

    <DsAlert variant="info">
      Estrutura inicial do domínio financeiro. A próxima iteração pode acoplar dados reais do hub executivo.
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
