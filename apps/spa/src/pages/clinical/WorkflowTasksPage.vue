<template>
  <div class="workflow-tasks-page">
    <AppPageHeader
      title="Pendências clínicas"
      subtitle="Uma fila operacional única para retornos, lembretes e tarefas assistenciais."
      :breadcrumbs="['Atendimento', 'Fluxo Assistencial CVG', 'Pendências clínicas']"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" :disabled="loading" @click="loadData">
          Atualizar
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="workflow-tasks-summary" aria-label="Resumo da fila clínica">
      <div class="workflow-stat">
        <span class="workflow-stat__label">Exibidas</span>
        <strong>{{ tasks.length }}</strong>
      </div>
      <div class="workflow-stat workflow-stat--warning">
        <span class="workflow-stat__label">Em atraso</span>
        <strong>{{ overdueCount }}</strong>
      </div>
      <div class="workflow-stat workflow-stat--critical">
        <span class="workflow-stat__label">Críticas</span>
        <strong>{{ criticalCount }}</strong>
      </div>
      <div class="workflow-stat">
        <span class="workflow-stat__label">Escaladas</span>
        <strong>{{ escalatedCount }}</strong>
      </div>
    </section>

    <form class="workflow-tasks-filters" aria-label="Filtros de pendências clínicas" @submit.prevent="loadData">
      <DsInput id="workflow-task-status" v-model="statusFilter" type="select" label="Status">
        <option value="">Todos os status</option>
        <option v-for="status in statusOptions" :key="status" :value="status">
          {{ statusLabel(status) }}
        </option>
      </DsInput>
      <DsInput
        id="workflow-task-type"
        v-model="taskTypeFilter"
        label="Tipo de tarefa"
        placeholder="Ex.: clinical.follow_up"
      />
      <div class="workflow-tasks-filters__actions">
        <DsButton type="submit" variant="primary" :loading="loading">Aplicar filtros</DsButton>
        <DsButton type="button" variant="secondary" :disabled="loading" @click="clearFilters">
          Limpar
        </DsButton>
      </div>
    </form>

    <div class="workflow-tasks-layout">
      <DsCard title="Fila assistencial">
        <p v-if="loading" class="sr-only" role="status" aria-live="polite">Carregando pendências clínicas…</p>
        <DataTable
          :columns="columns"
          :rows="tasks"
          :loading="loading"
          empty-icon="✓"
          empty-title="Nenhuma pendência encontrada"
          empty-description="As tarefas clínicas criadas por altas e outros fluxos aparecerão aqui."
          caption="Fila de pendências clínicas"
          row-key-field="id"
          variant="hoverable"
        >
          <template #cell-title="{ row }">
            <div class="workflow-task-title">
              <strong>{{ (row as WorkflowTaskRecord).title }}</strong>
              <small>{{ (row as WorkflowTaskRecord).taskType }}</small>
            </div>
          </template>
          <template #cell-status="{ row }">
            <StatusBadge
              :label="statusLabel((row as WorkflowTaskRecord).status)"
              :variant="statusVariant((row as WorkflowTaskRecord).status)"
              size="sm"
            />
          </template>
          <template #cell-priority="{ row }">
            <StatusBadge
              :label="priorityLabel((row as WorkflowTaskRecord).priority)"
              :variant="priorityVariant((row as WorkflowTaskRecord).priority)"
              size="sm"
            />
          </template>
          <template #cell-dueAt="{ row }">
            <span
              :class="{ 'workflow-task-due--overdue': isOverdue(row as WorkflowTaskRecord) }"
              :aria-label="isOverdue(row as WorkflowTaskRecord)
                ? `Vencimento ${formatDateTime((row as WorkflowTaskRecord).dueAt)}; em atraso`
                : undefined"
            >
              <span v-if="isOverdue(row as WorkflowTaskRecord)" class="sr-only">Em atraso: </span>
              {{ formatDateTime((row as WorkflowTaskRecord).dueAt) }}
              <span v-if="isOverdue(row as WorkflowTaskRecord)" aria-hidden="true"> (em atraso)</span>
            </span>
          </template>
          <template #cell-patientId="{ row }">
            <DsButton
              v-if="(row as WorkflowTaskRecord).patientId"
              tag="a"
              variant="ghost"
              size="sm"
              :to="`/patients/${encodeURIComponent((row as WorkflowTaskRecord).patientId!)}`"
              :aria-label="`Abrir paciente ${(row as WorkflowTaskRecord).patientId}`"
            >
              {{ shortId((row as WorkflowTaskRecord).patientId!) }}
            </DsButton>
            <span v-else>—</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="workflow-task-actions">
              <DsButton
                variant="secondary"
                size="sm"
                :disabled="Boolean(pendingAction) || loading || loadFailed"
                @click="selectTask(row as WorkflowTaskRecord)"
              >
                Detalhes
              </DsButton>
              <DsButton
                v-if="canAcknowledge(row as WorkflowTaskRecord)"
                variant="primary"
                size="sm"
                :loading="pendingAction === `ack:${(row as WorkflowTaskRecord).id}`"
                :disabled="Boolean(pendingAction) || loading || loadFailed"
                @click="runAction('acknowledge', row as WorkflowTaskRecord)"
              >
                Reconhecer
              </DsButton>
              <DsButton
                v-if="canComplete(row as WorkflowTaskRecord)"
                variant="success"
                size="sm"
                :loading="pendingAction === `complete:${(row as WorkflowTaskRecord).id}`"
                :disabled="Boolean(pendingAction) || loading || loadFailed"
                @click="runAction('complete', row as WorkflowTaskRecord)"
              >
                Concluir
              </DsButton>
              <DsButton
                v-if="(row as WorkflowTaskRecord).status === 'dlq'"
                variant="danger"
                size="sm"
                :loading="pendingAction === `replay:${(row as WorkflowTaskRecord).id}`"
                :disabled="Boolean(pendingAction) || loading || loadFailed"
                @click="runAction('replay', row as WorkflowTaskRecord)"
              >
                Reprocessar
              </DsButton>
            </div>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Detalhe da pendência">
        <EmptyState
          v-if="!selectedTask"
          icon="clipboard"
          title="Selecione uma tarefa"
          description="Consulte o contexto e os controles de ciclo de vida sem sair da fila."
          size="sm"
        />
        <template v-else>
          <div class="workflow-task-detail__heading">
            <div>
              <span class="workflow-task-detail__eyebrow">{{ selectedTask.taskType }}</span>
              <h2>{{ selectedTask.title }}</h2>
            </div>
            <StatusBadge
              :label="statusLabel(selectedTask.status)"
              :variant="statusVariant(selectedTask.status)"
            />
          </div>
          <p v-if="selectedTask.description" class="workflow-task-detail__description">
            {{ selectedTask.description }}
          </p>
          <dl class="workflow-task-detail__facts">
            <div><dt>Prioridade</dt><dd>{{ priorityLabel(selectedTask.priority) }}</dd></div>
            <div>
              <dt>Vencimento</dt>
              <dd :class="{ 'workflow-task-due--overdue': isOverdue(selectedTask) }">
                <span v-if="isOverdue(selectedTask)" class="sr-only">Em atraso: </span>
                {{ formatDateTime(selectedTask.dueAt) }}
                <span v-if="isOverdue(selectedTask)" aria-hidden="true"> (em atraso)</span>
              </dd>
            </div>
            <div><dt>Tentativas</dt><dd>{{ selectedTask.attempts }} / {{ selectedTask.maxAttempts }}</dd></div>
            <div><dt>Escalonamento</dt><dd>{{ selectedTask.escalationLevel || 'Nenhum' }}</dd></div>
            <div v-if="selectedTask.encounterId"><dt>Atendimento</dt><dd>{{ shortId(selectedTask.encounterId) }}</dd></div>
            <div v-if="selectedTask.patientId"><dt>Paciente</dt><dd>{{ shortId(selectedTask.patientId) }}</dd></div>
          </dl>
          <DsAlert v-if="selectedTask.lastError" variant="warning">
            Última falha: {{ selectedTask.lastError }}
          </DsAlert>
          <div v-if="canCancel(selectedTask)" class="workflow-task-detail__cancel">
            <DsInput
              id="workflow-task-cancel-reason"
              v-model="cancelReason"
              label="Motivo do cancelamento"
              placeholder="Explique por que a pendência não será executada"
            />
            <DsButton
              variant="danger"
              :loading="pendingAction === `cancel:${selectedTask.id}`"
              :disabled="Boolean(pendingAction) || loading || loadFailed || cancelReason.trim().length < 3"
              @click="runAction('cancel', selectedTask)"
            >
              Cancelar tarefa
            </DsButton>
          </div>
          <div class="workflow-task-detail__actions">
            <DsButton
              v-if="canAcknowledge(selectedTask)"
              variant="primary"
              :loading="pendingAction === `ack:${selectedTask.id}`"
              :disabled="Boolean(pendingAction) || loading || loadFailed"
              @click="runAction('acknowledge', selectedTask)"
            >
              Reconhecer
            </DsButton>
            <DsButton
              v-if="canComplete(selectedTask)"
              variant="success"
              :loading="pendingAction === `complete:${selectedTask.id}`"
              :disabled="Boolean(pendingAction) || loading || loadFailed"
              @click="runAction('complete', selectedTask)"
            >
              Concluir
            </DsButton>
            <DsButton
              v-if="selectedTask.status === 'dlq'"
              variant="danger"
              :loading="pendingAction === `replay:${selectedTask.id}`"
              :disabled="Boolean(pendingAction) || loading || loadFailed"
              @click="runAction('replay', selectedTask)"
            >
              Reprocessar
            </DsButton>
          </div>
        </template>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import EmptyState from '@/components/EmptyState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import {
  workflowTaskService,
  type WorkflowTaskPriority,
  type WorkflowTaskRecord,
  type WorkflowTaskStatus
} from '@/services/workflowTasks';
import { formatDateTime } from '@/utils/labels';
import type { DataTableColumn } from '@/components/DataTable.vue';

