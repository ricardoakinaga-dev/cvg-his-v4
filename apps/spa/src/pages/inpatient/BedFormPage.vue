<template>
  <div class="bed-form-page">
    <AppPageHeader :title="isEditing ? 'Editar Box de Internação' : 'Incluir Box de Internação'">
      <template #actions><DsButton tag="a" to="/beds" variant="secondary" :disabled="submitting">Voltar aos boxes</DsButton></template>
    </AppPageHeader>
    <DsAlert v-if="error" variant="danger">{{ error }}</DsAlert>
    <DsAlert v-if="completed" variant="success">
      Box {{ completed.name }} salvo.
      <div class="recovery-action"><DsButton tag="a" :to="`/beds/${completed.id}`" variant="secondary">Abrir cadastro</DsButton></div>
    </DsAlert>
    <DsAlert v-if="previousResult" :variant="previousResult.complete ? 'success' : 'warning'" dismissible @dismiss="previousResult = null">
      {{ previousResult.message }}
      <div v-if="previousResult.id" class="recovery-action"><DsButton tag="a" :to="`/beds/${previousResult.id}/edit`" variant="secondary">Abrir cadastro anterior</DsButton></div>
    </DsAlert>
    <p v-if="loading" class="state-message" role="status">Carregando cadastro e setores…</p>
    <DsAlert v-if="recordError" variant="danger">
      {{ recordError }}
      <div class="recovery-action"><DsButton variant="secondary" :disabled="loading || submitting" @click="loadData">Recarregar cadastro</DsButton></div>
    </DsAlert>
    <DsAlert v-if="sectorError" variant="warning">
      {{ sectorError }}
      <div class="recovery-action"><DsButton variant="secondary" :loading="sectorsLoading" :disabled="submitting || !!completed" @click="reloadSectors">Recarregar setores</DsButton></div>
    </DsAlert>
    <DsAlert v-if="createdBed && !completed && !submitting" variant="warning">
      O box {{ createdBed.name }} já foi criado. Há alterações pendentes; salve novamente para concluir neste mesmo cadastro.
    </DsAlert>

    <section class="bed-editor" aria-labelledby="bed-fields-title">
      <div v-if="record" class="record-identity">
        <span class="bed-mark" aria-hidden="true"><DsIcon name="bed" size="xl" /></span>
        <div><span class="eyebrow">{{ createdBed ? 'Cadastro criado' : 'Registro em edição' }}</span><h2>{{ record.code }} · {{ record.name }}</h2><p class="identity-code">{{ record.id }}</p></div>
        <StatusBadge :label="record.active ? statusLabel(record.status) : 'Inativo'" :variant="record.active && record.status === 'available' ? 'success' : 'neutral'" />
      </div>
      <h2 id="bed-fields-title" class="section-title">Dados do box</h2>
      <form class="bed-form" @submit.prevent="submitForm">
        <fieldset class="bed-fields" :disabled="locked">
          <div class="field-grid">
            <DsInput id="bed-code" v-model="form.code" label="Código" required placeholder="Ex.: B01" />
            <DsInput id="bed-name" v-model="form.name" label="Descrição" required placeholder="Ex.: Box de recuperação" />
            <div class="sector-field">
              <DsInput id="bed-sector" v-model="form.sectorId" type="select" label="Setor" required :disabled="sectorsLoading || !sectors.length">
                <option value="">Selecione o setor</option>
                <option v-for="sector in sectors" :key="sector.id" :value="sector.id">{{ sector.code }} · {{ sector.name }}{{ sector.active ? '' : ' · Inativo' }}</option>
                <option v-if="form.sectorId && !selectedSector" :value="form.sectorId" disabled>{{ sectorsLoading ? 'Carregando setor…' : sectorError ? 'Setor indisponível' : 'Setor não localizado' }} · {{ form.sectorId }}</option>
              </DsInput>
              <p v-if="selectedSector" class="field-detail">{{ selectedSector.code }} · {{ selectedSector.name }}<span v-if="!selectedSector.active"> · Inativo</span></p>
              <p v-else-if="form.sectorId && !sectorsLoading" class="field-detail">{{ sectorError ? 'Identificador do setor:' : 'Confirme o setor antes de salvar. Código:' }} {{ form.sectorId }}</p>
              <p v-else-if="!sectorsLoading && !sectorError && !sectors.length" class="field-detail">Nenhum setor cadastrado.</p>
              <div v-if="!sectorsLoading && !sectorError && (!sectors.length || (form.sectorId && !selectedSector))" class="sector-recovery">
                <DsButton tag="a" to="/sectors" variant="secondary">Gerenciar setores</DsButton>
                <DsButton type="button" variant="secondary" @click="reloadSectors">Recarregar setores</DsButton>
              </div>
            </div>
            <DsInput id="bed-status" v-model="form.status" type="select" label="Status" required>
              <option value="available">Disponível</option><option value="occupied">Ocupado</option><option value="maintenance">Manutenção</option><option value="blocked">Bloqueado</option>
            </DsInput>
            <DsInput id="bed-species" v-model="form.supportsSpecies" label="Espécie suportada" placeholder="Ex.: caninos, felinos" />
            <label class="toggle-label" for="bed-active"><input id="bed-active" v-model="form.active" type="checkbox" /><span>Box ativo</span></label>
          </div>
          <div class="form-actions"><DsButton type="submit" variant="primary" :loading="submitting" :disabled="!canSave">{{ submitting ? 'Salvando…' : 'Salvar' }}</DsButton><DsButton type="button" variant="secondary" :disabled="submitting" @click="router.push('/beds')">Cancelar</DsButton></div>
        </fieldset>
      </form>
      <p class="form-footnote">Os campos com * são obrigatórios.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';

