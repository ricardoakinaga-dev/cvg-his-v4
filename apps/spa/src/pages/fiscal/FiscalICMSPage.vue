<template>
  <div class="fiscal-icms-page">
    <AppPageHeader
      title="ICMS"
      subtitle="Consulta de ICMS interestadual e interno publicada pela API fiscal"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      Consulta read-only publicada pela API fiscal. Cadastro, edição e carga tributária transacional
      ainda não estão disponíveis nesta tela.
    </DsAlert>

    <section class="filter-bar">
      <DsInput v-model="ufDestination" type="select" label="UF destino">
        <option value="">Todas</option>
        <option v-for="option in destinationOptions" :key="option" :value="option">{{ option }}</option>
      </DsInput>
      <DsInput v-model="ncmFilter" label="NCM" placeholder="3004, 9018..." />
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
      <DsStatCard :label="`${destinationsCount} UF destino`" value="" icon="🗺️" />
      <DsStatCard :label="`${ncmCount} NCMs operacionais`" value="" icon="🏷️" />
    </section>

    <DataTable
      :columns="columns"
      :rows="icmsRules"
      :loading="loading"
      empty-icon="📊"
      empty-title="Nenhuma configuração de ICMS encontrada"
      empty-description="A API fiscal ainda não retornou regras de ICMS para consulta."
      variant="hoverable"
    >
      <template #cell-rate="{ row }">
        {{ formatRate((row as FiscalIcmsRule).rate) }}
      </template>
      <template #cell-operationType="{ row }">
        {{ formatOperationType((row as FiscalIcmsRule).operationType) }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { fiscalService, type FiscalIcmsRule } from '@/services/fiscal';

const icmsRules = ref<FiscalIcmsRule[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'ufOrigin', label: 'UF Origem' },
  { key: 'ufDestination', label: 'UF Destino' },
  { key: 'ncm', label: 'NCM' },
  { key: 'operationType', label: 'Operação' },
  { key: 'rate', label: 'Alíquota (%)' },
  { key: 'cst', label: 'CST' }
];

const destinationOptions = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC'];
const destinationsCount = computed(
  () => new Set(icmsRules.value.map((item) => item.ufDestination)).size
);
const ncmCount = computed(() => new Set(icmsRules.value.map((item) => item.ncm)).size);
const ufDestination = ref('');
const ncmFilter = ref('');
const operationType = ref<FiscalIcmsRule['operationType'] | ''>('');

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatOperationType(value: FiscalIcmsRule['operationType']): string {
  return value === 'interna' ? 'Interna' : 'Interestadual';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    icmsRules.value = await fiscalService.listIcmsRules({
      ufDestination: ufDestination.value || undefined,
      ncm: ncmFilter.value.trim() || undefined,
      operationType: operationType.value || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar configurações';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  ufDestination.value = '';
  ncmFilter.value = '';
  operationType.value = '';
  void load();
}

onMounted(load);
</script>

<style scoped>
.fiscal-icms-page {
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
