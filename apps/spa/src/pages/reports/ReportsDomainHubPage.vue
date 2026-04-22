<template>
  <div class="reports-domain-page">
    <AppPageHeader
      title="Relatórios por Domínio"
      :breadcrumbs="['Relatórios', 'Visão por Domínio']"
      subtitle="Entrada estruturada para os blocos analíticos de financeiro, agenda, atendimento, cadastros e estoque"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/administrative-reports">Hub executivo</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Esta landing page inaugura a decomposição de <strong>Relatórios</strong> por macrodomínio. O hub executivo
      continua disponível, mas agora existe uma navegação explícita por área operacional.
    </DsAlert>

    <section class="reports-grid">
      <DsCard v-for="domain in domains" :key="domain.title" :title="domain.title" variant="elevated">
        <p class="reports-grid__description">{{ domain.description }}</p>
        <div class="reports-grid__actions">
          <DsButton variant="primary" tag="a" :to="domain.to">Abrir</DsButton>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const domains = [
  {
    title: 'Relatórios Financeiros',
    description: 'Recebíveis, cobrança, caixa e leitura consolidada do backoffice financeiro.',
    to: '/reports/financial'
  },
  {
    title: 'Relatórios de Agenda',
    description: 'Capacidade, ocupação, confirmação e visão tática dos compromissos.',
    to: '/reports/appointments'
  },
  {
    title: 'Relatórios de Atendimento',
    description: 'Triagem, atendimentos, produtividade assistencial e episódios clínicos.',
    to: '/reports/encounters'
  },
  {
    title: 'Relatórios de Cadastros',
    description: 'Pacientes, tutores, serviços e qualidade da base cadastral.',
    to: '/reports/registers'
  },
  {
    title: 'Relatórios de Estoque',
    description: 'Movimentações, validade, consumo, catálogo e cobertura de itens.',
    to: '/reports/inventory'
  },
  {
    title: 'Relatórios de Produção',
    description: 'Leitura inicial de produção assistencial, produtividade por profissional e visão executiva.',
    to: '/reports/production'
  }
];
</script>

<style scoped>
.reports-domain-page {
  display: grid;
  gap: 16px;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.reports-grid__description {
  margin: 0 0 14px;
  color: #64748b;
  font-size: 14px;
}

.reports-grid__actions {
  display: flex;
}
</style>
