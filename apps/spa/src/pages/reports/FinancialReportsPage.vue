<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios Financeiros"
      :breadcrumbs="['Relatórios', 'Financeiro', 'Relatórios Financeiros']"
      subtitle="Entrada financeira para fluxo de caixa, DRE, contas, cheques e pagamento antecipado"
    />

    <DsAlert variant="info">
      Use os relatórios financeiros específicos no menu lateral para consultar recebíveis, caixa, DRE,
      cheques e pagamentos. O hub executivo consolidado continua disponível em Hubs Administrativos.
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