const route = useRoute(), router = useRouter();
const bedId = computed(() => typeof route.params.id === 'string' ? route.params.id.trim() : '');
const isEditing = computed(() => !!bedId.value);
const sectors = ref<SectorSummary[]>([]), loadedBed = ref<BedSummary | null>(null), createdBed = ref<BedSummary | null>(null);
const loading = ref(true), sectorsLoading = ref(false), submitting = ref(false);
const error = ref(''), recordError = ref(''), sectorError = ref('');
const completed = ref<{ id: string; name: string } | null>(null);
const previousResult = ref<{ id?: string; complete: boolean; message: string } | null>(null);
const emptyForm = () => ({ code: '', name: '', sectorId: '', status: 'available' as BedSummary['status'], supportsSpecies: '', active: true });
const form = reactive(emptyForm());
let active = true, generation = 0, sectorGeneration = 0;
const current = (version: number) => active && generation === version;
const selectedSector = computed(() => sectors.value.find(sector => sector.id === form.sectorId));
const record = computed(() => loadedBed.value || createdBed.value);
const recordReady = computed(() => !isEditing.value || loadedBed.value?.id === bedId.value);
const locked = computed(() => loading.value || submitting.value || !!completed.value || !recordReady.value || !!recordError.value);
const canSave = computed(() => !locked.value && !sectorsLoading.value && !sectorError.value && !!selectedSector.value && !!form.code.trim() && !!form.name.trim() && ['available', 'occupied', 'maintenance', 'blocked'].includes(form.status));
function statusLabel(status: BedSummary['status']) { return { available: 'Disponível', occupied: 'Ocupado', maintenance: 'Manutenção', blocked: 'Bloqueado' }[status] || 'Não informado'; }

