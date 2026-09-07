<template>
  <div class="admission-page">
    <AppPageHeader title="Admitir paciente" subtitle="Confirme o atendimento e escolha um leito disponível.">
      <template #actions><DsButton tag="a" to="/inpatient" variant="secondary">Voltar à internação</DsButton></template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger">{{ error }}</DsAlert>
    <DsAlert v-if="confirmedStay" variant="success">
      Admissão de {{ confirmedStay.patientName }} confirmada.
      <DsButton tag="a" :to="`/inpatient/${confirmedStay.id}`" variant="secondary" size="sm">Abrir ficha de internação</DsButton>
    </DsAlert>
    <DsAlert v-if="previousResult" :variant="previousResult.id ? 'success' : 'warning'" dismissible @dismiss="previousResult = null">
      {{ previousResult.message }}
      <DsButton v-if="previousResult.id" tag="a" :to="`/inpatient/${previousResult.id}`" variant="secondary" size="sm">Abrir internação anterior</DsButton>
    </DsAlert>
    <p v-if="initialLoading" class="state-message" role="status">Carregando atendimentos e setores…</p>
    <DsAlert v-if="catalogError" variant="warning">
      {{ catalogError }}
      <DsButton type="button" variant="secondary" size="sm" :disabled="locked || initialLoading" @click="loadPage(false)">Recarregar cadastros</DsButton>
    </DsAlert>
    <DsAlert v-if="contextError" variant="warning">
      {{ contextError }}
      <div class="inline-actions">
        <DsButton type="button" variant="secondary" size="sm" :disabled="locked || initialLoading" @click="loadPage(false)">Tentar novamente</DsButton>
        <DsButton type="button" variant="secondary" size="sm" :disabled="locked || initialLoading" @click="clearEncounter">Escolher outro atendimento</DsButton>
      </div>
    </DsAlert>

    <form class="admission-form" @submit.prevent="submit">
      <fieldset class="admission-fields" :disabled="locked || initialLoading">
        <section class="admission-section" aria-labelledby="encounter-title">
          <h2 id="encounter-title"><span class="step-number" aria-hidden="true">01</span>Atendimento</h2>
          <label for="admission-encounter">Atendimento aberto <span class="required-mark" aria-hidden="true">*</span></label>
          <select id="admission-encounter" v-model="form.encounterId" class="admission-select" required @change="changeEncounter">
            <option value="">Selecione o atendimento</option>
            <option v-for="encounter in eligibleEncounters" :key="encounter.id" :value="encounter.id">
              {{ encounter.reason || 'Motivo não informado' }} · {{ encounter.id }}
            </option>
          </select>
          <p v-if="!initialLoading && !eligibleEncounters.length && !catalogError" class="state-message">Nenhum atendimento aberto disponível para admissão.</p>
          <p v-if="identityLoading" class="state-message" role="status">Confirmando paciente e tutor…</p>
          <DsAlert v-else-if="identityError" variant="warning">
            {{ identityError }}
            <DsButton type="button" variant="secondary" size="sm" @click="loadIdentity">Recarregar identificação</DsButton>
          </DsAlert>
          <div v-if="selectedEncounter && patient && owner" class="patient-identity" aria-label="Paciente e tutor do atendimento">
            <div class="patient-heading">
              <span class="patient-mark" aria-hidden="true"><DsIcon name="paw" size="xl" /></span>
              <div><span class="eyebrow">Paciente</span><h3>{{ patient.name }}</h3><p>{{ speciesLabel(patient.species) }}<template v-if="patient.breed"> · {{ patient.breed }}</template></p></div>
              <StatusBadge :label="encounterStatusLabel(selectedEncounter.status)" variant="info" />
            </div>
            <dl class="identity-details">
              <div><dt>Tutor do atendimento</dt><dd>{{ owner.fullName }}</dd><dd class="identity-code">{{ owner.id }}</dd></div>
              <div><dt>Identificação do paciente</dt><dd class="identity-code">{{ patient.id }}</dd></div>
              <div class="identity-reason"><dt>Identificação do atendimento</dt><dd class="identity-code">{{ selectedEncounter.id }}</dd></div>
              <div class="identity-reason"><dt>Motivo do atendimento</dt><dd>{{ selectedEncounter.reason || 'Não informado' }}</dd></div>
            </dl>
          </div>
        </section>

        <section class="admission-section" aria-labelledby="destination-title">
          <h2 id="destination-title"><span class="step-number" aria-hidden="true">02</span>Setor e leito</h2>
          <label for="admission-sector">Setor <span class="required-mark" aria-hidden="true">*</span></label>
          <select id="admission-sector" v-model="form.sectorId" data-testid="sector-select" class="admission-select" :disabled="!identityReady || !activeSectors.length" required @change="loadBeds()">
            <option value="">Selecione o setor</option>
            <option v-for="sector in activeSectors" :key="sector.id" :value="sector.id">{{ sector.code }} · {{ sector.name }}</option>
          </select>
          <p v-if="selectedSector" class="sector-context"><span class="eyebrow">Setor selecionado</span><strong>{{ selectedSector.code }} · {{ selectedSector.name }}</strong></p>
          <p v-if="!initialLoading && !activeSectors.length && !catalogError" class="state-message">Nenhum setor ativo disponível.</p>
          <p v-if="!form.sectorId && activeSectors.length" class="state-message">Selecione um setor para consultar os leitos.</p>
          <p v-else-if="bedsLoading" class="state-message" role="status">Consultando leitos do setor…</p>
          <DsAlert v-else-if="bedsError" variant="warning">
            {{ bedsError }}
            <DsButton type="button" variant="secondary" size="sm" @click="loadBeds()">Recarregar leitos</DsButton>
          </DsAlert>
          <template v-else-if="form.sectorId">
            <div class="bed-heading"><h3>Leitos do setor</h3><span>{{ availableBeds.length }} disponíveis de {{ beds.length }}</span></div>
            <p v-if="!beds.length" class="state-message">Nenhum leito cadastrado neste setor.</p>
            <p v-else-if="!availableBeds.length" class="state-message">Não há leitos disponíveis neste setor.</p>
            <div v-if="beds.length" class="bed-grid" role="group" aria-label="Leitos do setor">
              <button v-for="bed in beds" :key="bed.id" type="button" class="bed-option" :class="{ 'bed-option--selected': form.bedId === bed.id }"
                :data-testid="`bed-option-${bed.id}`" :aria-pressed="form.bedId === bed.id" :disabled="!isAvailable(bed) || !identityReady" @click="selectBed(bed)">
                <span class="bed-option__top"><DsIcon name="bed" size="xl" /><span class="bed-status" :class="{ 'bed-status--available': isAvailable(bed) }">{{ bedStatus(bed) }}</span></span>
                <strong>{{ bed.code }}</strong><span class="bed-name">{{ bed.name }}</span>
                <span v-if="bed.supportsSpecies" class="bed-species">{{ speciesLabel(bed.supportsSpecies) }}</span>
                <span v-if="form.bedId === bed.id" class="selection-mark"><DsIcon name="check" size="sm" />Selecionado</span>
              </button>
            </div>
          </template>
          <div v-if="selectedBed && selectedSector" class="selected-destination" role="status">
            <DsIcon name="bed" size="lg" /><div><span class="eyebrow">Destino selecionado</span><strong>{{ selectedSector.name }} · {{ selectedBed.code }}</strong><span>{{ selectedBed.name }}</span></div>
          </div>
        </section>
        <div class="admission-actions">
          <DsButton type="submit" variant="primary" :loading="submitting" :disabled="!canSubmit">{{ submitting ? 'Confirmando admissão…' : 'Confirmar admissão' }}</DsButton>
          <DsButton tag="a" to="/inpatient" variant="secondary">Cancelar</DsButton>
        </div>
      </fieldset>
      <p class="form-footnote">Os campos com * são obrigatórios.</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { encounterService } from '@/services/encounter';
