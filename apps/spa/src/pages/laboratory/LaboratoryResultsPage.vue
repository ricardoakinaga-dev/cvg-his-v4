<template>
  <div class="laboratory-results-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Atendimentos', 'Laudos']"
      title="Laudos"
      subtitle="Documentos laboratoriais por cliente, proprietário, animal e datas"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/diagnostics" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="filter-panel" aria-label="Filtros de laudos">
      <form @submit.prevent="applyFilters">
        <div class="filters filters--primary">
          <label class="filter-field">
            <span>Código do Laudo</span>
            <input v-model="draftFilters.code" name="code" type="search" autocomplete="off" />
          </label>
          <label class="filter-field">
            <span>Animal</span>
            <input v-model="draftFilters.animal" name="animal" type="search" autocomplete="off" />
          </label>
          <DsButton type="submit" variant="primary">Pesquisar</DsButton>
        </div>
        <details class="advanced-filters" :open="Boolean(route.query.type)">
          <summary>Mais filtros<span v-if="advancedFilterCount"> · {{ advancedFilterCount }} aplicado(s)</span></summary>
          <div class="filters">
            <label class="filter-field">
              <span>Cliente</span>
              <input v-model="draftFilters.client" name="client" type="search" autocomplete="off" />
            </label>
            <label class="filter-field">
              <span>Proprietário</span>
              <input v-model="draftFilters.owner" name="owner" type="search" autocomplete="off" />
            </label>
            <label class="filter-field">
              <span>Data da Finalização</span>
              <input v-model="draftFilters.finalizedAt" name="finalizedAt" type="date" />
            </label>
            <label class="filter-field">
              <span>Data de Entrada</span>
              <input v-model="draftFilters.enteredAt" name="enteredAt" type="date" />
            </label>
            <label class="filter-field filter-field--wide">
              <span>Corpo do Laudo</span>
              <input v-model="draftFilters.body" name="body" type="search" autocomplete="off" />
            </label>
            <label class="checkbox-field">
              <input v-model="draftFilters.closed" name="closed" type="checkbox" />
              <span>Pesquisar Laudos Fechados</span>
            </label>
          </div>
        </details>
      </form>
    </section>

    <p v-if="!loading && !loadFailed" class="record-count" role="status">{{ filteredReports.length }} registro(s) encontrado(s)</p>
    <section v-if="loadFailed && !loading" class="load-failure" role="status">
      <strong>Não foi possível carregar os laudos</strong>
      <DsButton variant="secondary" @click="load">Tentar novamente</DsButton>
    </section>

    <DataTable
      v-else
      :columns="columns"
      :rows="filteredReports"
      :loading="loading"
      empty-icon="📋"
      empty-title="Nenhum registro encontrado"
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <span class="report-id">{{ shortId((row as LaboratoryReportRow).id) }}</span>
      </template>
      <template #cell-finalizedAt="{ row }">
        {{ formatDate((row as LaboratoryReportRow).finalizedAt) }}
      </template>
      <template #cell-enteredAt="{ row }">
        {{ formatDate((row as LaboratoryReportRow).enteredAt) }}
      </template>
      <template #cell-value="{ row }">
        <span title="Valor não informado">{{ (row as LaboratoryReportRow).value }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="report-actions">
          <DsButton
            tag="a"
            :to="`/diagnostics?encounter=${(row as LaboratoryReportRow).encounterId}`"
            size="sm"
            variant="secondary"
          >
            Abrir
          </DsButton>
          <DsButton
            size="sm"
            variant="primary"
            :loading="printingId === (row as LaboratoryReportRow).id"
            @click="openPrintableReport(row as LaboratoryReportRow)"
          >
            Laudo
          </DsButton>
        </div>
      </template>
    </DataTable>

    <details class="summary-disclosure">
      <summary>Resumo dos laudos</summary>
      <dl class="summary-grid" aria-label="Resumo dos laudos">
        <div><dt>Laudos</dt><dd>{{ loading || loadFailed ? '—' : reports.length }}</dd></div>
        <div><dt>Fechados</dt><dd>{{ loading || loadFailed ? '—' : closedCount }}</dd></div>
        <div><dt>Com anomalia · geral</dt><dd>{{ loading || loadFailed || !anomalies ? '—' : anomalies.flaggedOrders }}</dd></div>
      </dl>
      <p v-if="!loading && !loadFailed && !anomalies" class="summary-note">Análise de anomalias indisponível.</p>
      <p class="summary-note">Laudos e fechados: registros carregados, antes dos filtros locais. Anomalias: análise geral do laboratório.</p>
    </details>

    <DsModal
      :open="Boolean(printableReportHtml)"
      title="Laudo imprimível"
      size="lg"
      @close="closePrintableReport"
    >
      <iframe
        v-if="printableReportHtml"
        class="print-preview"
        title="Pré-visualização do laudo"
        :srcdoc="printableReportHtml"
      />
      <template #footer>
        <DsButton variant="ghost" @click="closePrintableReport">Fechar</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { laboratoryService } from '@/services/laboratory';
import { mlService, type LabAnomalyResponse } from '@/services/ml';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';

interface LaboratoryReportRow extends DiagnosticOrderSummary {
  clientName: string;
  ownerName: string;
  animalName: string;
  finalizedAt: string;
  enteredAt: string;
  value: string;
}

const route = useRoute();
const reports = ref<DiagnosticOrderSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const owners = ref<OwnerSummary[]>([]);
const anomalies = ref<LabAnomalyResponse | null>(null);
const loading = ref(false);
const loadFailed = ref(false);
const printingId = ref<string | null>(null);
const printableReportHtml = ref('');
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

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Código de Laudo', width: '16%' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'ownerName', label: 'Proprietário' },
  { key: 'animalName', label: 'Animal' },
  { key: 'finalizedAt', label: 'Data de Finalização', width: '16%' },
  { key: 'enteredAt', label: 'Data de Entrada', width: '15%' },
  { key: 'value', label: 'Valor', width: '110px' },
  { key: 'actions', label: 'Abrir', class: 'table__actions-col', width: '110px' }
];

