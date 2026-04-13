<template>
  <div class="fiscal-pis-cofins-page">
    <AppPageHeader title="PIS / COFINS" subtitle="Consulta de alíquotas por regime tributário e aplicação operacional">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      Tabela publicada apenas para conferência. Parametrização contábil e edição fiscal seguem fora
      da superfície disponível no backend.
    </DsAlert>

    <section class="filter-bar">
      <DsInput v-model="regime" type="select" label="Regime">
        <option value="">Todos</option>
        <option value="simples_nacional">Simples Nacional</option>
        <option value="lucro_presumido">Lucro Presumido</option>
        <option value="lucro_real">Lucro Real</option>
      </DsInput>
      <DsInput v-model="appliesTo" type="select" label="Aplicação">
        <option value="">Todas</option>
        <option value="ambos">Ambos</option>
        <option value="mercadoria">Mercadoria</option>
        <option value="servico">Serviço</option>
      </DsInput>
      <div class="filter-actions">
        <DsButton variant="secondary" @click="load">Aplicar filtros</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>

    <section class="hub-kpis">
      <DsStatCard :label="`${rules.length} regime(ns)`" value="" icon="📈" />
      <DsStatCard :label="highestCombinedRate" value="" icon="🧮" />
    </section>

    <DataTable
      :columns="columns"
      :rows="rules"
      :loading="loading"
      empty-icon="📈"
      empty-title="Nenhuma regra de PIS/COFINS encontrada"
      empty-description="As regras serão exibidas quando a parametrização fiscal estiver disponível."
      variant="hoverable"
    >
      <template #cell-regime="{ row }">
        {{ formatRegime((row as FiscalPisCofinsRule).regime) }}
      </template>
      <template #cell-appliesTo="{ row }">
        {{ formatAppliesTo((row as FiscalPisCofinsRule).appliesTo) }}
      </template>
      <template #cell-pisRate="{ row }">
        {{ formatRate((row as FiscalPisCofinsRule).pisRate) }}
      </template>
      <template #cell-cofinsRate="{ row }">
        {{ formatRate((row as FiscalPisCofinsRule).cofinsRate) }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { fiscalService, type FiscalPisCofinsRule } from '@/services/fiscal';

const rules = ref<FiscalPisCofinsRule[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'regime', label: 'Regime' },
  { key: 'appliesTo', label: 'Aplicação' },
  { key: 'pisRate', label: 'PIS' },
  { key: 'cofinsRate', label: 'COFINS' },
  { key: 'notes', label: 'Observações' }
];

const highestCombinedRate = computed(() => {
  if (rules.value.length === 0) return '0,00% combinado';
  const maxRate = Math.max(...rules.value.map((item) => item.pisRate + item.cofinsRate));
  return `${maxRate.toFixed(2)}% combinado`;
});
const regime = ref<FiscalPisCofinsRule['regime'] | ''>('');
const appliesTo = ref<FiscalPisCofinsRule['appliesTo'] | ''>('');

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatRegime(value: FiscalPisCofinsRule['regime']): string {
  return value.replace(/_/g, ' ');
}

function formatAppliesTo(value: FiscalPisCofinsRule['appliesTo']): string {
  if (value === 'ambos') return 'Ambos';
  return value === 'mercadoria' ? 'Mercadoria' : 'Serviço';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    rules.value = await fiscalService.listPisCofinsRules({
      regime: regime.value || undefined,
      appliesTo: appliesTo.value || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar PIS/COFINS';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  regime.value = '';
  appliesTo.value = '';
  void load();
}

onMounted(load);
</script>

<style scoped>
.fiscal-pis-cofins-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
