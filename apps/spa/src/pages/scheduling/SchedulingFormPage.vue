<template>
  <div class="scheduling-form-page">
    <AppPageHeader>
      <template #title>📅 Novo Agendamento</template>
      <template #subtitle>
        <span class="muted">Criar um compromisso operacional com contexto de paciente e tipo de visita.</span>
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/scheduling">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
      {{ formError }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="scheduling-form__layout">
      <DsCard class="scheduling-form__card">
        <form class="scheduling-form" @submit.prevent="onSubmit">
          <div class="form-section">
            <h2 class="form-section__title">🐾 Paciente</h2>
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
          </div>

          <div class="form-section">
            <h2 class="form-section__title">📋 Agendamento</h2>
            <div class="form-row">
              <div class="form-field">
                <DsInput
                  id="scheduledAt"
                  v-model="form.scheduledAt"
                  type="datetime-local"
                  label="Data e Hora"
                  required
                  :error="errors.scheduledAt"
                />
              </div>
              <div class="form-field">
                <DsInput id="visitType" v-model="form.visitType" type="select" label="Tipo">
                  <option value="scheduled">📅 Agendado</option>
                  <option value="walk_in">🚶 Walk-in</option>
                  <option value="return">🔄 Retorno</option>
                </DsInput>
              </div>
            </div>
            <div class="form-field">
              <DsInput
                id="reason"
                v-model="form.reason"
                type="textarea"
                label="Motivo"
                placeholder="Descreva o motivo do agendamento"
                :rows="3"
              />
            </div>
          </div>

          <div class="form-actions">
            <DsButton type="submit" variant="primary" :loading="submitting">
              {{ submitting ? 'Salvando...' : 'Salvar Agendamento' }}
            </DsButton>
            <DsButton variant="secondary" tag="a" href="/scheduling">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Resumo do compromisso" class="scheduling-form__aside">
        <p class="scheduling-form__aside-text">
          Use esta tela para registrar o compromisso com contexto suficiente para a operação da
          recepção e da fila.
        </p>
        <ul class="scheduling-form__facts">
          <li>Paciente associado com busca direta.</li>
          <li>Owner preenchido automaticamente após seleção.</li>
          <li>Horário sugerido já inicia com a data atual.</li>
        </ul>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { appointmentService } from '@/services/appointment';
import { patientService } from '@/services/patient';
import type { CreateAppointmentRequest } from '@/types/appointment';
import type { PatientSummary } from '@/types/patient';
import { useFormValidation } from '@/composables/useFormValidation';
import { speciesLabel } from '@/utils/labels';
import SearchSelect from '@/components/SearchSelect.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
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
    const message = err instanceof Error ? err.message : 'Erro ao criar agendamento';
    formError.value = message;
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
.scheduling-form-page {
  max-width: 1120px;
}

.scheduling-form__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.scheduling-form__card,
.scheduling-form__aside {
  min-width: 0;
}

.scheduling-form__aside-text {
  margin: 0 0 16px;
  color: var(--color-text-secondary, #475569);
}

.scheduling-form__facts {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 960px) {
  .scheduling-form__layout {
    grid-template-columns: 1fr;
  }
}
</style>
