<template>
  <div class="sectors-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Internação', 'Setores']" title="Setores" />
    <section class="create-panel" aria-labelledby="create-sector-title">
      <h2 id="create-sector-title">{{ created ? 'Setor criado' : 'Novo setor' }}</h2>
      <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
      <DsAlert v-if="created" variant="success">
        {{ created.code }} · {{ created.name }} cadastrado.
        <span class="created-id">{{ created.id }}</span>
        <div class="recovery-action"><DsButton type="button" variant="secondary" :disabled="saving" @click="beginAnother">Cadastrar outro setor</DsButton></div>
      </DsAlert>
      <form ref="formElement" class="sector-form" @submit.prevent="createSector">
        <fieldset :disabled="saving || !!created" class="create-fields">
          <DsInput id="sector-code" v-model="form.code" label="Código" placeholder="Ex.: UTI" required />
          <DsInput id="sector-name" v-model="form.name" label="Nome" placeholder="Ex.: Unidade de Terapia Intensiva" required />
          <DsInput id="sector-kind" v-model="form.kind" type="select" label="Tipo"><option v-for="kind in kinds" :key="kind.value" :value="kind.value">{{ kind.label }}</option></DsInput>
          <DsButton type="submit" :disabled="!canCreate" :loading="saving" variant="primary">{{ saving ? 'Criando…' : 'Criar setor' }}</DsButton>
        </fieldset>
      </form>
    </section>

    <section class="sector-results" aria-label="Setores cadastrados">
      <div class="results-heading"><h2>{{ sectors === null ? 'Setores cadastrados' : `${sectors.length} ${sectors.length === 1 ? 'setor' : 'setores'}` }}</h2><DsButton variant="secondary" :disabled="loading" @click="loadData">Atualizar</DsButton></div>
      <dl class="sector-summary" aria-label="Resumo do cadastro"><div v-for="item in summary" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value ?? '—' }}</dd></div></dl>
      <p v-if="loading" class="state-message" role="status">Consultando setores…</p>
      <DsAlert v-else-if="error" variant="danger">{{ error }}<div class="recovery-action"><DsButton variant="secondary" @click="loadData">Recarregar setores</DsButton></div></DsAlert>
      <DataTable v-if="sectors !== null" :columns="columns" :rows="sectors" caption="Setores de internação" empty-icon="building" empty-title="Nenhum setor cadastrado" empty-description="Use o formulário acima para cadastrar o primeiro setor." variant="hoverable" compact>
        <template #cell-code="{ row }"><strong class="record-code">{{ (row as SectorSummary).code }}</strong></template>
        <template #cell-name="{ row }"><span class="record-name">{{ (row as SectorSummary).name }}</span></template>
        <template #cell-kind="{ row }"><span class="kind-label">{{ kindLabel((row as SectorSummary).kind) }}</span></template>
        <template #cell-active="{ row }"><StatusBadge :label="(row as SectorSummary).active ? 'Ativo' : 'Inativo'" :variant="(row as SectorSummary).active ? 'success' : 'neutral'" /></template>
        <template #cell-createdAt="{ row }"><span>{{ dateLabel((row as SectorSummary).createdAt) }}</span></template>
      </DataTable>
    </section>
    <nav class="related-pages" aria-label="Cadastros e operação da internação"><DsButton variant="secondary" tag="a" to="/beds">Boxes</DsButton><DsButton variant="secondary" tag="a" to="/inpatient/board">Mapa de Leitos</DsButton></nav>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { inpatientService } from '@/services/inpatient';
import { formatDateTime } from '@/utils/labels';
import type { SectorSummary } from '@/types/inpatient';

