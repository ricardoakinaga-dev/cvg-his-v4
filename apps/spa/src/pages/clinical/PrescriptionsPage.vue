<template>
  <div class="clinical-page">
    <AppPageHeader
      title="Prescrições"
      subtitle="Satélite clínico para receituário vinculado ao atendimento"
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

    <DsCard title="Atendimento selecionado">
      <DsInput
        v-model="selectedEncounterId"
        type="select"
        label="Atendimento"
        :disabled="loading || loadFailed || submitting"
      >
        <option value="">{{ loading ? 'Carregando atendimentos…' : encounters.length ? 'Selecione um atendimento' : 'Nenhum atendimento disponível' }}</option>
        <option v-for="enc in encounters" :key="enc.id" :value="enc.id">
          {{ enc.id.slice(0, 8) }} • {{ enc.reason || 'Sem descrição' }}
        </option>
      </DsInput>
      <div v-if="selectedEncounter && !loading && !loadFailed" class="summary-list">
        <strong v-if="hasWorkflowContext">Contexto do atendimento clínico</strong>
        <div><strong>Paciente:</strong> {{ selectedEncounter.patientId }}</div>
        <div><strong>Status:</strong> {{ encounterStatusLabel(selectedEncounter.status) }}</div>
        <div><strong>Motivo:</strong> {{ selectedEncounter.reason }}</div>
      </div>
      <div v-if="loadFailed" class="context-state" role="status">
        <p>Não foi possível carregar os atendimentos.</p>
        <DsButton variant="secondary" @click="loadData">Tentar novamente</DsButton>
      </div>
      <div v-else-if="!loading && !selectedEncounter" class="context-state" role="status">
        <p>{{ encounters.length ? 'Selecione um atendimento para consultar e registrar prescrições.' : 'Nenhum atendimento disponível para prescrição.' }}</p>
        <DsButton variant="secondary" tag="a" to="/encounters">Ver atendimentos</DsButton>
      </div>
      <p v-else-if="loading || contextState === 'loading'" class="muted" role="status">Carregando contexto clínico…</p>
      <div v-else-if="contextState === 'failed'" class="context-state" role="status">
        <p>Não foi possível carregar as prescrições e execuções deste atendimento.</p>
        <DsButton variant="secondary" @click="refreshEncounterData">Tentar novamente</DsButton>
      </div>
    </DsCard>

    <template v-if="contextReady">
      <DsCard title="Nova prescrição">
        <form @submit.prevent="submitPrescription">
          <fieldset class="form-grid" :disabled="submitting">
            <DsInput v-model="form.medicationName" label="Medicamento" required />
            <DsInput v-model="form.dosage" label="Posologia" required />
            <DsInput v-model="form.route" label="Via" placeholder="Oral, IV, IM..." />
            <DsInput v-model="form.frequency" label="Frequência" placeholder="Ex: 12/12h" />
            <DsInput v-model="form.notes" type="textarea" label="Observações" :rows="3" />
            <div class="form-actions">
              <DsButton type="submit" variant="primary" :loading="submitting">Salvar prescrição</DsButton>
              <DsButton variant="secondary" type="button" @click="resetForm">Limpar</DsButton>
            </div>
          </fieldset>
        </form>
      </DsCard>

      <div class="clinical-grid clinical-grid--two">
        <DsCard title="Prescrições do atendimento">
          <DataTable
            :columns="prescriptionColumns"
            :rows="prescriptions"
            :loading="false"
            empty-icon="💊"
            empty-title="Nenhuma prescrição encontrada"
            empty-description="Registre a primeira prescrição para este atendimento."
            variant="hoverable"
          >
            <template #cell-createdAt="{ row }">
              {{ formatDateTime((row as ClinicalEntrySummary).createdAt) }}

    </template>
          <template #cell-actions="{ row }">
            <DsButton size="sm" variant="secondary" :disabled="submitting" @click="copyToDraft(row as ClinicalEntrySummary)">
              Copiar para rascunho
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Execuções vinculadas">
        <DataTable
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
    </template>

    <details class="clinical-overview">
      <summary>Resumo da prescrição</summary>
      <dl class="overview-grid">
        <div class="overview-metric"><dt>Atendimentos carregados</dt><dd>{{ loading || loadFailed ? '—' : encounters.length }}</dd></div>
        <div class="overview-metric"><dt>Prescrições do atendimento</dt><dd>{{ contextReady ? prescriptions.length : '—' }}</dd></div>
        <div class="overview-metric"><dt>Execuções vinculadas</dt><dd>{{ contextReady ? executions.length : '—' }}</dd></div>
      </dl>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
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
import type { PrescriptionExecutionSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { encounterStatusLabel, formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const prescriptions = ref<ClinicalEntrySummary[]>([]);
const executions = ref<PrescriptionExecutionSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
const loadFailed = ref(false);
const contextState = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle');
let listRequestVersion = 0;
let contextRequestVersion = 0;
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const workflowContext = readWorkflowContext();

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

const hasWorkflowContext = computed(() =>
  Boolean(workflowContext.encounterId || workflowContext.patientId || workflowContext.ownerId)
);

const selectedEncounterContextId = computed(() => !loading.value && !loadFailed.value ? selectedEncounter.value?.id : undefined);

const contextReady = computed(() =>
  !loading.value && !loadFailed.value && Boolean(selectedEncounter.value) && contextState.value === 'ready'
);

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento', to: '/encounters' },
  { key: 'prescriptions', label: 'Prescrições', current: true }
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
      value: shortId(selectedEncounter.value?.patientId)
    }
  ];
  if (selectedEncounter.value?.ownerId) {
    items.push({
      key: 'owner',
      label: 'Tutor',
      value: shortId(selectedEncounter.value?.ownerId)
    });
  }
  return items;
});

