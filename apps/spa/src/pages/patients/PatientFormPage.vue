<template>
  <div class="patient-form-page">
    <AppPageHeader :title="isEdit ? 'Editar paciente' : 'Novo paciente'" subtitle="Identificação, tutor responsável e dados do animal.">
      <template #actions><DsButton variant="secondary" tag="a" to="/patients">Voltar aos pacientes</DsButton></template>
    </AppPageHeader>
    <div v-if="formError" ref="formErrorRegion" class="form-feedback-region" tabindex="-1">
      <DsAlert variant="danger">{{ formError }}</DsAlert>
    </div>
    <div v-if="duplicatePatientId" ref="duplicateFeedbackRegion" class="duplicate-feedback-region" tabindex="-1">
      <DsAlert variant="warning" icon="alert" title="Cadastro possivelmente duplicado">
        <p>Já existe um animal com o mesmo nome vinculado a este tutor. Nada novo foi criado e seu rascunho continua preservado.</p>
        <div class="duplicate-feedback__actions">
          <DsButton type="button" variant="secondary" @click="openDuplicatePatient">Abrir animal existente</DsButton>
          <DsButton type="button" variant="ghost" @click="dismissDuplicateWarning">Manter este rascunho</DsButton>
        </div>
      </DsAlert>
    </div>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>
    <p v-if="initialLoading" class="state-message" role="status">Carregando ficha e cadastros…</p>
    <section v-else-if="patientFailed" class="form-section" aria-label="Ficha indisponível">
      <h2>Não foi possível carregar o paciente</h2><p class="state-message">A ficha precisa ser carregada antes de qualquer alteração.</p>
      <DsButton variant="secondary" @click="loadPage">Tentar novamente</DsButton>
    </section>
    <form
      v-else
      class="patient-form"
      novalidate
      :aria-describedby="validationErrorFields.length ? 'patient-form-error-summary' : undefined"
      @submit.prevent="onSubmit"
    >
      <div
        v-if="validationErrorFields.length"
        id="patient-form-error-summary"
        class="form-error-summary"
        aria-labelledby="patient-form-error-summary-title"
      >
        <h2 id="patient-form-error-summary-title">Revise os campos obrigatórios</h2>
        <p>Confira os campos destacados antes de salvar o paciente.</p>
        <ul>
          <li v-for="field in validationErrorFields" :key="field.key">
            <a :href="`#${field.targetId}`" @click.prevent="focusValidationField(field.key)">
              {{ field.label }}: {{ errors[field.key] }}
            </a>
          </li>
        </ul>
      </div>
      <fieldset class="form-body" :disabled="submitting || saveCompleted">
        <section class="form-section owner-section" aria-labelledby="owner-title">
          <div class="section-heading"><h2 id="owner-title"><span class="section-number" aria-hidden="true">01</span>Tutor responsável <span class="required-mark" aria-hidden="true">*</span></h2><DsButton type="button" size="sm" variant="secondary" tag="a" to="/owners/new">Novo tutor</DsButton></div>
          <div v-if="linkedOwner" class="linked-owner">
            <div><span class="section-eyebrow">Tutor vinculado</span><h3>{{ linkedOwner.fullName }}</h3><p class="owner-code">{{ linkedOwner.id }}</p><p v-if="ownerContact(linkedOwner)" class="owner-contact">Contato: {{ ownerContact(linkedOwner) }}</p><StatusBadge :label="ownerStatus(linkedOwner)" :variant="linkedOwner.status === 'active' ? 'success' : 'neutral'" /></div>
            <DsButton v-if="!pickerOpen" type="button" variant="secondary" :disabled="submitting" @click="openOwnerPicker">Trocar tutor</DsButton>
          </div>
          <DsAlert v-if="ownerIdentityError" variant="warning">{{ ownerIdentityError }} <DsButton type="button" variant="secondary" size="sm" :disabled="ownersLoading || submitting" @click="resolveRequestedOwner">Recarregar identificação</DsButton></DsAlert>
          <template v-if="pickerOpen || !linkedOwner">
            <div class="owner-search"><DsInput id="ownerSearch" v-model="ownerSearch" type="search" label="Tutor responsável" placeholder="Nome, documento ou contato" hint="Busque por nome, documento ou contato." :error="errors.primaryOwnerId" :disabled="ownersLoading" required @keydown.enter.prevent="searchOwners" /><DsButton type="button" variant="secondary" :disabled="ownersLoading || submitting" @click="searchOwners">Buscar tutor</DsButton></div>
            <p v-if="ownerSearch !== ownerAppliedSearch" class="state-message">Busca alterada. Clique em Buscar tutor para atualizar a lista.</p>
            <p v-if="ownersLoading" class="state-message" role="status">Carregando tutores…</p>
            <DsAlert v-else-if="ownersError" variant="danger">{{ ownersError }} <DsButton type="button" size="sm" variant="secondary" @click="loadOwners(ownerPage, ownerAppliedSearch)">Recarregar tutores</DsButton></DsAlert>
            <div v-else-if="visibleOwners.length" class="client-options" role="group" aria-label="Tutores encontrados">
              <button v-for="owner in visibleOwners" :key="owner.id" class="client-option" type="button" :aria-pressed="stagedOwner?.id === owner.id" :disabled="submitting" @click="stagedOwner = owner">
                <span class="client-option__status">{{ ownerStatus(owner) }}</span><strong>{{ owner.fullName }}</strong><span class="owner-code">{{ owner.id }}</span><span>{{ owner.documentId || 'Documento não informado' }}</span><span v-if="ownerContact(owner)" class="owner-contact">Contato: {{ ownerContact(owner) }}</span>
              </button>
            </div>
            <p v-else class="state-message">Nenhum tutor encontrado. Revise a busca ou cadastre um tutor.</p>
            <div v-if="!ownersLoading && !ownersError && ownerPages > 1" class="owner-pagination" aria-label="Paginação dos tutores">
              <DsButton type="button" variant="secondary" size="sm" :disabled="ownerPage <= 1" @click="changeOwnerPage(ownerPage - 1)">Anterior</DsButton><span>Página {{ ownerPage }} de {{ ownerPages }}</span><DsButton type="button" variant="secondary" size="sm" :disabled="ownerPage >= ownerPages" @click="changeOwnerPage(ownerPage + 1)">Próxima</DsButton>
            </div>
            <div class="owner-confirm"><DsButton type="button" :disabled="!stagedOwner || ownersLoading || submitting" @click="linkSelectedOwner">Vincular tutor</DsButton><DsButton v-if="linkedOwner" type="button" variant="secondary" @click="pickerOpen = false; stagedOwner = null">Manter tutor atual</DsButton></div>
          </template>
        </section>
        <section class="form-section identity-section" aria-labelledby="identity-title">
          <h2 id="identity-title"><span class="section-number" aria-hidden="true">02</span>Identificação</h2>
          <DsAlert v-if="speciesError" variant="warning">{{ speciesError }} <DsButton type="button" size="sm" variant="secondary" @click="loadSpecies">Recarregar espécies</DsButton></DsAlert>
          <p v-else-if="!speciesLoading && !speciesOptions.length" class="state-message">{{ isEdit ? 'Nenhuma espécie no catálogo atual. A espécie registrada na ficha será preservada.' : 'Nenhuma espécie cadastrada. Cadastre uma espécie para criar o paciente.' }}</p>
          <DsAlert v-if="breedsError" variant="warning">{{ breedsError }} <DsButton type="button" size="sm" variant="secondary" @click="loadBreeds">Recarregar raças</DsButton></DsAlert>
          <div class="form-row identity-main-row">
            <DsInput
              id="name"
              v-model="form.name"
              label="Nome do Animal"
              placeholder="Nome do animal"
              :error="errors.name"
              required
            />
            <DsInput
              id="species"
              v-model="form.species"
              type="select"
              label="Espécie"
              :error="errors.species"
              :disabled="speciesLoading || Boolean(speciesError) || !speciesOptions.length"
              :hint="speciesSelectHint"
              required
            >
              <option value="">Selecione...</option>
              <option v-for="speciesOption in speciesOptions" :key="speciesOption.id" :value="speciesOption.systemCode">
                {{ speciesOption.name }}
              </option>
              <option v-if="selectedSpeciesOutsideCatalog" :value="form.species">
                {{ form.species }}
              </option>
            </DsInput>
          </div>
          <div class="form-row form-row--3">
            <DsInput
              id="breed"
              v-model="form.breed"
              type="select"
              label="Raça"
              :disabled="breedsLoading || Boolean(breedsError)"
              :hint="breedSelectHint"
            >
              <option value="">Selecione...</option>
              <option v-for="breed in breedOptionsForSpecies" :key="breed.id" :value="breed.name">
                {{ breed.name }}
              </option>
              <option v-if="selectedBreedOutsideCatalog" :value="form.breed">
                {{ form.breed }}
              </option>
            </DsInput>
            <DsInput
              id="sex"
              v-model="form.sex"
              type="select"
              label="Sexo"
              :error="errors.sex"
              required
            >
              <option value="">Selecione...</option>
              <option value="male">Macho</option>
              <option value="female">Fêmea</option>
              <option value="unknown">Desconhecido</option>
            </DsInput>
            <DsInput id="size" v-model="form.size" type="select" label="Tamanho">
              <option value="">Não informado</option>
              <option value="small">Pequeno</option>
              <option value="medium">Médio</option>
              <option value="large">Grande</option>
            </DsInput>
          </div>

        </section>
        <details class="form-section extra-section" :open="isEdit">
          <summary><span class="section-number" aria-hidden="true">03</span>Dados complementares <span class="optional-note">Opcional</span></summary>
          <div class="extra-fields">
          <div class="form-row form-row--3">
            <DsInput
              id="baseWeightKg"
              v-model.number="form.baseWeightKg"
              type="number"
              step="0.1"
              min="0"
              label="Peso (kg)"
              placeholder="0.0"
            />
            <DsInput
              id="birthDateApproximate"
              v-model="form.birthDateApproximate"
              type="date"
              label="Data de nascimento aproximada"
            />
            <DsInput id="status" v-model="form.status" type="select" label="Status">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="deceased">Falecido</option>
            </DsInput>
          </div>
          <div class="form-row form-row--3">
            <DsInput id="isNeutered" v-model="form.isNeutered" type="select" label="Castrado">
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </DsInput>
            <DsInput id="microchip" v-model="form.microchip" label="Número do chip" />
            <DsInput id="pedigreeNumber" v-model="form.pedigreeNumber" label="Número pedigree" />
          </div>
          <div class="form-row">
            <DsInput id="color" v-model="form.color" label="Cor" />
            <DsInput id="legacyVetusId" v-model="form.legacyVetusId" label="ID legado Vetus" />
          </div>
          <div class="form-row clinical-notes">
            <DsInput id="chronicDisease" v-model="form.chronicDisease" type="textarea" :rows="2" label="Doença crônica" />
            <DsInput id="allergy" v-model="form.allergy" type="textarea" :rows="2" label="Alergia" />
          </div>
          <div class="form-row clinical-notes">
            <DsInput id="temperament" v-model="form.temperament" type="textarea" :rows="2" label="Temperamento" />
            <DsInput id="originalCreatedAt" v-model="form.originalCreatedAt" type="date" label="Data de cadastro original" />
          </div>
          <DsInput
            id="generalNotes"
            v-model="form.generalNotes"
            type="textarea"
            label="Observações gerais"
            :rows="3"
          />

          </div>
        </details>
        <div class="form-actions"><DsButton type="submit" variant="primary" :loading="submitting" :disabled="!canSave || successPending">{{ submitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Salvar animal' }}</DsButton><DsButton type="button" variant="secondary" tag="a" to="/patients">Cancelar</DsButton></div>
      </fieldset>
      <p class="form-footnote">Os campos com * são obrigatórios.</p>
    </form>
    <DsModal :open="leaveRequested" title="Alterações não salvas" size="sm" initial-focus="#patient-continue-editing" @close="resolveLeave(false)">
      <p>Você alterou os dados deste paciente. Continue editando para salvar ou descarte as alterações para sair.</p>
      <template #footer>
        <DsButton variant="secondary" @click="resolveLeave(true)">Descartar e sair</DsButton>
        <DsButton id="patient-continue-editing" variant="primary" @click="resolveLeave(false)">Continuar editando</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { patientService } from '@/services/patient';
import { ownerService } from '@/services/owner';
import { breedsService, type BreedSummary } from '@/services/breeds';
import { animalSpeciesService, type AnimalSpeciesSummary } from '@/services/species';
import type { CreatePatientRequest, UpdatePatientRequest, PatientSummary } from '@/types/patient';
import type { OwnerSummary } from '@/types/owner';
import { useUnsavedChanges } from '@/composables/useUnsavedChanges';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import { duplicateEntityId } from '@/utils/duplicateConflict';
import { useSuccessRedirect } from '@/composables/successRedirect';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
const route = useRoute(); const router = useRouter();
const isEdit = computed(() => !!route.params.id && route.path.includes('/edit'));
const patientId = computed(() => String(route.params.id || ''));
const emptyForm = () => ({
  name: '',
  species: '',
  breed: '',
  sex: '' as 'male' | 'female' | 'unknown' | '',
  size: '' as 'small' | 'medium' | 'large' | '',
  baseWeightKg: undefined as number | undefined,
  birthDateApproximate: '',
  isNeutered: '' as '' | 'true' | 'false',
  microchip: '',
  pedigreeNumber: '',
  color: '',
  chronicDisease: '',
  allergy: '',
  temperament: '',
  generalNotes: '',
  legacyVetusId: '',
  originalCreatedAt: '',
  primaryOwnerId: '',
  status: 'active' as 'active' | 'inactive' | 'deceased'
});
const form = reactive(emptyForm());
const { leaveRequested, resolveLeave, markClean } = useUnsavedChanges(() => JSON.stringify(form), {
  resetsForm: (to, from) => to.query.ownerId !== from.query.ownerId
});
const owners = ref<OwnerSummary[]>([]), linkedOwner = ref<OwnerSummary | null>(null), stagedOwner = ref<OwnerSummary | null>(null);
const breeds = ref<BreedSummary[]>([]), speciesCatalog = ref<AnimalSpeciesSummary[]>([]);
const saveCompleted = ref(false);
const duplicatePatientId = ref('');
const initialLoading = ref(true), patientFailed = ref(false), ownersLoading = ref(false), breedsLoading = ref(false), speciesLoading = ref(false);
const ownersError = ref(''), ownerIdentityError = ref(''), speciesError = ref(''), breedsError = ref('');
const ownerSearch = ref(''), ownerAppliedSearch = ref(''), pickerOpen = ref(true), requestedOwnerId = ref('');
const ownerPage = ref(1), ownerPages = ref(1), ownerRemotePaging = ref(false);
let pageGeneration = 0, ownerGeneration = 0, speciesGeneration = 0, breedGeneration = 0, identityGeneration = 0;
let active = true;
const current = (version: number) => active && version === pageGeneration;
const visibleOwners = computed(() => ownerRemotePaging.value ? owners.value : owners.value.slice((ownerPage.value - 1) * 12, ownerPage.value * 12));
const speciesOptions = computed(() => speciesCatalog.value);
const selectedSpeciesOutsideCatalog = computed(() => Boolean(form.species) && !speciesOptions.value.some(item => item.systemCode === form.species));
const breedOptionsForSpecies = computed(() => breeds.value.filter(item => !form.species || item.species === form.species));
const selectedBreedOutsideCatalog = computed(() => Boolean(form.breed) && !breedOptionsForSpecies.value.some(item => item.name === form.breed));
const speciesSelectHint = computed(() => speciesLoading.value ? 'Carregando espécies…' : selectedSpeciesOutsideCatalog.value ? 'Espécie registrada na ficha, fora do catálogo atual.' : undefined);
const breedSelectHint = computed(() => breedsLoading.value ? 'Carregando raças…' : selectedBreedOutsideCatalog.value ? 'Raça registrada na ficha, fora do catálogo atual.' : undefined);
const validationFields = [
  { key: 'name', label: 'Nome do animal', targetId: 'name' },
  { key: 'species', label: 'Espécie', targetId: 'species' },
  { key: 'sex', label: 'Sexo', targetId: 'sex' },
  { key: 'primaryOwnerId', label: 'Tutor responsável', targetId: 'ownerSearch' }
] as const;
const validation = useFormValidation({ rules: {
  name: [(v: unknown) => (!(v as string)?.trim() ? 'Nome é obrigatório' : null)],
  species: [(v: unknown) => (!v ? 'Espécie é obrigatória' : null)],
  sex: [(v: unknown) => (!v ? 'Sexo é obrigatório' : null)],
  primaryOwnerId: [(v: unknown) => (!v ? 'Selecione um tutor responsável' : null)]
} });
const { errors, formError, successMessage, submitting, validate } = validation;
const successRedirect = useSuccessRedirect();
const successPending = successRedirect.successPending;
const formErrorRegion = ref<HTMLElement | null>(null);
const duplicateFeedbackRegion = ref<HTMLElement | null>(null);
const validationErrorFields = computed(() => validationFields.filter(field => Boolean(errors[field.key])));
const canSave = computed(() => !submitting.value && !saveCompleted.value && !initialLoading.value && !patientFailed.value && linkedOwner.value?.id === form.primaryOwnerId && Boolean(form.primaryOwnerId) && (isEdit.value || (!speciesLoading.value && !speciesError.value && speciesOptions.value.length > 0)));
function focusValidationField(key: typeof validationFields[number]['key']) {
  const field = validationFields.find(item => item.key === key);
  if (!field) return;
  document.getElementById(field.targetId)?.focus();
}
async function focusDuplicateFeedback() {
  await nextTick();
  const region = duplicateFeedbackRegion.value;
  if (!region) return;
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  region.scrollIntoView?.({ block: 'center', behavior });
  region.focus({ preventScroll: true });
}
function openDuplicatePatient() {
  const id = duplicatePatientId.value;
  if (id) void router.push(`/patients/${id}`);
}
function dismissDuplicateWarning() {
  duplicatePatientId.value = '';
  document.getElementById('name')?.focus({ preventScroll: true });
}
async function focusFormError() {
  await nextTick();
  const region = formErrorRegion.value;
  if (!region) return;
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  region.scrollIntoView?.({ block: 'center', behavior });
  region.focus({ preventScroll: true });
}
function ownerContact(owner: OwnerSummary) { return (owner.contacts?.find(contact => contact.primary) || owner.contacts?.[0])?.value || ''; }
function ownerStatus(owner: OwnerSummary) { return owner.status === 'active' ? 'Ativo' : owner.status === 'inactive' ? 'Inativo' : 'Não informado'; }
async function loadOwners(page = 1, search = ownerSearch.value.trim()) {
  const version = pageGeneration, request = ++ownerGeneration;
  ownersLoading.value = true; ownersError.value = ''; owners.value = []; stagedOwner.value = null;
  ownerPage.value = page; ownerAppliedSearch.value = search;
  try {
    const result = await ownerService.listPage({ search: search || undefined, page, pageSize: 12 });
    if (!current(version) || request !== ownerGeneration) return;
    owners.value = result.items;
    ownerRemotePaging.value = result.page !== undefined || result.totalPages !== undefined || result.total !== undefined;
    ownerPages.value = Math.max(1, result.totalPages ?? Math.ceil((result.total ?? result.items.length) / (result.pageSize || 12)));
    if (result.page !== undefined) ownerPage.value = result.page;
  } catch { if (current(version) && request === ownerGeneration) ownersError.value = 'Erro ao carregar lista de tutores. Tente novamente.'; }
  finally { if (current(version) && request === ownerGeneration) ownersLoading.value = false; }
}
function searchOwners() { if (!submitting.value) void loadOwners(1, ownerSearch.value.trim()); }
function changeOwnerPage(page: number) { if (submitting.value || ownersLoading.value) return; stagedOwner.value = null; if (ownerRemotePaging.value) void loadOwners(page, ownerAppliedSearch.value); else ownerPage.value = page; }
function openOwnerPicker() { pickerOpen.value = true; stagedOwner.value = null; }
async function linkSelectedOwner() {
  if (submitting.value || ownersLoading.value || !stagedOwner.value) return;
  identityGeneration++; linkedOwner.value = stagedOwner.value; form.primaryOwnerId = stagedOwner.value.id;
  requestedOwnerId.value = stagedOwner.value.id; ownerIdentityError.value = ''; delete errors.primaryOwnerId;
  pickerOpen.value = false; stagedOwner.value = null;
  await nextTick(); const field = document.getElementById('name'); field?.focus({ preventScroll: true }); field?.closest('section')?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
}
async function resolveRequestedOwner() {
  const id = requestedOwnerId.value; if (!id) return;
  const version = pageGeneration, request = ++identityGeneration;
  ownerIdentityError.value = '';
  try {
    const owner = owners.value.find(item => item.id === id) || await ownerService.getById(id);
    if (!current(version) || request !== identityGeneration) return;
    if (owner.id !== id) throw new Error('Identity mismatch');
    linkedOwner.value = owner; form.primaryOwnerId = id; pickerOpen.value = false;
    if (initialLoading.value) markClean();
  } catch { if (current(version) && request === identityGeneration) ownerIdentityError.value = `Não foi possível confirmar o tutor ${id}. Recarregue a identificação ou selecione um tutor.`; }
}
async function loadSpecies() {
  const version = pageGeneration, request = ++speciesGeneration; speciesLoading.value = true; speciesError.value = '';
  try { const items = await animalSpeciesService.list({ active: true }); if (current(version) && request === speciesGeneration) speciesCatalog.value = [...items]; }
  catch { if (current(version) && request === speciesGeneration) { speciesCatalog.value = []; speciesError.value = 'Erro ao carregar lista de espécies. Tente novamente.'; } }
  finally { if (current(version) && request === speciesGeneration) speciesLoading.value = false; }
}
async function loadBreeds() {
  const version = pageGeneration, request = ++breedGeneration; breedsLoading.value = true; breedsError.value = '';
  try { const items = await breedsService.list({ active: true }); if (current(version) && request === breedGeneration) breeds.value = items; }
  catch { if (current(version) && request === breedGeneration) { breeds.value = []; breedsError.value = 'Erro ao carregar lista de raças. Tente novamente.'; } }
  finally { if (current(version) && request === breedGeneration) breedsLoading.value = false; }
}
async function loadPage() {
  const version = ++pageGeneration, edit = isEdit.value, id = patientId.value;
  successRedirect.invalidate(); ownerGeneration++; speciesGeneration++; breedGeneration++; identityGeneration++;
  initialLoading.value = true; patientFailed.value = false; saveCompleted.value = false; duplicatePatientId.value = ''; Object.assign(form, emptyForm()); validation.clearErrors(); formError.value = ''; successMessage.value = '';
  markClean();
  linkedOwner.value = null; stagedOwner.value = null; owners.value = []; breeds.value = []; speciesCatalog.value = []; pickerOpen.value = true;
  ownerSearch.value = ''; ownerIdentityError.value = ''; requestedOwnerId.value = '';
  const [patientResult] = await Promise.allSettled([edit ? patientService.getById(id) : Promise.resolve(null), loadOwners(1, ''), loadSpecies(), loadBreeds()]);
  if (!current(version)) return;
  if (edit) {
    if (patientResult.status === 'rejected' || !patientResult.value || patientResult.value.id !== id) { patientFailed.value = true; formError.value = 'Erro ao carregar animal. Tente novamente.'; initialLoading.value = false; return; }
    const patient: PatientSummary = patientResult.value;
      form.name = patient.name;
      form.species = patient.species;
      form.breed = patient.breed || '';
      form.sex = patient.sex;
      form.size = patient.size || '';
      form.baseWeightKg = patient.baseWeightKg;
      form.birthDateApproximate = patient.birthDateApproximate || '';
      form.isNeutered =
        patient.isNeutered === true ? 'true' : patient.isNeutered === false ? 'false' : '';
      form.microchip = patient.microchip || '';
      form.pedigreeNumber = patient.pedigreeNumber || '';
      form.color = patient.color || '';
      form.chronicDisease = patient.chronicDisease || '';
      form.allergy = patient.allergy || '';
      form.temperament = patient.temperament || '';
      form.generalNotes = patient.generalNotes || '';
      form.legacyVetusId = patient.legacyVetusId || '';
      form.originalCreatedAt = patient.originalCreatedAt || '';
      form.primaryOwnerId = patient.primaryOwnerId;
      form.status = patient.status;
    requestedOwnerId.value = patient.primaryOwnerId;
  } else requestedOwnerId.value = typeof route.query?.ownerId === 'string' ? route.query.ownerId.trim() : '';
  markClean();
  if (requestedOwnerId.value) await resolveRequestedOwner();
  if (current(version)) initialLoading.value = false;
}
async function onSubmit() {
  if (submitting.value || saveCompleted.value || initialLoading.value || patientFailed.value) return;
  if (!validate({ name: form.name, species: form.species, sex: form.sex, primaryOwnerId: form.primaryOwnerId })) {
    await nextTick();
    const firstInvalidField = validationErrorFields.value[0];
    if (firstInvalidField) focusValidationField(firstInvalidField.key);
    return;
  }
  if (!canSave.value) { formError.value = 'Confirme o tutor e os cadastros necessários antes de salvar.'; return; }
  const version = pageGeneration, edit = isEdit.value, id = patientId.value;
  const submittedSnapshot = JSON.stringify(form);
  if (!successRedirect.begin()) return;
  submitting.value = true; duplicatePatientId.value = ''; formError.value = ''; successMessage.value = '';
  try {
    const payload: CreatePatientRequest | UpdatePatientRequest = {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || undefined,
      sex: form.sex as 'male' | 'female' | 'unknown',
      size: (form.size as 'small' | 'medium' | 'large') || undefined,
      baseWeightKg: form.baseWeightKg,
      birthDateApproximate: form.birthDateApproximate || undefined,
      isNeutered: form.isNeutered === '' ? undefined : form.isNeutered === 'true',
      microchip: form.microchip.trim() || undefined,
      pedigreeNumber: form.pedigreeNumber.trim() || undefined,
      color: form.color.trim() || undefined,
      chronicDisease: form.chronicDisease.trim() || undefined,
      allergy: form.allergy.trim() || undefined,
      temperament: form.temperament.trim() || undefined,
      generalNotes: form.generalNotes.trim() || undefined,
      legacyVetusId: form.legacyVetusId.trim() || undefined,
      originalCreatedAt: form.originalCreatedAt || undefined,
      primaryOwnerId: form.primaryOwnerId,
      status: form.status
    };

    const saved = edit ? await patientService.update(id, payload as UpdatePatientRequest) : await patientService.create(payload as CreatePatientRequest);
    if (!current(version)) return;
    if (!saved?.id || (edit && saved.id !== id)) throw new Error('A resposta do paciente não corresponde ao cadastro solicitado.');
    markClean(submittedSnapshot);
    saveCompleted.value = true;
    successMessage.value = edit ? 'Animal atualizado com sucesso!' : 'Animal cadastrado com sucesso!';
    const destination = edit ? id : saved.id;
    successRedirect.schedule(() => { if (current(version)) return router.push(`/patients/${destination}`); }, successMessage.value);
  } catch (err: unknown) {
    if (current(version)) {
      const conflictingPatientId = duplicateEntityId(err, 'patientId');
      if (conflictingPatientId) {
        duplicatePatientId.value = conflictingPatientId;
        formError.value = '';
      } else {
        formError.value = err instanceof Error ? err.message : 'Erro ao salvar animal';
      }
    }
  }
  finally { if (active) submitting.value = false; }
}
onMounted(loadPage);
watch(() => [route.params.id, route.path, route.query?.ownerId], () => { void loadPage(); }, { flush: 'sync' });
watch(formError, (message) => { if (message) void focusFormError(); });
watch(duplicatePatientId, (id) => { if (id) void focusDuplicateFeedback(); });
onBeforeUnmount(() => { active = false; pageGeneration++; successRedirect.invalidate(); });
</script>

<style scoped>
.patient-form-page { display: grid; gap: 20px; min-width: 0; }
.patient-form, .form-body { display: grid; gap: 20px; min-width: 0; }
.patient-form { scroll-padding-bottom: 104px; }
.form-feedback-region { scroll-margin-top: 120px; }
.form-feedback-region:focus { outline: 3px solid var(--color-focus-ring); outline-offset: 4px; border-radius: 8px; }
.duplicate-feedback-region { scroll-margin-top: 120px; }
.duplicate-feedback-region:focus { outline: 3px solid var(--color-focus-ring); outline-offset: 4px; border-radius: 8px; }
.duplicate-feedback__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.form-body { border: 0; margin: 0; padding: 0; }
.form-section { padding: 24px; border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); min-width: 0; scroll-margin-top: 150px; }
.section-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 20px; }
h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.4; }
h3 { margin: 6px 0; font-size: 22px; overflow-wrap: anywhere; }
.section-number { display: inline-grid; place-items: center; width: 30px; height: 30px; flex: 0 0 auto; border-radius: 9px; background: var(--color-primary-50); color: var(--color-primary-700); font-size: 12px; font-weight: 700; }
.required-mark { color: var(--color-danger-600); }
.state-message, .form-footnote, .optional-note { color: var(--color-text-secondary); font-size: 13px; line-height: 1.6; }
.state-message { margin: 12px 0; }.form-footnote { margin: 0; }
.section-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .09em; color: var(--color-text-secondary); }
.linked-owner { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px; border: 1px solid var(--color-border); border-left: 3px solid var(--color-primary-500); border-radius: 12px; margin-bottom: 12px; }
.owner-code { overflow-wrap: anywhere; font-size: 12px; color: var(--color-text-secondary); margin: 4px 0 10px; }
.owner-contact { margin: 0 0 8px; font-size: 13px; color: var(--color-text-secondary); overflow-wrap: anywhere; }
.owner-search { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: end; margin: 16px 0; }
.client-options { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
.client-option { display: flex; flex-direction: column; gap: 6px; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); color: var(--color-text); font: inherit; font-size: 13px; text-align: left; cursor: pointer; overflow-wrap: anywhere; min-width: 0; }
.client-option strong { font-size: 15px; }.client-option .owner-code { margin: 0; }
.client-option:hover { border-color: var(--color-primary-500); }.client-option[aria-pressed=true] { outline: 2px solid var(--color-primary-500); outline-offset: -2px; background: var(--color-primary-50); }
.client-option:focus-visible, summary:focus-visible { outline: 2px solid var(--color-primary-500); outline-offset: 3px; }
.client-option__status { color: var(--color-text-secondary); font-size: 12px; }
.owner-pagination { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px; font-size: 12px; }
.owner-confirm, .form-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
.identity-section > h2 { margin-bottom: 20px; }
.form-row { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; margin-bottom: 18px; }
.form-row--3 { grid-template-columns: repeat(3,minmax(0,1fr)); }
.form-row:last-child { margin-bottom: 0; }
.extra-section { padding-block: 0; }summary { display: flex; align-items: center; gap: 10px; min-height: 70px; cursor: pointer; font-weight: 600; }summary::after { content: '+'; margin-left: auto; font-size: 22px; color: var(--color-text-secondary); }details[open] summary::after { content: '−'; }
.optional-note { font-weight: 400; }.extra-fields { padding: 6px 0 24px; }
.form-actions { position: sticky; top: calc(100vh - 80px); top: calc(100dvh - 80px); z-index: 2; margin-top: 0; padding: 12px 0 max(12px, env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: var(--color-surface); box-shadow: 0 -8px 20px rgb(10 35 42 / 10%); }
.form-actions > :first-child { min-width: 180px; }
@media (max-width: 900px) { .client-options { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 520px) {
 .patient-form-page,.patient-form,.form-body { gap: 16px; }.form-section { padding: 16px; scroll-margin-top: 190px; }
 .section-heading { align-items: start; gap: 10px; }.section-heading h2 { font-size: 17px; flex-wrap: wrap; }
 .linked-owner { flex-direction: column; align-items: start; padding: 14px; }h3 { font-size: 20px; }
 .owner-search { grid-template-columns: minmax(0,1fr); }.owner-search > :last-child { justify-self: stretch; }
 .client-options { grid-template-columns: 1fr; }.client-option { padding: 14px; }
 .form-row,.form-row--3 { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
 .identity-section .identity-main-row { grid-template-columns: 1fr; }
 .identity-section .form-row--3 > :first-child { grid-column: 1/-1; }
 .extra-fields .form-row--3 > :last-child { grid-column: 1/-1; }
 .clinical-notes { grid-template-columns: 1fr; }
 .extra-section { padding-block: 0; }summary { font-size: 16px; }.optional-note { font-size: 11px; }
 .form-actions > * { flex: 1 1 auto; }.form-actions > :first-child { min-width: 180px; }
}
</style>
