<template>
  <div class="inpatient-daily-charges-page">
    <AppPageHeader title="Diárias de Internação">
      <template #actions>
        <DsButton tag="a" to="/inpatient" variant="secondary">Internações</DsButton>
        <DsButton tag="a" to="/billing" variant="secondary">Contas a Receber</DsButton>
      </template>
    </AppPageHeader>

    <form class="filters" aria-label="Filtrar diárias" @submit.prevent="applyFilters">
      <label for="daily-status">Status
        <select id="daily-status" v-model="filters.status">
          <option value="pending">Pendentes</option><option value="billed">Faturadas</option>
          <option value="cancelled">Canceladas</option><option value="">Todas</option>
        </select>
      </label>
      <label for="daily-unit">Unidade<input id="daily-unit" v-model="filters.unit" placeholder="Ex.: UTI" /></label>
      <label for="daily-ward">Enfermaria<input id="daily-ward" v-model="filters.ward" placeholder="Ex.: Ala A" /></label>
      <DsButton type="submit" variant="primary">Filtrar</DsButton>
    </form>

    <div class="query-context" aria-live="polite">
      <p><span class="eyebrow">{{ loading || error ? 'Consulta solicitada' : 'Filtros aplicados' }}</span><strong>{{ scopeLabel }}</strong></p>
      <span v-if="hasDraftChanges" class="draft-notice">Alterações nos filtros ainda não aplicadas.</span>
    </div>

    <DsAlert v-if="error" variant="danger">
      <strong>Não foi possível consultar as diárias.</strong><p class="error-detail">{{ error }}</p>
      <DsButton variant="secondary" @click="refresh">Tentar novamente</DsButton>
    </DsAlert>
    <p v-if="loading" class="loading-message" role="status">Consultando diárias de internação…</p>

    <template v-if="worklist && !loading && !error">
      <section class="summary-grid" :class="{ 'summary-grid--wide': wideSummary }" aria-label="Valores da consulta">
        <div class="amount-card"><span class="amount-icon" aria-hidden="true"><DsIcon name="clock" size="lg" /></span><div>
          <h2>Pendente</h2><strong class="summary-value">{{ formatCurrency(worklist.totalPendingAmount) }}</strong>
          <span class="muted">{{ pendingCount }} {{ pendingCount === 1 ? 'lançamento' : 'lançamentos' }}</span>
        </div></div>
        <div class="amount-card"><span class="amount-icon amount-icon--billed" aria-hidden="true"><DsIcon name="check" size="lg" /></span><div>
          <h2>Faturado</h2><strong class="summary-value">{{ formatCurrency(worklist.totalBilledAmount) }}</strong>
          <span class="muted">{{ billedCount }} {{ billedCount === 1 ? 'lançamento' : 'lançamentos' }}</span>
        </div></div>
      </section>
      <div class="results-heading"><div class="results-title"><h2>Lançamentos</h2><span>{{ worklist.items.length }} na consulta</span></div><DsButton variant="secondary" @click="refresh">Atualizar</DsButton></div>
      <DsAlert v-if="failedPatientIds.length" variant="warning">
        Alguns pacientes não puderam ser identificados. Os códigos completos permanecem na tabela.
        <div class="recovery-action"><DsButton variant="secondary" :loading="identitiesLoading" @click="retryIdentities">Recarregar identificação</DsButton></div>
      </DsAlert>
    </template>

    <DataTable v-if="loading || worklist" :columns="columns" :rows="worklist?.items ?? []" :loading="loading"
      caption="Lançamentos de diárias de internação" empty-icon="receipt"
      empty-title="Nenhuma diária encontrada" empty-description="Não há lançamentos para os filtros aplicados." variant="hoverable" compact>
      <template #cell-patient="{ row }">
        <div class="cell-stack patient-cell">
          <strong v-if="patientNames[row.patientId]">{{ patientNames[row.patientId] }}</strong>
          <span v-else class="muted">{{ failedPatientIds.includes(row.patientId) ? 'Identificação indisponível' : 'Identificando paciente…' }}</span>
          <span class="identity-code">{{ row.patientId }}</span>
        </div>
      </template>
      <template #cell-location="{ row }"><div class="cell-stack"><strong>{{ row.unit }}</strong><span class="muted">{{ row.ward }}</span><span class="muted">Leito {{ row.bed }}</span></div></template>
      <template #cell-description="{ row }"><div class="cell-stack"><strong>{{ row.description }}</strong><span class="muted">{{ row.quantity }} × {{ formatCurrency(row.unitAmount) }}</span></div></template>
      <template #cell-chargeDate="{ row }">{{ formatChargeDate(row.chargeDate) }}</template>
      <template #cell-total="{ row }"><strong class="cell-amount">{{ formatCurrency(row.totalAmount) }}</strong></template>
      <template #cell-status="{ row }"><StatusBadge :label="statusLabel(row.status)" :variant="statusVariant(row.status)" /></template>
      <template #cell-actions="{ row }"><div class="actions">
        <DsButton tag="a" :to="`/inpatient/${row.stayId}`" size="sm" variant="secondary">Internação</DsButton>
        <DsButton v-if="row.billingRecordId" tag="a" :to="`/billing/${row.encounterId}`" size="sm" variant="ghost">Cobrança</DsButton>
      </div></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue';
