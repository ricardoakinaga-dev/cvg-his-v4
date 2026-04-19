<template>
  <div class="laboratory-results-page">
    <AppPageHeader
      title="Resultados Laboratoriais"
      subtitle="Laudos liberados e pendências por tipo de exame"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${pendingCount} aguardando laudo`" value="" icon="📋" />
      <DsStatCard :label="`${filteredResults.length} liberado(s)`" value="" icon="✅" />
      <DsStatCard :label="`${allResults.length} item(ns) monitorados`" value="" icon="📊" />
      <DsStatCard :label="`${anomalySummary.flaggedOrders} com anomalia`" value="" icon="🚨" />
    </section>

    <div class="filter-bar">
      <DsInput v-model="filterType" type="select" label="Tipo de Exame">
        <option value="">Todos</option>
        <option value="HEM">Hemograma</option>
        <option value="BIO">Bioquímico</option>
        <option value="URIN">Urina</option>
        <option value="RX">Radiografia</option>
        <option value="US">Ultrassonografia</option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredResults"
      :loading="loading"
      empty-icon="📋"
      empty-title="Nenhum resultado encontrado"
      empty-description="Resultados laboratoriais aparecerão aqui quando forem liberados."
      variant="hoverable"
    >
      <template #cell-status="{ row }">
        <DsBadge :variant="statusVariant((row as DiagnosticOrderSummary).status)" size="sm">
          {{ statusLabel((row as DiagnosticOrderSummary).status) }}
        </DsBadge>
      </template>
      <template #cell-resultSummary="{ row }">
        {{ (row as DiagnosticOrderSummary).resultSummary ?? 'Aguardando liberação no prontuário' }}
      </template>
      <template #cell-anomaly="{ row }">
        <DsBadge
          v-if="anomalyByOrder[(row as DiagnosticOrderSummary).id]"
          :variant="anomalyByOrder[(row as DiagnosticOrderSummary).id]?.severity === 'critical' ? 'danger' : 'warning'"
          size="sm"
        >
          {{ anomalyByOrder[(row as DiagnosticOrderSummary).id]?.severity === 'critical' ? 'Crítica' : 'Revisar' }}
        </DsBadge>
        <span v-else>—</span>
      </template>
      <template #cell-createdAt="{ row }">
        {{ formatDate((row as DiagnosticOrderSummary).createdAt) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton tag="a" :to="`/diagnostics?encounter=${(row as DiagnosticOrderSummary).encounterId}`" size="sm" variant="secondary">
          Ver laudo
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { laboratoryService } from '@/services/laboratory';
import { mlService, type LabAnomalyResponse } from '@/services/ml';

const route = useRoute();
const allResults = ref<DiagnosticOrderSummary[]>([]);
const anomalies = ref<LabAnomalyResponse | null>(null);
const loading = ref(false);
const error = ref('');
const filterType = ref('');

const columns: DataTableColumn[] = [
  { key: 'examType', label: 'Tipo de Exame' },
  { key: 'patientId', label: 'Paciente' },
  { key: 'status', label: 'Status' },
  { key: 'resultSummary', label: 'Resumo do Laudo' },
  { key: 'anomaly', label: 'Anomalia' },
  { key: 'createdAt', label: 'Data' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const filteredResults = computed(() => {
  const normalizedFilter = filterType.value.trim().toUpperCase();

  return allResults.value.filter((item) => {
    const matchesType =
      !normalizedFilter ||
      item.examType.toUpperCase().includes(normalizedFilter) ||
      item.examCatalogId?.toUpperCase().includes(normalizedFilter);

    return matchesType;
  });
});

const pendingCount = computed(() =>
  allResults.value.filter((item) => item.status === 'requested' || item.status === 'collected').length
);
const anomalyByOrder = computed<Record<string, { severity: 'warning' | 'critical'; message: string }>>(() =>
  Object.fromEntries((anomalies.value?.flags ?? []).map((flag) => [flag.orderId, flag]))
);
const anomalySummary = computed(() => ({
  flaggedOrders: anomalies.value?.flaggedOrders ?? 0
}));

function formatDate(d: string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function statusVariant(status: DiagnosticOrderSummary['status']): 'default' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'requested':
    case 'collected':
      return 'warning';
    case 'resulted':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function statusLabel(status: DiagnosticOrderSummary['status']): string {
  switch (status) {
    case 'requested':
      return 'Solicitado';
    case 'collected':
      return 'Coletado';
    case 'resulted':
      return 'Liberado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [results, anomalyResponse] = await Promise.all([
      laboratoryService.listResults(),
      mlService.getLabAnomalies({ examType: filterType.value || undefined }).catch(() => null)
    ]);
    allResults.value = results;
    anomalies.value = anomalyResponse;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar resultados';
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query.type,
  (value) => {
    filterType.value = typeof value === 'string' ? value : '';
  },
  { immediate: true }
);

onMounted(load);
</script>

<style scoped>
.laboratory-results-page {
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
  max-width: 400px;
}
</style>