const statusOptions: readonly WorkflowTaskStatus[] = [
  'pending',
  'processing',
  'retrying',
  'acknowledged',
  'completed',
  'cancelled',
  'dlq'
];

const columns: readonly DataTableColumn[] = [
  { key: 'title', label: 'Tarefa' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'dueAt', label: 'Vencimento' },
  { key: 'patientId', label: 'Paciente' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const tasks = ref<WorkflowTaskRecord[]>([]);
const selectedTask = ref<WorkflowTaskRecord | null>(null);
const statusFilter = ref<WorkflowTaskStatus | ''>('');
const taskTypeFilter = ref('');
const cancelReason = ref('');
const loading = ref(false);
const loadFailed = ref(false);
const error = ref('');
const successMessage = ref('');
const pendingAction = ref('');
let loadSequence = 0;

const overdueCount = computed(() => tasks.value.filter(isOverdue).length);
const criticalCount = computed(() => tasks.value.filter((task) => task.priority === 'critical').length);
const escalatedCount = computed(() => tasks.value.filter((task) => task.escalationLevel > 0).length);

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function statusLabel(status: WorkflowTaskStatus): string {
  return {
    pending: 'Pendente',
    processing: 'Em processamento',
    retrying: 'Em nova tentativa',
    acknowledged: 'Reconhecida',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    dlq: 'Revisão necessária'
  }[status];
}

function statusVariant(status: WorkflowTaskStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'neutral';
  if (status === 'dlq') return 'danger';
  if (status === 'processing' || status === 'retrying') return 'info';
  return 'warning';
}

function priorityLabel(priority: WorkflowTaskPriority): string {
  return { low: 'Baixa', normal: 'Normal', high: 'Alta', critical: 'Crítica' }[priority];
}

function priorityVariant(priority: WorkflowTaskPriority): 'success' | 'warning' | 'danger' | 'neutral' {
  if (priority === 'critical') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'success';
  return 'neutral';
}

function isOverdue(task: WorkflowTaskRecord): boolean {
  return !['completed', 'cancelled'].includes(task.status) && Date.parse(task.dueAt) < Date.now();
}

function canAcknowledge(task: WorkflowTaskRecord): boolean {
  return task.status === 'pending' || task.status === 'retrying';
}

function canComplete(task: WorkflowTaskRecord): boolean {
  return task.status === 'pending' || task.status === 'acknowledged' || task.status === 'retrying';
}

function canCancel(task: WorkflowTaskRecord): boolean {
  return !['completed', 'cancelled', 'processing'].includes(task.status);
}

function selectTask(task: WorkflowTaskRecord): void {
  selectedTask.value = task;
  cancelReason.value = '';
}

async function loadData(): Promise<void> {
  const sequence = ++loadSequence;
  loading.value = true;
  error.value = '';
  try {
    const result = await workflowTaskService.list({
      status: statusFilter.value || undefined,
      taskType: taskTypeFilter.value.trim() || undefined,
      limit: 200
    });
    if (sequence !== loadSequence) return;
    loadFailed.value = false;
    tasks.value = result;
    if (selectedTask.value) {
      selectedTask.value = result.find((task) => task.id === selectedTask.value?.id) ?? null;
    }
  } catch (cause) {
    if (sequence !== loadSequence) return;
    loadFailed.value = true;
    tasks.value = [];
    selectedTask.value = null;
    error.value = cause instanceof Error ? cause.message : 'Não foi possível carregar a fila clínica.';
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

function clearFilters(): void {
  statusFilter.value = '';
  taskTypeFilter.value = '';
  void loadData();
}

async function runAction(
  action: 'acknowledge' | 'complete' | 'cancel' | 'replay',
  task: WorkflowTaskRecord
): Promise<void> {
  pendingAction.value = `${action === 'acknowledge' ? 'ack' : action}:${task.id}`;
  error.value = '';
  try {
    const updated = action === 'acknowledge'
      ? await workflowTaskService.acknowledge(task.id)
      : action === 'complete'
        ? await workflowTaskService.complete(task.id)
        : action === 'cancel'
          ? await workflowTaskService.cancel(task.id, cancelReason.value.trim())
          : await workflowTaskService.replay(task.id, task.revision);
    selectedTask.value = updated;
    successMessage.value = `Tarefa ${statusLabel(updated.status).toLocaleLowerCase()} com sucesso.`;
    cancelReason.value = '';
    await loadData();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar a tarefa.';
  } finally {
    pendingAction.value = '';
  }
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.workflow-tasks-page {
  display: grid;
  gap: 1.25rem;
}

.workflow-tasks-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.workflow-stat {
  display: grid;
  gap: 0.25rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--color-border, #d9e3e8);
  border-radius: 0.75rem;
  background: var(--color-surface, #fff);
}

.workflow-stat strong {
  color: var(--color-text, #17313b);
  font-size: 1.6rem;
  line-height: 1;
}

.workflow-stat__label {
  color: var(--color-text-muted, #58727c);
  font-size: 0.8rem;
  font-weight: 600;
}

.workflow-stat--warning { border-color: color-mix(in srgb, #c98918 36%, var(--color-border, #d9e3e8)); }
.workflow-stat--critical { border-color: color-mix(in srgb, #b83a3a 36%, var(--color-border, #d9e3e8)); }

.workflow-tasks-filters {
  display: grid;
  grid-template-columns: minmax(12rem, 0.8fr) minmax(16rem, 1.2fr) auto;
  align-items: end;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #d9e3e8);
  border-radius: 0.75rem;
  background: var(--color-surface-subtle, #f7fafb);
}

.workflow-tasks-filters__actions,
.workflow-task-actions,
.workflow-task-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.workflow-tasks-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(18rem, 0.85fr);
  align-items: start;
  gap: 1rem;
}

.workflow-task-title {
  display: grid;
  gap: 0.2rem;
  min-width: 12rem;
}

.workflow-task-title small,
.workflow-task-detail__eyebrow {
  color: var(--color-text-muted, #58727c);
  font-size: 0.75rem;
}

.workflow-task-due--overdue {
  color: var(--color-danger, #a52727);
  font-weight: 700;
}

.workflow-task-detail__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.workflow-task-detail__heading h2 {
  margin: 0.25rem 0 0;
  font-size: 1.15rem;
}

.workflow-task-detail__description {
  margin: 1rem 0;
  color: var(--color-text-muted, #58727c);
  line-height: 1.55;
}

.workflow-task-detail__facts {
  display: grid;
  gap: 0.65rem;
  margin: 1rem 0;
}

.workflow-task-detail__facts div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--color-border-subtle, #edf2f4);
  padding-bottom: 0.55rem;
}

.workflow-task-detail__facts dt { color: var(--color-text-muted, #58727c); }
.workflow-task-detail__facts dd { margin: 0; text-align: right; font-weight: 600; }

.workflow-task-detail__cancel {
  display: grid;
  gap: 0.65rem;
  margin: 1rem 0;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-subtle, #edf2f4);
}

@media (max-width: 980px) {
  .workflow-tasks-layout { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .workflow-tasks-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .workflow-tasks-filters { grid-template-columns: 1fr; }
  .workflow-tasks-filters__actions > * { flex: 1 1 10rem; }
}
</style>
