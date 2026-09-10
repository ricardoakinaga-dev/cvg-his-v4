<template>
  <div class="laboratory-workbench">
    <AppPageHeader :title="config.title" subtitle="Resultados por paciente e exame.">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/diagnostics">Novo exame</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="lookupWarnings.length && !loadFailed && !accessDenied" variant="warning">
      <span v-for="warning in lookupWarnings" :key="warning" class="lookup-warning">{{ warning }}</span>
    </DsAlert>

    <details class="lab-filters">
      <summary>Filtros da consulta</summary>
      <form class="lab-filter-grid" @submit.prevent="applyFilters">
        <DsInput v-model="draftFilters.code" type="search" :label="config.codeLabel" />
        <DsInput v-model="draftFilters.tutor" type="search" label="Tutor" />
        <DsInput v-model="draftFilters.animal" type="search" label="Animal" />
        <DsInput :model-value="draftFilters.closed ? 'closed' : 'open'" type="select" label="Situação"
          @update:model-value="draftFilters.closed = $event === 'closed'">
          <option value="closed">Concluídos</option>
          <option value="open">Não concluídos</option>
        </DsInput>
        <DsInput v-model="draftFilters.finalizedAt" type="date" label="Data da análise (UTC)" />
        <DsInput v-model="draftFilters.enteredAt" type="date" label="Data de entrada (UTC)" />
        <DsInput v-model="draftFilters.body" class="lab-filter-wide" type="search" label="Corpo do resultado" />
        <div class="lab-filter-actions">
          <DsButton type="submit" variant="primary" :disabled="loading">Pesquisar</DsButton>
          <DsButton type="button" variant="secondary" :disabled="loading" @click="clearFilters">Limpar</DsButton>
        </div>
      </form>
    </details>
    <p v-if="filtersChanged" class="lab-query-note">Filtros alterados. Pesquise para atualizar os exames.</p>

    <section aria-label="Lista de exames laboratoriais" class="lab-records">
      <div class="lab-section-heading"><h2>Exames encontrados</h2><span v-if="!loading && !loadFailed && !accessDenied">{{ rows.length }}</span></div>
      <DataTable :columns="recordColumns" :rows="rows" :loading="loading" caption="Exames encontrados"
        :feedback="recordFeedback"
        empty-title="Nenhum exame encontrado"
        empty-description="Revise os filtros ou atualize a consulta.">
        <template v-if="loadFailed" #feedbackAction>
          <DsButton variant="secondary" :loading="loading" :disabled="loading" @click="load">Tentar novamente</DsButton>
        </template>
        <template #cell-id="{ row }"><span class="lab-code">{{ row.id }}</span></template>
        <template #cell-animalName="{ row }"><button type="button" class="lab-patient-link" :aria-label="`Ver resultado de ${row.animalName}`" :aria-pressed="selectedId === row.id" @click="selectResult(row.id)">{{ row.animalName }}</button></template>
        <template #cell-updatedAt="{ row }">{{ formatDate(row.updatedAt) }}</template>
        <template #cell-status="{ row }"><StatusBadge :label="statusLabel(row.status)" :variant="row.status === 'resulted' ? 'success' : 'neutral'" /></template>
        <template #cell-actions="{ row }">
          <DsButton size="sm" variant="secondary" :aria-pressed="selectedId === row.id" @click="selectResult(row.id)">Ver resultado</DsButton>
        </template>
      </DataTable>
    </section>

    <section v-if="selected" ref="selectedRegion" class="lab-selected" tabindex="-1" aria-label="Resultado selecionado">
      <header class="lab-selected-header">
        <div><div class="lab-selected-caption"><span class="lab-eyebrow">Resultado selecionado</span><StatusBadge :label="statusLabel(selected.status)" :variant="selected.status === 'resulted' ? 'success' : 'neutral'" /></div><h2>{{ selected.animalName }}</h2><p>{{ selected.tutorName }}</p></div>
        <DsButton size="sm" variant="secondary" tag="a" :to="`/diagnostics?encounter=${selected.encounterId}`">Abrir exame</DsButton>
      </header>
      <dl class="lab-identity">
        <div><dt>Exame</dt><dd>{{ selected.id }}</dd></div>
        <div><dt>Paciente</dt><dd>{{ selected.patientId }}</dd></div>
        <div><dt>Atendimento</dt><dd>{{ selected.encounterId }}</dd></div>
        <div><dt>Atualizado em (UTC)</dt><dd>{{ formatDate(selected.updatedAt, true) }}</dd></div>
      </dl>
      <template v-if="parameterRows.length">
      <h3>Resultado estruturado</h3>
      <p class="lab-help">Valores, unidades, referências e sinalizações registrados neste exame.</p>
      <DataTable :columns="parameterColumns" :rows="parameterRows" caption="Parâmetros do exame selecionado"
        empty-title="Sem valores estruturados" empty-description="Consulte o texto original deste exame, quando informado.">
        <template #cell-status="{ row }"><StatusBadge :label="row.statusLabel" :variant="row.statusVariant" /></template>
      </DataTable>
      </template>
      <p v-else class="lab-help">Sem valores estruturados. Consulte o texto original deste exame.</p>
      <div class="lab-original"><h3>Texto original</h3><p>{{ selected.resultSummary || 'Resumo não informado.' }}</p></div>
    </section>

    <details v-if="!loading && !loadFailed && !accessDenied" class="lab-references">
      <summary>Referências cadastradas</summary>
      <p class="lab-help">Catálogo de consulta. As referências do resultado são as registradas no próprio exame.</p>
      <DataTable :columns="referenceColumns" :rows="referenceRows" :feedback="referenceFeedback" caption="Catálogo de referências"
        empty-title="Nenhuma referência cadastrada" empty-description="O catálogo não retornou referências para este tipo de exame.">
        <template v-if="referencesFailed" #feedbackAction>
          <DsButton variant="secondary" :loading="referenceLoading" :disabled="referenceLoading" @click="retryReferences">Tentar novamente</DsButton>
        </template>
      </DataTable>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn, type DataTableFeedback } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import { laboratoryService } from '@/services/laboratory';
