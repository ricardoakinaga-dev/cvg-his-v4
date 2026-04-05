<template>
  <div class="encounters-list-page">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">🩺 Atendimentos</h1>
        <p class="page-header__subtitle">Abertura e controle do episódio clínico</p>
      </div>
      <div class="page-header__actions">
        <router-link to="/encounters/new" class="btn btn--primary">+ Abrir Atendimento</router-link>
      </div>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="🩺"
      empty-title="Nenhum atendimento encontrado"
      empty-description="Abra o primeiro atendimento para começar."
      variant="hoverable"
    >
      <template #emptyAction>
        <router-link to="/encounters/new" class="btn btn--primary">+ Abrir Atendimento</router-link>
      </template>
      <template #cell-patient="{ row }">
        <strong>🐾 {{ patientName((row as EncounterSummary).patientId) }}</strong>
      </template>
      <template #cell-visitType="{ row }">
        {{ visitTypeLabel((row as EncounterSummary).visitType) }}
      </template>
      <template #cell-reason="{ row }">
        <span class="reason-cell" :title="(row as EncounterSummary).reason">
          {{ truncate((row as EncounterSummary).reason, 40) }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="encounterStatusLabel((row as EncounterSummary).status)"
          :variant="encounterStatusVariant((row as EncounterSummary).status)"
        />
      </template>
      <template #cell-openedAt="{ row }">
        {{ formatDateTime((row as EncounterSummary).openedAt) }}
      </template>
      <template #cell-actions="{ row }">
        <router-link
          :to="`/encounters/${(row as EncounterSummary).id}`"
          class="btn btn--sm btn--secondary"
          >Ver</router-link
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { encounterService } from '@/services/encounter';
import type { EncounterSummary } from '@/types/encounter';
import { visitTypeLabel, encounterStatusLabel, formatDateTime, truncate } from '@/utils/labels';
import { useListData } from '@/composables/useListData';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';

const entityCache = useEntityCache();
const patientNames = ref<Record<string, string>>({});

const columns: DataTableColumn[] = [
  { key: 'patient', label: 'Paciente' },
  { key: 'visitType', label: 'Tipo' },
  { key: 'reason', label: 'Queixa' },
  { key: 'status', label: 'Status' },
  { key: 'openedAt', label: 'Abertura' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

function encounterStatusVariant(s: string) {
  const map: Record<string, string> = {
    reception: 'info',
    in_triage: 'warning',
    in_care: 'default',
    observation: 'info',
    closed: 'neutral'
  };
  return (map[s] || 'default') as any;
}

function patientName(id: string) {
  return patientNames.value[id] || `Paciente ${id.slice(0, 8)}...`;
}

const { items, loading, error, load } = useListData<EncounterSummary>({
  fetchFn: async () => {
    const encounters = await encounterService.list();
    const patientIds = [...new Set(encounters.map((e) => e.patientId))];
    await Promise.all(
      patientIds.map(async (id) => {
        patientNames.value[id] = await entityCache.getPatientName(id);
      })
    );
    return encounters;
  },
  entityLabel: 'atendimentos'
});
</script>

<style scoped>
.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
