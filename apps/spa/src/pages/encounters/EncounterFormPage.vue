<template>
  <div class="encounter-form-page">
    <AppPageHeader>
      <template #title>🩺 Abrir Atendimento</template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/encounters">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>

    <form class="encounter-form" @submit.prevent="onSubmit">
      <DsCard>
        <template #title>🐾 Paciente *</template>
        <div class="form-field">
          <label for="patientId" class="form-field__label">Selecione o paciente</label>
          <SearchSelect
            id="patientId"
            v-model="form.patientId"
            :options="patientOptions"
            :loading="patientsLoading"
            placeholder="Buscar paciente por nome..."
            @change="onPatientChange"
          />
          <span v-if="errors.patientId" class="form-field__error">{{ errors.patientId }}</span>
        </div>
      </DsCard>

      <DsCard>
        <template #title>📋 Classificação</template>
        <div class="form-row">
          <DsInput id="visitType" v-model="form.visitType" type="select" label="Tipo" required>
            <option value="walk_in">🚶 Walk-in</option>
            <option value="scheduled">📅 Agendado</option>
            <option value="return">🔄 Retorno</option>
          </DsInput>
          <DsInput id="origin" v-model="form.origin" type="select" label="Origem">
            <option value="reception">Recepção</option>
            <option value="schedule">Agendamento</option>
            <option value="return">Retorno</option>
          </DsInput>
        </div>
        <DsInput
          id="reason"
          v-model="form.reason"
          type="textarea"
          label="Motivo (Queixa)"
          placeholder="Descreva o motivo principal da consulta"
          :error="errors.reason"
          :rows="3"
          required
        />
      </DsCard>

      <div class="form-actions">
        <DsButton type="submit" variant="primary" :disabled="submitting">
          {{ submitting ? 'Abrindo...' : 'Abrir Atendimento' }}
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/encounters">Cancelar</DsButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { encounterService } from '@/services/encounter';
import { patientService } from '@/services/patient';
import type { CreateEncounterRequest } from '@/types/encounter';
import type { PatientSummary } from '@/types/patient';
import SearchSelect from '@/components/SearchSelect.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import { speciesLabel } from '@/utils/labels';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const router = useRouter();

const form = reactive({
  patientId: '',
  ownerId: '',
  visitType: 'walk_in' as 'walk_in' | 'scheduled' | 'return',
  origin: 'reception' as 'reception' | 'schedule' | 'return',
  reason: ''
});

const patients = ref<PatientSummary[]>([]);
const patientsLoading = ref(false);

const patientOptions = computed(() =>
  patients.value.map((p) => ({
    label: `${p.name} (${speciesLabel(p.species)})`,
    value: p.id
  }))
);

const validation = useFormValidation({
  rules: {
    patientId: [(v: unknown) => (!v ? 'Selecione um paciente' : null)],
    reason: [(v: unknown) => (!(v as string)?.trim() ? 'Motivo é obrigatório' : null)]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;

function getValues(): Record<string, unknown> {
  return {
    patientId: form.patientId,
    reason: form.reason
  };
}

function onPatientChange(option: { label: string; value: string } | null) {
  if (option) {
    const patient = patients.value.find((p) => p.id === option.value);
    if (patient) {
      form.ownerId = patient.primaryOwnerId;
    }
  } else {
    form.ownerId = '';
  }
}

async function onSubmit() {
  if (!validate(getValues())) return;

  submitting.value = true;
  formError.value = '';
  successMessage.value = '';

  try {
    const payload: CreateEncounterRequest = {
      patientId: form.patientId,
      ownerId: form.ownerId,
      visitType: form.visitType,
      origin: form.origin,
      reason: form.reason.trim()
    };
    const created = await encounterService.create(payload);
    successMessage.value = 'Atendimento aberto com sucesso!';
    setTimeout(() => router.push(`/encounters/${created.id}`), 1000);
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao abrir atendimento';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  patientsLoading.value = true;
  try {
    patients.value = await patientService.list();
  } catch {
    formError.value = 'Erro ao carregar lista de pacientes';
  } finally {
    patientsLoading.value = false;
  }
});
</script>

<style scoped>
.encounter-form-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.encounter-form-page__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}
.encounter-form {
  max-width: 640px;
}
.encounter-form .ds-card {
  margin-bottom: 16px;
}
</style>
