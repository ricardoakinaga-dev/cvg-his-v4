<template>
  <div class="encounter-form-page">
    <AppPageHeader title="Abrir Atendimento" subtitle="Confirme o paciente e registre o motivo da consulta.">
      <template #actions><DsButton variant="secondary" tag="a" to="/encounters">Voltar aos atendimentos</DsButton></template>
    </AppPageHeader>
    <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>
    <DsAlert v-if="previousWrite" :variant="previousWrite.encounterId ? 'success' : 'warning'" dismissible @dismiss="previousWrite = null">{{ previousWrite.message }} <DsButton v-if="previousWrite.encounterId" type="button" tag="a" :to="`/encounters/${previousWrite.encounterId}`" variant="secondary" size="sm">Ver atendimento de {{ previousWrite.patientName }}</DsButton></DsAlert>
    <p v-if="initialLoading" class="state-message" role="status">Carregando paciente e contexto…</p>
    <DsAlert v-if="contextError" variant="danger">{{ contextError }}<div class="inline-actions"><DsButton type="button" size="sm" variant="secondary" :disabled="locked" @click="loadPage">Tentar novamente</DsButton><DsButton type="button" size="sm" variant="secondary" :disabled="locked" @click="clearContext">Escolher outro paciente</DsButton></div></DsAlert>
    <form class="encounter-form" @submit.prevent="onSubmit">
      <fieldset :disabled="locked || initialLoading" class="encounter-fields">
        <section class="form-section" aria-labelledby="patient-title">
          <div class="section-heading"><h2 id="patient-title"><span class="section-number" aria-hidden="true">01</span>Paciente <span class="required-mark" aria-hidden="true">*</span></h2><DsButton v-if="!form.appointmentId" type="button" size="sm" variant="secondary" tag="a" to="/patients/new">Novo paciente</DsButton></div>
          <div v-if="form.appointmentId" class="appointment-context"><div><span class="eyebrow">Agendamento vinculado</span><p>{{ form.appointmentId }}</p></div><DsButton type="button" variant="secondary" size="sm" @click="unlinkAppointment">Desvincular agendamento</DsButton></div>
          <template v-if="!form.appointmentId">
            <div v-if="queryOwnerFilter" class="patient-scope"><span>Busca limitada ao tutor {{ queryOwnerFilter }}.</span><DsButton type="button" size="sm" variant="secondary" @click="clearOwnerScope">Buscar todos os pacientes</DsButton></div>
            <div class="patient-search"><DsInput id="patientSearch" v-model="searchDraft" type="search" label="Buscar paciente" placeholder="Nome ou identificação" :disabled="patientsLoading || Boolean(contextError)" @keydown.enter.prevent="searchPatients" /><DsButton type="button" variant="secondary" :disabled="patientsLoading || Boolean(contextError)" @click="searchPatients">Buscar pacientes</DsButton></div>
            <p v-if="searchDraft.trim() !== appliedSearch" class="state-message">Busca alterada. Clique em Buscar pacientes para atualizar a lista.</p>
            <p v-if="patientsLoading" class="state-message" role="status">Carregando pacientes…</p>
            <DsAlert v-else-if="patientsError" variant="warning">{{ patientsError }} <DsButton type="button" size="sm" variant="secondary" @click="loadPatients(page, appliedSearch)">Recarregar pacientes</DsButton></DsAlert>
            <p v-else-if="!patients.length" class="state-message">Nenhum paciente encontrado. Revise a busca ou cadastre um paciente.</p>
          </template>
          <DsInput id="patientId" v-model="form.patientId" type="select" label="Selecione o paciente" :error="errors.patientId" :disabled="patientsLoading || Boolean(form.appointmentId) || Boolean(contextError)" required @change="choosePatient">
            <option value="">Selecione...</option>
            <option v-if="selectedOutsidePage" :value="selectedPatient!.id">{{ patientOption(selectedPatient!) }}</option>
            <option v-for="patient in visiblePatients" :key="patient.id" :value="patient.id">{{ patientOption(patient) }}</option>
          </DsInput>
          <div v-if="!form.appointmentId && !patientsLoading && !patientsError && pages > 1" class="pagination" aria-label="Paginação de pacientes"><DsButton type="button" size="sm" variant="secondary" :disabled="page <= 1" @click="changePage(page - 1)">Anterior</DsButton><span>Página {{ page }} de {{ pages }}</span><DsButton type="button" size="sm" variant="secondary" :disabled="page >= pages" @click="changePage(page + 1)">Próxima</DsButton></div>
          <div v-if="selectedPatient" class="patient-identity" aria-label="Identificação do paciente selecionado">
            <div class="patient-identity__animal"><span class="eyebrow">Paciente selecionado</span><h3>{{ selectedPatient.name }}</h3><p>{{ speciesLabel(selectedPatient.species) }}<template v-if="selectedPatient.breed"> · {{ selectedPatient.breed }}</template></p><p class="identity-code">{{ selectedPatient.id }}</p></div>
            <div class="patient-identity__owner"><span class="eyebrow">Tutor responsável</span><p v-if="ownerLoading" class="state-message" role="status">Confirmando tutor…</p><template v-else-if="selectedOwner"><strong>{{ selectedOwner.fullName }}</strong><p class="identity-code">{{ selectedOwner.id }}</p><p v-if="ownerContact">{{ ownerContact }}</p></template><DsAlert v-else-if="ownerError" variant="warning">{{ ownerError }} <DsButton type="button" size="sm" variant="secondary" @click="resolveOwner">Recarregar tutor</DsButton></DsAlert></div>
          </div>
        </section>
        <section class="form-section" aria-labelledby="visit-title">
          <h2 id="visit-title"><span class="section-number" aria-hidden="true">02</span>Consulta</h2>
          <div class="form-row"><DsInput id="visitType" v-model="form.visitType" type="select" label="Tipo" required><option value="walk_in">Walk-in</option><option value="scheduled">Agendado</option><option value="return">Retorno</option></DsInput><DsInput id="origin" v-model="form.origin" type="select" label="Origem"><option value="reception">Recepção</option><option value="schedule">Agendamento</option><option value="return">Retorno</option></DsInput></div>
          <DsInput id="reason" v-model="form.reason" type="textarea" label="Motivo (Queixa)" placeholder="Descreva o motivo principal da consulta" :error="errors.reason" :rows="4" required />
        </section>
        <div class="form-actions"><DsButton type="submit" variant="primary" :loading="submitting" :disabled="!canSubmit || successPending">{{ submitting ? 'Abrindo...' : 'Abrir Atendimento' }}</DsButton><DsButton type="button" variant="secondary" tag="a" to="/encounters">Cancelar</DsButton></div>
      </fieldset>
      <p class="form-footnote">Os campos com * são obrigatórios.</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { encounterService } from '@/services/encounter';
