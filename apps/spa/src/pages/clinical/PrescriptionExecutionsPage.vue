<template>
  <div class="clinical-page">
    <AppPageHeader
      title="Execuções de Prescrição"
      subtitle="Administração e histórico por atendimento"
      :breadcrumb-items="headerBreadcrumbItems"
      :context-items="[]"
      :next-steps="[]"
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="clinical-context-strip" aria-label="Contexto do atendimento clínico">
      <div class="context-selector">
        <DsInput v-model="selectedEncounterId" type="select" label="Atendimento" :disabled="encountersLoading">
          <option value="" disabled>{{ encountersLoading ? 'Carregando atendimentos…' : 'Selecione um atendimento' }}</option>
          <option v-for="enc in encounters" :key="enc.id" :value="enc.id">{{ shortId(enc.id) }} · {{ enc.reason || 'Sem descrição' }}</option>
        </DsInput>
      </div>
      <div v-if="selectedEncounter" class="context-identity">
        <span>Contexto do atendimento clínico</span>
        <strong>Paciente {{ selectedEncounter.patientId }}</strong>
        <small>Tutor {{ selectedEncounter.ownerId || 'Não informado' }}</small>
      </div>
      <DsButton
        :disabled="formDisabled || !prescriptions.length"
        :aria-expanded="createOpen"
        aria-controls="prescription-execution-create-panel"
        @click="createOpen = !createOpen"
      >{{ createOpen ? 'Fechar formulário' : 'Nova execução' }}</DsButton>
    </section>
    <DsAlert v-if="contextError" variant="danger">
      {{ contextError }} <DsButton variant="secondary" size="sm" @click="loadData">Tentar novamente</DsButton>
    </DsAlert>
    <p v-if="encountersLoading" role="status">Carregando atendimentos…</p>
    <p v-else-if="loading" role="status">Carregando prescrições e execuções…</p>
    <p v-else-if="!encounters.length && !contextError" class="context-message">Nenhum atendimento disponível. Abra um atendimento para acompanhar as execuções.</p>
    <p v-else-if="selectedEncounter && !prescriptions.length && !contextError" class="context-message">Nenhuma prescrição disponível neste atendimento. Consulte o prontuário para conferir as prescrições.</p>

    <div
      v-if="createOpen"
      id="prescription-execution-create-panel"
      class="create-panel"
      role="region"
      aria-label="Nova execução de prescrição"
    >
      <DsCard title="Nova execução">
        <form class="form-grid" @submit.prevent="submitExecution">
          <DsInput :disabled="formDisabled" v-model="form.clinicalEntryId" type="select" label="Prescrição vinculada" required>
            <option v-for="entry in prescriptions" :key="entry.id" :value="entry.id">
              {{ entry.title }}
            </option>
          </DsInput>
          <DsInput :disabled="formDisabled" v-model="form.medicationName" label="Medicamento" required />
          <DsInput :disabled="formDisabled" v-model="form.dosage" label="Posologia" required />
          <DsInput :disabled="formDisabled" v-model="form.route" label="Via" />
          <DsInput :disabled="formDisabled" v-model="form.frequency" label="Frequência" />
          <DsInput :disabled="formDisabled" v-model="form.scheduledAt" type="datetime-local" label="Agendada para" required />
          <DsInput :disabled="formDisabled" v-model="form.notes" type="textarea" label="Observações" :rows="3" />
          <div class="form-actions">
            <DsButton type="submit" variant="primary" :loading="submitting" :disabled="formDisabled">Criar execução</DsButton>
            <DsButton variant="secondary" type="button" :disabled="formDisabled" @click="resetForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <div class="clinical-grid clinical-grid--two" v-if="selectedEncounter && !contextError">
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
            <span class="status-label">{{ statusLabel((row as PrescriptionExecutionSummary).status) }}</span>
          </template>
          <template #cell-scheduledAt="{ row }">
            {{ formatDateTime((row as PrescriptionExecutionSummary).scheduledAt) }}
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <DsButton v-if="(row as PrescriptionExecutionSummary).status === 'pending'" :disabled="mutationPending || loading || encountersLoading" size="sm" variant="primary" @click="execute((row as PrescriptionExecutionSummary).id)">
                Administrar
              </DsButton>
              <DsButton
                size="sm"
                variant="secondary"
                v-if="(row as PrescriptionExecutionSummary).status === 'pending'"
                :disabled="mutationPending || loading || encountersLoading"
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
        <p v-if="detailLoading" role="status">Carregando detalhe…</p>
        <DsAlert v-else-if="detailError" variant="danger">{{ detailError }} <DsButton variant="secondary" size="sm" @click="showDetail(detailId)">Tentar novamente</DsButton></DsAlert>
        <p v-else-if="!selectedExecution" class="context-message">Selecione uma execução para consultar os dados e o histórico.</p>
        <div v-if="selectedExecution" class="summary-list">
          <div><strong>Medicamento:</strong> {{ selectedExecution.medicationName }}</div>
          <div><strong>Posologia:</strong> {{ selectedExecution.dosage }}</div>
          <div><strong>Via / frequência:</strong> {{ selectedExecution.route || '—' }} · {{ selectedExecution.frequency || '—' }}</div>
          <div><strong>Status:</strong> {{ statusLabel(selectedExecution.status) }}</div>
          <div><strong>Agendada:</strong> {{ formatDateTime(selectedExecution.scheduledAt) }}</div>
          <div><strong>Notas:</strong> {{ selectedExecution.notes || '—' }}</div>
        </div>
        <div v-if="selectedExecution" class="detail-actions">
          <DsButton
            v-if="selectedExecution.status === 'suspended'"
            variant="primary"
            :loading="actionLoading === 'resume'"
            :disabled="mutationPending || loading || encountersLoading"
            @click="resume(selectedExecution.id)"
          >
            Retomar
          </DsButton>
          <DsButton
            variant="secondary"
            :loading="actionLoading === 'log'"
            :disabled="mutationPending || loading || encountersLoading"
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
            <template #cell-eventType="{ row }">{{ eventLabel((row as AdministrationEventSummary).eventType) }}</template>
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
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { routeLocationKey } from 'vue-router';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb
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
import type {
  AdministrationEventSummary,
  PrescriptionExecutionSummary
} from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const prescriptions = ref<Awaited<ReturnType<typeof prescriptionsService.listByEncounter>>>([]);
const executions = ref<PrescriptionExecutionSummary[]>([]);
const selectedExecution = ref<PrescriptionExecutionSummary & { events: readonly AdministrationEventSummary[] } | null>(null);
const selectedEncounterId = ref('');
const loading = ref(false);
const submitting = ref(false);
const actionLoading = ref('');
const error = ref('');
const successMessage = ref('');
let workflowContext = readWorkflowContext();
const route = inject(routeLocationKey, undefined);
const createOpen = ref(false);
const encountersLoading = ref(false);
const contextError = ref('');
const detailError = ref('');
const detailLoading = ref(false);
const detailId = ref('');
const pendingEncounters = ref(new Set<string>());
const mutationPending = computed(() => submitting.value || Boolean(actionLoading.value) || pendingEncounters.value.has(selectedEncounterId.value));
const formDisabled = computed(() => loading.value || encountersLoading.value || mutationPending.value || Boolean(contextError.value));
let active = true;
let contextVersion = 0;
let listVersion = 0;
let detailVersion = 0;
let encounterVersion = 0;

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

