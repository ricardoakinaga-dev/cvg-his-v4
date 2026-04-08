<template>
  <div class="inpatient-list-page">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">🛏️ Internação</h1>
        <p class="page-header__subtitle">Gestão de internações e leitos</p>
      </div>
      <div class="page-header__actions">
        <DsButton tag="a" to="/inpatient/board" variant="secondary">🗺️ Mapa de Leitos</DsButton>
        <DsButton tag="a" to="/encounters" variant="secondary">+ Admitir Paciente</DsButton>
      </div>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="🛏️"
      empty-title="Nenhuma internação ativa"
      empty-description="As internações aparecem quando pacientes são admitidos."
      variant="hoverable"
    >
      <template #cell-patient="{ row }">
        {{ patientName((row as InpatientStaySummary).patientId) }}
      </template>
      <template #cell-location="{ row }">
        <strong>{{ (row as InpatientStaySummary).unit }}</strong>
        <span class="muted"> / {{ (row as InpatientStaySummary).ward }}</span>
      </template>
      <template #cell-bed="{ row }">
        {{ (row as InpatientStaySummary).bed }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel((row as InpatientStaySummary).status)"
          :variant="statusVariant((row as InpatientStaySummary).status)"
        />
      </template>
      <template #cell-admittedAt="{ row }">
        {{ formatDate((row as InpatientStaySummary).admittedAt) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/inpatient/${(row as InpatientStaySummary).id}`"
          size="sm"
          variant="secondary"
          >Ver</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { inpatientService } from '@/services/inpatient';
import type { InpatientStaySummary } from '@/types/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import { useListData } from '@/composables/useListData';
import { formatDate } from '@/utils/labels';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';

const entityCache = useEntityCache();
const patientNames = ref<Record<string, string>>({});

const columns: DataTableColumn[] = [
  { key: 'patient', label: 'Paciente' },
  { key: 'location', label: 'Localização' },
  { key: 'bed', label: 'Leito' },
  { key: 'status', label: 'Status' },
  { key: 'admittedAt', label: 'Admissão' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const statusLabelMap: Record<InpatientStaySummary['status'], string> = {
  admitted: 'Internado',
  stable: 'Estável',
  transferred: 'Transferido',
  discharged: 'Alta'
};

const statusVariantMap: Record<InpatientStaySummary['status'], string> = {
  admitted: 'info',
  stable: 'success',
  transferred: 'warning',
  discharged: 'neutral'
};

function statusLabel(s: InpatientStaySummary['status']) {
  return statusLabelMap[s] || s;
}

function statusVariant(s: InpatientStaySummary['status']) {
  return (statusVariantMap[s] || 'default') as any;
}

function patientName(id: string): string {
  return patientNames.value[id] || `Paciente ${id.slice(0, 8)}...`;
}

const { items, loading, error, load } = useListData<InpatientStaySummary>({
  fetchFn: async () => {
    const stays = await inpatientService.list();
    const patientIds = [...new Set(stays.map((s) => s.patientId))];
    await Promise.all(
      patientIds.map(async (id) => {
        patientNames.value[id] = await entityCache.getPatientName(id);
      })
    );
    return stays;
  },
  entityLabel: 'internações'
});
</script>
