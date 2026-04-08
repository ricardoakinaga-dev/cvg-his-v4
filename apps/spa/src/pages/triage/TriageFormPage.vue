<template>
  <div class="triage-form-page">
    <AppPageHeader title="Nova Triagem" />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <form @submit.prevent="handleSubmit">
        <div class="form-row">
          <DsInput
            id="encounterId"
            v-model="form.encounterId"
            label="Atendimento *"
            placeholder="ID do atendimento"
            required
          />
          <DsInput
            id="patientId"
            v-model="form.patientId"
            label="Paciente *"
            placeholder="ID do paciente"
            required
          />
        </div>

        <div class="form-row">
          <DsInput
            id="priority"
            v-model="form.priority"
            type="select"
            label="Prioridade *"
            required
          >
            <option value="" disabled>Selecione a prioridade</option>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </DsInput>
          <DsInput
            id="destination"
            v-model="form.destination"
            type="select"
            label="Destino *"
            required
          >
            <option value="" disabled>Selecione o destino</option>
            <option value="in_care">Em Atendimento</option>
            <option value="observation">Observação</option>
          </DsInput>
        </div>

        <DsInput
          id="chiefComplaint"
          v-model="form.chiefComplaint"
          type="textarea"
          label="Queixa Principal *"
          placeholder="Descreva a queixa principal"
          :rows="3"
          required
        />

        <DsInput
          id="initialNotes"
          v-model="form.initialNotes"
          type="textarea"
          label="Notas Iniciais"
          placeholder="Notas adicionais (opcional)"
          :rows="3"
        />

        <DsInput
          id="alerts"
          v-model="alertsInput"
          label="Alertas"
          placeholder="Separe por vírgulas (ex: alergia, jejum)"
          hint="Separe múltiplos alertas por vírgula"
        />

        <div class="form-actions">
          <DsButton type="submit" variant="primary" :loading="saving">
            {{ saving ? 'Salvando...' : 'Registrar Triagem' }}
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/triage">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createTriage } from '@/services/triage';
import type { CreateTriageRequest, TriagePriority, TriageDestination } from '@/types/triage';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

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

form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}
</style>
