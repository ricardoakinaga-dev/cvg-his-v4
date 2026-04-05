<template>
  <div class="appointment-form-page">
    <AppPageHeader>
      <template #title>📅 Novo Agendamento</template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/appointments">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>

    <form class="appointment-form" @submit.prevent="onSubmit">
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
        <template #title>📋 Agendamento</template>
        <div class="form-row">
          <DsInput
            id="scheduledAt"
            v-model="form.scheduledAt"
            type="datetime-local"
            label="Data e Hora"
            :error="errors.scheduledAt"
            required
          />
          <DsInput id="visitType" v-model="form.visitType" type="select" label="Tipo">
            <option value="scheduled">📅 Agendado</option>
            <option value="walk_in">🚶 Walk-in</option>
            <option value="return">🔄 Retorno</option>
          </DsInput>
        </div>
        <DsInput
          id="reason"
          v-model="form.reason"
          type="textarea"
          label="Motivo"
          placeholder="Descreva o motivo do agendamento"
          :rows="3"
        />
      </DsCard>

      <div class="form-actions">
        <DsButton type="submit" variant="primary" :disabled="submitting">
          {{ submitting ? 'Salvando...' : 'Salvar Agendamento' }}
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/appointments">Cancelar</DsButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { appointmentService } from '@/services/appointment';
import { patientService } from '@/services/patient';
import type { CreateAppointmentRequest } from '@/types/appointment';
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
  scheduledAt: new Date().toISOString().slice(0, 16),
  visitType: 'scheduled' as 'walk_in' | 'scheduled' | 'return',
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
    scheduledAt: [(v: unknown) => (!v ? 'Data/hora é obrigatória' : null)]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;

function getValues(): Record<string, unknown> {
  return {
    patientId: form.patientId,
    scheduledAt: form.scheduledAt
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
    const payload: CreateAppointmentRequest = {
      patientId: form.patientId,
      ownerId: form.ownerId,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      visitType: form.visitType,
      reason: form.reason.trim() || 'Sem motivo informado'
    };
    const created = await appointmentService.create(payload);
    successMessage.value = 'Agendamento criado com sucesso!';
    setTimeout(() => router.push(`/appointments/${created.id}`), 1000);
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao criar agendamento';
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
.appointment-form {
  max-width: 640px;
}
.appointment-form .ds-card {
  margin-bottom: 16px;
}
</style>
