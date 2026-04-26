<template>
  <div class="laboratory-hemograms-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Atendimentos', 'Hemogramas']"
      title="Hemogramas"
      subtitle="Registro completo de hemograma com valores de referência, desvios e histórico"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/diagnostics" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="summary-grid" aria-label="Resumo dos hemogramas">
      <DsStatCard :label="`${hemograms.length} hemograma(s)`" value="" icon="🩸" />
      <DsStatCard :label="`${outOfRangeCount} parâmetro(s) fora da faixa`" value="" icon="⚠️" />
      <DsStatCard :label="`${referenceValues.length} valor(es) de referência`" value="" icon="📈" />
    </section>

    <section class="filter-panel" aria-label="Filtros de hemogramas">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Código do Hemograma</span>
          <input v-model="draftFilters.code" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Cliente</span>
          <input v-model="draftFilters.client" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Proprietário</span>
          <input v-model="draftFilters.owner" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Animal</span>
          <input v-model="draftFilters.animal" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Data da Análise</span>
          <input v-model="draftFilters.finalizedAt" type="date" />
        </label>
        <label class="filter-field">
          <span>Data de Entrada</span>
          <input v-model="draftFilters.enteredAt" type="date" />
        </label>
        <label class="filter-field filter-field--wide">
          <span>Corpo do Resultado</span>
          <input v-model="draftFilters.body" type="search" autocomplete="off" />
        </label>
        <label class="checkbox-field">
          <input v-model="draftFilters.closed" type="checkbox" />
          <span>Pesquisar Hemogramas Fechados</span>
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="hemogramColumns"
      :rows="filteredHemograms"
      :loading="loading"
      empty-icon="🩸"
      empty-title="Nenhum registro encontrado"
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <span class="record-id">{{ shortId((row as HemogramRow).id) }}</span>
      </template>
      <template #cell-analysisAt="{ row }">
        {{ formatDate((row as HemogramRow).analysisAt) }}
      </template>
      <template #cell-enteredAt="{ row }">
        {{ formatDate((row as HemogramRow).enteredAt) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as HemogramRow).statusLabel"
          :variant="(row as HemogramRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/diagnostics?encounter=${(row as HemogramRow).encounterId}`"
          size="sm"
          variant="secondary"
        >
          Abrir
        </DsButton>
      </template>
    </DataTable>

    <section class="section-grid">
      <DsCard title="Resultado estruturado">
        <DataTable
          :columns="parameterColumns"
          :rows="parameterRows"
          :loading="loading"
          empty-icon="📊"
          empty-title="Nenhum valor de referência cadastrado"
          compact
          variant="hoverable"
        >
          <template #cell-reference="{ row }">
            {{ formatReference(row as ParameterRow) }}
          </template>
          <template #cell-status="{ row }">
            <StatusBadge
              :label="(row as ParameterRow).statusLabel"
              :variant="(row as ParameterRow).statusVariant"
              size="sm"
            />
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Histórico comparativo">
        <div class="history-grid">
          <article v-for="item in historyCards" :key="item.title" class="history-card">
            <strong>{{ item.title }}</strong>
            <span>{{ item.value }}</span>
          </article>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type {
  DiagnosticOrderSummary,
  LaboratoryReferenceValueSummary
} from '@cvg-his-v2/shared-types';
import { laboratoryService } from '@/services/laboratory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface HemogramRow extends DiagnosticOrderSummary {
  clientName: string;
  ownerName: string;
  animalName: string;
  analysisAt: string;
  enteredAt: string;
  statusLabel: string;
  statusVariant: StatusVariant;
}

interface ParameterRow {
  id: string;
  group: string;
  parameter: string;
  value: string;
  unit: string;
  minValue: number;
  maxValue: number;
  statusLabel: string;
  statusVariant: StatusVariant;
}

const hemograms = ref<DiagnosticOrderSummary[]>([]);
const referenceValues = ref<LaboratoryReferenceValueSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const owners = ref<OwnerSummary[]>([]);
const loading = ref(false);
const error = ref('');
const draftFilters = reactive({
  code: '',
  client: '',
  owner: '',
  animal: '',
  finalizedAt: '',
  enteredAt: '',
  body: '',
  closed: true
});
const appliedFilters = reactive({ ...draftFilters });

const hemogramColumns: DataTableColumn[] = [
  { key: 'id', label: 'Código do Hemograma', width: '17%' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'ownerName', label: 'Proprietário' },
  { key: 'animalName', label: 'Animal' },
  { key: 'analysisAt', label: 'Data da Análise', width: '15%' },
  { key: 'enteredAt', label: 'Data de Entrada', width: '15%' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'actions', label: 'Abrir', class: 'table__actions-col', width: '110px' }
];

const parameterColumns: DataTableColumn[] = [
  { key: 'group', label: 'Grupo' },
  { key: 'parameter', label: 'Parâmetro' },
  { key: 'value', label: 'Valor' },
  { key: 'unit', label: 'Unidade' },
  { key: 'reference', label: 'Referência' },
  { key: 'status', label: 'Status', width: '170px' }
];

const ownerById = computed(() => new Map(owners.value.map((owner) => [owner.id, owner])));
const patientById = computed(() => new Map(patients.value.map((patient) => [patient.id, patient])));

