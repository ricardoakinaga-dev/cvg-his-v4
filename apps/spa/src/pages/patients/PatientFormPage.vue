<template>
  <div class="patient-form-page">
    <AppPageHeader>
      <template #title>
        {{ isEdit ? 'Editar Paciente' : 'Novo Paciente' }}
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/patients">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>

    <form class="patient-form" @submit.prevent="onSubmit">
      <DsCard>
        <template #title>🐾 Identificação</template>
        <div class="form-row">
          <DsInput
            id="name"
            v-model="form.name"
            label="Nome do Paciente"
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
            required
          >
            <option value="">Selecione...</option>
            <option value="canine">🐕 Canino</option>
            <option value="feline">🐈 Felino</option>
            <option value="avian">🐦 Aves</option>
            <option value="rodent">🐹 Roedor</option>
            <option value="reptile">🦎 Réptil</option>
            <option value="other">🐾 Outro</option>
          </DsInput>
        </div>
        <div class="form-row form-row--3">
          <DsInput
            id="breed"
            v-model="form.breed"
            label="Raça"
            placeholder="Ex: Golden Retriever"
          />
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
        <template #title>👤 Tutor Responsável *</template>
        <div class="form-field">
          <label for="primaryOwnerId" class="form-field__label">Selecione o tutor</label>
          <SearchSelect
            id="primaryOwnerId"
            v-model="form.primaryOwnerId"
            :options="ownerOptions"
            :loading="ownersLoading"
            placeholder="Buscar tutor por nome..."
          />
          <span v-if="errors.primaryOwnerId" class="form-field__error">{{
            errors.primaryOwnerId
          }}</span>
        </div>
      </DsCard>

      <DsCard>
        <template #title>🩺 Dados Clínicos</template>
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
          <DsInput id="status" v-model="form.status" type="select" label="Status">
            <option value="active">✅ Ativo</option>
            <option value="inactive">⏸ Inativo</option>
            <option value="deceased">✝ Falecido</option>
          </DsInput>
        </div>
      </DsCard>

      <div class="form-actions">
        <DsButton type="submit" variant="primary" :disabled="submitting">
          {{ submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Paciente' }}
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/patients">Cancelar</DsButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { patientService } from '@/services/patient';
import { ownerService } from '@/services/owner';
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
  primaryOwnerId: '',
  status: 'active' as 'active' | 'inactive' | 'deceased'
});

const owners = ref<OwnerSummary[]>([]);
const ownersLoading = ref(false);

const ownerOptions = computed(() => owners.value.map((o) => ({ label: o.fullName, value: o.id })));

const validation = useFormValidation({
  rules: {
    name: [(v: unknown) => (!(v as string)?.trim() ? 'Nome é obrigatório' : null)],
    species: [(v: unknown) => (!v ? 'Espécie é obrigatória' : null)],
    sex: [(v: unknown) => (!v ? 'Sexo é obrigatório' : null)],
    primaryOwnerId: [(v: unknown) => (!v ? 'Selecione um tutor responsável' : null)]
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
      primaryOwnerId: form.primaryOwnerId,
      status: form.status
    };

    if (isEdit.value) {
      await patientService.update(patientId.value, payload as UpdatePatientRequest);
      successMessage.value = 'Paciente atualizado com sucesso!';
      setTimeout(() => router.push(`/patients/${patientId.value}`), 1000);
    } else {
      const created = await patientService.create(payload as CreatePatientRequest);
      successMessage.value = 'Paciente cadastrado com sucesso!';
      setTimeout(() => router.push(`/patients/${created.id}`), 1000);
    }
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao salvar paciente';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  ownersLoading.value = true;
  try {
    owners.value = await ownerService.list();
  } catch {
    formError.value = 'Erro ao carregar lista de tutores';
  } finally {
    ownersLoading.value = false;
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
      form.primaryOwnerId = patient.primaryOwnerId;
      form.status = patient.status;
    } catch (err: unknown) {
      formError.value = err instanceof Error ? err.message : 'Erro ao carregar paciente';
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
.patient-form {
  max-width: 720px;
}
.form-row--3 {
  grid-template-columns: 1fr 1fr 1fr;
}
.patient-form .ds-card {
  margin-bottom: 16px;
}
</style>
