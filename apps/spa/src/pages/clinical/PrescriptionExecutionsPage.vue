<template>
  <div class="clinical-page">
    <AppPageHeader
      title="Execuções de Prescrição"
      subtitle="Satélite clínico para administração vinculada ao atendimento"
      :breadcrumb-items="headerBreadcrumbItems"
      :context-items="headerContextItems"
      :next-steps="headerNextSteps"
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section v-if="hasWorkflowContext" class="clinical-context-strip" aria-label="Contexto do atendimento clínico">
      <div>
        <span>Contexto do atendimento clínico</span>
        <strong>{{ selectedEncounterContextLabel }}</strong>
        <small>Paciente {{ shortId(selectedEncounter?.patientId || workflowContext.patientId) }} · Tutor {{ shortId(selectedEncounter?.ownerId || workflowContext.ownerId) }}</small>
      </div>
      <div class="clinical-context-strip__actions">
        <DsButton v-if="selectedEncounterContextId" size="sm" variant="secondary" tag="a" :to="`/encounters/${selectedEncounterContextId}`">
          Voltar ao atendimento
        </DsButton>
        <DsButton v-if="selectedEncounterContextId" size="sm" variant="secondary" tag="a" :to="`/medical-records/${selectedEncounterContextId}`">
          Abrir prontuário
        </DsButton>
      </div>
    </section>

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

      <DsCard title="Nova execução">
        <form class="form-grid" @submit.prevent="submitExecution">
          <DsInput v-model="form.clinicalEntryId" type="select" label="Prescrição vinculada" required>
            <option v-for="entry in prescriptions" :key="entry.id" :value="entry.id">
              {{ entry.title }}
            </option>
          </DsInput>
          <DsInput v-model="form.medicationName" label="Medicamento" required />
          <DsInput v-model="form.dosage" label="Posologia" required />
          <DsInput v-model="form.route" label="Via" />
          <DsInput v-model="form.frequency" label="Frequência" />
          <DsInput v-model="form.scheduledAt" type="datetime-local" label="Agendada para" required />
          <DsInput v-model="form.notes" type="textarea" label="Observações" :rows="3" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="submitting">Criar execução</DsButton>
            <DsButton variant="secondary" type="button" @click="resetForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Execuções do atendimento">
        <DataTable
          :columns="executionColumns"
          :rows="executions"
          :loading="loading"
          empty-icon="🩺"
          empty-title="Nenhuma execução encontrada"
          empty-description="Crie a primeira execução para acompanhar a administração."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            {{ (row as PrescriptionExecutionSummary).status }}
          </template>
          <template #cell-scheduledAt="{ row }">
            {{ formatDateTime((row as PrescriptionExecutionSummary).scheduledAt) }}
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <DsButton size="sm" variant="primary" @click="execute((row as PrescriptionExecutionSummary).id)">
                Administrar
              </DsButton>
              <DsButton
                size="sm"
                variant="secondary"
                @click="suspend((row as PrescriptionExecutionSummary).id)"
              >
                Suspender
              </DsButton>
              <DsButton
                size="sm"
                variant="secondary"
                @click="showDetail((row as PrescriptionExecutionSummary).id)"
              >
                Detalhes
              </DsButton>
            </div>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Detalhe da execução">
        <div v-if="selectedExecution" class="summary-list">
          <div><strong>Medicamento:</strong> {{ selectedExecution.medicationName }}</div>
          <div><strong>Status:</strong> {{ selectedExecution.status }}</div>
          <div><strong>Agendada:</strong> {{ formatDateTime(selectedExecution.scheduledAt) }}</div>
          <div><strong>Notas:</strong> {{ selectedExecution.notes || '—' }}</div>
        </div>
        <div v-if="selectedExecution" class="detail-actions">
          <DsButton
            v-if="selectedExecution.status === 'suspended'"
            variant="primary"
            :loading="actionLoading === 'resume'"
            @click="resume(selectedExecution.id)"
          >
            Retomar
          </DsButton>
          <DsButton
            v-else
            variant="secondary"
            :loading="actionLoading === 'log'"
            @click="logEvent(selectedExecution.id)"
          >
            Registrar evento
          </DsButton>
        </div>

        <div v-if="selectedExecution" class="events-block">
          <h3 class="section-title">Eventos</h3>
          <DataTable
            :columns="eventColumns"
            :rows="selectedExecution ? [...selectedExecution.events] : []"
            :loading="false"
            empty-icon="🗂️"
            empty-title="Sem eventos"
            empty-description="A execução ainda não possui eventos."
            variant="hoverable"
            :compact="true"
          >
            <template #cell-occurredAt="{ row }">
              {{ formatDateTime((row as AdministrationEventSummary).occurredAt) }}
            </template>
          </DataTable>
        </div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb,
  type PageContextItem,
  type PageNextStep
} from '@/components/AppPageHeader.vue';
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
import type {
  AdministrationEventSummary,
  PrescriptionExecutionSummary
} from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const prescriptions = ref<ClinicalEntrySummary[]>([]);
const executions = ref<PrescriptionExecutionSummary[]>([]);
const selectedExecution = ref<PrescriptionExecutionSummary & { events: readonly AdministrationEventSummary[] } | null>(null);
const selectedEncounterId = ref('');
const loading = ref(false);
const submitting = ref(false);
const actionLoading = ref('');
const error = ref('');
const successMessage = ref('');
const workflowContext = readWorkflowContext();