import { inpatientService } from '@/services/inpatient';
import { patientService } from '@/services/patient';
import type { InpatientDailyChargeSummary, InpatientDailyChargeWorklistItem, InpatientDailyChargeWorklistResponse } from '@/types/inpatient';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';

type Filters = { status: InpatientDailyChargeSummary['status'] | ''; unit: string; ward: string };
const filters = reactive<Filters>({ status: 'pending', unit: '', ward: '' });
const requestedFilters = ref<Filters>({ ...filters });
const appliedFilters = ref<Filters>({ ...filters });
const normalize = (value: Filters): Filters => ({ status: value.status, unit: value.unit.trim(), ward: value.ward.trim() });
const loading = ref(true), error = ref('');
const worklist = ref<InpatientDailyChargeWorklistResponse | null>(null);
const patientNames = ref<Record<string, string>>({});
const failedPatientIds = ref<string[]>([]), identitiesLoading = ref(false);
let active = true, generation = 0, identityGeneration = 0;
const isCurrent = (version: number) => active && generation === version;
const hasDraftChanges = computed(() => JSON.stringify(normalize(filters)) !== JSON.stringify(requestedFilters.value));
const scopeLabel = computed(() => {
  const scope = loading.value || error.value ? requestedFilters.value : appliedFilters.value;
  return [scope.status ? { pending: 'Pendentes', billed: 'Faturadas', cancelled: 'Canceladas' }[scope.status] : 'Todos os status', scope.unit || 'Todas as unidades', scope.ward || 'Todas as enfermarias'].join(' · ');
});
const pendingCount = computed(() => worklist.value?.items.filter(item => item.status === 'pending').length ?? 0);
const billedCount = computed(() => worklist.value?.items.filter(item => item.status === 'billed').length ?? 0);
const columns: DataTableColumn[] = [
  { key: 'patient', label: 'Paciente', width: '190px' }, { key: 'location', label: 'Local', width: '155px' },
  { key: 'description', label: 'Diária', width: '210px' }, { key: 'chargeDate', label: 'Data', width: '110px' },
  { key: 'total', label: 'Total', width: '125px' }, { key: 'status', label: 'Status', width: '105px' }, { key: 'actions', label: 'Ações', width: '210px' }
];
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const wideSummary = computed(() => worklist.value && [worklist.value.totalPendingAmount, worklist.value.totalBilledAmount].some(value => formatCurrency(value).length > 16));
function formatCurrency(value: number) { return Number.isFinite(value) ? currency.format(value) : 'Não informado'; }
function formatChargeDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || 'Não informada';
}
function statusLabel(status: InpatientDailyChargeSummary['status']) { return { pending: 'Pendente', billed: 'Faturada', cancelled: 'Cancelada' }[status] ?? status; }
function statusVariant(status: InpatientDailyChargeSummary['status']): 'warning' | 'success' | 'neutral' { return ({ pending: 'warning', billed: 'success', cancelled: 'neutral' } as const)[status] ?? 'neutral'; }