import { inpatientService } from '@/services/inpatient';
import { patientService } from '@/services/patient';
import { ownerService } from '@/services/owner';
import { speciesLabel, encounterStatusLabel } from '@/utils/labels';
import type { EncounterSummary } from '@/types/encounter';
import type { PatientSummary } from '@/types/patient';
import type { OwnerSummary } from '@/types/owner';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';

const route = useRoute(), router = useRouter();
const encounters = ref<EncounterSummary[]>([]), sectors = ref<SectorSummary[]>([]), beds = ref<BedSummary[]>([]);
const patient = ref<PatientSummary | null>(null), owner = ref<OwnerSummary | null>(null);
const form = reactive({ encounterId: '', sectorId: '', bedId: '' });
const error = ref(''), catalogError = ref(''), contextError = ref(''), identityError = ref(''), bedsError = ref('');
const initialLoading = ref(true), identityLoading = ref(false), bedsLoading = ref(false), submitting = ref(false);
const confirmedStay = ref<{ id: string; patientName: string } | null>(null);
const previousResult = ref<{ id?: string; patientName: string; message: string } | null>(null);
let active = true, generation = 0, identityGeneration = 0, bedGeneration = 0;
const current = (version: number) => active && version === generation;
const eligibleEncounters = computed(() => encounters.value.filter(e => e.status !== 'closed'));
const activeSectors = computed(() => sectors.value.filter(s => s.active));
const selectedEncounter = computed(() => eligibleEncounters.value.find(e => e.id === form.encounterId));
const selectedSector = computed(() => activeSectors.value.find(s => s.id === form.sectorId));
const isAvailable = (bed: BedSummary) => bed.active && bed.status === 'available' && bed.sectorId === form.sectorId;
const availableBeds = computed(() => beds.value.filter(isAvailable));
const selectedBed = computed(() => availableBeds.value.find(b => b.id === form.bedId));
const locked = computed(() => submitting.value || Boolean(confirmedStay.value));
const identityReady = computed(() => !identityLoading.value && !identityError.value && Boolean(selectedEncounter.value && patient.value?.id === selectedEncounter.value.patientId && owner.value?.id === selectedEncounter.value.ownerId));
const canSubmit = computed(() => !initialLoading.value && !locked.value && !contextError.value && identityReady.value && !bedsLoading.value && !bedsError.value && Boolean(selectedSector.value && selectedBed.value));
const statusLabels: Record<string, string> = { available: 'Disponível', occupied: 'Ocupado', maintenance: 'Manutenção', blocked: 'Bloqueado' };
function bedStatus(bed: BedSummary) { return !bed.active ? 'Inativo' : statusLabels[bed.status] || 'Não informado'; }
function selectBed(bed: BedSummary) { if (!locked.value && !bedsLoading.value && identityReady.value && isAvailable(bed)) form.bedId = bed.id; }

