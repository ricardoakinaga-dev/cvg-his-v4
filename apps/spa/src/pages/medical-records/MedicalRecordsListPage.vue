<template>
  <div class="medical-records-list-page">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">📋 Prontuário Clínico</h1>
        <p class="page-header__subtitle">Registro clínico por atendimento</p>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="📋"
      empty-title="Nenhum prontuário encontrado"
      empty-description="Os prontuários são criados automaticamente quando atendimentos são abertos."
      variant="hoverable"
    >
      <template #cell-encounter="{ row }">
        <router-link
          :to="`/encounters/${(row as MedicalRecordListSummary).record.encounterId}`"
          class="encounter-link"
        >
          {{ (row as MedicalRecordListSummary).record.encounterId.slice(0, 8) }}...
        </router-link>
      </template>
      <template #cell-patient="{ row }">
        {{ patientName((row as MedicalRecordListSummary).record.patientId) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="
            (row as MedicalRecordListSummary).record.status === 'open' ? 'Aberto' : 'Concluído'
          "
          :variant="
            (row as MedicalRecordListSummary).record.status === 'open' ? 'warning' : 'success'
          "
        />
      </template>
      <template #cell-entries="{ row }">
        {{ (row as MedicalRecordListSummary).entryCount }} entradas
      </template>
      <template #cell-updatedAt="{ row }">
        {{ formatDate((row as MedicalRecordListSummary).record.updatedAt) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/medical-records/${(row as MedicalRecordListSummary).record.encounterId}`"
          size="sm"
          variant="secondary"
        >
          Ver prontuário
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { MedicalRecordListSummary } from '@/types/medicalRecords';
import { useEntityCache } from '@/composables/useEntityCache';
import { useListData } from '@/composables/useListData';
import { formatDate } from '@/utils/labels';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';

const entityCache = useEntityCache();
const patientNames = ref<Record<string, string>>({});

const columns: DataTableColumn[] = [
  { key: 'encounter', label: 'Atendimento' },
  { key: 'patient', label: 'Paciente' },
  { key: 'status', label: 'Status' },
  { key: 'entries', label: 'Entradas' },
  { key: 'updatedAt', label: 'Atualizado' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

function patientName(id: string): string {
  return patientNames.value[id] || `Paciente ${id.slice(0, 8)}...`;
}

const { items, loading, error, load } = useListData<MedicalRecordListSummary>({
  fetchFn: async () => {
    const records = await medicalRecordsService.listAll();
    const patientIds = [...new Set(records.map((r) => r.record.patientId))];
    await Promise.all(
      patientIds.map(async (id) => {
        patientNames.value[id] = await entityCache.getPatientName(id);
      })
    );
    return records;
  },
  entityLabel: 'prontuários'
});
</script>

<style scoped>
.encounter-link {
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: 500;
}
.encounter-link:hover {
  text-decoration: underline;
}
</style>
