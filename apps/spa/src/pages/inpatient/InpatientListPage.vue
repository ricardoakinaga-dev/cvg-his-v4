<template>
  <div class="inpatient-list-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Internação', 'Internação']" title="Internação" subtitle="Atendimento > Internação. Acompanhe admissões, leitos e evolução dos pacientes internados.">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">
          <template #icon><DsIcon name="refresh" size="sm" aria-hidden="true" /></template>
          Atualizar
        </DsButton>
        <DsButton tag="a" to="/inpatient/board" variant="secondary">
          <template #icon><DsIcon name="map" size="sm" aria-hidden="true" /></template>
          Mapa de Leitos
        </DsButton>
        <DsButton tag="a" to="/inpatient/daily-charges" variant="secondary">
          <template #icon><DsIcon name="money" size="sm" aria-hidden="true" /></template>
          Diárias
        </DsButton>
        <DsButton tag="a" to="/sectors" variant="ghost">
          <template #icon><DsIcon name="building" size="sm" aria-hidden="true" /></template>
          Setores
        </DsButton>
        <DsButton tag="a" to="/queue" variant="secondary">
          <template #icon><DsIcon name="hospital" size="sm" aria-hidden="true" /></template>
          Ver Fila
        </DsButton>
        <DsButton tag="a" to="/inpatient/admit" variant="primary">
          <template #icon><DsIcon name="plus" size="sm" aria-hidden="true" /></template>
          Admitir Paciente
        </DsButton>
      </template>
    </AppPageHeader>

    <section class="inpatient-list-page__overview" aria-label="Resumo da internação" :aria-busy="loading">
      <div class="overview-metric overview-metric--primary">
        <span class="overview-metric__value">{{ hasData ? occupancyRate : '—' }}</span>
        <span class="overview-metric__label">{{ occupancyLabel }}</span>
      </div>
      <div class="overview-metric">
        <span class="overview-metric__value">{{ hasData ? admittedCount : '—' }}</span>
        <span class="overview-metric__label">Em cuidado nesta lista</span>
      </div>
      <div class="overview-metric">
        <span class="overview-metric__value">{{ hasData ? stableCount : '—' }}</span>
        <span class="overview-metric__label">Estáveis nesta lista</span>
      </div>
    </section>

    <p v-if="loading && items.length" class="inpatient-refresh-status" role="status" aria-live="polite">
      Atualizando a lista sem remover o contexto confirmado em tela…
    </p>

    <DsAlert v-if="error && items.length" variant="danger" dismissible @dismiss="error = ''">
      <div class="inpatient-refresh-feedback">
        <span>{{ error }}. Os dados anteriores permanecem visíveis.</span>
        <DsButton variant="secondary" size="sm" :loading="loading" :disabled="loading" @click="reload">
          Tentar novamente
        </DsButton>
      </div>
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="tableLoading"
      :feedback="tableFeedback"
      empty-icon="🛏️"
      empty-title="Nenhuma internação ativa"
      empty-description="As internações aparecem quando um atendimento evolui para admissão ou observação prolongada."
      variant="hoverable"
    >
      <template v-if="tableFeedback" #feedbackAction>
        <DsButton variant="secondary" :loading="loading" :disabled="loading" @click="reload">
          Tentar novamente
        </DsButton>
      </template>
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
          :aria-label="`Ver internação de ${patientName((row as InpatientStaySummary).patientId)}, leito ${(row as InpatientStaySummary).bed}`"
          >Ver</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { inpatientService } from '@/services/inpatient';
import type { InpatientStaySummary } from '@/types/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import { formatDate } from '@/utils/labels';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableFeedback } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const entityCache = useEntityCache();
const route = useRoute();
const patientNames = ref<Record<string, string>>({});
const activeBedCount = ref(0);
const occupiedCount = ref(0);
const items = ref<InpatientStaySummary[]>([]);
const loading = ref(true);
const error = ref('');
const hasData = computed(() => items.value.length > 0 || (!loading.value && !error.value));
const tableLoading = computed(() => loading.value && items.value.length === 0);
let loadGeneration = 0;

const tableFeedback = computed<DataTableFeedback | null>(() => {
  if (!error.value || items.value.length > 0) return null;
  return {
    kind: 'error',
    icon: '⚠️',
    title: 'Não foi possível carregar as internações',
    description: `${error.value}. Tente novamente para atualizar a lista.`
  };
});

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
const occupancyRate = computed(() => {
  if (!activeBedCount.value) return '—';
  return `${Math.round((occupiedCount.value / activeBedCount.value) * 100)}%`;
});

