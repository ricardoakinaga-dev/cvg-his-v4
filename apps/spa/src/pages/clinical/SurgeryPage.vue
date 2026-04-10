<template>
  <div class="clinical-page">
    <AppPageHeader title="Cirurgias" subtitle="Primeiro corte real da trilha cirúrgica na SPA">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Atendimento selecionado">
        <DsInput v-model="selectedEncounterId" type="select" label="Atendimento" @change="refreshContext">
          <option v-for="enc in encounters" :key="enc.id" :value="enc.id">
            {{ enc.id.slice(0, 8) }} • {{ enc.reason || 'Sem descrição' }}
          </option>
        </DsInput>
        <div v-if="selectedEncounter" class="summary-list">
          <div><strong>Paciente:</strong> {{ selectedEncounter.patientId }}</div>
          <div><strong>Status:</strong> {{ selectedEncounter.status }}</div>
          <div><strong>Motivo:</strong> {{ selectedEncounter.reason }}</div>
        </div>
      </DsCard>

      <DsCard title="Nova solicitação cirúrgica">
        <form class="form-grid" @submit.prevent="submitSurgery">
          <DsInput v-model="form.procedureName" label="Procedimento" required />
          <DsInput v-model="form.surgeonUserId" label="Cirurgião responsável" />
          <DsInput v-model="form.scheduledAt" type="datetime-local" label="Agendamento" />
          <DsInput
            v-model="form.surgicalTeam"
            label="Equipe cirúrgica"
            placeholder="Separada por vírgula"
          />
          <DsInput
            v-model="form.preparationNotes"
            type="textarea"
            label="Preparação"
            :rows="3"
            placeholder="Condutas pré-operatórias"
          />
          <div class="form-actions">
            <DsButton variant="primary" :loading="submitting">Registrar cirurgia</DsButton>
            <DsButton variant="secondary" type="button" @click="resetForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Solicitações cirúrgicas">
        <DataTable
          :columns="surgeryColumns"
          :rows="surgeryRequests"
          :loading="loading"
          empty-icon="🔪"
          empty-title="Nenhuma cirurgia encontrada"
          empty-description="Registre a primeira solicitação cirúrgica para este atendimento."
          variant="hoverable"
        >
          <template #cell-createdAt="{ row }">
            {{ formatDateTime((row as ClinicalEntrySummary).createdAt) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Timeline cirúrgica">
        <DataTable
          :columns="timelineColumns"
          :rows="surgeryTimeline"
          :loading="loading"
          empty-icon="🗂️"
          empty-title="Nenhum evento cirúrgico encontrado"
          empty-description="A timeline clínica será preenchida conforme o fluxo cirúrgico evoluir."
          variant="hoverable"
        >
          <template #cell-occurredAt="{ row }">
            {{ formatDateTime((row as ClinicalTimelineEventSummary).occurredAt) }}
          </template>
        </DataTable>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { encounterService } from '@/services/encounter';
import { surgeryService } from '@/services/surgery';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { EncounterSummary } from '@/types/encounter';
import type { ClinicalEntrySummary, ClinicalTimelineEventSummary } from '@/types/medicalRecords';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const surgeryRequests = ref<ClinicalEntrySummary[]>([]);
const surgeryTimeline = ref<ClinicalTimelineEventSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');

const form = ref({
  procedureName: '',
  surgeonUserId: '',
  scheduledAt: '',
  surgicalTeam: '',
  preparationNotes: ''
});

const surgeryColumns: DataTableColumn[] = [
  { key: 'title', label: 'Procedimento' },
  { key: 'content', label: 'Resumo' },
  { key: 'createdAt', label: 'Criado em' }
];

const timelineColumns: DataTableColumn[] = [
  { key: 'eventType', label: 'Evento' },
  { key: 'summary', label: 'Resumo' },
  { key: 'occurredAt', label: 'Quando' }
];

const selectedEncounter = computed(() =>
  encounters.value.find((encounter) => encounter.id === selectedEncounterId.value)
);

function resetForm() {
  form.value = {
    procedureName: '',
    surgeonUserId: '',
    scheduledAt: '',
    surgicalTeam: '',
    preparationNotes: ''
  };
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    encounters.value = await encounterService.list();
    if (!selectedEncounterId.value && encounters.value.length > 0) {
      selectedEncounterId.value = encounters.value[0].id;
    }
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cirurgias';
  } finally {
    loading.value = false;
  }
}

async function refreshContext() {
  if (!selectedEncounter.value) {
    surgeryRequests.value = [];
    surgeryTimeline.value = [];
    return;
  }

  surgeryRequests.value = await surgeryService.listByEncounter(selectedEncounter.value.id);
  surgeryTimeline.value = (await medicalRecordsService.getTimeline(selectedEncounter.value.id)).filter(
    (event) => event.eventType.startsWith('surgery_')
  );
  if (!form.value.procedureName.trim()) {
    form.value.procedureName = `Cirurgia para ${selectedEncounter.value.reason || 'atendimento'}`;
  }
}

async function submitSurgery() {
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await surgeryService.createRequest({
      encounterId: selectedEncounter.value.id,
      patientId: selectedEncounter.value.patientId,
      title: form.value.procedureName.trim(),
      content: [
        form.value.surgeonUserId.trim() ? `Cirurgião: ${form.value.surgeonUserId.trim()}` : '',
        form.value.scheduledAt.trim()
          ? `Agendamento: ${new Date(form.value.scheduledAt).toISOString()}`
          : '',
        form.value.surgicalTeam.trim() ? `Equipe: ${form.value.surgicalTeam.trim()}` : '',
        form.value.preparationNotes.trim() ? `Preparação: ${form.value.preparationNotes.trim()}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    });
    successMessage.value = 'Solicitação cirúrgica registrada.';
    resetForm();
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar cirurgia';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.clinical-grid {
  display: grid;
  gap: 16px;
}

.clinical-grid--two {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--color-text-secondary, #475569);
}
</style>