const ownerById = computed(() => new Map(owners.value.map((owner) => [owner.id, owner])));
const patientById = computed(() => new Map(patients.value.map((patient) => [patient.id, patient])));

const decoratedReports = computed<LaboratoryReportRow[]>(() =>
  reports.value.map((report) => {
    const patient = patientById.value.get(report.patientId);
    const owner = patient ? ownerById.value.get(patient.primaryOwnerId) : undefined;
    const ownerName = owner?.fullName ?? 'Proprietário não identificado';
    return {
      ...report,
      clientName: ownerName,
      ownerName,
      animalName: patient?.name ?? report.patientId,
      finalizedAt: report.status === 'resulted' ? report.updatedAt : '',
      enteredAt: report.createdAt,
      value: '—'
    };
  })
);

const filteredReports = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const client = normalizeSearch(appliedFilters.client);
  const owner = normalizeSearch(appliedFilters.owner);
  const animal = normalizeSearch(appliedFilters.animal);
  const body = normalizeSearch(appliedFilters.body);

  return decoratedReports.value.filter((report) => {
    if (code && !normalizeSearch(report.id).includes(code)) return false;
    if (client && !normalizeSearch(report.clientName).includes(client)) return false;
    if (owner && !normalizeSearch(report.ownerName).includes(owner)) return false;
    if (animal && !normalizeSearch(report.animalName).includes(animal) && !normalizeSearch(report.patientId).includes(animal)) {
      return false;
    }
    if (body && !laboratoryResultSearchText(report).includes(body)) return false;
    if (appliedFilters.finalizedAt && report.finalizedAt.slice(0, 10) !== appliedFilters.finalizedAt) return false;
    if (appliedFilters.enteredAt && report.enteredAt.slice(0, 10) !== appliedFilters.enteredAt) return false;
    if (!appliedFilters.closed && report.status === 'resulted') return false;
    return true;
  });
});

