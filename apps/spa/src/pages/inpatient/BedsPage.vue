<template>
  <div class="beds-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Cadastros', 'Boxes de Internação']" title="Boxes de Internação">
      <template #actions><DsButton variant="primary" data-focus-key="beds-create" @click="router.push('/beds/new')">Incluir</DsButton></template>
    </AppPageHeader>

    <section class="filter-panel" aria-label="Pesquisar boxes">
      <form class="bed-filters" @submit.prevent="applyFilters">
        <DsInput id="boxes-code" v-model="filters.code" label="Código" placeholder="Código" />
        <DsInput id="boxes-description" v-model="filters.description" label="Descrição" placeholder="Descrição" />
        <label class="active-filter" for="boxes-active"><input id="boxes-active" v-model="filters.activeOnly" type="checkbox" /><span>Boxes Ativos</span></label>
        <DsButton type="submit" variant="secondary">Pesquisar</DsButton>
      </form>
      <p v-if="draftChanged" class="draft-notice">Filtros alterados. Pesquise para aplicar.</p>
    </section>

    <section class="registry-results" aria-label="Resultado da consulta de boxes">
      <div class="query-context">
        <div><h2>{{ beds === null ? 'Consulta de boxes' : `${beds.length} ${beds.length === 1 ? 'box' : 'boxes'} nesta consulta` }}</h2><p>{{ requested.activeOnly ? 'Somente boxes ativos' : 'Todos os boxes · ativos e inativos' }}<span v-if="requested.code"> · Código: {{ requested.code }}</span><span v-if="requested.description"> · Descrição: {{ requested.description }}</span></p></div>
        <DsButton variant="secondary" :disabled="loading" @click="reloadRequested">Atualizar</DsButton>
      </div>
      <dl class="registry-summary" aria-label="Contagem nesta consulta">
        <div v-for="item in summary" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value ?? '—' }}</dd></div>
      </dl>
      <p class="summary-note">Disponíveis, ocupados, manutenção e bloqueados contam apenas boxes ativos.</p>
      <p v-if="loading" class="state-message" role="status">Consultando boxes…</p>
      <DsAlert v-else-if="error" variant="danger">
        {{ error }}
        <div class="recovery-action"><DsButton variant="secondary" @click="reloadRequested">Recarregar boxes</DsButton></div>
      </DsAlert>
      <template v-if="beds !== null">
        <p v-if="sectorsLoading" class="state-message" role="status">Consultando setores… Os boxes já estão disponíveis abaixo.</p>
        <DsAlert v-else-if="sectorError" variant="warning">
          Não foi possível consultar os setores. Os boxes estão exibidos com o identificador do setor.
          <div class="recovery-action"><DsButton variant="secondary" @click="loadSectors">Recarregar setores</DsButton></div>
        </DsAlert>
        <DataTable :columns="columns" :rows="beds" caption="Boxes de internação" empty-icon="bed" empty-title="Nenhum registro encontrado"
          empty-description="Revise os filtros ou inclua um novo box de internação." variant="hoverable">
          <template #cell-code="{ row }"><strong class="record-code">{{ (row as BedSummary).code }}</strong></template>
          <template #cell-name="{ row }"><span class="record-name">{{ (row as BedSummary).name }}</span></template>
          <template #cell-sectorId="{ row }">
            <div class="sector-context"><span>{{ sectorLabel((row as BedSummary).sectorId) }}</span><small v-if="!sectorMap.has((row as BedSummary).sectorId)">{{ (row as BedSummary).sectorId }}</small></div>
          </template>
          <template #cell-status="{ row }"><StatusBadge :label="statusLabel((row as BedSummary).status)" :variant="statusVariant(row as BedSummary)" /></template>
          <template #cell-active="{ row }">{{ (row as BedSummary).active ? 'Sim' : 'Não' }}</template>
          <template #cell-actions="{ row }"><DsButton size="sm" variant="secondary" :data-focus-key="`beds-open-${(row as BedSummary).id}`" @click="router.push(`/beds/${(row as BedSummary).id}`)">Abrir</DsButton></template>
        </DataTable>
      </template>
    </section>

    <nav class="related-pages" aria-label="Rotinas de internação">
      <DsButton variant="secondary" tag="a" to="/sectors">Setores</DsButton>
      <DsButton variant="secondary" tag="a" to="/inpatient/board">Mapa de Leitos</DsButton>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

