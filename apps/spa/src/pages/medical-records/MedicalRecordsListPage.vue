<template>
  <div class="medical-records-list-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Atendimentos', 'Prontuário Clínico']" title="📋 Prontuário Clínico" subtitle="Atendimento > Prontuário. Documentação clínica aberta nos atendimentos ativos e concluídos.">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">🔄 Atualizar</DsButton>
        <DsButton tag="a" to="/encounters" variant="secondary">🩺 Ver Atendimentos</DsButton>
        <DsButton tag="a" to="/patients" variant="ghost">🐾 Pacientes</DsButton>
      </template>
    </AppPageHeader>

    <section class="medical-records-list-page__overview">
      <DsCard title="Visão consolidada">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ items.length }}</span>
            <span class="overview-metric__label">Prontuários carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ openRecords }}</span>
            <span class="overview-metric__label">Em aberto</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ closedRecords }}</span>
            <span class="overview-metric__label">Concluídos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ totalEntries }}</span>
            <span class="overview-metric__label">Entradas clínicas</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="medical-records-list-page__story">
      <DsCard title="Leitura rápida">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
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
      empty-icon="📋"
      empty-title="Nenhum prontuário encontrado"
      empty-description="Os prontuários nascem quando um atendimento é aberto e acompanham o caso até a alta."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton tag="a" to="/encounters/new" variant="primary">+ Abrir Atendimento</DsButton>
      </template>
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
import { ref, computed } from 'vue';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { MedicalRecordListSummary } from '@/types/medicalRecords';
import { useEntityCache } from '@/composables/useEntityCache';
import { useListData } from '@/composables/useListData';
import { formatDate } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

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

const openRecords = computed(
  () => items.value.filter((summary) => summary.record.status === 'open').length
);
const closedRecords = computed(
  () => items.value.filter((summary) => summary.record.status !== 'open').length
);
const totalEntries = computed(() => items.value.reduce((sum, summary) => sum + summary.entryCount, 0));
const openRate = computed(() => {
  if (!items.value.length) return '0%';
  return `${Math.round((openRecords.value / items.value.length) * 100)}%`;
});
const storyCards = computed(() => [
  { label: 'Abertos', value: openRecords.value.toString(), hint: 'Prontuários ainda em curso' },
  { label: 'Concluídos', value: closedRecords.value.toString(), hint: 'Prontuários fechados' },
  { label: 'Entradas', value: totalEntries.value.toString(), hint: 'Volume clínico acumulado' },
  { label: 'Taxa aberta', value: openRate.value, hint: 'Proporção de casos em aberto' }
]);
</script>

<style scoped>
.medical-records-list-page__overview {
  margin-bottom: 16px;
}

.medical-records-list-page__story {
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

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.story-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.story-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.story-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.encounter-link {
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: 500;
}
.encounter-link:hover {
  text-decoration: underline;
}
</style>