const occupancyLabel = computed(() => {
  if (loading.value) return 'Carregando ocupação…';
  if (error.value) return 'Ocupação indisponível';
  if (!activeBedCount.value) return 'Nenhum leito ativo';
  return `${occupiedCount.value} de ${activeBedCount.value} leitos em uso`;
});

async function load() {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = '';
  try {
    const patientIdFilter = typeof route.query.patientId === 'string' ? route.query.patientId : undefined;
    const [stays, beds] = await Promise.all([
      inpatientService.list(patientIdFilter ? { patientId: patientIdFilter } : undefined),
      inpatientService.listBeds({ active: true })
    ]);
    if (generation !== loadGeneration) return;
    items.value = stays;
    patientNames.value = {};
    const activeBeds = beds.filter((bed) => bed.active);
    activeBedCount.value = activeBeds.length;
    occupiedCount.value = activeBeds.filter((bed) => bed.status === 'occupied').length;
    void Promise.allSettled(
      [...new Set(stays.map((stay) => stay.patientId))].map(async (id) => {
        const name = await entityCache.getPatientName(id);
        if (generation === loadGeneration) patientNames.value[id] = name;
      })
    );
  } catch (err: unknown) {
    if (generation === loadGeneration) {
      const accessDenied = typeof err === 'object' && err !== null && 'status' in err && err.status === 403;
      if (accessDenied) {
        // Do not keep an authorized snapshot visible after the server revokes access.
        items.value = [];
        patientNames.value = {};
        activeBedCount.value = 0;
        occupiedCount.value = 0;
      }
      error.value = err instanceof Error ? err.message : 'Erro ao carregar internações';
    }
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

function reload() {
  void load();
}

onMounted(reload);
onBeforeUnmount(() => {
  ++loadGeneration;
});
watch(() => route.query.patientId, reload);

</script>

<style scoped>
.inpatient-list-page__overview {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(2, minmax(120px, 1fr));
  gap: 1px;
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-border, #e2e8f0);
}

.overview-metric {
  padding: 12px;
  background: var(--color-surface, #ffffff);
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

.inpatient-refresh-status {
  margin: -4px 0 12px;
  color: var(--color-text-secondary, #55717a);
  font-size: 13px;
}

.inpatient-refresh-feedback {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.inpatient-refresh-feedback > span {
  flex: 1 1 240px;
  min-width: 0;
}

@media (max-width: 640px) {
  .inpatient-list-page__overview {
    grid-template-columns: 1fr;
  }

  .inpatient-list-page :deep(.table-wrapper) {
    overflow: visible;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .inpatient-list-page :deep(.data-table) {
    display: block;
    width: 100%;
    min-width: 0;
    border-collapse: separate;
  }

  .inpatient-list-page :deep(.data-table thead) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .inpatient-list-page :deep(.data-table tbody) {
    display: grid;
    gap: 12px;
    width: 100%;
  }

  .inpatient-list-page :deep(.data-table tbody tr) {
    display: grid;
    width: 100%;
    box-sizing: border-box;
    gap: 0;
    padding: 12px 14px;
    border: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
    border-radius: 16px;
    background: var(--pulse-surface, var(--color-surface, #ffffff));
    box-shadow: var(--pulse-shadow-card, 0 12px 30px rgba(15, 35, 48, 0.08));
  }

  .inpatient-list-page :deep(.data-table tbody td) {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    padding: 7px 0;
    border: 0;
    text-align: right;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .inpatient-list-page :deep(.data-table tbody td::before) {
    flex: 0 0 auto;
    margin-right: auto;
    color: var(--pulse-muted, var(--color-text-muted, #55717a));
    content: attr(data-label);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-align: left;
    text-transform: uppercase;
  }

  .inpatient-list-page :deep(.data-table tbody td:last-child) {
    align-items: center;
    padding-top: 12px;
    margin-top: 4px;
    border-top: 1px solid var(--pulse-line-soft, var(--color-border, #d5e2e6));
  }

  .inpatient-list-page :deep(.data-table tbody td:last-child .ds-btn) {
    min-width: 96px;
  }
}
</style>
