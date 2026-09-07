<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Cadastros"
      :breadcrumbs="['Relatórios', 'Cadastros', 'Relatórios de Cadastros']"
      subtitle="Escolha a base que deseja consultar."
    />
    <ReportCategoryNavigation label="Relatórios de Cadastros" :groups="groups" />
  </div>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/AppPageHeader.vue';
import ReportCategoryNavigation from '@/components/reports/ReportCategoryNavigation.vue';

const groups = [
  {
    "title": "Cadastros",
    "items": [
      {
        "title": "Tutores",
        "description": "Consulta da base de tutores.",
        "to": "/reports/registers/owners"
      },
      {
        "title": "Pacientes",
        "description": "Consulta da base de pacientes.",
        "to": "/reports/registers/patients"
      },
      {
        "title": "Serviços",
        "description": "Consulta do catálogo de serviços.",
        "to": "/reports/registers/services"
      },
      {
        "title": "Fornecedores",
        "description": "Consulta da base de fornecedores.",
        "to": "/reports/registers/suppliers"
      }
    ]
  },
  {
    "title": "Histórico comercial",
    "items": [
      {
        "title": "Exclusão de Vendas e Comandas",
        "description": "Consulta de exclusões registradas.",
        "to": "/reports/deleted-sales-counter-sales"
      }
    ]
  }
];
</script>

<style scoped>
.reports-page { display: grid; gap: 24px; }
</style>
