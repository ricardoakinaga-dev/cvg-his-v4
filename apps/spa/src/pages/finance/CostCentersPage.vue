<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Centros de Custo"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Centros de Custo']"
      subtitle="Estrutura inicial para rateio financeiro, visão gerencial e futura leitura por unidade operacional"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Novo Centro</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície inicial para <strong>Financeiro &gt; Cadastros &gt; Centros de Custo</strong>. Rateio automatizado,
      vínculo contábil e fechamento por competência ainda serão expandidos depois.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${costCenters.length} centro(s)`" value="" icon="📊" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="" icon="🏥" />
      <DsStatCard :label="`${administrativeCount} administrativo(s)`" value="" icon="🧾" />
    </section>

    <DsCard title="Mapa inicial de centros">
      <div class="catalog-grid">
        <article v-for="center in costCenters" :key="center.code" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ center.name }}</strong>
            <span class="catalog-item__badge">{{ center.kind }}</span>
          </div>
          <p class="catalog-item__meta">Código: {{ center.code }} · Responsável: {{ center.owner }}</p>
          <p class="catalog-item__hint">{{ center.description }}</p>
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

const costCenters = ref([
  {
    code: 'CLI-ATD',
    name: 'Atendimento Clínico',
    kind: 'Operacional',
    owner: 'Coordenação Assistencial',
    description: 'Receita e custo ligados a consultas, procedimentos e jornada ambulatorial.'
  },
  {
    code: 'ESTOQUE',
    name: 'Suprimentos e Estoque',
    kind: 'Administrativo',
    owner: 'Backoffice',
    description: 'Rateio de reposição, compras e consumo estrutural do hospital.'
  },
  {
    code: 'LAB-OP',
    name: 'Laboratório',
    kind: 'Operacional',
    owner: 'Coordenação Laboratorial',
    description: 'Estrutura inicial para separar leitura econômica do domínio laboratorial.'
  }
]);

const operationalCount = computed(() => costCenters.value.filter((item) => item.kind === 'Operacional').length);
const administrativeCount = computed(() => costCenters.value.filter((item) => item.kind === 'Administrativo').length);

function reload() {
  costCenters.value = [...costCenters.value];
}
</script>

<style scoped>
.finance-catalog-page {
  display: grid;
  gap: 16px;
}

.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.catalog-item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 14px;
  background: var(--color-surface, #fff);
}

.catalog-item__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.catalog-item__badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
}

.catalog-item__meta {
  margin: 10px 0 6px;
  font-size: 13px;
  color: #475569;
}

.catalog-item__hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}
</style>
