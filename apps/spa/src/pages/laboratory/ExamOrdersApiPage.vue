<template>
  <div class="exam-queue-page">
    <AppPageHeader :breadcrumb-items="headerBreadcrumbItems">
      <template #title>Esteira de Exames</template>
      <template #subtitle>
        Atendimento > Atendimentos > Esteira de Exames. Fluxo Vetus: solicitação, coleta, análise, laudo e entrega
      </template>
      <template #actions>
        <DsButton tag="a" :to="newDiagnosticPath" variant="primary" icon="+">Novo Pedido</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="loadOrders">
          {{ loading ? 'Atualizando...' : 'Atualizar' }}
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="notice" :variant="notice.variant" dismissible @dismiss="notice = null">
      {{ notice.message }}
    </DsAlert>

    <section class="workflow-lanes" aria-label="Resumo da esteira de exames">
      <article v-for="lane in workflowLanes" :key="lane.key" class="workflow-lane">
        <span class="workflow-lane__label">{{ lane.label }}</span>
        <strong>{{ lane.count }}</strong>
      </article>
    </section>

    <DsCard title="Filtrar por...">
      <div class="filter-grid">
        <DsInput v-model="filters.status" label="Status" type="select">
          <option value="">Todos</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </DsInput>
        <DsInput v-model="filters.client" label="Cliente" placeholder="Nome, CPF ou ID do cliente" />
        <DsInput v-model="filters.patient" label="Animal" placeholder="Nome ou ID do animal" />
        <DsInput v-model="filters.encounter" label="Atendimento" placeholder="ID do atendimento" />
        <DsInput v-model="filters.exam" label="Exame" placeholder="Hemograma, urina, bioquímico..." />
      </div>
      <div class="filter-actions">
        <DsButton variant="secondary" @click="clearFilters">Todos</DsButton>
        <DsButton variant="primary">Pesquisar</DsButton>
      </div>
    </DsCard>

    <section class="page-grid">
      <DsCard title="Encaminhar solicitação">
        <div class="form-grid">
          <DsInput v-model="form.encounterId" label="Atendimento" placeholder="enc_..." />
          <DsInput v-model="form.patientId" label="Animal" placeholder="patient_..." />
          <DsInput v-model="form.examName" label="Exame" placeholder="Hemograma completo" />
          <DsInput v-model="form.examCode" label="Código" placeholder="HEMO001" />
          <DsInput
            v-model="form.notes"
            class="form-grid__wide"
            label="Observações"
            type="textarea"
            placeholder="Material, prioridade, coleta ou orientação clínica"
          />
        </div>
        <DsButton variant="primary" :loading="saving" @click="createOrder">
          {{ saving ? 'Encaminhando...' : 'Encaminhar para esteira' }}
        </DsButton>
      </DsCard>

      <DsCard title="Fila operacional">
        <DataTable
          :columns="columns"
          :rows="filteredItems"
          :loading="loading"
          empty-icon="🧪"
          empty-title="Nenhum exame nesta esteira"
          empty-description="Os exames solicitados aparecerão aqui para coleta, análise, laudo e entrega."
          variant="hoverable"
          compact
        >
          <template #cell-requestedAt="{ row }">
            {{ formatDate((row as ExamOrderRecord).requestedAt) }}
          </template>
          <template #cell-client="{ row }">
            {{ clientLabel(row as ExamOrderRecord) }}
          </template>
          <template #cell-patient="{ row }">
            {{ patientLabel(row as ExamOrderRecord) }}
          </template>
          <template #cell-priority="{ row }">
            {{ priorityLabel((row as ExamOrderRecord).priority) }}
          </template>
          <template #cell-status="{ row }">
            <DsBadge :variant="statusVariant(workflowStatus(row as ExamOrderRecord))" size="sm">
              {{ statusLabel(workflowStatus(row as ExamOrderRecord)) }}
            </DsBadge>
          </template>
          <template #cell-collection="{ row }">
            {{ collectionLabel(row as ExamOrderRecord) }}
          </template>
          <template #cell-report="{ row }">
            {{ reportLabel(row as ExamOrderRecord) }}
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <DsButton
                v-if="workflowStatus(row as ExamOrderRecord) === 'requested'"
                tag="a"
                :to="diagnosticPath(row as ExamOrderRecord)"
                size="sm"
                variant="secondary"
              >
                Registrar coleta
              </DsButton>
              <DsButton
                v-else-if="workflowStatus(row as ExamOrderRecord) === 'collected'"
                tag="a"
                :to="resultPath(row as ExamOrderRecord)"
                size="sm"
                variant="secondary"
              >
                Registrar resultado
              </DsButton>
              <DsButton v-else tag="a" :to="resultPath(row as ExamOrderRecord)" size="sm" variant="secondary">
                Emitir laudo
              </DsButton>
            </div>
          </template>
        </DataTable>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { examApiService } from '@/services/examApi';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { ExamOrderRecord } from '@/types/examApi';

