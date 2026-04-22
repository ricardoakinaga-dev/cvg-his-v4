<template>
  <div class="fiscal-icms-matrix-page">
    <AppPageHeader title="Matriz ICMS" :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Matriz ICMS']" subtitle="Visão consolidada da matriz interestadual por UF de destino">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      Matriz publicada apenas para consulta operacional. Não há edição de alíquota nem versionamento
      fiscal nesta tela.
    </DsAlert>

    <section class="filter-bar">
      <DsInput v-model="ufOrigin" type="select" label="UF origem">
        <option value="">Todas</option>
        <option v-for="option in ufOptions" :key="option" :value="option">{{ option }}</option>
      </DsInput>
      <DsInput v-model="ufDestination" type="select" label="UF destino">
        <option value="">Todas</option>
        <option v-for="option in ufOptions" :key="option" :value="option">{{ option }}</option>
      </DsInput>
      <DsInput v-model="operationType" type="select" label="Operação">
        <option value="">Todas</option>
        <option value="interna">Interna</option>
        <option value="interestadual">Interestadual</option>
      </DsInput>
      <div class="filter-actions">
        <DsButton variant="secondary" @click="load">Aplicar filtros</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>

    <section class="hub-kpis">
      <DsStatCard :label="`${rows.length} combinação(ões)`" value="" icon="📊" />
      <DsStatCard :label="maxRate" value="" icon="🧮" />
    </section>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      empty-icon="📊"
      empty-title="Nenhuma combinação de ICMS encontrada"
      empty-description="A matriz será exibida quando a base fiscal estiver carregada."
      variant="hoverable"
    >
      <template #cell-rate="{ row }">
        {{ formatRate((row as FiscalIcmsMatrixRow).rate) }}
      </template>
      <template #cell-operationType="{ row }">
        {{ formatOperationType((row as FiscalIcmsMatrixRow).operationType) }}
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
import { fiscalService, type FiscalIcmsMatrixRow } from '@/services/fiscal';

const rows = ref<FiscalIcmsMatrixRow[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'ufOrigin', label: 'UF Origem' },
  { key: 'ufDestination', label: 'UF Destino' },
  { key: 'operationType', label: 'Operação' },
  { key: 'rate', label: 'Alíquota' }
];

const ufOptions = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC'];
const maxRate = computed(() => {
  if (rows.value.length === 0) return '0,00%';
  return `${Math.max(...rows.value.map((item) => item.rate)).toFixed(2)}% máxima`;
});
const ufOrigin = ref('');
const ufDestination = ref('');
const operationType = ref<FiscalIcmsMatrixRow['operationType'] | ''>('');

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatOperationType(value: FiscalIcmsMatrixRow['operationType']): string {
  return value === 'interna' ? 'Interna' : 'Interestadual';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await fiscalService.listIcmsMatrix({
      ufOrigin: ufOrigin.value || undefined,
      ufDestination: ufDestination.value || undefined,
      operationType: operationType.value || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar matriz ICMS';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  ufOrigin.value = '';
  ufDestination.value = '';
  operationType.value = '';
  void load();
}

onMounted(load);
</script>

<style scoped>
.fiscal-icms-matrix-page {
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
