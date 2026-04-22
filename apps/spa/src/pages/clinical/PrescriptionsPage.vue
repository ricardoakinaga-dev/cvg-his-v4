<template>
  <div class="clinical-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Atendimentos', 'Prescrições']" title="Prescrições" subtitle="Workspace clínico real para prescrição e rastreio">
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

    <section class="clinical-overview">
      <DsCard title="Resumo da prescrição">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ encounters.length }}</span>
            <span class="overview-metric__label">Atendimentos carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ prescriptions.length }}</span>
            <span class="overview-metric__label">Prescrições do atendimento</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ executions.length }}</span>
            <span class="overview-metric__label">Execuções vinculadas</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ selectedEncounter ? '1' : '0' }}</span>
            <span class="overview-metric__label">Atendimento ativo</span>
          </div>
        </div>
      </DsCard>
    </section>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Atendimento selecionado">
        <DsInput v-model="selectedEncounterId" type="select" label="Atendimento" @change="syncForm">
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

      <DsCard title="Nova prescrição">
        <form class="form-grid" @submit.prevent="submitPrescription">
          <DsInput v-model="form.medicationName" label="Medicamento" required />
          <DsInput v-model="form.dosage" label="Posologia" required />
          <DsInput v-model="form.route" label="Via" placeholder="Oral, IV, IM..." />
          <DsInput v-model="form.frequency" label="Frequência" placeholder="Ex: 12/12h" />
          <DsInput v-model="form.notes" type="textarea" label="Observações" :rows="3" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="submitting">Salvar prescrição</DsButton>
            <DsButton variant="secondary" type="button" @click="resetForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Prescrições do atendimento">
        <DataTable
          :columns="prescriptionColumns"
          :rows="prescriptions"
          :loading="loading"
          empty-icon="💊"
          empty-title="Nenhuma prescrição encontrada"
          empty-description="Registre a primeira prescrição para este atendimento."
          variant="hoverable"
        >
          <template #cell-createdAt="{ row }">
            {{ formatDateTime((row as ClinicalEntrySummary).createdAt) }}
          </template>
          <template #cell-actions="{ row }">
            <DsButton size="sm" variant="secondary" @click="useForExecution(row as ClinicalEntrySummary)">
              Usar na execução
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Execuções vinculadas">
        <div v-if="executionsLoading" class="muted">Carregando execuções...</div>
        <DataTable
          v-else
          :columns="executionColumns"
          :rows="executions"
          :loading="false"
          empty-icon="🩺"
          empty-title="Nenhuma execução vinculada"
          empty-description="Acompanhe as administrações a partir da superfície de execução."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            {{ (row as PrescriptionExecutionSummary).status }}
          </template>
          <template #cell-scheduledAt="{ row }">
            {{ formatDateTime((row as PrescriptionExecutionSummary).scheduledAt) }}
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
import { prescriptionsService } from '@/services/prescriptions';
import { prescriptionExecutionsService } from '@/services/prescription-executions';
import type { EncounterSummary } from '@/types/encounter';
import type { ClinicalEntrySummary } from '@/types/medicalRecords';
import type { PrescriptionExecutionSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const prescriptions = ref<ClinicalEntrySummary[]>([]);
const executions = ref<PrescriptionExecutionSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
const executionsLoading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');

const form = ref({
  medicationName: '',
  dosage: '',
  route: '',
  frequency: '',
  notes: ''
});

const prescriptionColumns: DataTableColumn[] = [
  { key: 'title', label: 'Medicamento' },
  { key: 'content', label: 'Detalhes' },
  { key: 'createdAt', label: 'Criada em' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const executionColumns: DataTableColumn[] = [
  { key: 'medicationName', label: 'Medicamento' },
  { key: 'dosage', label: 'Posologia' },
  { key: 'status', label: 'Status' },
  { key: 'scheduledAt', label: 'Agendada' }
];

const selectedEncounter = computed(() =>
  encounters.value.find((encounter) => encounter.id === selectedEncounterId.value)
);

function resetForm() {
  form.value = {
    medicationName: '',
    dosage: '',
    route: '',
    frequency: '',
    notes: ''
  };
}

function syncForm() {
  const first = prescriptions.value[0];
  if (first) {
    form.value.medicationName = first.title;
    form.value.notes = first.content;
  }
}

function useForExecution(entry: ClinicalEntrySummary) {
  form.value.medicationName = entry.title;
  form.value.notes = entry.content;
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const loadedEncounters = await encounterService.list();
    encounters.value = loadedEncounters;
    if (!selectedEncounterId.value && encounters.value.length > 0) {
      selectedEncounterId.value = encounters.value[0].id;
    }
    await refreshEncounterData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar prescrições';
  } finally {
    loading.value = false;
  }
}

async function refreshEncounterData() {
  if (!selectedEncounter.value) {
    prescriptions.value = [];
    executions.value = [];
    return;
  }

  prescriptions.value = await prescriptionsService.listByEncounter(selectedEncounter.value.id);
  executionsLoading.value = true;
  try {
    executions.value = await prescriptionExecutionsService.list({
      encounterId: selectedEncounter.value.id
    });
  } finally {
    executionsLoading.value = false;
  }
  syncForm();
}

async function submitPrescription() {
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await prescriptionsService.create({
      encounterId: selectedEncounter.value.id,
      patientId: selectedEncounter.value.patientId,
      title: form.value.medicationName.trim(),
      content: [
        `Posologia: ${form.value.dosage.trim()}`,
        form.value.route.trim() ? `Via: ${form.value.route.trim()}` : '',
        form.value.frequency.trim() ? `Frequência: ${form.value.frequency.trim()}` : '',
        form.value.notes.trim() ? `Observações: ${form.value.notes.trim()}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    });
    successMessage.value = 'Prescrição registrada com sucesso.';
    resetForm();
    await refreshEncounterData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar prescrição';
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

.clinical-overview {
  margin-bottom: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
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

.muted {
  color: var(--color-text-muted, #64748b);
}
</style>
