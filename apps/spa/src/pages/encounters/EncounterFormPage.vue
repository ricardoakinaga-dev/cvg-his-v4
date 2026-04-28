<template>
  <div class="encounter-form-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Atendimentos', 'Novo Atendimento']">
      <template #title>🩺 Abrir Atendimento</template>
      <template #subtitle>
        Atendimento > Atendimentos. Abra o episódio clínico a partir da recepção, agenda ou fila e prepare o prontuário.
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/encounters">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>

    <div class="encounter-form-page__layout">
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

      <aside class="encounter-form-page__aside">
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
            <li>Abra o atendimento apenas depois de confirmar o paciente correto.</li>
            <li>Tipo e origem devem refletir a entrada real na agenda, fila ou recepção.</li>
            <li>Queixa objetiva ajuda triagem, prontuário e decisão de internação.</li>
          </ul>
        </DsCard>
      </aside>
    </div>
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
  appointmentId: '',
  visitType: 'walk_in' as 'walk_in' | 'scheduled' | 'return',
  origin: 'reception' as 'reception' | 'schedule' | 'return',
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
    reason: [(v: unknown) => (!(v as string)?.trim() ? 'Motivo é obrigatório' : null)]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;

const summaryCards = computed(() => [
  { label: 'Paciente', value: patientName.value || '—', hint: 'Animal selecionado' },
  { label: 'Tutor', value: ownerName.value || '—', hint: 'Responsável vinculado' },
  {
    label: 'Tipo',
    value:
      form.visitType === 'scheduled'
        ? 'Agendado'
        : form.visitType === 'return'
          ? 'Retorno'
          : 'Walk-in',
    hint: 'Natureza do atendimento'
  },
  {
    label: 'Origem',
    value:
      form.origin === 'schedule' ? 'Agendamento' : form.origin === 'return' ? 'Retorno' : 'Recepção',
    hint: 'Entrada operacional'
  }
]);

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

function readQueryPrefill() {
  const params = new URLSearchParams(window.location.search);
  return {
    patientId: params.get('patientId')?.trim() || '',
    ownerId: params.get('ownerId')?.trim() || '',
    appointmentId: params.get('appointmentId')?.trim() || ''
  };
}

async function applyPrefill() {
  const { patientId, ownerId, appointmentId } = readQueryPrefill();

  if (appointmentId) {
    form.appointmentId = appointmentId;
    form.visitType = 'scheduled';
    form.origin = 'schedule';
  }

  if (ownerId) {
    form.ownerId = ownerId;
    try {
      ownerName.value = await entityCache.getOwnerName(ownerId);
    } catch {
      ownerName.value = '';
    }
  }

  if (!patientId) return;

  const patient = patients.value.find((item) => item.id === patientId);
  if (!patient) return;

  form.patientId = patient.id;
  form.ownerId = patient.primaryOwnerId;
  patientName.value = patient.name;
  try {
    ownerName.value = await entityCache.getOwnerName(patient.primaryOwnerId);
  } catch {
    ownerName.value = '';
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
    if (form.appointmentId) {
      payload.appointmentId = form.appointmentId;
    }
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
    await applyPrefill();
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

.encounter-form-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.encounter-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.encounter-form-page__aside {
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
  .encounter-form-page__layout {
    grid-template-columns: 1fr;
  }

  .encounter-form-page__aside {
    position: static;
  }
}
</style>