type WorkflowStatus = 'requested' | 'collected' | 'in_analysis' | 'reported' | 'delivered' | 'cancelled';

const statusOptions: { value: WorkflowStatus; label: string }[] = [
  { value: 'requested', label: 'Solicitado' },
  { value: 'collected', label: 'Coletado' },
  { value: 'in_analysis', label: 'Em Análise' },
  { value: 'reported', label: 'Laudado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' }
];

const columns: DataTableColumn[] = [
  { key: 'id', label: 'ID Exame' },
  { key: 'requestedAt', label: 'Solicitado em' },
  { key: 'client', label: 'Cliente' },
  { key: 'patient', label: 'Animal' },
  { key: 'encounterId', label: 'Atendimento' },
  { key: 'examName', label: 'Exame' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'status', label: 'Status' },
  { key: 'collection', label: 'Coleta' },
  { key: 'report', label: 'Laudo' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const items = ref<ExamOrderRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const form = ref({
  encounterId: '',
  patientId: '',
  examName: '',
  examCode: '',
  notes: ''
});
const filters = ref({
  status: '',
  client: '',
  patient: '',
  encounter: '',
  exam: ''
});
const workflowContext = readWorkflowContext();
const headerBreadcrumbItems = [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento' },
  { key: 'attendances', label: 'Atendimentos' },
  { key: 'exam-queue', label: 'Esteira de Exames', current: true }
];

const filteredItems = computed(() => {
  return items.value.filter((item) => {
    const status = workflowStatus(item);
    const searchableClient = clientLabel(item).toLowerCase();
    const searchablePatient = patientLabel(item).toLowerCase();
    const searchableEncounter = item.encounterId.toLowerCase();
    const searchableExam = `${item.examName} ${item.examCode ?? ''} ${item.category ?? ''}`.toLowerCase();

    return (
      (!filters.value.status || status === filters.value.status) &&
      matches(searchableClient, filters.value.client) &&
      matches(searchablePatient, filters.value.patient) &&
      matches(searchableEncounter, filters.value.encounter) &&
      matches(searchableExam, filters.value.exam)
    );
  });
});

const workflowLanes = computed(() => [
  { key: 'requested', label: 'Solicitado', count: countByStatus('requested') },
  { key: 'collected', label: 'Coletado', count: countByStatus('collected') },
  { key: 'in_analysis', label: 'Em Análise', count: countByStatus('in_analysis') },
  { key: 'reported', label: 'Laudado', count: countByStatus('reported') },
  { key: 'delivered', label: 'Entregue', count: countByStatus('delivered') }
]);

const newDiagnosticPath = computed(() => {
  const params = new URLSearchParams();
  if (workflowContext.encounterId) params.set('encounterId', workflowContext.encounterId);
  if (workflowContext.patientId) params.set('patientId', workflowContext.patientId);
  if (workflowContext.ownerId) params.set('ownerId', workflowContext.ownerId);
  const query = params.toString();
  return query ? `/diagnostics?${query}` : '/diagnostics';
});

async function loadOrders() {
  loading.value = true;
  try {
    items.value = await examApiService.listOrders(workflowContext.encounterId || undefined);
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao carregar a esteira de exames.'
    };
  } finally {
    loading.value = false;
  }
}

async function createOrder() {
  if (!form.value.encounterId.trim() || !form.value.patientId.trim() || !form.value.examName.trim()) return;
  saving.value = true;
  try {
    const created = await examApiService.createOrder({
      encounterId: form.value.encounterId.trim(),
      patientId: form.value.patientId.trim(),
      examName: form.value.examName.trim(),
      examCode: form.value.examCode.trim() || undefined,
      notes: form.value.notes.trim() || undefined
    });
    items.value = [created, ...items.value];
    form.value = {
      encounterId: workflowContext.encounterId,
      patientId: workflowContext.patientId,
      examName: '',
      examCode: '',
      notes: workflowContext.encounterId ? `Atendimento ${workflowContext.encounterId}` : ''
    };
    notice.value = { variant: 'success', message: 'Pedido encaminhado para a esteira de exames.' };
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao encaminhar pedido de exame.'
    };
  } finally {
    saving.value = false;
  }
}