async function loadIdentity() {
  const encounter = selectedEncounter.value, version = generation, request = ++identityGeneration;
  patient.value = null; owner.value = null; identityError.value = '';
  if (!encounter) { identityLoading.value = false; return; }
  identityLoading.value = true;
  try {
    const [patientValue, ownerValue] = await Promise.all([patientService.getById(encounter.patientId), ownerService.getById(encounter.ownerId)]);
    if (!current(version) || request !== identityGeneration || selectedEncounter.value?.id !== encounter.id) return;
    if (patientValue.id !== encounter.patientId || ownerValue.id !== encounter.ownerId) throw new Error('Identity mismatch');
    patient.value = patientValue; owner.value = ownerValue;
  } catch { if (current(version) && request === identityGeneration) identityError.value = 'Não foi possível confirmar o paciente e o tutor deste atendimento.'; }
  finally { if (current(version) && request === identityGeneration) identityLoading.value = false; }
}
async function changeEncounter() {
  if (locked.value) return;
  contextError.value = ''; error.value = ''; form.sectorId = ''; form.bedId = ''; beds.value = []; bedsError.value = ''; bedsLoading.value = false; bedGeneration++;
  await loadIdentity();
}
function clearEncounter() {
  if (locked.value) return;
  form.encounterId = ''; void changeEncounter();
}
async function loadBeds(preserveId = '') {
  const version = generation, request = ++bedGeneration, sectorId = form.sectorId;
  beds.value = []; form.bedId = ''; bedsError.value = ''; bedsLoading.value = false;
  if (!selectedSector.value) return;
  bedsLoading.value = true;
  try {
    const items = await inpatientService.listBeds({ sectorId });
    if (!current(version) || request !== bedGeneration || form.sectorId !== sectorId) return;
    if (items.some(b => b.sectorId !== sectorId)) throw new Error('Sector mismatch');
    beds.value = items;
    if (preserveId && availableBeds.value.some(b => b.id === preserveId)) form.bedId = preserveId;
  } catch { if (current(version) && request === bedGeneration) bedsError.value = 'Não foi possível carregar os leitos deste setor. Tente novamente.'; }
  finally { if (current(version) && request === bedGeneration) bedsLoading.value = false; }
}
async function loadPage(reset = true) {
  const requestedId = reset ? (typeof route.query.encounterId === 'string' ? route.query.encounterId.trim() : '') : form.encounterId || (typeof route.query.encounterId === 'string' ? route.query.encounterId.trim() : '');
  const rememberedSector = reset ? '' : form.sectorId, rememberedBed = reset ? '' : form.bedId;
  const version = ++generation; identityGeneration++; bedGeneration++;
  initialLoading.value = true; identityLoading.value = false; bedsLoading.value = false;
  form.encounterId = ''; form.sectorId = ''; form.bedId = ''; patient.value = null; owner.value = null; beds.value = [];
  confirmedStay.value = null; error.value = ''; catalogError.value = ''; contextError.value = ''; identityError.value = ''; bedsError.value = '';
  const [encounterResult, sectorResult] = await Promise.allSettled([encounterService.list(), inpatientService.listSectors()]);
  if (!current(version)) return;
  encounters.value = encounterResult.status === 'fulfilled' ? encounterResult.value : [];
  sectors.value = sectorResult.status === 'fulfilled' ? sectorResult.value : [];
  if (encounterResult.status === 'rejected' || sectorResult.status === 'rejected') catalogError.value = 'Não foi possível carregar todos os atendimentos e setores. Recarregue os cadastros.';
  if (requestedId) {
    try {
      const encounter = encounters.value.find(e => e.id === requestedId) || await encounterService.getById(requestedId);
      if (!current(version)) return;
      if (encounter.id !== requestedId) throw new Error('Identity mismatch');
      if (encounter.status === 'closed') { contextError.value = 'Este atendimento está encerrado. Escolha um atendimento aberto para admitir o paciente.'; }
      else {
        if (!encounters.value.some(e => e.id === encounter.id)) encounters.value.push(encounter);
        form.encounterId = encounter.id; await loadIdentity();
      }
    } catch { if (current(version)) contextError.value = 'Não foi possível confirmar o atendimento informado. Tente novamente ou escolha outro atendimento.'; }
  }
  if (!current(version)) return;
  if (identityReady.value && sectors.value.some(s => s.id === rememberedSector && s.active)) { form.sectorId = rememberedSector; await loadBeds(rememberedBed); }
  if (current(version)) initialLoading.value = false;
}
async function submit() {
  if (!canSubmit.value) return;
  const encounter = selectedEncounter.value!, sector = selectedSector.value!, bed = selectedBed.value!;
  const version = generation, patientName = patient.value!.name;
  const payload = { encounterId: encounter.id, patientId: encounter.patientId, unit: 'Internacao', ward: sector.name, bed: bed.code, sectorId: sector.id, bedId: bed.id };
  submitting.value = true; error.value = '';
  try {
    const stay = await inpatientService.admit(payload);
    if (!current(version)) { if (active) previousResult.value = { id: stay.id, patientName, message: `Admissão de ${patientName} confirmada.` }; return; }
    confirmedStay.value = { id: stay.id, patientName };
    try { await router.push(`/inpatient/${stay.id}`); }
    catch { /* The confirmed admission link remains available; never repeat the write. */ }
  } catch (cause) {
    if (current(version)) { error.value = cause instanceof Error ? cause.message : 'Não foi possível admitir o paciente.'; await loadBeds(bed.id); }
    else if (active) previousResult.value = { patientName, message: `Não foi possível concluir a admissão de ${patientName}. ${cause instanceof Error ? cause.message : 'Tente novamente.'}` };
  } finally { if (active) submitting.value = false; }
}
onMounted(() => loadPage());
watch(() => route.query.encounterId, () => { void loadPage(); }, { flush: 'sync' });
onBeforeUnmount(() => { active = false; generation++; identityGeneration++; bedGeneration++; });
</script>

