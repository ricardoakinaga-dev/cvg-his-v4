<template>
  <div class="laboratory-orders-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Atendimentos', 'Exames']"
      title="Exames"
      subtitle="Pedidos laboratoriais por cliente, animal e data"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/diagnostics" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="summary-grid" aria-label="Resumo dos exames">
      <DsStatCard :label="`${orders.length} exame(s)`" value="" icon="🧪" />
      <DsStatCard :label="`${requestedCount} aguardando coleta`" value="" icon="📋" />
      <DsStatCard :label="`${collectedCount} coletado(s)`" value="" icon="🩸" />
      <DsStatCard :label="`${resultedCount} liberado(s)`" value="" icon="✅" />
    </section>

    <section class="filter-panel" aria-label="Filtros de exames">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Cliente</span>
          <input v-model="draftFilters.client" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Animal</span>
          <input v-model="draftFilters.animal" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Data</span>
          <input v-model="draftFilters.date" type="date" />
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredOrders"
      :loading="loading"
      empty-icon="🧪"
      empty-title="Nenhum registro encontrado"
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <span class="order-id">{{ shortId((row as LaboratoryOrderRow).id) }}</span>
      </template>
      <template #cell-clientName="{ row }">
        {{ (row as LaboratoryOrderRow).clientName }}
      </template>
      <template #cell-animalName="{ row }">
        {{ (row as LaboratoryOrderRow).animalName }}
      </template>
      <template #cell-createdAt="{ row }">
        {{ formatDate((row as LaboratoryOrderRow).createdAt) }}
      </template>
      <template #cell-status="{ row }">
        <span :class="`exam-status exam-status--${(row as LaboratoryOrderRow).status}`">
          {{ statusLabel((row as LaboratoryOrderRow).status) }}
        </span>
      </template>
      <template #cell-stage="{ row }">
        <div class="exam-stage">
          <strong>{{ stageLabel(row as LaboratoryOrderRow) }}</strong>
          <span>{{ stageHint(row as LaboratoryOrderRow) }}</span>
        </div>
      </template>
      <template #cell-patientLink="{ row }">
        <div class="exam-links">
          <a :href="`/patients/${(row as LaboratoryOrderRow).patientId}`">Paciente</a>
          <a :href="`/medical-records/${(row as LaboratoryOrderRow).encounterId}`">Prontuário</a>
        </div>
      </template>
      <template #cell-actions="{ row }">
        <div class="exam-actions">
          <DsButton
            v-if="(row as LaboratoryOrderRow).status === 'requested'"
            size="sm"
            variant="primary"
            :loading="collectingId === (row as LaboratoryOrderRow).id"
            :disabled="collectingId === (row as LaboratoryOrderRow).id"
            @click="collectOrder(row as LaboratoryOrderRow)"
          >
            {{ collectingId === (row as LaboratoryOrderRow).id ? 'Coletando...' : 'Coletar' }}
          </DsButton>
          <DsButton
            v-if="(row as LaboratoryOrderRow).status === 'collected' && !isCanonicalOrder(row as LaboratoryOrderRow)"
            size="sm"
            variant="primary"
            @click="openResultModal(row as LaboratoryOrderRow)"
          >
            Liberar resultado
          </DsButton>
          <DsButton
            v-if="(row as LaboratoryOrderRow).status === 'collected' && isCanonicalOrder(row as LaboratoryOrderRow)"
            size="sm"
            variant="primary"
            :loading="analysisId === (row as LaboratoryOrderRow).id"
            :disabled="analysisId === (row as LaboratoryOrderRow).id"
            @click="startAnalysis(row as LaboratoryOrderRow)"
          >
            {{ analysisId === (row as LaboratoryOrderRow).id ? 'Iniciando...' : 'Iniciar análise' }}
          </DsButton>
          <DsButton
            v-if="(row as LaboratoryOrderRow).status === 'in_analysis'"
            size="sm"
            variant="primary"
            @click="openResultModal(row as LaboratoryOrderRow)"
          >
            Reportar resultado
          </DsButton>
          <DsButton
            v-if="(row as LaboratoryOrderRow).status === 'reported'"
            size="sm"
            variant="primary"
            :loading="deliveringId === (row as LaboratoryOrderRow).id"
            :disabled="deliveringId === (row as LaboratoryOrderRow).id"
            @click="deliverOrder(row as LaboratoryOrderRow)"
          >
            {{ deliveringId === (row as LaboratoryOrderRow).id ? 'Entregando...' : 'Entregar' }}
          </DsButton>
          <DsButton
            v-if="['in_analysis', 'reported', 'delivered'].includes((row as LaboratoryOrderRow).status)"
            size="sm"
            variant="secondary"
            @click="recollectOrder(row as LaboratoryOrderRow)"
          >
            Recoletar
          </DsButton>
          <DsButton
            tag="a"
            :to="`/diagnostics?order=${(row as LaboratoryOrderRow).id}`"
            size="sm"
            variant="secondary"
          >
            Abrir
          </DsButton>
        </div>
      </template>
    </DataTable>

    <DsModal
      :open="Boolean(resultOrder)"
      :title="resultOrder?.status === 'in_analysis' ? 'Reportar resultado' : 'Liberar resultado'"
      size="sm"
      @close="closeResultModal"
    >
      <div class="result-form">
        <p v-if="resultOrder">
          {{ resultOrder.examType }} · {{ resultOrder.animalName }} · {{ resultOrder.clientName }}
        </p>
        <label class="filter-field" for="result-summary">
          <span>Resumo do resultado *</span>
          <textarea
            id="result-summary"
            v-model="resultSummary"
            rows="5"
            placeholder="Informe achados, interpretação ou referência do laudo liberado"
          />
        </label>
        <p class="filter-field">
          <span>Responsável técnico</span>
          <strong>Profissional autenticado (assinatura automática)</strong>
        </p>
      </div>
      <template #footer>
        <DsButton variant="ghost" @click="closeResultModal">Cancelar</DsButton>
        <DsButton
          variant="primary"
          :loading="resultSubmitting"
          :disabled="!resultSummary.trim() || resultSubmitting"
          @click="submitResult"
        >
          {{ resultSubmitting ? 'Salvando...' : resultOrder?.status === 'in_analysis' ? 'Reportar resultado' : 'Liberar resultado' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { apiRequest } from '@/services/api';
import { laboratoryService } from '@/services/laboratory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';

type LaboratoryWorkflowStatus =
  | 'requested'
  | 'collected'
  | 'in_analysis'
  | 'reported'
  | 'delivered'
  | 'resulted'
  | 'cancelled';

type LaboratoryWorkflowOrder = Omit<DiagnosticOrderSummary, 'status'> & {
  status: LaboratoryWorkflowStatus;
  legacyStatus?: 'resulted';
  collectionAttempt?: number;
  analysisStartedAt?: string;
  analysisStartedByUserId?: string;
  reportedAt?: string;
  reportedByUserId?: string;
  deliveredAt?: string;
  deliveredByUserId?: string;
  deliveryChannel?: string;
  recollectionReason?: string;
  history?: readonly {
    eventType: string;
    attempt: number;
  }[];
  workflowVersion?: 2;
};

interface LaboratoryOrderRow extends LaboratoryWorkflowOrder {
  clientName: string;
  animalName: string;
}

const orders = ref<LaboratoryWorkflowOrder[]>([]);
const patients = ref<PatientSummary[]>([]);
const owners = ref<OwnerSummary[]>([]);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const collectingId = ref<string | null>(null);
const analysisId = ref<string | null>(null);
const deliveringId = ref<string | null>(null);
const resultOrder = ref<LaboratoryOrderRow | null>(null);
const resultSummary = ref('');
const resultSubmitting = ref(false);
const draftFilters = reactive({
  client: '',
  animal: '',
  date: ''
});
const appliedFilters = reactive({
  client: '',
  animal: '',
  date: ''
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id', width: '12%' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'animalName', label: 'Animal' },
  { key: 'createdAt', label: 'Data', width: '12%' },
  { key: 'status', label: 'Status', width: '14%' },
  { key: 'stage', label: 'Esteira', width: '20%' },
  { key: 'patientLink', label: 'Vínculo', width: '12%' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col', width: '220px' }
];

const ownerById = computed(() => new Map(owners.value.map((owner) => [owner.id, owner])));
const patientById = computed(() => new Map(patients.value.map((patient) => [patient.id, patient])));

const decoratedOrders = computed<LaboratoryOrderRow[]>(() =>
  orders.value.map((order) => {
    const patient = patientById.value.get(order.patientId);
    const owner = patient ? ownerById.value.get(patient.primaryOwnerId) : undefined;
    return {
      ...order,
      clientName: owner?.fullName ?? 'Cliente não identificado',
      animalName: patient?.name ?? order.patientId
    };
  })
);

const filteredOrders = computed(() => {
  const client = normalizeSearch(appliedFilters.client);
  const animal = normalizeSearch(appliedFilters.animal);
  const date = appliedFilters.date;

  return decoratedOrders.value.filter((order) => {
    if (client && !normalizeSearch(order.clientName).includes(client)) return false;
    if (animal && !normalizeSearch(order.animalName).includes(animal) && !normalizeSearch(order.patientId).includes(animal)) {
      return false;
    }
    if (date && order.createdAt.slice(0, 10) !== date) return false;
    return true;
  });
});

const requestedCount = computed(() => orders.value.filter((item) => item.status === 'requested').length);
const collectedCount = computed(() => orders.value.filter((item) => item.status === 'collected').length);
const resultedCount = computed(() => orders.value.filter((item) =>
  item.status === 'reported' || item.status === 'delivered' || item.status === 'resulted'
).length);

function normalizeSearch(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}...` : id;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function applyFilters() {
  appliedFilters.client = draftFilters.client;
  appliedFilters.animal = draftFilters.animal;
  appliedFilters.date = draftFilters.date;
}

function isCanonicalOrder(order: LaboratoryOrderRow): boolean {
  return order.workflowVersion === 2;
}

function statusLabel(status: LaboratoryWorkflowStatus): string {
  return {
    requested: 'Aguardando coleta',
    collected: 'Coletado',
    in_analysis: 'Em análise',
    reported: 'Laudo reportado',
    delivered: 'Entregue',
    // Kept for old API projections.
    resulted: 'Resultado liberado',
    cancelled: 'Cancelado'
  }[status];
}

function stageLabel(order: LaboratoryOrderRow): string {
  return {
    requested: '1. Pedido recebido',
    collected: isCanonicalOrder(order) ? '2. Material coletado' : '2. Aguardando resultado',
    in_analysis: '3. Em análise técnica',
    reported: '4. Laudo reportado',
    delivered: '5. Entregue ao solicitante',
    // Kept for old API projections.
    resulted: '3. Liberado ao prontuário',
    cancelled: 'Cancelado'
  }[order.status];
}

function stageHint(order: LaboratoryOrderRow): string {
  if (order.status === 'requested') return 'Coleta pendente';
  if (order.status === 'collected') {
    const attempt = order.collectionAttempt ? ` · Tentativa ${order.collectionAttempt}` : '';
    return order.collectedAt
      ? `Coletado em ${formatDate(order.collectedAt)}${attempt}`
      : `Material coletado${attempt}`;
  }
  if (order.status === 'in_analysis') {
    const actor = order.analysisStartedByUserId ? ` por ${order.analysisStartedByUserId}` : '';
    const attempt = order.collectionAttempt ? ` · Tentativa ${order.collectionAttempt}` : '';
    return `Análise iniciada${actor}${attempt}`;
  }
  if (order.status === 'reported') {
    const releaseActor = order.signedByUserId ?? order.reportedByUserId;
    const releaseDate = order.reportedAt ?? order.updatedAt;
    return releaseActor
      ? `Reportado por ${releaseActor} em ${formatDate(releaseDate)}`
      : order.resultSummary ?? 'Resultado registrado';
  }
  if (order.status === 'delivered') {
    const deliveryDate = order.deliveredAt ?? order.updatedAt;
    return order.deliveryChannel
      ? `Entregue via ${order.deliveryChannel} em ${formatDate(deliveryDate)}`
      : 'Laudo entregue';
  }
  if (order.status === 'resulted') {
    const releaseActor = order.signedByUserId ?? order.releasedByUserId;
    const releaseDate = order.resultedAt ?? order.updatedAt;
    return releaseActor
      ? `Liberado por ${releaseActor} em ${formatDate(releaseDate)}`
      : order.resultSummary ?? 'Resultado registrado';
  }
  return 'Fluxo encerrado';
}

function replaceOrder(updated: DiagnosticOrderSummary | LaboratoryWorkflowOrder) {
  orders.value = orders.value.map((order) =>
    order.id === updated.id ? (updated as unknown as LaboratoryWorkflowOrder) : order
  );
}

type CanonicalLaboratoryTransitionPayload =
  | { status: 'in_analysis' }
  | { status: 'reported'; resultSummary: string }
  | { status: 'delivered'; deliveryChannel: string };

async function requestCanonicalTransition(
  orderId: string,
  payload: CanonicalLaboratoryTransitionPayload
): Promise<LaboratoryWorkflowOrder> {
  return apiRequest<LaboratoryWorkflowOrder>(
    `/laboratory/orders/${encodeURIComponent(orderId)}/result`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

async function collectOrder(order: LaboratoryOrderRow) {
  collectingId.value = order.id;
  error.value = '';
  successMessage.value = '';

  try {
    const updated = await laboratoryService.recordResult(order.id, {
      status: 'collected',
      collectedByUserId: 'lab-ui'
    });
    replaceOrder(updated);
    successMessage.value = 'Coleta registrada com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar coleta';
  } finally {
    collectingId.value = null;
  }
}

async function startAnalysis(order: LaboratoryOrderRow) {
  analysisId.value = order.id;
  error.value = '';
  successMessage.value = '';

  try {
    const updated = await requestCanonicalTransition(order.id, { status: 'in_analysis' });
    replaceOrder(updated);
    successMessage.value = 'Análise iniciada com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao iniciar análise';
  } finally {
    analysisId.value = null;
  }
}

function openResultModal(order: LaboratoryOrderRow) {
  resultOrder.value = order;
  resultSummary.value = order.resultSummary ?? '';
  error.value = '';
  successMessage.value = '';
}

function closeResultModal() {
  resultOrder.value = null;
  resultSummary.value = '';
}

async function submitResult() {
  if (!resultOrder.value || !resultSummary.value.trim()) return;

  resultSubmitting.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const updated = resultOrder.value.status === 'in_analysis'
      ? await requestCanonicalTransition(resultOrder.value.id, {
        status: 'reported',
        resultSummary: resultSummary.value.trim()
      })
      : await laboratoryService.recordResult(resultOrder.value.id, {
        status: 'resulted',
        resultSummary: resultSummary.value.trim()
      });
    replaceOrder(updated);
    successMessage.value = resultOrder.value.status === 'in_analysis'
      ? 'Resultado reportado com sucesso.'
      : 'Resultado liberado com sucesso.';
    closeResultModal();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao liberar resultado';
  } finally {
    resultSubmitting.value = false;
  }
}

async function deliverOrder(order: LaboratoryOrderRow) {
  deliveringId.value = order.id;
  error.value = '';
  successMessage.value = '';

  try {
    const updated = await apiRequest<LaboratoryWorkflowOrder>(
      `/laboratory/orders/${encodeURIComponent(order.id)}/deliver`,
      {
        method: 'POST',
        body: JSON.stringify({ deliveryChannel: 'portal' })
      }
    );
    replaceOrder(updated);
    successMessage.value = 'Laudo entregue com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao entregar laudo';
  } finally {
    deliveringId.value = null;
  }
}

async function recollectOrder(order: LaboratoryOrderRow) {
  const reason = typeof window === 'undefined'
    ? 'Nova coleta solicitada pelo laboratório'
    : window.prompt('Informe o motivo da recoleta', 'Amostra inadequada')?.trim();
  if (!reason) return;

  error.value = '';
  successMessage.value = '';

  try {
    const updated = await apiRequest<LaboratoryWorkflowOrder>(
      `/laboratory/orders/${encodeURIComponent(order.id)}/recollect`,
      {
        method: 'POST',
        body: JSON.stringify({ reason })
      }
    );
    replaceOrder(updated);
    successMessage.value = 'Recoleta registrada com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar recoleta';
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [ordersResult, patientsResult, ownersResult] = await Promise.allSettled([
      laboratoryService.listOrders({ date: appliedFilters.date || undefined }),
      patientService.list({ pageSize: 500 }),
      ownerService.list({ pageSize: 500 })
    ]);

    if (ordersResult.status === 'rejected') {
      throw ordersResult.reason;
    }

    orders.value = ordersResult.value.map(
      (order) => order as unknown as LaboratoryWorkflowOrder
    );
    patients.value = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
    owners.value = ownersResult.status === 'fulfilled' ? ownersResult.value : [];
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar exames';
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-orders-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
  align-items: end;
  gap: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.filter-field input {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.order-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.exam-status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
}

.exam-status--requested {
  background: #fef3c7;
  color: #92400e;
}

.exam-status--collected {
  background: #dbeafe;
  color: #1d4ed8;
}

.exam-status--in_analysis {
  background: #ede9fe;
  color: #6d28d9;
}

.exam-status--reported {
  background: #dcfce7;
  color: #166534;
}

.exam-status--delivered {
  background: #cffafe;
  color: #155e75;
}

.exam-status--resulted {
  background: #dcfce7;
  color: #166534;
}

.exam-status--cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.exam-stage,
.exam-links,
.exam-actions,
.result-form {
  display: grid;
  gap: 6px;
}

.exam-stage span,
.result-form p {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.exam-links a {
  color: var(--color-primary-700, #1d4ed8);
  font-weight: 700;
  text-decoration: none;
}

.exam-actions {
  grid-template-columns: repeat(auto-fit, minmax(92px, max-content));
  align-items: center;
}

.filter-field textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
  resize: vertical;
}

@media (max-width: 780px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