const decoratedHemograms = computed<HemogramRow[]>(() =>
  hemograms.value.map((hemogram) => {
    const patient = patientById.value.get(hemogram.patientId);
    const owner = patient ? ownerById.value.get(patient.primaryOwnerId) : undefined;
    const ownerName = owner?.fullName ?? 'Proprietário não identificado';
    const statusLabel = hemogram.status === 'resulted' ? 'Fechado' : 'Em análise';

    return {
      ...hemogram,
      clientName: ownerName,
      ownerName,
      animalName: patient?.name ?? hemogram.patientId,
      analysisAt: hemogram.status === 'resulted' ? hemogram.updatedAt : '',
      enteredAt: hemogram.createdAt,
      statusLabel,
      statusVariant: hemogram.status === 'resulted' ? 'success' : 'warning'
    };
  })
);

const filteredHemograms = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const client = normalizeSearch(appliedFilters.client);
  const owner = normalizeSearch(appliedFilters.owner);
  const animal = normalizeSearch(appliedFilters.animal);
  const body = normalizeSearch(appliedFilters.body);

  return decoratedHemograms.value.filter((hemogram) => {
    if (code && !normalizeSearch(hemogram.id).includes(code)) return false;
    if (client && !normalizeSearch(hemogram.clientName).includes(client)) return false;
    if (owner && !normalizeSearch(hemogram.ownerName).includes(owner)) return false;
    if (animal && !normalizeSearch(hemogram.animalName).includes(animal) && !normalizeSearch(hemogram.patientId).includes(animal)) {
      return false;
    }
    if (body && !normalizeSearch(hemogram.resultSummary).includes(body)) return false;
    if (appliedFilters.finalizedAt && hemogram.analysisAt.slice(0, 10) !== appliedFilters.finalizedAt) return false;
    if (appliedFilters.enteredAt && hemogram.enteredAt.slice(0, 10) !== appliedFilters.enteredAt) return false;
    if (!appliedFilters.closed && hemogram.status === 'resulted') return false;
    return true;
  });
});

const parameterRows = computed<ParameterRow[]>(() =>
  referenceValues.value.map((reference) => ({
    id: reference.id,
    group: classifyHemogramGroup(reference.parameter),
    parameter: displayParameter(reference.parameter),
    value: resolveLatestValue(reference.parameter),
    unit: reference.unit,
    minValue: reference.minValue,
    maxValue: reference.maxValue,
    statusLabel: resolveLatestValue(reference.parameter) === '-' ? 'Referência aplicada' : 'Dentro da faixa',
    statusVariant: 'info'
  }))
);

const outOfRangeCount = computed(() =>
  hemograms.value.filter((item) => normalizeSearch(item.resultSummary).includes('fora da faixa')).length
);

const historyCards = computed(() => [
  { title: 'Série vermelha', value: `${countByGroup('Série vermelha')} parâmetro(s)` },
  { title: 'Série branca', value: `${countByGroup('Série branca')} parâmetro(s)` },
  { title: 'Plaquetas', value: `${countByGroup('Plaquetas')} parâmetro(s)` },
  { title: 'Comparativo', value: `${filteredHemograms.value.length} registro(s)` }
]);

function normalizeSearch(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}...` : id;
}

function formatDate(value: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function displayParameter(value: string): string {
  const labels: Record<string, string> = {
    hemacias: 'Hemácias',
    leucocitos: 'Leucócitos'
  };
  return labels[normalizeSearch(value)] ?? value;
}

function classifyHemogramGroup(parameter: string): string {
  const normalized = normalizeSearch(parameter);
  if (normalized.includes('hemacia') || normalized.includes('hemoglobina') || normalized.includes('hematocrito')) {
    return 'Série vermelha';
  }
  if (normalized.includes('leucocito') || normalized.includes('neutrofilo') || normalized.includes('linfocito')) {
    return 'Série branca';
  }
  if (normalized.includes('plaqueta')) {
    return 'Plaquetas';
  }
  return 'Hematologia';
}

function countByGroup(group: string): number {
  return parameterRows.value.filter((row) => row.group === group).length;
}

function resolveLatestValue(parameter: string): string {
  const latestSummary = filteredHemograms.value[0]?.resultSummary;
  if (!latestSummary) return '-';

  const escaped = parameter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = latestSummary.match(new RegExp(`${escaped}\\s*[:=]\\s*([\\d.,]+)`, 'i'));
  return match?.[1] ?? '-';
}

function formatReference(row: ParameterRow): string {
  return `${row.minValue} - ${row.maxValue}`;
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [hemogramsResult, referencesResult, patientsResult, ownersResult] = await Promise.allSettled([
      laboratoryService.listHemograms({
        code: appliedFilters.code || undefined,
        finalizedAt: appliedFilters.finalizedAt || undefined,
        enteredAt: appliedFilters.enteredAt || undefined,
        body: appliedFilters.body || undefined,
        closed: appliedFilters.closed
      }),
      laboratoryService.listReferenceValues('HEM'),
      patientService.list({ pageSize: 500 }),
      ownerService.list({ pageSize: 500 })
    ]);

    if (hemogramsResult.status === 'rejected') {
      throw hemogramsResult.reason;
    }

    hemograms.value = hemogramsResult.value;
    referenceValues.value = referencesResult.status === 'fulfilled' ? referencesResult.value : [];
    patients.value = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
    owners.value = ownersResult.status === 'fulfilled' ? ownersResult.value : [];
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar hemogramas';
    hemograms.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-hemograms-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-grid,
.section-grid,
.history-grid {
  display: grid;
  gap: 12px;
}

.summary-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.section-grid {
  grid-template-columns: 1fr;
}

.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  align-items: end;
  gap: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.filter-field--wide {
  grid-column: span 2;
}

.filter-field input {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.record-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.history-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.history-card {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.history-card strong {
  color: var(--color-text, #0f172a);
}

.history-card span {
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .filters,
  .filter-field--wide {
    grid-template-columns: 1fr;
    grid-column: auto;
  }
}
</style>