<style scoped>
.admission-page,.admission-form,.admission-fields { display:grid;gap:20px;min-width:0; }
.admission-fields { border:0;margin:0;padding:0; }
.admission-section { padding:24px;border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface);min-width:0; }
h2 { display:flex;align-items:center;gap:10px;margin:0 0 20px;font-size:18px;font-weight:600; }
.step-number { display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--color-primary-50);color:var(--color-primary-700);font-size:12px;font-weight:700; }
label { display:block;margin-bottom:8px;font-size:13px;font-weight:600;color:var(--color-text-secondary); }.required-mark { color:var(--color-danger-600); }
.admission-select { width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-surface);color:var(--color-text);font:inherit;font-size:14px; }
.admission-select:focus-visible,.bed-option:focus-visible { outline:2px solid var(--color-primary-500);outline-offset:3px; }
.admission-select:disabled { opacity:.65;cursor:not-allowed; }
.state-message,.form-footnote { font-size:13px;line-height:1.6;color:var(--color-text-secondary);margin:14px 0 0; }.form-footnote { margin:0; }
.sector-context { display:grid;gap:5px;margin:16px 0 0;font-size:14px;overflow-wrap:anywhere; }
.patient-identity { margin-top:20px;padding:20px;border:1px solid var(--color-border);border-left:3px solid var(--color-primary-500);border-radius:12px; }
.patient-heading { display:flex;gap:14px;align-items:center;flex-wrap:wrap; }.patient-heading>div { flex:1;min-width:0; }.patient-heading h3 { font-size:24px;margin:4px 0;overflow-wrap:anywhere; }.patient-heading p { margin:0;font-size:14px;overflow-wrap:anywhere; }
.patient-mark { display:grid;place-items:center;width:48px;height:48px;border-radius:14px;color:var(--color-primary-700);background:var(--color-primary-50); }
.eyebrow { color:var(--color-text-secondary);font-size:11px;letter-spacing:.08em;text-transform:uppercase; }
.identity-details { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0 0;padding-top:16px;border-top:1px solid var(--color-border); }
.identity-details dt { font-size:12px;color:var(--color-text-secondary);margin-bottom:6px; }.identity-details dd { margin:0;font-size:14px;overflow-wrap:anywhere; }.identity-details .identity-code { font-size:12px;color:var(--color-text-secondary);margin-top:4px; }.identity-reason { grid-column:1/-1; }
.bed-heading { display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin:22px 0 16px; }.bed-heading h3 { font-size:16px;margin:0; }.bed-heading>span { color:var(--color-text-secondary);font-size:12px; }
.bed-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px; }
.bed-option { display:flex;flex-direction:column;gap:8px;min-width:0;padding:18px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-surface);color:var(--color-text);text-align:left;font:inherit;cursor:pointer;transition:border-color .15s,background .15s,transform .15s; }
.bed-option__top { display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--color-text-secondary);margin-bottom:8px; }.bed-option strong { font-size:20px;overflow-wrap:anywhere; }.bed-name { font-size:14px;line-height:1.5;overflow-wrap:anywhere; }.bed-species { font-size:12px;color:var(--color-text-secondary); }
.bed-status { font-size:11px;line-height:1.4;color:var(--color-text-secondary);background:var(--color-surface-muted,var(--color-surface));border:1px solid var(--color-border);border-radius:99px;padding:4px 8px; }.bed-status--available { color:var(--color-primary-700);background:var(--color-primary-50);border-color:transparent; }
.bed-option:hover:not(:disabled) { border-color:var(--color-primary-500);transform:translateY(-2px); }.bed-option:disabled { cursor:not-allowed; }.bed-option--selected { border-color:var(--color-primary-500);box-shadow:inset 0 0 0 1px var(--color-primary-500);background:var(--color-primary-50); }
.selection-mark { display:flex;gap:6px;align-items:center;font-size:12px;color:var(--color-primary-700);margin-top:auto;padding-top:4px; }
.selected-destination { display:flex;gap:12px;align-items:center;margin-top:18px;padding:16px;border:1px solid var(--color-border);border-radius:12px; }.selected-destination>div { display:grid;gap:5px;min-width:0; }.selected-destination strong,.selected-destination>div>span:last-child { overflow-wrap:anywhere;font-size:14px; }
.admission-actions,.inline-actions { display:flex;gap:12px;flex-wrap:wrap; }.inline-actions { margin-top:12px; }.admission-actions>:first-child { min-width:210px; }
.admission-fields:disabled .bed-option { opacity:.65;cursor:not-allowed; }
@media(max-width:520px) { .admission-page,.admission-form,.admission-fields { gap:16px; }.admission-section { padding:16px; }.patient-identity { padding:16px; }.patient-heading { display:grid;grid-template-columns:48px minmax(0,1fr);align-items:start; }.patient-heading > :last-child { grid-column:2;justify-self:start; }.patient-heading h3 { font-size:22px; }.identity-details { grid-template-columns:1fr; }.bed-grid { grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }.bed-option { padding:14px; }.bed-option__top { flex-direction:column;align-items:start;gap:8px; }.admission-actions>* { flex:1 1 auto; }.admission-actions>:first-child { min-width:210px; } }
@media(prefers-reduced-motion:reduce) { .bed-option { transition:none; }.bed-option:hover:not(:disabled) { transform:none; } }
</style>