const closedCount = computed(() => reports.value.filter((item) => item.status === 'resulted').length);
const advancedFilterCount = computed(() =>
  [appliedFilters.client, appliedFilters.owner, appliedFilters.finalizedAt, appliedFilters.enteredAt, appliedFilters.body]
    .filter(Boolean).length + (appliedFilters.closed ? 0 : 1)
);

function normalizeSearch(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function laboratoryResultSearchText(report: LaboratoryReportRow): string {
  return normalizeSearch([
    report.resultSummary,
    ...(report.resultValues ?? []).flatMap((value) => [
      value.parameter,
      value.value,
      value.unit,
      value.reference
    ])
  ].filter((part): part is string => Boolean(part)).join(' '));
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

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

function closePrintableReport() {
  printableReportHtml.value = '';
}

async function openPrintableReport(report: LaboratoryReportRow) {
  printingId.value = report.id;
  error.value = '';
  try {
    printableReportHtml.value = await laboratoryService.printReport(report.id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao gerar laudo imprimível';
  } finally {
    printingId.value = null;
  }
}

async function load() {
  loading.value = true;
  loadFailed.value = false;
  error.value = '';
  try {
    const [reportsResult, patientsResult, ownersResult, anomalyResponse] = await Promise.allSettled([
      laboratoryService.listResults({
        code: appliedFilters.code || undefined,
        finalizedAt: appliedFilters.finalizedAt || undefined,
        enteredAt: appliedFilters.enteredAt || undefined,
        body: appliedFilters.body || undefined,
        closed: appliedFilters.closed
      }),
      patientService.list({ pageSize: 500 }),
      ownerService.list({ pageSize: 500 }),
      mlService.getLabAnomalies({ examType: undefined }).catch(() => null)
    ]);

    if (reportsResult.status === 'rejected') {
      throw reportsResult.reason;
    }

    reports.value = reportsResult.value;
    patients.value = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
    owners.value = ownersResult.status === 'fulfilled' ? ownersResult.value : [];
    anomalies.value = anomalyResponse.status === 'fulfilled' ? anomalyResponse.value : null;
  } catch (err: unknown) {
    loadFailed.value = true;
    error.value = err instanceof Error ? err.message : 'Erro ao carregar laudos';
    reports.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query.type,
  (value) => {
    const type = typeof value === 'string' ? value : '';
    if (type) {
      draftFilters.body = type;
      appliedFilters.body = type;
    }
  },
  { immediate: true }
);

onMounted(load);
</script>

<style scoped>
.laboratory-results-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-disclosure summary {
  min-height: 44px;
  padding-block: 12px;
  box-sizing: border-box;
  color: var(--color-text-secondary);
  font-weight: 700;
  cursor: pointer;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin: 8px 0;
}
.summary-grid > div {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}
.summary-grid dt, .summary-note, .record-count {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.summary-grid dd {
  margin: 6px 0 0;
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.record-count { margin: 0; }
.load-failure {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
}

.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.advanced-filters summary {
  min-height: 44px;
  box-sizing: border-box;
  padding-block: 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  align-items: end;
  gap: 12px;
}

.filters--primary { grid-template-columns: repeat(2, minmax(0, 1fr)) auto; }

.filter-field {
  min-width: 0;
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
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  min-height: 44px;
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
  min-height: 44px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.report-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.report-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, max-content));
  align-items: center;
  gap: 6px;
}

.print-preview {
  width: 100%;
  min-height: 70vh;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: #ffffff;
}

@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-field--wide, .checkbox-field { grid-column: 1 / -1; }
  .filters--primary > button { grid-column: 1 / -1; }
}
</style>