import { patientService } from '@/services/patient';
import { ownerService } from '@/services/owner';
import type { DiagnosticOrderSummary, LaboratoryReferenceValueSummary } from '@cvg-his-v2/shared-types';
import type { PatientSummary } from '@/types/patient';
import type { OwnerSummary } from '@/types/owner';

const props = defineProps<{ examType: 'HEM' | 'URIN' | 'BIO' }>();
const configurations = {
  HEM: { title: 'Hemogramas', codeLabel: 'Código do Hemograma', method: 'listHemograms' },
  URIN: { title: 'Urina', codeLabel: 'Código do Exame', method: 'listUrinalysis' },
  BIO: { title: 'Bioquímico', codeLabel: 'Código do Exame', method: 'listBiochemistry' }
} as const;
const config = computed(() => configurations[props.examType]);
const emptyFilters = () => ({ code: '', tutor: '', animal: '', finalizedAt: '', enteredAt: '', body: '', closed: true });
const draftFilters = reactive(emptyFilters());
const appliedFilters = reactive(emptyFilters());
const filtersChanged = computed(() => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters));
const records = ref<DiagnosticOrderSummary[]>([]);
const references = ref<LaboratoryReferenceValueSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const owners = ref<OwnerSummary[]>([]);
const selectedId = ref('');
const selectedRegion = ref<HTMLElement | null>(null);
const loading = ref(true);
const loadFailed = ref(false);
const accessDenied = ref(false);
const referencesFailed = ref(false);
const referenceLoading = ref(false);
const lookupWarnings = ref<string[]>([]);
const error = ref('');
let requestId = 0;
let referenceRequestId = 0;

