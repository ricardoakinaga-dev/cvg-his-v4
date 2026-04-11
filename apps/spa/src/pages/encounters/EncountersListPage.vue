<template>
  <div class="encounters-list-page">
    <AppPageHeader title="🩺 Atendimentos" subtitle="Abertura e controle do episódio clínico">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton tag="a" to="/encounters/new" variant="primary">+ Abrir Atendimento</DsButton>
      </template>
    </AppPageHeader>

    <section class="encounters-list-page__overview">
      <DsCard title="Resumo do episódio clínico">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ items.length }}</span>
            <span class="overview-metric__label">Atendimentos carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activeEncounters }}</span>
            <span class="overview-metric__label">Em curso</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ closedEncounters }}</span>
            <span class="overview-metric__label">Encerrados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ triageEncounters }}</span>
            <span class="overview-metric__label">Em triagem</span>
          </div>
        </div>
      </DsCard>
    </section>

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
        <DsButton tag="a" to="/encounters/new" variant="primary">+ Abrir Atendimento</DsButton>
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
        <DsButton
          tag="a"
          :to="`/encounters/${(row as EncounterSummary).id}`"
          size="sm"
          variant="secondary"
          >Ver</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { encounterService } from '@/services/encounter';
import type { EncounterSummary } from '@/types/encounter';
import { visitTypeLabel, encounterStatusLabel, formatDateTime, truncate } from '@/utils/labels';
import { useListData } from '@/composables/useListData';
import { useEntityCache } from '@/composables/useEntityCache';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
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

const activeEncounters = computed(
  () => items.value.filter((encounter) => encounter.status !== 'closed').length
);
const closedEncounters = computed(
  () => items.value.filter((encounter) => encounter.status === 'closed').length
);
const triageEncounters = computed(
  () => items.value.filter((encounter) => encounter.status === 'in_triage').length
);

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
.encounters-list-page__overview {
  margin-bottom: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
