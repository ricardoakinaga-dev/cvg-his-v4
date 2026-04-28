<template>
  <div class="patient-form-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Cadastros', 'Animais', isEdit ? 'Editar Animal' : 'Cadastrar Novo Animal']"
      title="Cadastro de animal"
      :subtitle="
        isEdit
          ? 'Atendimento > Cadastros. Atualize a ficha do animal e o vínculo com o cliente.'
          : 'Atendimento > Cadastros. Vincule o cliente antes de preencher a ficha do animal.'
      "
    >
      <template #title>
        {{ isEdit ? 'Editar Animal' : 'Cadastrar Novo Animal' }}
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/owners">Ir para Cadastro de Clientes</DsButton>
        <DsButton variant="secondary" tag="a" to="/patients">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Necessário vincular o animal a um Cliente antes de salvar o cadastro.
    </DsAlert>

    <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>

    <div class="patient-form-page__layout">
      <form class="patient-form" @submit.prevent="onSubmit">
        <DsCard v-if="showClientLinkStep" class="client-link-card">
          <template #title>👤 Vincular Cliente</template>
          <div class="client-link-card__header">
            <div>
              <p class="client-link-card__copy">
                Busque por nome, CPF, e-mail ou ID e selecione o cliente responsável.
              </p>
              <DsButton tag="a" to="/owners/new" variant="secondary" size="sm">
                Ir para Cadastro de Clientes
              </DsButton>
            </div>
            <DsButton
              type="button"
              variant="primary"
              :disabled="!selectedOwnerCandidate"
              @click="linkSelectedOwner"
            >
              Vincular Cliente
            </DsButton>
          </div>

          <div class="client-link-card__search">
            <DsInput
              id="ownerSearch"
              v-model="ownerSearch"
              type="search"
              placeholder="Buscar por Nome, CPF, E-mail ou ID"
            />
            <DsButton type="button" variant="secondary">Filtrar</DsButton>
          </div>

          <div class="client-options" role="listbox" aria-label="Clientes">
            <button
              v-for="owner in filteredOwnerCandidates"
              :key="owner.id"
              class="client-option"
              :class="{ 'client-option--selected': stagedOwnerId === owner.id }"
              type="button"
              @click="stagedOwnerId = owner.id"
            >
              <span class="client-option__status">Ativo</span>
              <strong>{{ owner.fullName }}</strong>
              <span>ID {{ owner.id }} - CPF/CNPJ {{ owner.documentId || 'Não informado' }}</span>
              <span>E-mail: {{ ownerEmailByOwner(owner) }}</span>
            </button>
          </div>
        </DsCard>

        <DsCard>
          <template #title>🐾 Identificação</template>
          <div class="form-row">
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
              :disabled="speciesLoading"
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
              :disabled="breedsLoading"
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
              <option value="male">♂ Macho</option>
              <option value="female">♀ Fêmea</option>
              <option value="unknown">❓ Desconhecido</option>
            </DsInput>
            <DsInput id="size" v-model="form.size" type="select" label="Tamanho">
              <option value="">Não informado</option>
              <option value="small">Pequeno</option>
              <option value="medium">Médio</option>
              <option value="large">Grande</option>
            </DsInput>
          </div>
        </DsCard>

        <DsCard>
          <template #title>👤 Cliente Responsável *</template>
          <div class="form-field">
            <label for="primaryOwnerId" class="form-field__label">Selecione o cliente</label>
            <SearchSelect
              id="primaryOwnerId"
              v-model="form.primaryOwnerId"
              :options="ownerOptions"
              :loading="ownersLoading"
              placeholder="Buscar cliente por nome..."
            />
            <span v-if="errors.primaryOwnerId" class="form-field__error">{{
              errors.primaryOwnerId
            }}</span>
          </div>
        </DsCard>

        <DsCard>
          <template #title>🩺 Dados complementares</template>
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
              <option value="active">✅ Ativo</option>
              <option value="inactive">⏸ Inativo</option>
              <option value="deceased">✝ Falecido</option>
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
          <div class="form-row form-row--3">
            <DsInput id="color" v-model="form.color" label="Cor" />
            <DsInput id="temperament" v-model="form.temperament" label="Temperamento" />
            <DsInput id="legacyVetusId" v-model="form.legacyVetusId" label="ID legado Vetus" />
          </div>
          <div class="form-row form-row--3">
            <DsInput id="chronicDisease" v-model="form.chronicDisease" label="Doença crônica" />
            <DsInput id="allergy" v-model="form.allergy" label="Alergia" />
            <DsInput
              id="originalCreatedAt"
              v-model="form.originalCreatedAt"
              type="date"
              label="Data de cadastro original"
            />
          </div>
          <DsInput
            id="generalNotes"
            v-model="form.generalNotes"
            type="textarea"
            label="Observações gerais"
            :rows="3"
          />
        </DsCard>

        <div class="form-actions">
          <DsButton type="submit" variant="primary" :disabled="submitting">
            {{ submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Animal' }}
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/patients">Cancelar</DsButton>
        </div>
      </form>

      <aside class="patient-form-page__aside">
        <DsCard title="Resumo em tempo real">
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard title="Boas práticas">
          <ul class="guide-list">
            <li>Nome e espécie são essenciais para identificar o paciente rapidamente.</li>
            <li>Escolha o tutor correto antes de salvar para manter a jornada assistencial íntegra.</li>
            <li>Peso e data aproximada ajudam triagem, prescrição e acompanhamento ao longo do tempo.</li>
          </ul>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { patientService } from '@/services/patient';
import { ownerService } from '@/services/owner';
import { breedsService, type BreedSummary } from '@/services/breeds';
import {
  animalSpeciesService,
  defaultAnimalSpecies,
  type AnimalSpeciesSummary
} from '@/services/species';
import type { CreatePatientRequest, UpdatePatientRequest, PatientSummary } from '@/types/patient';
import type { OwnerSummary } from '@/types/owner';
import SearchSelect from '@/components/SearchSelect.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id && route.path.includes('/edit'));
const patientId = computed(() => route.params.id as string);

const form = reactive({
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

const owners = ref<OwnerSummary[]>([]);
const breeds = ref<BreedSummary[]>([]);
const speciesCatalog = ref<AnimalSpeciesSummary[]>([]);
const ownersLoading = ref(false);
const breedsLoading = ref(false);
const speciesLoading = ref(false);
const ownerSearch = ref('');
const stagedOwnerId = ref('');

const ownerOptions = computed(() => owners.value.map((o) => ({ label: o.fullName, value: o.id })));
const speciesOptions = computed(() =>
  speciesCatalog.value.length > 0 ? speciesCatalog.value : [...defaultAnimalSpecies]
);
const selectedSpeciesOutsideCatalog = computed(
  () => Boolean(form.species) && !speciesOptions.value.some((species) => species.systemCode === form.species)
);
const speciesSelectHint = computed(() =>
  speciesLoading.value
    ? 'Carregando espécies cadastradas...'
    : 'Lista integrada ao cadastro Cadastros > Espécies.'
);
const breedOptionsForSpecies = computed(() =>
  breeds.value.filter((breed) => !form.species || breed.species === form.species)
);
const selectedBreedOutsideCatalog = computed(
  () => Boolean(form.breed) && !breedOptionsForSpecies.value.some((breed) => breed.name === form.breed)
);
const breedSelectHint = computed(() =>
  breedsLoading.value
    ? 'Carregando raças cadastradas...'
    : 'Lista integrada ao cadastro Cadastros > Raças.'
);
const selectedOwnerName = computed(
  () => owners.value.find((owner) => owner.id === form.primaryOwnerId)?.fullName || '—'
);
const showClientLinkStep = computed(() => !isEdit.value && !form.primaryOwnerId);
const selectedOwnerCandidate = computed(() =>
  owners.value.find((owner) => owner.id === stagedOwnerId.value)
);
const filteredOwnerCandidates = computed(() => {
  const search = ownerSearch.value.trim().toLowerCase();
  const items = search
    ? owners.value.filter((owner) => {
        const contacts = owner.contacts.map((contact) => contact.value.toLowerCase()).join(' ');
        return (
          owner.id.toLowerCase().includes(search) ||
          owner.fullName.toLowerCase().includes(search) ||
          owner.documentId?.toLowerCase().includes(search) ||
          contacts.includes(search)
        );
      })
    : owners.value;

  return items.slice(0, 10);
});
const summaryCards = computed(() => [
  { label: 'Animal', value: form.name.trim() || '—', hint: 'Nome em cadastro' },
  { label: 'Espécie', value: form.species || '—', hint: 'Classificação clínica' },
  { label: 'Cliente', value: selectedOwnerName.value, hint: 'Responsável vinculado' },
  {
    label: 'Status',
    value:
      form.status === 'active' ? 'Ativo' : form.status === 'inactive' ? 'Inativo' : 'Falecido',
    hint: 'Situação operacional'
  },
  {
    label: 'Alerta',
    value: form.allergy.trim() || form.chronicDisease.trim() || 'Sem alerta',
    hint: 'Alergia/doença crônica'
  }
]);

const neuteredValue = computed(() => {
  if (form.isNeutered === '') return undefined;
  return form.isNeutered === 'true';
});

const validation = useFormValidation({
  rules: {
    name: [(v: unknown) => (!(v as string)?.trim() ? 'Nome é obrigatório' : null)],
    species: [(v: unknown) => (!v ? 'Espécie é obrigatória' : null)],
    sex: [(v: unknown) => (!v ? 'Sexo é obrigatório' : null)],
    primaryOwnerId: [(v: unknown) => (!v ? 'Selecione um cliente responsável' : null)]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;

function getValues(): Record<string, unknown> {
  return {
    name: form.name,
    species: form.species,
    sex: form.sex,
    primaryOwnerId: form.primaryOwnerId
  };
}

async function onSubmit() {
  if (!validate(getValues())) return;

  submitting.value = true;
  formError.value = '';
  successMessage.value = '';

  try {
    const payload: CreatePatientRequest | UpdatePatientRequest = {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || undefined,
      sex: form.sex as 'male' | 'female' | 'unknown',
      size: (form.size as 'small' | 'medium' | 'large') || undefined,
      baseWeightKg: form.baseWeightKg,
      birthDateApproximate: form.birthDateApproximate || undefined,
      isNeutered: neuteredValue.value,
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

    if (isEdit.value) {
      await patientService.update(patientId.value, payload as UpdatePatientRequest);
      successMessage.value = 'Animal atualizado com sucesso!';
      setTimeout(() => router.push(`/patients/${patientId.value}`), 1000);
    } else {
      const created = await patientService.create(payload as CreatePatientRequest);
      successMessage.value = 'Animal cadastrado com sucesso!';
      setTimeout(() => router.push(`/patients/${created.id}`), 1000);
    }
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao salvar animal';
  } finally {
    submitting.value = false;
  }
}

function linkSelectedOwner() {
  if (!selectedOwnerCandidate.value) return;
  form.primaryOwnerId = selectedOwnerCandidate.value.id;
}

function ownerEmailByOwner(owner: OwnerSummary): string {
  return owner.contacts.find((contact) => contact.type === 'email')?.value || 'Não informado';
}

onMounted(async () => {
  ownersLoading.value = true;
  breedsLoading.value = true;
  speciesLoading.value = true;
  try {
    owners.value = await ownerService.list();
    const ownerIdFromQuery = typeof route.query?.ownerId === 'string' ? route.query.ownerId : '';
    if (ownerIdFromQuery) {
      form.primaryOwnerId = ownerIdFromQuery;
      stagedOwnerId.value = ownerIdFromQuery;
    }
  } catch {
    formError.value = 'Erro ao carregar lista de clientes';
  } finally {
    ownersLoading.value = false;
  }
  try {
    speciesCatalog.value = await animalSpeciesService.list({ active: true });
  } catch {
    speciesCatalog.value = [...defaultAnimalSpecies];
    formError.value = formError.value || 'Erro ao carregar lista de espécies';
  } finally {
    speciesLoading.value = false;
  }
  try {
    breeds.value = await breedsService.list({ active: true });
  } catch {
    formError.value = formError.value || 'Erro ao carregar lista de raças';
  } finally {
    breedsLoading.value = false;
  }

  if (isEdit.value) {
    try {
      const patient: PatientSummary = await patientService.getById(patientId.value);
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
    } catch (err: unknown) {
      formError.value = err instanceof Error ? err.message : 'Erro ao carregar animal';
    }
  }
});
</script>

<style scoped>
.patient-form-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.patient-form-page__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.patient-form-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.patient-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.client-link-card {
  border-color: #bfdbfe;
}

.client-link-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.client-link-card__copy {
  margin: 0 0 10px;
  color: var(--color-text-muted, #64748b);
  font-size: 14px;
}

.client-link-card__search {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 14px;
}

.client-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.client-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  text-align: left;
  cursor: pointer;
}

.client-option:hover,
.client-option--selected {
  border-color: var(--color-primary-500, #2563eb);
  background: var(--color-primary-50, #eff6ff);
}

.client-option span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.client-option__status {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534 !important;
  font-weight: 700;
}

.patient-form-page__aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.guide-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-muted, #64748b);
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .patient-form-page__layout {
    grid-template-columns: 1fr;
  }

  .patient-form-page__aside {
    position: static;
  }

  .client-link-card__header {
    flex-direction: column;
  }

  .client-link-card__search {
    grid-template-columns: 1fr;
  }
}
.form-row--3 {
  grid-template-columns: 1fr 1fr 1fr;
}
</style>