const recordColumns: DataTableColumn[] = [
  { key: 'animalName', label: 'Paciente' }, { key: 'updatedAt', label: 'Atualizado em' },
  { key: 'tutorName', label: 'Tutor' }, { key: 'id', label: 'Exame' },
  { key: 'status', label: 'Situação' }, { key: 'actions', label: 'Resultado' }
];
const parameterColumns: DataTableColumn[] = [
  { key: 'parameter', label: 'Parâmetro' }, { key: 'value', label: 'Valor' },
  { key: 'unit', label: 'Unidade' }, { key: 'reference', label: 'Referência do exame' },
  { key: 'status', label: 'Sinalização do exame' }
];
const referenceColumns: DataTableColumn[] = [
  { key: 'parameter', label: 'Parâmetro' }, { key: 'minimum', label: 'Mínimo' },
  { key: 'maximum', label: 'Máximo' }, { key: 'unit', label: 'Unidade' }
];
const rows = computed(() => {
  if (loading.value || loadFailed.value || accessDenied.value) return [];
  const patientMap = new Map(patients.value.map(patient => [patient.id, patient]));
  const ownerMap = new Map(owners.value.map(owner => [owner.id, owner]));
  return records.value.map(record => {
    const patient = patientMap.get(record.patientId);
    const owner = patient && ownerMap.get(patient.primaryOwnerId);
    return { ...record, animalName: patient?.name || `Paciente ${record.patientId}`,
      tutorName: owner?.fullName || 'Tutor não identificado' };
  }).filter(record => {
    const match = (value: string | undefined, query: string) => !query || normalize(value).includes(normalize(query));
    return match(record.id, appliedFilters.code)
      && match(record.tutorName, appliedFilters.tutor)
      && (!appliedFilters.animal || match(record.animalName, appliedFilters.animal) || match(record.patientId, appliedFilters.animal))
      && match([record.resultSummary, ...(record.resultValues ?? []).flatMap(value => [value.parameter, value.value, value.unit, value.reference])].filter(Boolean).join(' '), appliedFilters.body)
      && (!appliedFilters.finalizedAt || (record.status === 'resulted' && record.updatedAt.slice(0, 10) === appliedFilters.finalizedAt))
      && (!appliedFilters.enteredAt || record.createdAt.slice(0, 10) === appliedFilters.enteredAt)
      && (appliedFilters.closed ? record.status === 'resulted' : record.status !== 'resulted');
  });
});
const hasActiveFilters = computed(() => Boolean(
  appliedFilters.code || appliedFilters.tutor || appliedFilters.animal || appliedFilters.finalizedAt
  || appliedFilters.enteredAt || appliedFilters.body || !appliedFilters.closed
));
const recordFeedback = computed<DataTableFeedback | null>(() => {
  if (accessDenied.value) {
    return {
      kind: 'forbidden',
      icon: '🔒',
      title: 'Acesso aos exames negado',
      description: 'Seu perfil não tem a permissão diagnostics.read para consultar resultados laboratoriais.'
    };
  }
  if (loadFailed.value) {
    return {
      kind: 'error',
      icon: '⚠️',
      title: 'Não foi possível carregar os exames',
      description: error.value || 'A consulta falhou. Tente novamente para atualizar os resultados.'
    };
  }
  if (hasActiveFilters.value && rows.value.length === 0) {
    return {
      kind: 'no-results',
      icon: '🔎',
      title: 'Nenhum exame corresponde aos filtros',
      description: 'Revise os filtros e tente novamente.'
    };
  }
  return null;
});
const selected = computed(() => rows.value.find(record => record.id === selectedId.value) ?? null);
const parameterRows = computed(() => (selected.value?.resultValues ?? []).map((value, index) => ({
  id: `${selected.value!.id}-${index}`, parameter: displayParameter(value.parameter), value: value.value || '—',
  unit: value.unit || '—', reference: value.reference || '—',
  statusLabel: value.outOfRange === true ? 'Fora da faixa' : value.outOfRange === false ? 'Dentro da faixa' : 'Não informada',
  statusVariant: value.outOfRange === true ? 'warning' as const : value.outOfRange === false ? 'success' as const : 'neutral' as const
})));
const referenceRows = computed(() => references.value.map(value => ({ ...value, parameter: displayParameter(value.parameter),
  minimum: formatNumber(value.minValue), maximum: formatNumber(value.maxValue) })));
const referenceFeedback = computed<DataTableFeedback | null>(() => referencesFailed.value ? {
  kind: 'unavailable',
  icon: 'clock',
  title: 'Referências indisponíveis',
  description: 'O catálogo não respondeu. Tente novamente; os resultados registrados continuam disponíveis.'
} : null);