import { patientService } from '@/services/patient';
import { ownerService } from '@/services/owner';
import { appointmentService } from '@/services/appointment';
import type { CreateEncounterRequest } from '@/types/encounter';
import type { PatientSummary } from '@/types/patient';
import type { OwnerSummary } from '@/types/owner';
import { useFormValidation } from '@/composables/useFormValidation';
import { useSuccessRedirect } from '@/composables/successRedirect';
import { speciesLabel } from '@/utils/labels';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
const router = useRouter(), route = useRoute();
const emptyForm = () => ({ patientId: '', ownerId: '', appointmentId: '', visitType: 'walk_in' as CreateEncounterRequest['visitType'], origin: 'reception' as CreateEncounterRequest['origin'], reason: '' });
const form = reactive(emptyForm());
const patients = ref<PatientSummary[]>([]), selectedPatient = ref<PatientSummary | null>(null), selectedOwner = ref<OwnerSummary | null>(null);
const initialLoading = ref(true), patientsLoading = ref(false), ownerLoading = ref(false), completed = ref(false);
const patientsError = ref(''), ownerError = ref(''), contextError = ref('');
const searchDraft = ref(''), appliedSearch = ref(''), queryOwnerFilter = ref('');
const page = ref(1), pages = ref(1), remotePaging = ref(false);
let generation = 0, listGeneration = 0, ownerGeneration = 0, active = true;
const current = (version: number) => active && generation === version;
const visiblePatients = computed(() => remotePaging.value ? patients.value : patients.value.slice((page.value - 1) * 12, page.value * 12));
const selectedOutsidePage = computed(() => selectedPatient.value && !visiblePatients.value.some(p => p.id === selectedPatient.value!.id));
const ownerContact = computed(() => (selectedOwner.value?.contacts?.find(c => c.primary) || selectedOwner.value?.contacts?.[0])?.value || '');
const { errors, formError, successMessage, submitting, validate, clearErrors } = useFormValidation({ rules: { patientId: [(v: unknown) => !v ? 'Selecione um paciente' : null], reason: [(v: unknown) => !(v as string)?.trim() ? 'Motivo é obrigatório' : null] } });
const successRedirect = useSuccessRedirect();
const successPending = successRedirect.successPending;
const previousWrite = ref<{ message: string; patientName: string; encounterId?: string } | null>(null);
const locked = computed(() => submitting.value || completed.value || successPending.value);
const canSubmit = computed(() => !locked.value && !initialLoading.value && !contextError.value && !ownerLoading.value && Boolean(selectedPatient.value && selectedOwner.value && selectedPatient.value.id === form.patientId && selectedPatient.value.primaryOwnerId === selectedOwner.value.id && form.ownerId === selectedOwner.value.id));
const patientOption = (p: PatientSummary) => `${p.name} · ${speciesLabel(p.species)} · ${p.id}`;
async function loadPatients(requestedPage = 1, search = searchDraft.value.trim()) {
  const version = generation, request = ++listGeneration;
  patientsLoading.value = true; patientsError.value = ''; patients.value = []; appliedSearch.value = search; page.value = requestedPage;
  try {
    const result = await patientService.listPage({ search: search || undefined, ownerId: queryOwnerFilter.value || undefined, page: requestedPage, pageSize: 12 });
    if (!current(version) || request !== listGeneration) return;
    patients.value = result.items; remotePaging.value = result.page !== undefined || result.total !== undefined || result.totalPages !== undefined;
    pages.value = Math.max(1, result.totalPages ?? Math.ceil((result.total ?? result.items.length) / (result.pageSize || 12)));
    if (result.page !== undefined) page.value = result.page;
  } catch { if (current(version) && request === listGeneration) patientsError.value = 'Erro ao carregar lista de pacientes. Tente novamente.'; }
  finally { if (current(version) && request === listGeneration) patientsLoading.value = false; }
}
function searchPatients() { if (!locked.value && !contextError.value) void loadPatients(1, searchDraft.value.trim()); }
function changePage(next: number) { if (locked.value || patientsLoading.value) return; if (remotePaging.value) void loadPatients(next, appliedSearch.value); else page.value = next; }
async function resolveOwner() {
  const patient = selectedPatient.value, version = generation, request = ++ownerGeneration;
  selectedOwner.value = null; form.ownerId = ''; ownerError.value = '';
  if (!patient) { ownerLoading.value = false; return; }
  ownerLoading.value = true;
  try {
    if (!patient.primaryOwnerId) throw new Error('Missing owner');
    const owner = await ownerService.getById(patient.primaryOwnerId);
    if (!current(version) || request !== ownerGeneration || selectedPatient.value?.id !== patient.id) return;
    if (owner.id !== patient.primaryOwnerId) throw new Error('Identity mismatch');
    selectedOwner.value = owner; form.ownerId = owner.id;
  } catch { if (current(version) && request === ownerGeneration) ownerError.value = `Não foi possível confirmar o tutor ${patient.primaryOwnerId || 'da ficha'}.`; }
  finally { if (current(version) && request === ownerGeneration) ownerLoading.value = false; }
}
async function choosePatient() {
  if (locked.value || form.appointmentId || contextError.value) return;
  selectedPatient.value = patients.value.find(p => p.id === form.patientId) || (selectedPatient.value?.id === form.patientId ? selectedPatient.value : null);
  if (!selectedPatient.value) form.patientId = '';
  await resolveOwner();
}
function queryValue(key: string) { const value = route.query?.[key]; return typeof value === 'string' ? value.trim() : ''; }
async function loadPage() {
  const version = ++generation; listGeneration++; ownerGeneration++; successRedirect.invalidate();
  initialLoading.value = true; completed.value = false; contextError.value = ''; ownerError.value = ''; ownerLoading.value = false;
  Object.assign(form, emptyForm()); selectedPatient.value = null; selectedOwner.value = null; clearErrors(); formError.value = ''; successMessage.value = ''; searchDraft.value = '';
  let requestedPatient = queryValue('patientId'), requestedOwner = queryValue('ownerId'); const appointmentId = queryValue('appointmentId'); queryOwnerFilter.value = requestedOwner;
  const listRequest = loadPatients(1, '');
  try {
    if (appointmentId) {
      const appointment = await appointmentService.getById(appointmentId);
      if (!current(version)) return;
      if (appointment.id !== appointmentId || !appointment.patientId || !appointment.ownerId || (requestedPatient && requestedPatient !== appointment.patientId) || (requestedOwner && requestedOwner !== appointment.ownerId)) throw new Error('O agendamento não corresponde ao paciente e tutor informados.');
      requestedPatient = appointment.patientId; requestedOwner = appointment.ownerId;
      form.appointmentId = appointmentId; form.visitType = 'scheduled'; form.origin = 'schedule';
    }
    await listRequest;
    if (!current(version)) return;
    if (requestedPatient) {
      const patient = patients.value.find(p => p.id === requestedPatient) || await patientService.getById(requestedPatient);
      if (!current(version)) return;
      if (patient.id !== requestedPatient || (requestedOwner && patient.primaryOwnerId !== requestedOwner)) throw new Error('O paciente não corresponde ao tutor informado.');
      selectedPatient.value = patient; form.patientId = patient.id; await resolveOwner();
    }
  } catch (err: unknown) { if (current(version)) { selectedPatient.value = null; selectedOwner.value = null; form.patientId = ''; form.ownerId = ''; contextError.value = err instanceof Error && (err.message.startsWith('O paciente') || err.message.startsWith('O agendamento')) ? err.message : 'Não foi possível confirmar o contexto de abertura. Recarregue ou escolha outro paciente.'; } }
  finally { await listRequest; if (current(version)) initialLoading.value = false; }
}
function clearContext() {
  if (locked.value) return;
  generation++; ownerGeneration++; listGeneration++; successRedirect.invalidate(); initialLoading.value = false; contextError.value = ''; ownerError.value = ''; ownerLoading.value = false;
  selectedPatient.value = null; selectedOwner.value = null; form.patientId = ''; form.ownerId = ''; form.appointmentId = ''; queryOwnerFilter.value = ''; searchDraft.value = ''; void loadPatients(1, '');
}
function clearOwnerScope() { if (locked.value) return; queryOwnerFilter.value = ''; void loadPatients(1, appliedSearch.value); }
function unlinkAppointment() { if (locked.value) return; form.appointmentId = ''; clearOwnerScope(); }
async function onSubmit() {
  if (locked.value || initialLoading.value) return;
  if (!validate({ patientId: form.patientId, reason: form.reason })) return;
  if (!canSubmit.value) { formError.value = 'Confirme a identificação do paciente e do tutor antes de abrir o atendimento.'; return; }
  if (!successRedirect.begin()) return;
  const version = generation, submittedPatientName = selectedPatient.value!.name;
  const payload: CreateEncounterRequest = { patientId: form.patientId, ownerId: form.ownerId, visitType: form.visitType, origin: form.origin, reason: form.reason.trim() };
  if (form.appointmentId) payload.appointmentId = form.appointmentId;
  submitting.value = true; formError.value = ''; successMessage.value = '';
  try {
    const created = await encounterService.create(payload);
    if (!current(version)) { if (active) previousWrite.value = { message: `Atendimento de ${submittedPatientName} aberto.`, patientName: submittedPatientName, encounterId: created.id }; return; }
    completed.value = true; successMessage.value = 'Atendimento aberto com sucesso!';
    successRedirect.schedule(() => { if (current(version)) return router.push(`/encounters/${created.id}`); }, successMessage.value);
  } catch (err: unknown) { if (current(version)) formError.value = err instanceof Error ? err.message : 'Erro ao abrir atendimento'; else if (active) previousWrite.value = { message: `Não foi possível abrir o atendimento de ${submittedPatientName}. ${err instanceof Error ? err.message : 'Tente novamente.'}`, patientName: submittedPatientName }; }
  finally { if (active) submitting.value = false; }
}
onMounted(loadPage);
watch(() => [route.query?.patientId, route.query?.ownerId, route.query?.appointmentId], () => { void loadPage(); }, { flush: 'sync' });
onBeforeUnmount(() => { active = false; generation++; listGeneration++; ownerGeneration++; successRedirect.invalidate(); });
</script>