const loading = ref(true), saving = ref(false);
const sectors = ref<SectorSummary[] | null>(null);
const error = ref(''), formError = ref('');
const formElement = ref<HTMLFormElement | null>(null);
const emptyForm = () => ({ code: '', name: '', kind: 'clinic' });
const form = reactive(emptyForm());
const created = ref<{ id: string; code: string; name: string } | null>(null);
const kinds = [{ value: 'clinic', label: 'Clínica' }, { value: 'surgery', label: 'Cirurgia' }, { value: 'icu', label: 'UTI' }, { value: 'isolation', label: 'Isolamento' }, { value: 'observation', label: 'Observação' }, { value: 'other', label: 'Outro' }];
let active = true, generation = 0;
const canCreate = computed(() => !saving.value && !created.value && !!form.code.trim() && !!form.name.trim() && kinds.some(kind => kind.value === form.kind));
const summary = computed(() => [
  { label: 'Total', value: sectors.value?.length ?? null },
  { label: 'Ativos', value: sectors.value?.filter(sector => sector.active).length ?? null },
  { label: 'Inativos', value: sectors.value?.filter(sector => !sector.active).length ?? null },
  { label: 'Tipos', value: sectors.value ? new Set(sectors.value.map(sector => sector.kind).filter(kind => typeof kind === 'string' && kind.trim())).size : null }
]);
const columns: DataTableColumn[] = [{ key: 'code', label: 'Código', width: '135px' }, { key: 'name', label: 'Nome', width: '260px' }, { key: 'kind', label: 'Tipo', width: '150px' }, { key: 'active', label: 'Status', width: '120px' }, { key: 'createdAt', label: 'Criado em', width: '180px' }];
async function loadData() {
  const version = ++generation;
  loading.value = true; error.value = ''; sectors.value = null;
  try { const items = await inpatientService.listSectors(); if (active && version === generation) sectors.value = items; }
  catch (cause) { if (active && version === generation) error.value = cause instanceof Error ? cause.message : 'Não foi possível consultar os setores.'; }
  finally { if (active && version === generation) loading.value = false; }
}
async function createSector() {
  if (!active || !canCreate.value) return;
  const payload = { code: form.code.trim(), name: form.name.trim(), kind: form.kind };
  saving.value = true; formError.value = '';
  try {
    const sector = await inpatientService.createSector(payload);
    if (!active) return;
    created.value = { id: sector.id, code: payload.code, name: payload.name };
    void loadData();
  } catch (cause) { if (active) formError.value = cause instanceof Error ? cause.message : 'Não foi possível cadastrar o setor.'; }
  finally { if (active) saving.value = false; }
}
function beginAnother() {
  if (saving.value) return;
  created.value = null; formError.value = ''; Object.assign(form, emptyForm());
  void nextTick(() => formElement.value?.querySelector('input')?.focus());
}
function kindLabel(value: string) { return kinds.find(kind => kind.value === value)?.label || value?.trim() || 'Não informado'; }
function dateLabel(value: string) { return value && !Number.isNaN(new Date(value).getTime()) ? formatDateTime(value) : 'Não informada'; }
onMounted(loadData);
onBeforeUnmount(() => { active = false; generation++; });
</script>

<style scoped>
.sectors-page { display:grid;gap:16px;min-width:0; }.sectors-page :deep(.app-page-header) { margin-bottom:0; }.create-panel { display:grid;gap:16px;padding:20px;border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface);min-width:0; }.create-panel h2,.results-heading h2 { margin:0;font-size:18px;font-weight:600; }.create-fields { display:grid;grid-template-columns:minmax(110px,.65fr) minmax(180px,1.25fr) minmax(140px,.8fr) auto;gap:14px;align-items:end;border:0;margin:0;padding:0;min-width:0; }.create-fields>* { min-width:0; }.created-id { display:block;margin-top:6px;font-size:12px;overflow-wrap:anywhere; }.recovery-action { margin-top:12px; }
.sector-results { display:grid;gap:12px;min-width:0; }.results-heading { display:flex;align-items:center;justify-content:space-between;gap:12px; }.sector-summary { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:0;padding:14px 0;border:1px solid var(--color-border);border-radius:14px;background:var(--color-surface); }.sector-summary>div { padding:0 16px;min-width:0; }.sector-summary>div+div { border-left:1px solid var(--color-border); }.sector-summary dt { font-size:12px;color:var(--color-text-secondary); }.sector-summary dd { margin:6px 0 0;font-size:22px;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere; }.state-message { margin:0;color:var(--color-text-secondary);font-size:14px; }.record-code,.record-name,.kind-label { display:block;overflow-wrap:anywhere;white-space:normal; }.record-name { min-width:160px; }.kind-label { min-width:110px; }.related-pages { display:flex;gap:10px;flex-wrap:wrap; }.sectors-page :deep(.ds-alert__message) { overflow-wrap:anywhere; }
@media(max-width:1100px) { .create-fields { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:600px) { .sectors-page { gap:12px; }.create-panel { padding:16px;gap:14px; }.create-fields { gap:12px; }.sector-summary>div { padding:0 10px; }.sector-summary dd { font-size:20px; }.related-pages>* { flex:1; } }
</style>