function normalize(value: string | undefined) { return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(); }
function displayParameter(value: string) {
  const labels: Record<string, string> = { hemacias: 'Hemácias', leucocitos: 'Leucócitos', 'densidade urinaria': 'Densidade urinária', 'ph urinario': 'pH urinário' };
  return labels[normalize(value)] ?? value;
}
function formatNumber(value: number) { return Number.isFinite(value) ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 20 }).format(value) : '—'; }
function formatDate(value: string, time = false) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', ...(time ? { timeStyle: 'short' as const } : {}), timeZone: 'UTC' }).format(parsed);
}
function statusLabel(value: DiagnosticOrderSummary['status']) { return ({ requested: 'Solicitado', collected: 'Coletado', resulted: 'Concluído', cancelled: 'Cancelado' })[value]; }
function isForbiddenError(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && 'status' in cause
    && (cause as { status?: unknown }).status === 403;
}
async function selectResult(id: string) {
  if (!rows.value.some(record => record.id === id)) return;
  selectedId.value = id;
  await nextTick();
  if (selectedId.value !== id) return;
  selectedRegion.value?.focus({ preventScroll: true });
  selectedRegion.value?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
}
function applyFilters() { Object.assign(appliedFilters, draftFilters); void load(); }
function clearFilters() { Object.assign(draftFilters, emptyFilters()); applyFilters(); }

async function retryReferences() {
  if (loading.value || referenceLoading.value || !referencesFailed.value) return;
  const generation = requestId;
  const retry = ++referenceRequestId;
  const examType = props.examType;
  referenceLoading.value = true;
  try {
    const result = await laboratoryService.listReferenceValues(examType);
    if (generation !== requestId || retry !== referenceRequestId) return;
    references.value = result;
    referencesFailed.value = false;
  } catch {
    if (generation === requestId && retry === referenceRequestId) referencesFailed.value = true;
  } finally {
    if (generation === requestId && retry === referenceRequestId) referenceLoading.value = false;
  }
}

async function resolveIdentities<T extends { id: string }>(ids: string[], get: (id: string) => Promise<T>, generation: number) {
  const items: T[] = [];
  let failed = false;
  for (let offset = 0; offset < ids.length && generation === requestId; offset += 6) {
    const batch = ids.slice(offset, offset + 6);
    const results = await Promise.allSettled(batch.map(id => get(id)));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.id === batch[index]) items.push(result.value);
      else failed = true;
    });
  }
  return { items, failed };
}

async function load() {
  const generation = ++requestId;
  referenceRequestId += 1;
  const previousId = selectedId.value;
  const query = { ...appliedFilters };
  const examType = props.examType;
  const method = configurations[examType].method;
  loading.value = true; loadFailed.value = false; accessDenied.value = false; error.value = ''; lookupWarnings.value = [];
  selectedId.value = ''; records.value = []; references.value = []; patients.value = []; owners.value = [];
  referencesFailed.value = false; referenceLoading.value = false;
  try {
    const [result, referenceResult, patientResult, ownerResult] = await Promise.allSettled([
      laboratoryService[method]({ code: query.code || undefined, finalizedAt: query.finalizedAt || undefined,
        enteredAt: query.enteredAt || undefined, body: query.body || undefined, closed: query.closed }),
      laboratoryService.listReferenceValues(examType), patientService.list({ pageSize: 200 }), ownerService.list({ pageSize: 200 })
    ]);
    if (generation !== requestId) return;
    if (result.status === 'rejected') throw result.reason;
    const knownPatients = patientResult.status === 'fulfilled' ? [...patientResult.value] : [];
    const knownOwners = ownerResult.status === 'fulfilled' ? [...ownerResult.value] : [];
    let patientsUnavailable = patientResult.status === 'rejected';
    let ownersUnavailable = ownerResult.status === 'rejected';
    if (!patientsUnavailable) {
      const missing = [...new Set(result.value.map(record => record.patientId))].filter(id => !knownPatients.some(patient => patient.id === id));
      const resolved = await resolveIdentities(missing, id => patientService.getById(id), generation);
      if (generation !== requestId) return;
      knownPatients.push(...resolved.items);
      patientsUnavailable = resolved.failed;
    }
    if (!ownersUnavailable) {
      const missing = [...new Set(knownPatients.map(patient => patient.primaryOwnerId).filter(Boolean))].filter(id => !knownOwners.some(owner => owner.id === id));
      const resolved = await resolveIdentities(missing, id => ownerService.getById(id), generation);
      if (generation !== requestId) return;
      knownOwners.push(...resolved.items);
      ownersUnavailable = resolved.failed;
    }
    if ((query.animal && patientsUnavailable) || (query.tutor && (patientsUnavailable || ownersUnavailable))) {
      throw new Error('Não foi possível aplicar os filtros de identificação. Tente novamente.');
    }
    records.value = result.value;
    referencesFailed.value = referenceResult.status === 'rejected';
    if (referenceResult.status === 'fulfilled') references.value = referenceResult.value;
    patients.value = knownPatients;
    owners.value = knownOwners;
    if (patientsUnavailable) lookupWarnings.value.push('Identificação dos pacientes indisponível para parte ou todos os exames. Confira os códigos dos pacientes.');
    if (ownersUnavailable) lookupWarnings.value.push('Identificação dos tutores indisponível para parte ou todos os exames.');
    loading.value = false;
    selectedId.value = rows.value.some(record => record.id === previousId) ? previousId : rows.value[0]?.id ?? '';
  } catch (cause) {
    if (generation !== requestId) return;
    accessDenied.value = isForbiddenError(cause);
    loadFailed.value = !accessDenied.value;
    error.value = cause instanceof Error ? cause.message : 'Não foi possível carregar os exames. Tente novamente.';
  } finally {
    if (generation === requestId) loading.value = false;
  }
}
onMounted(load);
watch(() => props.examType, () => { Object.assign(draftFilters, emptyFilters()); Object.assign(appliedFilters, emptyFilters()); void load(); });
onBeforeUnmount(() => { requestId += 1; });
</script>

