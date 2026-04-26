<template>
  <div class="laboratory-urinalysis-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Atendimentos', 'Urina']"
      title="Urina"
      subtitle="Análise urinária completa como resultado clínico estruturado por seções"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/diagnostics" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="summary-grid" aria-label="Resumo de urina">
      <DsStatCard :label="`${urinalysisResults.length} exame(s) de urina`" value="" icon="💧" />
      <DsStatCard :label="`${structuredSections.length} seção(ões)`" value="" icon="🧾" />
      <DsStatCard :label="`${referenceValues.length} achado(s) de referência`" value="" icon="🔬" />
    </section>

    <section class="filter-panel" aria-label="Filtros de urina">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Código do Exame</span>
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
          <span>Pesquisar Exames Fechados</span>
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="urinalysisColumns"
      :rows="filteredUrinalysis"
      :loading="loading"
      empty-icon="💧"
      empty-title="Nenhum registro encontrado"
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <span class="record-id">{{ shortId((row as UrinalysisRow).id) }}</span>
      </template>
      <template #cell-analysisAt="{ row }">
        {{ formatDate((row as UrinalysisRow).analysisAt) }}
      </template>
      <template #cell-enteredAt="{ row }">
        {{ formatDate((row as UrinalysisRow).enteredAt) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as UrinalysisRow).statusLabel"
          :variant="(row as UrinalysisRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/diagnostics?encounter=${(row as UrinalysisRow).encounterId}`"
          size="sm"
          variant="secondary"
        >
          Abrir
        </DsButton>
      </template>
    </DataTable>

    <section class="section-grid">
      <DsCard title="Resultado estruturado">
        <div class="analysis-grid">
          <article v-for="section in structuredSections" :key="section.title" class="analysis-card">
            <div>
              <strong>{{ section.title }}</strong>
              <span>{{ section.subtitle }}</span>
            </div>
            <ul>
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </DsCard>

      <DsCard title="Achados observacionais">
        <DataTable
          :columns="findingColumns"
          :rows="findingRows"
          :loading="loading"
          empty-icon="🔬"
          empty-title="Nenhum achado estruturado"
          compact
          variant="hoverable"
        >
          <template #cell-reference="{ row }">
            {{ formatReference(row as FindingRow) }}
          </template>
          <template #cell-status="{ row }">
            <StatusBadge
              :label="(row as FindingRow).statusLabel"
              :variant="(row as FindingRow).statusVariant"
              size="sm"
            />
          </template>
        </DataTable>
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

interface UrinalysisRow extends DiagnosticOrderSummary {
  clientName: string;
  ownerName: string;
  animalName: string;
  analysisAt: string;
  enteredAt: string;
  statusLabel: string;
  statusVariant: StatusVariant;
}

interface FindingRow {
  id: string;
  section: string;
  finding: string;
  value: string;
  unit: string;
  minValue: number;
  maxValue: number;
  statusLabel: string;
  statusVariant: StatusVariant;
}

const urinalysisResults = ref<DiagnosticOrderSummary[]>([]);
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

const urinalysisColumns: DataTableColumn[] = [
  { key: 'id', label: 'Código do Exame', width: '17%' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'ownerName', label: 'Proprietário' },
  { key: 'animalName', label: 'Animal' },
  { key: 'analysisAt', label: 'Data da Análise', width: '15%' },
  { key: 'enteredAt', label: 'Data de Entrada', width: '15%' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'actions', label: 'Abrir', class: 'table__actions-col', width: '110px' }
];

const findingColumns: DataTableColumn[] = [
  { key: 'section', label: 'Seção' },
  { key: 'finding', label: 'Achado' },
  { key: 'value', label: 'Valor' },
  { key: 'unit', label: 'Unidade' },
  { key: 'reference', label: 'Referência' },
  { key: 'status', label: 'Status', width: '170px' }
];

const structuredSections = [
  {
    title: 'Exame físico',
    subtitle: 'Macroscopia da amostra',
    items: ['Volume', 'Cor', 'Aspecto', 'Densidade urinária']
  },
  {
    title: 'Exame químico',
    subtitle: 'Fita ou leitura química',
    items: ['pH urinário', 'Proteína', 'Glicose', 'Corpos cetônicos']
  },
  {
    title: 'Exame microscópico',
    subtitle: 'Sedimento urinário',
    items: ['Células', 'Cristais', 'Cilindros', 'Bactérias']
  }
];

const ownerById = computed(() => new Map(owners.value.map((owner) => [owner.id, owner])));
const patientById = computed(() => new Map(patients.value.map((patient) => [patient.id, patient])));

const decoratedUrinalysis = computed<UrinalysisRow[]>(() =>
  urinalysisResults.value.map((result) => {
    const patient = patientById.value.get(result.patientId);
    const owner = patient ? ownerById.value.get(patient.primaryOwnerId) : undefined;
    const ownerName = owner?.fullName ?? 'Proprietário não identificado';
    const statusLabel = result.status === 'resulted' ? 'Fechado' : 'Em análise';

    return {
      ...result,
      clientName: ownerName,
      ownerName,
      animalName: patient?.name ?? result.patientId,
      analysisAt: result.status === 'resulted' ? result.updatedAt : '',
      enteredAt: result.createdAt,
      statusLabel,
      statusVariant: result.status === 'resulted' ? 'success' : 'warning'
    };
  })
);

const filteredUrinalysis = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const client = normalizeSearch(appliedFilters.client);
  const owner = normalizeSearch(appliedFilters.owner);
  const animal = normalizeSearch(appliedFilters.animal);
  const body = normalizeSearch(appliedFilters.body);

  return decoratedUrinalysis.value.filter((result) => {
    if (code && !normalizeSearch(result.id).includes(code)) return false;
    if (client && !normalizeSearch(result.clientName).includes(client)) return false;
    if (owner && !normalizeSearch(result.ownerName).includes(owner)) return false;
    if (animal && !normalizeSearch(result.animalName).includes(animal) && !normalizeSearch(result.patientId).includes(animal)) {
      return false;
    }
    if (body && !normalizeSearch(result.resultSummary).includes(body)) return false;
    if (appliedFilters.finalizedAt && result.analysisAt.slice(0, 10) !== appliedFilters.finalizedAt) return false;
    if (appliedFilters.enteredAt && result.enteredAt.slice(0, 10) !== appliedFilters.enteredAt) return false;
    if (!appliedFilters.closed && result.status === 'resulted') return false;
    return true;
  });
});

