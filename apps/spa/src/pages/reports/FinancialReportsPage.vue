<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios Financeiros"
      :breadcrumbs="['Relatórios', 'Financeiro', 'Relatórios Financeiros']"
      subtitle="Escolha a consulta para acompanhar contas e resultados."
    />
    <ReportCategoryNavigation label="Relatórios Financeiros" :groups="groups" />
  </div>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/AppPageHeader.vue';
import ReportCategoryNavigation from '@/components/reports/ReportCategoryNavigation.vue';

const groups = [
  {
    "title": "Contas",
    "items": [
      {
        "title": "Contas a Receber",
        "description": "Valores pendentes de recebimento.",
        "to": "/reports/accounts-receivable"
      },
      {
        "title": "Contas Recebidas",
        "description": "Recebimentos registrados.",
        "to": "/reports/received-accounts"
      },
      {
        "title": "Contas a Pagar",
        "description": "Obrigações e situações registradas.",
        "to": "/reports/accounts-payable"
      },
      {
        "title": "Contas Pagas",
        "description": "Pagamentos registrados.",
        "to": "/reports/paid-accounts"
      }
    ]
  },
  {
    "title": "Caixa e resultados",
    "items": [
      {
        "title": "Fluxo de Caixa",
        "description": "Indicadores de entradas, recebíveis e caixa.",
        "to": "/reports/financial"
      },
      {
        "title": "DRE",
        "description": "Fonte contábil ainda indisponível.",
        "to": "/reports/dre"
      },
      {
        "title": "Gaveta",
        "description": "Gavetas e saldos registrados.",
        "to": "/reports/cash-drawer"
      }
    ]
  },
  {
    "title": "Outras consultas",
    "items": [
      {
        "title": "Cheques",
        "description": "Consulta de cheques.",
        "to": "/reports/cheques"
      },
      {
        "title": "Pagamento Antecipado",
        "description": "Consulta de adiantamentos.",
        "to": "/reports/advance-payments"
      },
      {
        "title": "Pacotes",
        "description": "Consulta de pacotes.",
        "to": "/reports/packages"
      }
    ]
  }
];
</script>

<style scoped>
.reports-page { display: grid; gap: 24px; }
</style>
