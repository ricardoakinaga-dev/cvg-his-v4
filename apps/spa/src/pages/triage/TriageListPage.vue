<template>
  <div class="triage-list-page">
    <AppPageHeader title="🧭 Triagem" subtitle="Classificação inicial e direcionamento do fluxo">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="fetchData">Atualizar</DsButton>
        <DsButton tag="a" to="/triage/new" variant="primary">+ Nova Triagem</DsButton>
      </template>
    </AppPageHeader>

    <section class="triage-list-page__overview">
      <DsCard title="Resumo da triagem">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ records.length }}</span>
            <span class="overview-metric__label">Registros</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ criticalCount }}</span>
            <span class="overview-metric__label">Críticas</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ inCareCount }}</span>
            <span class="overview-metric__label">Em atendimento</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ observationCount }}</span>
            <span class="overview-metric__label">Observação</span>
          </div>
        </div>
      </DsCard>
    </section>

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
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import { computed } from 'vue';

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

const criticalCount = computed(() => records.value.filter((r) => r.priority === 'critical').length);
const inCareCount = computed(() => records.value.filter((r) => r.destination === 'in_care').length);
const observationCount = computed(
  () => records.value.filter((r) => r.destination === 'observation').length
);
</script>

<style scoped>
.triage-list-page {
  max-width: 1280px;
}

.triage-list-page__overview {
  margin-bottom: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}
</style>