<style scoped>
.encounter-form-page,.encounter-form,.encounter-fields { display:grid;gap:20px;min-width:0; }
.encounter-fields { border:0;margin:0;padding:0; }
.form-section { padding:24px;border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface);min-width:0; }
.section-heading { display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:20px; }
h2 { display:flex;align-items:center;gap:10px;margin:0;font-size:18px;font-weight:600; }h3 { margin:6px 0;font-size:24px;overflow-wrap:anywhere; }
.section-number { display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--color-primary-50);color:var(--color-primary-700);font-size:12px; }
.required-mark { color:var(--color-danger-600); }.patient-search { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin-bottom:16px; }
.state-message,.form-footnote { font-size:13px;line-height:1.6;color:var(--color-text-secondary);margin:8px 0; }.form-footnote { margin:0; }
.patient-identity { display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px;margin-top:20px;border:1px solid var(--color-border);border-left:3px solid var(--color-primary-500);border-radius:12px; }
.patient-identity p,.appointment-context p { margin:6px 0;overflow-wrap:anywhere;font-size:14px; }.patient-identity__owner { border-left:1px solid var(--color-border);padding-left:24px;min-width:0; }.patient-identity__animal { min-width:0; }.patient-identity__owner strong { display:block;margin:10px 0 6px;font-size:18px;overflow-wrap:anywhere; }
.eyebrow { font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--color-text-secondary); }.patient-identity .identity-code { color:var(--color-text-secondary);font-size:12px; }
.appointment-context { display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;border-radius:12px;background:var(--color-primary-50);margin-bottom:18px; }.appointment-context>div { min-width:0; }
.patient-scope { display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;font-size:13px;color:var(--color-text-secondary);overflow-wrap:anywhere; }
.form-row { display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0; }.inline-actions,.form-actions { display:flex;gap:12px;flex-wrap:wrap; }.inline-actions { margin-top:12px; }.form-actions>:first-child { min-width:190px; }.pagination { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;font-size:12px; }
@media(max-width:520px) { .encounter-form-page,.encounter-form,.encounter-fields { gap:16px; }.form-section { padding:16px; }.patient-search { grid-template-columns:1fr; }.patient-identity { grid-template-columns:1fr;gap:16px;padding:16px; }.patient-identity__owner { border-left:0;border-top:1px solid var(--color-border);padding:16px 0 0; }.form-row { gap:12px; }.appointment-context { flex-direction:column;align-items:start; }.form-actions>* { flex:1 1 auto; }.form-actions>:first-child { min-width:190px; }h3 { font-size:22px; } }
</style>
