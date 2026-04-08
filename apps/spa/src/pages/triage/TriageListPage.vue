<template>
  <div class="triage-list-page">
    <div class="page-header">
      <h1>Triagem</h1>
      <div class="page-header__actions">
        <DsButton variant="primary" size="sm" @click="$router.push('/triage/new')">
          Nova Triagem
        </DsButton>
      </div>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="records"
      :loading="loading"
      variant="striped"
      caption="Registros de triagem"
    >
      <template #priority="{ row }">
        <DsBadge :variant="priorityVariant((row as TriageSummary).priority)" size="sm">
          {{ priorityLabel((row as TriageSummary).priority) }}
        </DsBadge>
      </template>
      <template #destination="{ row }">
        <DsBadge :variant="destinationVariant((row as TriageSummary).destination)" size="sm">
          {{ destinationLabel((row as TriageSummary).destination) }}
        </DsBadge>
      </template>
      <template #actions="{ row }">
        <DsButton tag="a" :to="`/triage/${(row as TriageSummary).id}`" size="sm" variant="secondary"
          >Ver</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { useListData } from '@/composables/useListData';
import { listTriageRecords } from '@/services/triage';
import type { TriageSummary } from '@/types/triage';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DataTable from '@/components/DataTable.vue';

const columns = [
  { key: 'patientId', label: 'Paciente' },
  { key: 'encounterId', label: 'Atendimento' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'chiefComplaint', label: 'Queixa Principal' },
  { key: 'destination', label: 'Destino' },
  { key: 'triagedByUserId', label: 'Triado por' },
  { key: 'createdAt', label: 'Data' },
  { key: 'actions', label: '' }
];

const {
  loading,
  error,
  items: records,
  load: fetchData
} = useListData<TriageSummary>({
  fetchFn: () => listTriageRecords(),
  entityLabel: 'triagens'
});

function priorityVariant(p: string): 'danger' | 'warning' | 'info' | 'default' {
  const map: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default'
  };
  return map[p] || 'default';
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa'
  };
  return map[p] || p;
}

function destinationVariant(d: string): 'success' | 'info' {
  return d === 'in_care' ? 'success' : 'info';
}

function destinationLabel(d: string): string {
  return d === 'in_care' ? 'Em Atendimento' : 'Observação';
}
</script>

<style scoped>
.triage-list-page {
  max-width: 1280px;
}
</style>