<style scoped>
.laboratory-workbench { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.lab-filters, .lab-references { border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); padding: 0 16px 16px; }
.lab-filters:not([open]), .lab-references:not([open]) { padding-bottom: 0; }
summary { min-height: 52px; display: list-item; align-content: center; cursor: pointer; font-weight: 600; color: var(--color-text); }
summary:focus-visible { outline: 2px solid var(--color-primary-500); outline-offset: 2px; border-radius: 4px; }
.lab-filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; padding-top: 12px; }
.lab-filter-wide { grid-column: span 2; }
.lab-filter-actions { grid-column: 1 / -1; display: flex; gap: 10px; }
.lab-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
h2, h3, p { margin: 0; }
h2 { font-size: 20px; line-height: 1.3; } h3 { font-size: 16px; line-height: 1.4; }
.lab-section-heading > span { color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.lab-selected { scroll-margin-top: 154px; min-width: 0; padding: 24px; border: 1px solid var(--color-border); border-top: 3px solid var(--color-primary-500); border-radius: 18px; background: var(--color-surface); }
.lab-selected-header { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
.lab-selected-caption { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.lab-selected-header h2 { margin: 6px 0; font-size: 26px; overflow-wrap: anywhere; }
.lab-selected-header p, .lab-help, .lab-query-note { color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }
.lab-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--color-primary-600); }
.lab-identity { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin: 20px 0 24px; padding: 16px 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
.lab-identity dt { color: var(--color-text-secondary); font-size: 12px; margin-bottom: 4px; }
.lab-identity dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
.lab-help { margin: 8px 0 16px; }.lab-original { margin-top: 24px; }.lab-original p { margin-top: 10px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; }
.lab-patient-link { padding: 8px 0; min-height: 44px; border: 0; background: transparent; text-align: left; font: inherit; font-weight: 600; color: var(--color-text); cursor: pointer; text-decoration: underline; text-decoration-color: var(--color-primary-500); text-underline-offset: 4px; }
.lab-patient-link:focus-visible, .lab-selected:focus-visible { outline: 2px solid var(--color-primary-500); outline-offset: 3px; }
.lab-code { font-size: 12px; overflow-wrap: anywhere; }
.lookup-warning { display: block; }.lookup-warning + .lookup-warning { margin-top: 6px; }
.lab-unavailable { padding: 12px 0; color: var(--color-text-secondary); }
:deep(.data-table td), :deep(.data-table th) { overflow-wrap: anywhere; }
@media (max-width: 900px) { .lab-filter-grid, .lab-identity { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 520px) {
  .laboratory-workbench { gap: 18px; }.lab-selected { padding: 16px; scroll-margin-top: 190px; }
  :deep(.app-page-header__actions) { display: flex; flex-wrap: nowrap; gap: 8px; }
  :deep(.app-page-header__actions > .ds-btn) { flex: 1 1 0; width: auto; }
  .lab-selected-header { flex-direction: column; gap: 12px; }.lab-selected-header h2 { font-size: 23px; }
  .lab-filter-grid { gap: 12px; }.lab-identity { gap: 12px; }.lab-filters, .lab-references { padding-left: 12px; padding-right: 12px; }
}
</style>