const selectedEncounterContextId = computed(() => selectedEncounter.value?.id || '');

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento', to: '/encounters' },
  { key: 'executions', label: 'Execuções', current: true }
]);

const headerSecondaryActions = computed<PageAction[]>(() => {
  const actions: PageAction[] = [
    { key: 'refresh', label: 'Atualizar', variant: 'secondary', loading: loading.value || encountersLoading.value, onClick: () => void loadData() }
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

function emptyDraft() {
  return { clinicalEntryId: '', medicationName: '', dosage: '', route: '', frequency: '', scheduledAt: '', notes: '' };
}
function resetForm() {
  form.value = emptyDraft();
  form.value.clinicalEntryId = prescriptions.value[0]?.id || '';
  syncDraftFromPrescription();
}
function syncDraftFromPrescription() {
  const selected = prescriptions.value.find(entry => entry.id === form.value.clinicalEntryId);
  form.value.medicationName = selected?.medicationName || selected?.title || '';
  form.value.dosage = selected?.dosage || '';
  form.value.route = selected?.route || '';
  form.value.frequency = selected?.frequency || '';
  form.value.notes = selected?.notes || selected?.content || '';
}
watch(() => form.value.clinicalEntryId, syncDraftFromPrescription);
function clearContext() {
  contextVersion++;
  loading.value = false;
  listVersion++;
  detailVersion++;
  prescriptions.value = [];
  executions.value = [];
  selectedExecution.value = null;
  detailId.value = '';
  detailLoading.value = false;
  detailError.value = '';
  contextError.value = '';
  error.value = '';
  successMessage.value = '';
  form.value = emptyDraft();
  createOpen.value = false;
  submitting.value = false;
  actionLoading.value = '';
}
watch(selectedEncounterId, () => {
  clearContext();
  void refreshContext();
}, { flush: 'sync' });
const current = (version: number, id: string) => active && version === contextVersion && id === selectedEncounterId.value;
async function loadData() {
  const request = ++encounterVersion;
  const context = contextVersion;
  encountersLoading.value = true;
  contextError.value = '';
  try {
    const items = await encounterService.list();
    if (!active || request !== encounterVersion || context !== contextVersion) return;
    encounters.value = items;
    const requestedId = selectedEncounterId.value || workflowContext.encounterId;
    const next = requestedId
      ? items.find(item => item.id === requestedId && (selectedEncounterId.value || !workflowContext.patientId || item.patientId === workflowContext.patientId))?.id || ''
      : workflowContext.patientId
        ? items.find(item => item.patientId === workflowContext.patientId)?.id || ''
        : items[0]?.id || '';
    if (!next && (requestedId || workflowContext.patientId)) {
      if (selectedEncounterId.value) selectedEncounterId.value = '';
      else clearContext();
      contextError.value = 'Atendimento solicitado indisponível. Confira o contexto ou selecione um atendimento.';
      return;
    }
    if (next !== selectedEncounterId.value) selectedEncounterId.value = next;
    else await refreshContext();
  } catch (err) {
    if (active && request === encounterVersion && context === contextVersion) {
      clearContext();
      contextError.value = message(err, 'Erro ao carregar atendimentos');
    }
  } finally {
    if (active && request === encounterVersion) encountersLoading.value = false;
  }
}
async function refreshContext(preferredId = '') {
  const encounter = selectedEncounter.value;
  const version = contextVersion;
  const request = ++listVersion;
  const detailAtStart = detailVersion;
  contextError.value = '';
  if (!encounter) { loading.value = false; return; }
  loading.value = true;
  try {
    const [entries, rows] = await Promise.all([
      prescriptionsService.listByEncounter(encounter.id),
      prescriptionExecutionsService.list({ encounterId: encounter.id })
    ]);
    if (!current(version, encounter.id) || request !== listVersion) return;
    prescriptions.value = entries.filter(entry => entry.encounterId === encounter.id && entry.patientId === encounter.patientId && entry.entryType === 'prescription' && !entry.deletedAt);
    executions.value = rows.filter(row => row.encounterId === encounter.id && row.patientId === encounter.patientId);
    if (!prescriptions.value.some(entry => entry.id === form.value.clinicalEntryId)) resetForm();
    if (detailAtStart === detailVersion) {
      const id = executions.value.find(row => row.id === preferredId || row.id === detailId.value)?.id || executions.value[0]?.id;
      if (id) await showDetail(id);
      else { selectedExecution.value = null; detailId.value = ''; }
    }
  } catch (err) {
    if (!current(version, encounter.id) || request !== listVersion) return;
    prescriptions.value = [];
    executions.value = [];
    selectedExecution.value = null;
    detailVersion++;
    detailLoading.value = false;
    form.value = emptyDraft();
    contextError.value = message(err, 'Erro ao carregar execuções');
  } finally {
    if (current(version, encounter.id) && request === listVersion) loading.value = false;
  }
}
async function showDetail(executionId: string) {
  const encounter = selectedEncounter.value;
  if (!encounter || !executions.value.some(row => row.id === executionId)) return;
  const version = contextVersion;
  const request = ++detailVersion;
  detailId.value = executionId;
  selectedExecution.value = null;
  detailLoading.value = true;
  detailError.value = '';
  try {
    const detail = await prescriptionExecutionsService.getById(executionId);
    if (!current(version, encounter.id) || request !== detailVersion) return;
    if (detail.id !== executionId || detail.encounterId !== encounter.id || detail.patientId !== encounter.patientId) throw new Error('Detalhe incompatível com o atendimento selecionado.');
    selectedExecution.value = detail;
  } catch (err) {
    if (current(version, encounter.id) && request === detailVersion) detailError.value = message(err, 'Erro ao carregar detalhe');
  } finally {
    if (current(version, encounter.id) && request === detailVersion) detailLoading.value = false;
  }
}
async function submitExecution() {
  if (formDisabled.value) return;
  const encounter = selectedEncounter.value;
  if (!encounter) { error.value = 'Selecione um atendimento'; return; }
  const entry = prescriptions.value.find(item => item.id === form.value.clinicalEntryId && item.encounterId === encounter.id && item.patientId === encounter.patientId);
  if (!entry) { error.value = 'Selecione uma prescrição deste atendimento'; return; }
  const scheduledAt = new Date(form.value.scheduledAt);
  if (!form.value.medicationName.trim() || !form.value.dosage.trim() || !Number.isFinite(scheduledAt.getTime())) {
    error.value = 'Informe medicamento, posologia e uma data válida.'; return;
  }
  const version = contextVersion;
  submitting.value = true;
  pendingEncounters.value.add(encounter.id);
  error.value = '';
  successMessage.value = '';
  try {
    await prescriptionExecutionsService.create({
      clinicalEntryId: entry.id, patientId: encounter.patientId, encounterId: encounter.id,
      medicationName: form.value.medicationName.trim(), dosage: form.value.dosage.trim(),
      route: form.value.route.trim() || undefined, frequency: form.value.frequency.trim() || undefined,
      scheduledAt: scheduledAt.toISOString(), notes: form.value.notes.trim() || undefined
    });
    if (!current(version, encounter.id)) return;
    successMessage.value = 'Execução criada com sucesso.';
    resetForm();
    createOpen.value = false;
    await refreshContext();
  } catch (err) {
    if (current(version, encounter.id)) error.value = message(err, 'Erro ao criar execução');
  } finally {
    // Returning to this encounter starts a new view while its earlier write may still be pending.
    // Reconcile that view before releasing its action lock.
    if (active && selectedEncounterId.value === encounter.id && !current(version, encounter.id)) await refreshContext();
    if (active) pendingEncounters.value.delete(encounter.id);
    if (current(version, encounter.id)) submitting.value = false;
  }
}
async function mutate(executionId: string, action: 'execute' | 'suspend' | 'resume' | 'log') {
  const encounter = selectedEncounter.value;
  const row = selectedExecution.value?.id === executionId ? selectedExecution.value : executions.value.find(item => item.id === executionId);
  if (!encounter || !row || row.encounterId !== encounter.id || row.patientId !== encounter.patientId || mutationPending.value || loading.value || encountersLoading.value || contextError.value) return;
  if ((action === 'execute' || action === 'suspend') && row.status !== 'pending') return;
  if (action === 'resume' && row.status !== 'suspended') return;
  const version = contextVersion;
  actionLoading.value = action;
  pendingEncounters.value.add(encounter.id);
  error.value = '';
  successMessage.value = '';
  try {
    if (action === 'execute') await prescriptionExecutionsService.execute(executionId, { status: 'administered', notes: 'Administrado pela SPA' });
    else if (action === 'suspend') await prescriptionExecutionsService.suspend(executionId, { reason: 'Suspensão operacional via SPA' });
    else if (action === 'resume') await prescriptionExecutionsService.resume(executionId);
    else await prescriptionExecutionsService.logEvent(executionId, { eventType: 'spa_manual_log', notes: 'Evento administrativo registrado pela SPA' });
    if (!current(version, encounter.id)) return;
    successMessage.value = { execute: 'Execução administrada.', suspend: 'Execução suspensa.', resume: 'Execução retomada.', log: 'Evento registrado.' }[action];
    if (action === 'log') { if (detailId.value === executionId) await showDetail(executionId); }
    else await refreshContext();
  } catch (err) {
    if (current(version, encounter.id)) error.value = message(err, 'Erro ao atualizar execução');
  } finally {
    // Returning to this encounter starts a new view while its earlier write may still be pending.
    // Reconcile that view before releasing its action lock.
    if (active && selectedEncounterId.value === encounter.id && !current(version, encounter.id)) await refreshContext();
    if (active) pendingEncounters.value.delete(encounter.id);
    if (current(version, encounter.id)) actionLoading.value = '';
  }
}
const execute = (id: string) => mutate(id, 'execute');
const suspend = (id: string) => mutate(id, 'suspend');
const resume = (id: string) => mutate(id, 'resume');
const logEvent = (id: string) => mutate(id, 'log');
function message(err: unknown, fallback: string) { return err instanceof Error ? err.message : fallback; }
function eventLabel(event: string) {
  return ({ created: 'Execução criada', administered: 'Administrada', 'not-administered': 'Não administrada', suspended: 'Suspensa', resumed: 'Retomada', spa_manual_log: 'Registro administrativo' } as Record<string, string>)[event] || event;
}
function statusLabel(status: string) {
  return ({ pending: 'Pendente', administered: 'Administrada', 'not-administered': 'Não administrada', suspended: 'Suspensa', cancelled: 'Cancelada' } as Record<string, string>)[status] || status;
}
if (route) watch(() => [route.query.encounterId, route.query.patientId, route.query.ownerId], () => {
  workflowContext = { encounterId: String(route.query.encounterId || ''), patientId: String(route.query.patientId || ''), ownerId: String(route.query.ownerId || '') };
  clearContext();
  selectedEncounterId.value = '';
  void loadData();
}, { flush: 'sync' });
onMounted(loadData);
onBeforeUnmount(() => { active = false; contextVersion++; listVersion++; detailVersion++; encounterVersion++; });

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
.context-selector { flex: 1 1 280px; min-width: 0; }
.context-identity { flex: 1 1 180px; overflow-wrap: anywhere; }
.context-message { color: var(--color-text-secondary); margin: 0; line-height: 1.6; }
.create-panel { min-width: 0; }
.status-label { font-weight: 600; }
.summary-list { overflow-wrap: anywhere; }
.clinical-grid {
  display: grid;
  gap: 16px;
}

.clinical-grid--two {
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  align-items: start;
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
  margin-bottom: 0;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #f8fafc);
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

@media (max-width: 1100px) { .clinical-grid--two { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 720px) {
  .context-selector, .context-identity { flex-basis: auto; }
  .clinical-context-strip {
    align-items: stretch;
    flex-direction: column;
  }

  .clinical-context-strip__actions {
    justify-content: flex-start;
  }
}
</style>
