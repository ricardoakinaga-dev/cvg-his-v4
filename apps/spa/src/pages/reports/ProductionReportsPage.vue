<template>
  <div class="reports-page">
    <AppPageHeader
      title="Relatórios de Produção"
      :breadcrumbs="['Relatórios', 'Produção', 'Relatórios de Produção']"
      subtitle="Primeira materialização honesta de um domínio que aparece indisponível no shell Vetus observado"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/administrative-reports">Abrir hub executivo</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      O benchmark Vetus evidencia <strong>Relatórios de Produção</strong> como uma rota prevista, porém majoritariamente indisponível
      na camada shell observada. Esta entrega materializa uma superfície inicial honesta para o domínio, sem fingir cobertura analítica completa.
    </DsAlert>

    <section class="reports-kpis">
      <DsStatCard :label="`${productionViews.length} visão(ões)`" value="" icon="🏭" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="" icon="🩺" />
      <DsStatCard :label="`${executiveCount} executiva(s)`" value="" icon="📈" />
    </section>

    <DsCard title="Leituras iniciais do domínio de produção">
      <div class="reports-grid">
        <article v-for="view in productionViews" :key="view.title" class="reports-card">
          <div class="reports-card__head">
            <strong>{{ view.title }}</strong>
            <span class="reports-card__badge">{{ view.scope }}</span>
          </div>
          <p class="reports-card__meta">Indicadores: {{ view.metrics }}</p>
          <p class="reports-card__hint">{{ view.description }}</p>
        </article>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const productionViews = ref([
  {
    title: 'Produção Assistencial',
    scope: 'Operacional',
    metrics: 'atendimentos, procedimentos, produtividade por turno',
    description: 'Primeira leitura para acompanhar volume assistencial entregue por frente clínica e janela operacional.'
  },
  {
    title: 'Produção por Profissional',
    scope: 'Operacional',
    metrics: 'consultas, ticket, conversão e repasse',
    description: 'Base futura para leitura de performance por profissional, conexão com comissões e agenda executada.'
  },
  {
    title: 'Produção Executiva',
    scope: 'Executivo',
    metrics: 'mix de receita, giro produtivo e capacidade instalada',
    description: 'Visão agregada para lideranças relacionarem produção com financeiro, ocupação e backoffice.'
  }
]);

const operationalCount = computed(() => productionViews.value.filter((item) => item.scope === 'Operacional').length);
const executiveCount = computed(() => productionViews.value.filter((item) => item.scope === 'Executivo').length);
</script>

<style scoped>
.reports-page {
  display: grid;
  gap: 16px;
}

.reports-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.reports-card {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 14px;
  background: var(--color-surface, #fff);
}

.reports-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.reports-card__badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #ede9fe;
  color: #6d28d9;
}

.reports-card__meta {
  margin: 10px 0 6px;
  font-size: 13px;
  color: #475569;
}

.reports-card__hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}
</style>
