<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Atendimento"
      :breadcrumbs="['Relatórios', 'Atendimento', 'Relatórios de Atendimento']"
      subtitle="Escolha a consulta para acompanhar a rotina assistencial."
    />
    <ReportCategoryNavigation label="Relatórios de Atendimento" :groups="groups" />
  </div>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/AppPageHeader.vue';
import ReportCategoryNavigation from '@/components/reports/ReportCategoryNavigation.vue';

const groups = [
  {
    "title": "Atendimento e produção",
    "items": [
      {
        "title": "Comandas e Vendas",
        "description": "Consulta de comandas e vendas.",
        "to": "/reports/sales"
      },
      {
        "title": "Produtos e Serviços Produzidos",
        "description": "Itens associados à produção.",
        "to": "/reports/produced-items"
      },
      {
        "title": "Atendimento por Profissional",
        "description": "Consulta por profissional.",
        "to": "/reports/professional-care"
      }
    ]
  },
  {
    "title": "Agenda",
    "items": [
      {
        "title": "Agenda",
        "description": "Consulta dos agendamentos.",
        "to": "/reports/appointments"
      }
    ]
  }
];
</script>

<style scoped>
.reports-page { display: grid; gap: 24px; }
</style>