type Filters = { code: string; description: string; activeOnly: boolean };
const router = useRouter();
const filters = reactive<Filters>({ code: '', description: '', activeOnly: true });
const requested = ref<Filters>({ ...filters });
const beds = ref<BedSummary[] | null>(null);
const sectors = ref<SectorSummary[]>([]);
const loading = ref(true), sectorsLoading = ref(true);
const error = ref(''), sectorError = ref('');
let active = true, generation = 0, sectorGeneration = 0;
const normalized = (value: Filters): Filters => ({ code: value.code.trim(), description: value.description.trim(), activeOnly: value.activeOnly });
const sameFilters = (a: Filters, b: Filters) => a.code === b.code && a.description === b.description && a.activeOnly === b.activeOnly;
const draftChanged = computed(() => !sameFilters(normalized(filters), requested.value));
const sectorMap = computed(() => new Map(sectors.value.map(sector => [sector.id, sector])));
const summary = computed(() => {
  const records = beds.value;
  const count = (status: BedSummary['status']) => records?.filter(bed => bed.active && bed.status === status).length ?? null;
  return [
    { label: 'Total', value: records?.length ?? null },
    { label: 'Disponíveis', value: count('available') },
    { label: 'Ocupados', value: count('occupied') },
    { label: 'Manutenção', value: count('maintenance') },
    { label: 'Bloqueados', value: count('blocked') },
    { label: 'Inativos', value: records?.filter(bed => !bed.active).length ?? null }
  ];
});
const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'name', label: 'Descrição', width: '250px' },
  { key: 'sectorId', label: 'Setor', width: '230px' },
  { key: 'status', label: 'Status', width: '150px' },
  { key: 'active', label: 'Boxes Ativos', width: '115px' },
  { key: 'actions', label: 'Abrir', width: '105px', class: 'table__actions-col' }
];

async function loadBeds(snapshot: Filters) {
  const query = normalized(snapshot);
  if (generation && loading.value && sameFilters(query, requested.value)) return;
  const version = ++generation;
  requested.value = query; loading.value = true; error.value = ''; beds.value = null;
  try {
    const items = await inpatientService.listBeds({ code: query.code || undefined, description: query.description || undefined, active: query.activeOnly });
    if (active && version === generation) beds.value = items;
  } catch (cause) {
    if (active && version === generation) error.value = cause instanceof Error ? cause.message : 'Não foi possível consultar os boxes.';
  } finally { if (active && version === generation) loading.value = false; }
}
function applyFilters() { void loadBeds({ ...filters }); }
function reloadRequested() { void loadBeds({ ...requested.value }); }
async function loadSectors() {
  const version = ++sectorGeneration;
  sectorsLoading.value = true; sectorError.value = ''; sectors.value = [];
  try {
    const items = await inpatientService.listSectors();
    if (active && version === sectorGeneration) sectors.value = items;
  } catch { if (active && version === sectorGeneration) sectorError.value = 'Setores indisponíveis'; }
  finally { if (active && version === sectorGeneration) sectorsLoading.value = false; }
}
function sectorLabel(id: string) {
  const sector = sectorMap.value.get(id);
  if (sector) return `${sector.code} · ${sector.name}${sector.active ? '' : ' · Inativo'}`;
  if (sectorsLoading.value) return 'Consultando setor…';
  return sectorError.value ? 'Nome do setor indisponível' : 'Setor não localizado';
}
function statusLabel(status: BedSummary['status']) { return { available: 'Disponível', occupied: 'Ocupado', maintenance: 'Manutenção', blocked: 'Bloqueado' }[status] || 'Não informado'; }
function statusVariant(bed: BedSummary): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!bed.active) return 'neutral';
  return ({ available: 'success', occupied: 'warning', maintenance: 'warning', blocked: 'danger' } as const)[bed.status] || 'neutral';
}
onMounted(() => { void loadBeds({ ...filters }); void loadSectors(); });
onBeforeUnmount(() => { active = false; generation++; sectorGeneration++; });
</script>