const form = ref({
  clinicalEntryId: '',
  medicationName: '',
  dosage: '',
  route: '',
  frequency: '',
  scheduledAt: '',
  notes: ''
});

const executionColumns: DataTableColumn[] = [
  { key: 'medicationName', label: 'Medicamento' },
  { key: 'dosage', label: 'Posologia' },
  { key: 'status', label: 'Status' },
  { key: 'scheduledAt', label: 'Agendada' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const eventColumns: DataTableColumn[] = [
  { key: 'eventType', label: 'Evento' },
  { key: 'notes', label: 'Notas' },
  { key: 'occurredAt', label: 'Momento' }
];

const selectedEncounter = computed(() =>
  encounters.value.find((encounter) => encounter.id === selectedEncounterId.value)
);

const hasWorkflowContext = computed(() =>
  Boolean(workflowContext.encounterId || workflowContext.patientId || workflowContext.ownerId)
);

const selectedEncounterContextId = computed(() => selectedEncounter.value?.id || workflowContext.encounterId);

const selectedEncounterContextLabel = computed(() => {
  const id = selectedEncounterContextId.value;
  const reason = selectedEncounter.value?.reason;
  return `${shortId(id)}${reason ? ` · ${reason}` : ''}`;
});

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento', to: '/encounters' },
  { key: 'executions', label: 'Execuções', current: true }
]);

const headerContextItems = computed<PageContextItem[]>(() => {
  const items: PageContextItem[] = [
    {
      key: 'encounter',
      label: 'Atendimento',
      value: selectedEncounterContextId.value ? shortId(selectedEncounterContextId.value) : 'Não selecionado',
      tone: selectedEncounterContextId.value ? 'info' : 'warning'
    },
    {
      key: 'patient',
      label: 'Paciente',
      value: shortId(selectedEncounter.value?.patientId || workflowContext.patientId)
    }
  ];
  if (selectedEncounter.value?.ownerId || workflowContext.ownerId) {
    items.push({
      key: 'owner',
      label: 'Tutor',
      value: shortId(selectedEncounter.value?.ownerId || workflowContext.ownerId)
    });
  }
  return items;
});

const headerNextSteps = computed<PageNextStep[]>(() => [
  {
    key: 'execute',
    label: 'Registrar execução quando houver prescrição',
    description: selectedEncounter.value?.reason || 'Selecione o atendimento clínico'
  }
]);

const headerSecondaryActions = computed<PageAction[]>(() => {
  const actions: PageAction[] = [
    { key: 'refresh', label: 'Atualizar', variant: 'secondary', loading: loading.value, onClick: () => void loadData() }
  ];
  if (selectedEncounterContextId.value) {
    actions.unshift({
      key: 'encounter',
      label: 'Atendimento',
      variant: 'secondary',
      to: `/encounters/${selectedEncounterContextId.value}`
    });
  }
  return actions;
});

const headerPrimaryAction = computed<PageAction | null>(() =>
  selectedEncounterContextId.value
    ? {
        key: 'record',
        label: 'Prontuário',
        to: `/medical-records/${selectedEncounterContextId.value}`
      }
    : null
);

function resetForm() {
  form.value = {
    clinicalEntryId: '',
    medicationName: '',
    dosage: '',
    route: '',
    frequency: '',
    scheduledAt: '',
    notes: ''
  };
  syncDraftFromPrescription();
}

function syncDraftFromPrescription() {
  const selected = prescriptions.value.find((entry) => entry.id === form.value.clinicalEntryId) ?? prescriptions.value[0];
  if (!selected) {
    return;
  }
  if (!form.value.clinicalEntryId) {
    form.value.clinicalEntryId = selected.id;
  }
  if (!form.value.medicationName.trim()) {
    form.value.medicationName = selected.title;
  }
  if (!form.value.notes.trim()) {
    form.value.notes = selected.content;
  }
}