const findingRows = computed<FindingRow[]>(() =>
  referenceValues.value.map((reference) => ({
    id: reference.id,
    section: classifyUrinalysisSection(reference.parameter),
    finding: displayFinding(reference.parameter),
    value: resolveLatestValue(reference.parameter),
    unit: reference.unit,
    minValue: reference.minValue,
    maxValue: reference.maxValue,
    statusLabel: resolveLatestValue(reference.parameter) === '-' ? 'Achado esperado' : 'Registrado',
    statusVariant: 'info'
  }))
);

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

function displayFinding(value: string): string {
  const labels: Record<string, string> = {
    'densidade urinaria': 'Densidade urinária',
    'ph urinario': 'pH urinário'
  };
  return labels[normalizeSearch(value)] ?? value;
}

function classifyUrinalysisSection(parameter: string): string {
  const normalized = normalizeSearch(parameter);
  if (normalized.includes('densidade') || normalized.includes('volume') || normalized.includes('cor') || normalized.includes('aspecto')) {
    return 'Exame físico';
  }
  if (normalized.includes('ph') || normalized.includes('proteina') || normalized.includes('glicose') || normalized.includes('ceton')) {
    return 'Exame químico';
  }
  return 'Exame microscópico';
}

function resolveLatestValue(parameter: string): string {
  const latestSummary = filteredUrinalysis.value[0]?.resultSummary;
  if (!latestSummary) return '-';

  const escaped = parameter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = latestSummary.match(new RegExp(`${escaped}\\s*[:=]\\s*([\\w.,]+)`, 'i'));
  return match?.[1] ?? '-';
}

function formatReference(row: FindingRow): string {
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
    const [urinalysisResult, referencesResult, patientsResult, ownersResult] = await Promise.allSettled([
      laboratoryService.listUrinalysis({
        code: appliedFilters.code || undefined,
        finalizedAt: appliedFilters.finalizedAt || undefined,
        enteredAt: appliedFilters.enteredAt || undefined,
        body: appliedFilters.body || undefined,
        closed: appliedFilters.closed
      }),
      laboratoryService.listReferenceValues('URIN'),
      patientService.list({ pageSize: 500 }),
      ownerService.list({ pageSize: 500 })
    ]);

    if (urinalysisResult.status === 'rejected') {
      throw urinalysisResult.reason;
    }

    urinalysisResults.value = urinalysisResult.value;
    referenceValues.value = referencesResult.status === 'fulfilled' ? referencesResult.value : [];
    patients.value = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
    owners.value = ownersResult.status === 'fulfilled' ? ownersResult.value : [];
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar exames de urina';
    urinalysisResults.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-urinalysis-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-grid,
.section-grid,
.analysis-grid {
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

.analysis-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.analysis-card {
  min-height: 148px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.analysis-card div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.analysis-card strong {
  color: var(--color-text, #0f172a);
}

.analysis-card span,
.analysis-card li {
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.analysis-card ul {
  margin: 10px 0 0;
  padding-left: 18px;
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
