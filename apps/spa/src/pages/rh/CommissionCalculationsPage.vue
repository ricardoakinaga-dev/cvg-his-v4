<template>
  <div class="rh-catalog-page">
    <AppPageHeader
      title="Cálculo de Comissões"
      :breadcrumbs="['RH', 'Comissões', 'Cálculo de Comissões']"
      subtitle="Painel inicial de leitura de repasses por período, equipe e produção"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Gerar Cálculo</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Estrutura inicial para materializar a trilha de <strong>RH &gt; Comissões</strong>. Fechamento por período,
      auditoria e aprovação ainda entram em próximas ondas.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${calculations.length} cálculo(s)`" value="" icon="🧮" />
      <DsStatCard :label="`${pendingCount} pendente(s)`" value="" icon="⏳" />
      <DsStatCard :label="totalLabel" value="" icon="💰" />
    </section>

    <DsCard title="Ciclos já mapeados">
      <div class="catalog-grid">
        <article v-for="item in calculations" :key="item.period" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ item.period }}</strong>
            <span class="catalog-item__badge" :class="{ 'catalog-item__badge--active': item.status === 'Fechado' }">
              {{ item.status }}
            </span>
          </div>
          <p class="catalog-item__meta">Equipe: {{ item.team }} · Itens: {{ item.entries }}</p>
          <p class="catalog-item__hint">Total apurado: {{ item.total }}</p>
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

const calculations = ref([
  { period: '2026-03', team: 'Clínica', entries: 42, total: 'R$ 12.480,00', status: 'Fechado' },
  { period: '2026-04', team: 'Laboratório', entries: 18, total: 'R$ 4.230,00', status: 'Em apuração' },
  { period: '2026-04', team: 'Comercial', entries: 11, total: 'R$ 2.140,00', status: 'Pendente' }
]);

const pendingCount = computed(() => calculations.value.filter((item) => item.status !== 'Fechado').length);
const totalLabel = computed(() => 'R$ 18.850,00 mapeados');

function reload() {
  calculations.value = [...calculations.value];
}
</script>

<style scoped>
.rh-catalog-page {
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
  background: #fef3c7;
  color: #92400e;
}
.catalog-item__badge--active {
  background: #dcfce7;
  color: #15803d;
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