watch(
  () => form.value.clinicalEntryId,
  () => syncDraftFromPrescription()
);

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    encounters.value = await encounterService.list();
    if (!selectedEncounterId.value && encounters.value.length > 0) {
      selectedEncounterId.value =
        encounters.value.find((encounter) => encounter.id === workflowContext.encounterId)?.id ??
        encounters.value.find((encounter) => encounter.patientId === workflowContext.patientId)?.id ??
        encounters.value[0].id;
    }
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar execuções';
  } finally {
    loading.value = false;
  }
}

async function refreshContext() {
  if (!selectedEncounter.value) {
    prescriptions.value = [];
    executions.value = [];
    selectedExecution.value = null;
    return;
  }

  prescriptions.value = await prescriptionsService.listByEncounter(selectedEncounter.value.id);
  executions.value = await prescriptionExecutionsService.list({
    encounterId: selectedEncounter.value.id
  });
  syncDraftFromPrescription();
  if (executions.value.length > 0 && !selectedExecution.value) {
    await showDetail(executions.value[0].id);
  }
}

async function submitExecution() {
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }
  if (!form.value.clinicalEntryId) {
    error.value = 'Selecione uma prescrição vinculada';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await prescriptionExecutionsService.create({
      clinicalEntryId: form.value.clinicalEntryId,
      patientId: selectedEncounter.value.patientId,
      encounterId: selectedEncounter.value.id,
      medicationName: form.value.medicationName.trim(),
      dosage: form.value.dosage.trim(),
      route: form.value.route.trim() || undefined,
      frequency: form.value.frequency.trim() || undefined,
      scheduledAt: new Date(form.value.scheduledAt).toISOString(),
      notes: form.value.notes.trim() || undefined
    });
    successMessage.value = 'Execução criada com sucesso.';
    resetForm();
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao criar execução';
  } finally {
    submitting.value = false;
  }
}

async function showDetail(executionId: string) {
  selectedExecution.value = await prescriptionExecutionsService.getById(executionId);
}

async function execute(executionId: string) {
  actionLoading.value = 'execute';
  try {
    await prescriptionExecutionsService.execute(executionId, {
      status: 'administered',
      notes: 'Administrado pela SPA'
    });
    await refreshContext();
    await showDetail(executionId);
    successMessage.value = 'Execução administrada.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao administrar';
  } finally {
    actionLoading.value = '';
  }
}

async function suspend(executionId: string) {
  actionLoading.value = 'suspend';
  try {
    await prescriptionExecutionsService.suspend(executionId, {
      reason: 'Suspensão operacional via SPA'
    });
    await refreshContext();
    await showDetail(executionId);
    successMessage.value = 'Execução suspensa.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao suspender';
  } finally {
    actionLoading.value = '';
  }
}

async function resume(executionId: string) {
  actionLoading.value = 'resume';
  try {
    await prescriptionExecutionsService.resume(executionId);
    await refreshContext();
    await showDetail(executionId);
    successMessage.value = 'Execução retomada.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao retomar';
  } finally {
    actionLoading.value = '';
  }
}

async function logEvent(executionId: string) {
  actionLoading.value = 'log';
  try {
    await prescriptionExecutionsService.logEvent(executionId, {
      eventType: 'spa_manual_log',
      notes: 'Evento administrativo registrado pela SPA'
    });
    await showDetail(executionId);
    successMessage.value = 'Evento registrado.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar evento';
  } finally {
    actionLoading.value = '';
  }
}

onMounted(loadData);

function readWorkflowContext() {
  if (typeof window === 'undefined') {
    return { encounterId: '', patientId: '', ownerId: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    encounterId: params.get('encounterId')?.trim() || '',
    patientId: params.get('patientId')?.trim() || '',
    ownerId: params.get('ownerId')?.trim() || ''
  };
}

function shortId(value?: string): string {
  return value ? value.slice(0, 8) : 'Não informado';
}
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

.form-actions,
.row-actions,
.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.clinical-context-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.clinical-context-strip span,
.clinical-context-strip small {
  display: block;
  color: var(--color-text-muted, #64748b);
}

.clinical-context-strip strong {
  display: block;
  color: var(--color-text, #0f172a);
}

.clinical-context-strip__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--color-text-secondary, #475569);
}

.events-block {
  margin-top: 16px;
}

@media (max-width: 720px) {
  .clinical-context-strip {
    align-items: stretch;
    flex-direction: column;
  }

  .clinical-context-strip__actions {
    justify-content: flex-start;
  }
}
</style>
