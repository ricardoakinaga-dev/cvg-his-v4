<template>
  <div class="triage-form-page">
    <div class="page-header">
      <h1>Nova Triagem</h1>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <form class="form-section" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="encounterId" class="form-field__label">Atendimento *</label>
        <input
          id="encounterId"
          v-model="form.encounterId"
          class="form-field__input"
          placeholder="ID do atendimento"
          required
        />
      </div>

      <div class="form-field">
        <label for="patientId" class="form-field__label">Paciente *</label>
        <input
          id="patientId"
          v-model="form.patientId"
          class="form-field__input"
          placeholder="ID do paciente"
          required
        />
      </div>

      <div class="form-field">
        <label for="priority" class="form-field__label">Prioridade *</label>
        <select id="priority" v-model="form.priority" class="form-field__input" required>
          <option value="" disabled>Selecione a prioridade</option>
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
      </div>

      <div class="form-field">
        <label for="destination" class="form-field__label">Destino *</label>
        <select id="destination" v-model="form.destination" class="form-field__input" required>
          <option value="" disabled>Selecione o destino</option>
          <option value="in_care">Em Atendimento</option>
          <option value="observation">Observação</option>
        </select>
      </div>

      <div class="form-field">
        <label for="chiefComplaint" class="form-field__label">Queixa Principal *</label>
        <textarea
          id="chiefComplaint"
          v-model="form.chiefComplaint"
          class="form-field__input"
          rows="3"
          placeholder="Descreva a queixa principal"
          required
        />
      </div>

      <div class="form-field">
        <label for="initialNotes" class="form-field__label">Notas Iniciais</label>
        <textarea
          id="initialNotes"
          v-model="form.initialNotes"
          class="form-field__input"
          rows="3"
          placeholder="Notas adicionais (opcional)"
        />
      </div>

      <div class="form-field">
        <label for="alerts" class="form-field__label">Alertas</label>
        <input
          id="alerts"
          v-model="alertsInput"
          class="form-field__input"
          placeholder="Separe por vírgulas (ex: alergia, jejum)"
        />
      </div>

      <div class="form-actions">
        <DsButton type="submit" variant="primary" :loading="saving">
          {{ saving ? 'Salvando...' : 'Registrar Triagem' }}
        </DsButton>
        <router-link to="/triage" class="btn btn--secondary">Cancelar</router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { createTriage } from '@/services/triage';
import type { CreateTriageRequest, TriagePriority, TriageDestination } from '@/types/triage';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const router = useRouter();
const error = ref('');
const saving = ref(false);

const form = ref<CreateTriageRequest>({
  encounterId: '',
  patientId: '',
  priority: 'medium' as TriagePriority,
  chiefComplaint: '',
  initialNotes: '',
  alerts: [],
  destination: 'in_care' as TriageDestination
});

const alertsInput = ref('');

async function handleSubmit() {
  error.value = '';
  saving.value = true;

  try {
    const payload: CreateTriageRequest = {
      ...form.value,
      alerts: alertsInput.value
        ? alertsInput.value
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : []
    };

    const record = await createTriage(payload);
    router.push(`/triage/${record.id}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao registrar triagem';
    error.value = message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.triage-form-page {
  max-width: 720px;
}
</style>