const headerNextSteps = computed<PageNextStep[]>(() => [
  {
    key: 'prescribe',
    label: 'Registrar prescrição quando indicado',
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
    medicationName: '',
    dosage: '',
    route: '',
    frequency: '',
    notes: ''
  };
}

function copyToDraft(entry: ClinicalEntrySummary) {
  if (!contextReady.value || submitting.value || entry.encounterId !== selectedEncounterId.value || !prescriptions.value.includes(entry)) return;
  resetForm();
  form.value.medicationName = entry.title;
  form.value.notes = entry.content;
}

function clearContext() {
  contextRequestVersion += 1;
  contextState.value = 'idle';
  prescriptions.value = [];
  executions.value = [];
  resetForm();
}

watch(selectedEncounterId, () => {
  clearContext();
  error.value = '';
  successMessage.value = '';
  if (!loading.value && !loadFailed.value) void refreshEncounterData();
}, { flush: 'sync' });

async function loadData() {
  const requestVersion = ++listRequestVersion;
  loading.value = true;
  loadFailed.value = false;
  error.value = '';
  successMessage.value = '';
  clearContext();
  try {
    const loadedEncounters = await encounterService.list();
    if (requestVersion !== listRequestVersion) return;
    encounters.value = loadedEncounters;
    if (!selectedEncounter.value) {
      selectedEncounterId.value =
        encounters.value.find((encounter) => encounter.id === workflowContext.encounterId)?.id ??
        encounters.value.find((encounter) => encounter.patientId === workflowContext.patientId)?.id ??
        encounters.value[0]?.id ?? '';
    }
    await refreshEncounterData();
  } catch (err: unknown) {
    if (requestVersion !== listRequestVersion) return;
    loadFailed.value = true;
    encounters.value = [];
    selectedEncounterId.value = '';
    clearContext();
    error.value = err instanceof Error ? err.message : 'Erro ao carregar atendimentos';
  } finally {
    if (requestVersion === listRequestVersion) loading.value = false;
  }
}

async function refreshEncounterData() {
  const encounterId = selectedEncounter.value?.id;
  const requestVersion = ++contextRequestVersion;
  prescriptions.value = [];
  executions.value = [];
  error.value = '';
  if (!encounterId || loadFailed.value) {
    contextState.value = 'idle';
    return;
  }
  contextState.value = 'loading';
  try {
    const [loadedPrescriptions, loadedExecutions] = await Promise.all([
      prescriptionsService.listByEncounter(encounterId),
      prescriptionExecutionsService.list({ encounterId })
    ]);
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return;
    prescriptions.value = loadedPrescriptions;
    executions.value = loadedExecutions;
    contextState.value = 'ready';
  } catch (err: unknown) {
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return;
    contextState.value = 'failed';
    error.value = err instanceof Error ? err.message : 'Erro ao carregar prescrições e execuções';
  }
}

async function submitPrescription() {
  if (!contextReady.value || !selectedEncounter.value || submitting.value) {
    error.value = 'Selecione um atendimento com o contexto carregado';
    return;
  }

  const encounterId = selectedEncounter.value.id;
  const patientId = selectedEncounter.value.patientId;
  const requestVersion = contextRequestVersion;
  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await prescriptionsService.create({
      encounterId,
      patientId,
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
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return;
    successMessage.value = 'Prescrição registrada com sucesso.';
    resetForm();
    await refreshEncounterData();
  } catch (err: unknown) {
    if (requestVersion === contextRequestVersion && selectedEncounterId.value === encounterId) {
      error.value = err instanceof Error ? err.message : 'Erro ao registrar prescrição';
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
onBeforeUnmount(() => { listRequestVersion += 1; contextRequestVersion += 1; });

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
.clinical-page { display: grid; gap: 16px; min-width: 0; }
.clinical-overview summary { min-height: 44px; padding-block: 12px; box-sizing: border-box; cursor: pointer; font-weight: 700; color: var(--color-text-secondary); }
.overview-metric dt { color: var(--color-text-secondary); font-size: 13px; }
.overview-metric dd { margin: 8px 0 0; font-size: 24px; font-weight: 700; color: var(--color-text); }
.context-state p { color: var(--color-text-secondary); }
.form-grid { border: 0; padding: 0; margin: 0; min-width: 0; }

.clinical-grid {
  display: grid;
  gap: 16px;
}

.clinical-grid--two {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
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
  overflow-wrap: anywhere;
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--color-text-secondary, #475569);
}

.muted {
  color: var(--color-text-muted, #64748b);
}

</style>