<style scoped>
.beds-page { display:grid;gap:16px;min-width:0; }.beds-page :deep(.app-page-header) { margin-bottom:0; }
.related-pages { display:flex;gap:8px;flex-wrap:wrap; }.filter-panel { padding:20px;border:1px solid var(--color-border);border-radius:16px;background:var(--color-surface);min-width:0; }
.bed-filters { display:grid;grid-template-columns:minmax(130px,.65fr) minmax(200px,1.3fr) auto auto;gap:16px;align-items:end; }.bed-filters>* { min-width:0; }
.active-filter { display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px;cursor:pointer; }.active-filter input { width:20px;height:20px;accent-color:var(--color-primary-600); }.active-filter input:focus-visible { outline:2px solid var(--color-primary-500);outline-offset:4px; }
.draft-notice { margin:12px 0 0;color:var(--color-text-secondary);font-size:13px; }.registry-results { display:grid;gap:12px;min-width:0; }.query-context { display:flex;align-items:center;justify-content:space-between;gap:12px; }.query-context>div { min-width:0; }.query-context h2 { margin:0;font-size:18px;font-weight:600; }.query-context p { margin:6px 0 0;font-size:13px;color:var(--color-text-secondary);line-height:1.5;overflow-wrap:anywhere; }
.registry-summary { display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0;margin:0;padding:14px 0;border:1px solid var(--color-border);border-radius:14px;background:var(--color-surface); }.registry-summary>div { padding:0 16px;min-width:0; }.registry-summary>div+div { border-left:1px solid var(--color-border); }.registry-summary dt { font-size:12px;color:var(--color-text-secondary); }.registry-summary dd { margin:6px 0 0;font-size:22px;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere; }.summary-note,.state-message { margin:0;font-size:12px;line-height:1.5;color:var(--color-text-secondary); }.state-message { font-size:14px; }.recovery-action { margin-top:12px; }
.record-code,.record-name,.sector-context { overflow-wrap:anywhere;white-space:normal; }.record-name { display:block;min-width:180px; }.sector-context { min-width:170px;line-height:1.5; }.sector-context small { display:block;color:var(--color-text-secondary);font-size:12px;margin-top:4px; }.beds-page :deep(.ds-alert__message) { overflow-wrap:anywhere; }
@media(max-width:1100px) { .bed-filters { grid-template-columns:repeat(2,minmax(0,1fr)); }.registry-summary>div { padding:0 12px; } }
@media(max-width:600px) { .beds-page { gap:12px; }.filter-panel { padding:16px; }.bed-filters { grid-template-columns:repeat(2,minmax(0,1fr));gap:12px; }.bed-filters>button { width:100%; }.registry-summary { grid-template-columns:repeat(3,minmax(0,1fr));row-gap:12px; }.registry-summary>div:nth-child(4) { border-left:0; }.registry-summary dd { font-size:20px; }.query-context { align-items:start; }.query-context h2 { font-size:17px; }.query-context>button { flex-shrink:0; }.related-pages>* { flex:1; } }
@media(max-width:600px) {
  .beds-page :deep(.app-page-header) { grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px; }
  .beds-page :deep(.app-page-header__title) { margin:0;font-size:20px;line-height:1.3; }
  .beds-page :deep(.app-page-header__side) { width:auto;padding:0;border:0; }
  .beds-page :deep(.app-page-header__actions>.ds-btn--primary) { flex:0 0 auto;width:auto; }
}
</style>