async function resolvePatients(items: InpatientDailyChargeWorklistItem[]) {
  const version = generation, identityRequest = ++identityGeneration;
  const ids = [...new Set(items.map(item => item.patientId))].filter(id => !patientNames.value[id]);
  failedPatientIds.value = []; identitiesLoading.value = ids.length > 0;
  let cursor = 0;
  const current = () => isCurrent(version) && identityGeneration === identityRequest;
  const worker = async () => {
    while (current() && cursor < ids.length) {
      const id = ids[cursor++]!;
      try {
        const patient = await patientService.getById(id);
        if (!current()) return;
        if (patient.id !== id || !patient.name?.trim()) throw new Error('Patient identity mismatch');
        patientNames.value = { ...patientNames.value, [id]: patient.name };
      } catch { if (current()) failedPatientIds.value = [...failedPatientIds.value, id]; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));
  if (current()) identitiesLoading.value = false;
}
function retryIdentities() { if (worklist.value && !loading.value && !identitiesLoading.value) void resolvePatients(worklist.value.items); }
async function load(scope: Filters) {
  const version = ++generation;
  identityGeneration++; identitiesLoading.value = false; failedPatientIds.value = []; patientNames.value = {};
  const snapshot = normalize(scope); requestedFilters.value = snapshot;
  loading.value = true; error.value = ''; worklist.value = null;
  try {
    const result = await inpatientService.listDailyChargeWorklist({ status: snapshot.status || undefined, unit: snapshot.unit || undefined, ward: snapshot.ward || undefined });
    if (!isCurrent(version)) return;
    worklist.value = result; appliedFilters.value = { ...snapshot };
    void resolvePatients(result.items);
  } catch (cause) { if (isCurrent(version)) error.value = cause instanceof Error ? cause.message : 'A consulta está indisponível. Tente novamente.'; }
  finally { if (isCurrent(version)) loading.value = false; }
}
function applyFilters() { void load(normalize(filters)); }
function refresh() { void load(requestedFilters.value); }
onMounted(() => refresh());
onBeforeUnmount(() => { active = false; generation++; identityGeneration++; });
</script>

<style scoped>
.inpatient-daily-charges-page { display:grid;gap:20px;min-width:0; }
.inpatient-daily-charges-page :deep(.app-page-header) { margin-bottom:0; }
.filters { display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:16px;align-items:end;padding:20px;border:1px solid var(--color-border);border-radius:16px;background:var(--color-surface);min-width:0; }
.filters label { display:grid;gap:8px;min-width:0;font-size:13px;font-weight:600;color:var(--color-text-secondary); }
.filters input,.filters select { width:100%;min-width:0;min-height:44px;padding:10px 12px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-surface);color:var(--color-text);font:inherit;font-size:14px;font-weight:400; }
.filters input::placeholder { color:var(--color-text-muted); }
.filters input:focus-visible,.filters select:focus-visible { outline:2px solid var(--color-primary-500);outline-offset:3px; }
.query-context { display:grid;gap:8px;min-width:0; }.query-context p { display:grid;gap:6px;margin:0; }.query-context strong { font-size:14px;font-weight:500;overflow-wrap:anywhere; }
.eyebrow { color:var(--color-text-secondary);font-size:11px;letter-spacing:.07em;text-transform:uppercase; }
.draft-notice { color:var(--color-text-secondary);font-size:13px; }.error-detail { margin:8px 0 12px;overflow-wrap:anywhere; }.loading-message { margin:0;color:var(--color-text-secondary);font-size:14px; }
.summary-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px; }
.summary-grid--wide { grid-template-columns:minmax(0,1fr); }
.amount-card { display:flex;align-items:start;gap:14px;padding:20px;border:1px solid var(--color-border);border-radius:16px;background:var(--color-surface);min-width:0; }.amount-card>div { min-width:0; }
.amount-icon { display:grid;place-items:center;flex:0 0 40px;height:40px;border-radius:12px;background:var(--color-primary-50);color:var(--color-primary-700); }
.amount-card h2 { margin:0 0 7px;color:var(--color-text-secondary);font-size:13px;font-weight:500; }
.summary-value { display:block;margin-bottom:5px;font-size:24px;letter-spacing:-.03em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere; }
.results-heading { display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap; }.results-heading h2 { margin:0;font-size:18px; }.results-title { display:flex;align-items:baseline;gap:10px;flex-wrap:wrap; }.results-title>span { color:var(--color-text-secondary);font-size:12px; }
.cell-stack { display:grid;gap:5px;min-width:120px;max-width:260px;overflow-wrap:anywhere; }.cell-stack strong { font-size:14px;font-weight:500; }.patient-cell { min-width:155px; }
.muted,.identity-code { display:block;color:var(--color-text-secondary);font-size:12px;line-height:1.5; }.identity-code { overflow-wrap:anywhere; }.cell-amount { white-space:nowrap;font-size:14px;font-variant-numeric:tabular-nums; }
.actions { display:flex;gap:8px;flex-wrap:wrap;min-width:185px; }.recovery-action { margin-top:12px; }
@media(max-width:600px) { .inpatient-daily-charges-page { gap:8px; }.filters { grid-template-columns:repeat(2,minmax(0,1fr));padding:14px;gap:10px; }.filters label { gap:6px; }.summary-grid { gap:12px; }.amount-card { padding:10px; }.amount-icon { display:none; }.amount-card h2 { margin-bottom:4px; }.summary-value { font-size:21px;line-height:1.2; }.results-heading h2 { font-size:16px; } }
</style>