function clearFilters() {
  filters.value = {
    status: '',
    client: '',
    patient: '',
    encounter: '',
    exam: ''
  };
}

function countByStatus(status: WorkflowStatus): number {
  return items.value.filter((item) => workflowStatus(item) === status).length;
}

function workflowStatus(item: ExamOrderRecord): WorkflowStatus {
  const status = String(item.status);
  if (status === 'completed' || status === 'released' || status === 'reported') return 'reported';
  if (status === 'delivered') return 'delivered';
  if (status === 'processing' || status === 'in_analysis') return 'in_analysis';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'collected') return 'collected';
  return 'requested';
}

function statusLabel(status: WorkflowStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function statusVariant(status: WorkflowStatus): 'default' | 'warning' | 'success' | 'danger' | 'info' {
  switch (status) {
    case 'requested':
      return 'warning';
    case 'collected':
      return 'info';
    case 'in_analysis':
      return 'default';
    case 'reported':
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function priorityLabel(priority: string): string {
  const normalized = priority?.toLowerCase();
  if (normalized === 'urgent' || normalized === 'high') return 'Urgente';
  if (normalized === 'low') return 'Baixa';
  return 'Normal';
}

function collectionLabel(item: ExamOrderRecord): string {
  return workflowStatus(item) === 'requested' ? 'Aguardando coleta' : 'Coleta registrada';
}

function reportLabel(item: ExamOrderRecord): string {
  const status = workflowStatus(item);
  if (status === 'reported' || status === 'delivered') return 'Laudo disponível';
  if (status === 'cancelled') return 'Cancelado';
  return 'Pendente';
}

function clientLabel(item: ExamOrderRecord): string {
  return workflowContext.ownerId || item.accountId || 'Não informado';
}

function patientLabel(item: ExamOrderRecord): string {
  return item.patientId || workflowContext.patientId || 'Não informado';
}

function diagnosticPath(item: ExamOrderRecord): string {
  const params = new URLSearchParams({
    order: item.id,
    encounterId: item.encounterId,
    patientId: item.patientId
  });
  if (workflowContext.ownerId) params.set('ownerId', workflowContext.ownerId);
  return `/diagnostics?${params.toString()}`;
}

function resultPath(item: ExamOrderRecord): string {
  return `/exam-results?order=${encodeURIComponent(item.id)}`;
}

function matches(value: string, filter: string): boolean {
  return !filter.trim() || value.includes(filter.trim().toLowerCase());
}

function formatDate(value: string): string {
  if (!value) return 'Não informado';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  form.value.encounterId = workflowContext.encounterId;
  form.value.patientId = workflowContext.patientId;
  if (workflowContext.encounterId && !form.value.notes) {
    form.value.notes = `Atendimento ${workflowContext.encounterId}`;
  }
  void loadOrders();
});

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
</script>

<style scoped>
.exam-queue-page,
.page-grid,
.form-grid {
  display: grid;
  gap: 16px;
}

.workflow-lanes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.workflow-lane {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 14px 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.workflow-lane__label {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
}

.workflow-lane strong {
  font-size: 24px;
  line-height: 1;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.page-grid {
  grid-template-columns: minmax(280px, 0.34fr) minmax(520px, 1fr);
  align-items: start;
}

.form-grid {
  margin-bottom: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
}
</style>
