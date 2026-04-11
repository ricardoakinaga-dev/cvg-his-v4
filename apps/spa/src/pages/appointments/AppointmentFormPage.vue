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

    <div class="appointment-form-page__layout">
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

      <aside class="appointment-form-page__aside">
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
            <li>Confirme o paciente antes de salvar para evitar agendamentos órfãos.</li>
            <li>Escolha o tipo correto para refletir a operação real da agenda.</li>
            <li>Use o motivo para contexto rápido da equipe de atendimento.</li>
          </ul>
        </DsCard>
      </aside>
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
import SearchSelect from '@/components/SearchSelect.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import { speciesLabel } from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const router = useRouter();
const entityCache = useEntityCache();

const form = reactive({
  patientId: '',
  ownerId: '',
  scheduledAt: new Date().toISOString().slice(0, 16),
  visitType: 'scheduled' as 'walk_in' | 'scheduled' | 'return',
  reason: ''
});

const patients = ref<PatientSummary[]>([]);
const patientsLoading = ref(false);
const patientName = ref('');
const ownerName = ref('');

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

const summaryCards = computed(() => [
  { label: 'Paciente', value: patientName.value || '—', hint: 'Selecionado no buscador' },
  { label: 'Tutor', value: ownerName.value || '—', hint: 'Responsável vinculado' },
  {
    label: 'Data/Hora',
    value: form.scheduledAt ? new Date(form.scheduledAt).toLocaleString('pt-BR') : '—',
    hint: 'Momento do atendimento'
  },
  { label: 'Tipo', value: form.visitType === 'return' ? 'Retorno' : form.visitType === 'walk_in' ? 'Walk-in' : 'Agendado', hint: 'Natureza da visita' }
]);

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
      patientName.value = patient.name;
      void entityCache.getOwnerName(patient.primaryOwnerId).then((name) => {
        ownerName.value = name;
      });
    }
  } else {
    form.ownerId = '';
    patientName.value = '';
    ownerName.value = '';
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.appointment-form-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.appointment-form-page__aside {
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
  .appointment-form-page__layout {
    grid-template-columns: 1fr;
  }

  .appointment-form-page__aside {
    position: static;
  }
}
</style>