async function reloadSectors() {
  const version = generation, request = ++sectorGeneration;
  sectorsLoading.value = true; sectorError.value = '';
  try {
    const items = await inpatientService.listSectors();
    if (current(version) && request === sectorGeneration) sectors.value = items;
  } catch { if (current(version) && request === sectorGeneration) { sectors.value = []; sectorError.value = 'Não foi possível carregar os setores. Recarregue para confirmar o destino do box.'; } }
  finally { if (current(version) && request === sectorGeneration) sectorsLoading.value = false; }
}
async function loadData() {
  const id = bedId.value, version = ++generation;
  sectorGeneration++; loading.value = true; loadedBed.value = null; createdBed.value = null; completed.value = null;
  error.value = ''; recordError.value = ''; sectorError.value = ''; sectors.value = []; Object.assign(form, emptyForm());
  const sectorRequest = reloadSectors();
  if (id) {
    try {
      const bed = await inpatientService.getBedById(id);
      if (!current(version)) return;
      if (bed.id !== id) throw new Error('Bed identity mismatch');
      loadedBed.value = bed;
      Object.assign(form, { code: bed.code, name: bed.name, sectorId: bed.sectorId, status: bed.status, supportsSpecies: bed.supportsSpecies ?? '', active: bed.active });
    } catch { if (current(version)) recordError.value = 'Não foi possível confirmar este box de internação. Recarregue o cadastro para editar.'; }
  }
  await sectorRequest;
  if (current(version)) loading.value = false;
}
async function submitForm() {
  if (!canSave.value) return;
  const version = generation;
  const payload = { sectorId: form.sectorId, code: form.code.trim(), name: form.name.trim(), status: form.status, supportsSpecies: form.supportsSpecies.trim() || null, active: form.active };
  const existingId = bedId.value || createdBed.value?.id;
  let savedId = existingId;
  submitting.value = true; error.value = '';
  try {
    if (existingId) {
      await inpatientService.updateBed(existingId, payload);
    } else {
      const saved = await inpatientService.createBed({ sectorId: payload.sectorId, code: payload.code, name: payload.name, supportsSpecies: payload.supportsSpecies || undefined });
      savedId = saved.id;
      if (current(version)) createdBed.value = saved;
      if (saved.status !== payload.status || saved.active !== payload.active) {
        await inpatientService.updateBed(saved.id, { status: payload.status, active: payload.active });
      }
    }
    if (!current(version)) { if (active) previousResult.value = { id: savedId, complete: true, message: `Box ${payload.code} · ${payload.name} salvo.` }; return; }
    completed.value = { id: savedId!, name: payload.name };
    try { await router.push('/beds'); } catch { /* The saved record link remains available; never repeat creation. */ }
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Não foi possível salvar o box.';
    if (current(version)) error.value = detail;
    else if (active) previousResult.value = { id: savedId, complete: false, message: `Não foi possível concluir as alterações de ${payload.code} · ${payload.name}. ${detail}` };
  } finally { if (active) submitting.value = false; }
}
onMounted(loadData);
watch(bedId, () => { void loadData(); }, { flush: 'sync' });
onBeforeUnmount(() => { active = false; generation++; sectorGeneration++; });
</script>

<style scoped>
.bed-form-page { display:grid;gap:20px;min-width:0; }.bed-form-page :deep(.app-page-header) { margin-bottom:0; }
.bed-editor { padding:24px;border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface);min-width:0; }
.section-title { margin:0 0 20px;font-size:18px;font-weight:600; }.bed-fields { border:0;padding:0;margin:0;min-width:0; }
.field-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start; }.field-grid>* { min-width:0; }
.field-detail,.state-message,.form-footnote { margin:10px 0 0;font-size:13px;line-height:1.5;color:var(--color-text-secondary);overflow-wrap:anywhere; }.state-message { margin:0; }.form-footnote { margin-top:16px; }
.toggle-label { display:flex;align-items:center;gap:12px;min-height:44px;margin-top:24px;cursor:pointer;font-size:14px; }.toggle-label input { width:20px;height:20px;accent-color:var(--color-primary-600); }.toggle-label:has(input:disabled) { cursor:not-allowed; }.toggle-label input:focus-visible { outline:2px solid var(--color-primary-500);outline-offset:4px; }
.form-actions { display:flex;gap:12px;flex-wrap:wrap;margin-top:24px; }.form-actions>:first-child { min-width:170px; }
.record-identity { display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--color-border); }.record-identity>div { flex:1;min-width:0; }.record-identity h2 { margin:4px 0 6px;font-size:20px;overflow-wrap:anywhere; }.identity-code { margin:0;color:var(--color-text-secondary);font-size:12px;overflow-wrap:anywhere; }.eyebrow { color:var(--color-text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.06em; }.bed-mark { display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:12px;background:var(--color-primary-50);color:var(--color-primary-700); }
.recovery-action { margin-top:12px; }.bed-form-page :deep(.ds-alert__message) { overflow-wrap:anywhere; }
.sector-recovery { display:flex;flex-wrap:wrap;gap:8px;margin-top:12px; }
@media(max-width:600px) { .bed-form-page { gap:14px; }.bed-editor { padding:16px; }.field-grid { grid-template-columns:minmax(0,1fr);gap:16px; }.toggle-label { margin-top:0; }.record-identity { display:grid;grid-template-columns:44px minmax(0,1fr);align-items:start; }.record-identity>:last-child { grid-column:2;justify-self:start; }.record-identity h2 { font-size:18px; }.form-actions>* { flex:1; } }
</style>
