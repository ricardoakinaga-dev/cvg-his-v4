<template>
  <div class="inpatient-list-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Internação', 'Internação']" title="🛏️ Internação" subtitle="Atendimento > Internação. Acompanhe admissões, leitos e evolução dos pacientes internados.">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">🔄 Atualizar</DsButton>
        <DsButton tag="a" to="/inpatient/board" variant="secondary">🗺️ Mapa de Leitos</DsButton>
        <DsButton tag="a" to="/sectors" variant="ghost">🏢 Setores</DsButton>
        <DsButton tag="a" to="/queue" variant="secondary">🏥 Ver Fila</DsButton>
        <DsButton tag="a" to="/encounters" variant="primary">+ Admitir Paciente</DsButton>
      </template>
    </AppPageHeader>

    <section class="inpatient-list-page__overview">
      <DsCard title="Resumo da ocupação">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ items.length }}</span>
            <span class="overview-metric__label">Internações ativas</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ admittedCount }}</span>
            <span class="overview-metric__label">Admitidos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ stableCount }}</span>
            <span class="overview-metric__label">Estáveis</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ dischargedCount }}</span>
            <span class="overview-metric__label">Altas / transferências</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="inpatient-list-page__story">
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
      empty-icon="🛏️"
      empty-title="Nenhuma internação ativa"
      empty-description="As internações aparecem quando um atendimento evolui para admissão ou observação prolongada."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton tag="a" to="/encounters" variant="primary">+ Abrir Atendimento</DsButton>
      </template>
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
import { useRoute } from 'vue-router';
import { inpatientService } from '@/services/inpatient';
import type { InpatientStaySummary } from '@/types/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import { useListData } from '@/composables/useListData';
import { formatDate } from '@/utils/labels';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { computed } from 'vue';

const entityCache = useEntityCache();
const route = useRoute();
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

const admittedCount = computed(() => items.value.filter((stay) => stay.status === 'admitted').length);
const stableCount = computed(() => items.value.filter((stay) => stay.status === 'stable').length);
const dischargedCount = computed(
  () => items.value.filter((stay) => stay.status === 'transferred' || stay.status === 'discharged').length
);
const occupancyRate = computed(() => {
  if (!items.value.length) return '0%';
  return `${Math.round((admittedCount.value / items.value.length) * 100)}%`;
});
const storyCards = computed(() => [
  { label: 'Internados', value: admittedCount.value.toString(), hint: 'Leitos em uso agora' },
  { label: 'Estáveis', value: stableCount.value.toString(), hint: 'Pacientes monitorados' },
  { label: 'Altas', value: dischargedCount.value.toString(), hint: 'Fluxo concluído' },
  { label: 'Ocupação', value: occupancyRate.value, hint: 'Proporção de admissões' }
]);

const { items, loading, error, load } = useListData<InpatientStaySummary>({
  fetchFn: async () => {
    const patientIdFilter = typeof route.query.patientId === 'string' ? route.query.patientId : undefined;
    const stays = await inpatientService.list(patientIdFilter ? { patientId: patientIdFilter } : undefined);
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

function reload() {
  void load();
}
</script>

<style scoped>
.inpatient-list-page__overview {
  margin-bottom: 16px;
}

.inpatient-list-page__story {
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
</style>
