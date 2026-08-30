<template>
  <div class="advance-payments-page">
    <AppPageHeader
      title="Pagamento Antecipado"
      :breadcrumbs="['Financeiro', 'Controles', 'Pagamento Antecipado']"
      subtitle="Recebimentos antecipados de clientes, saldo disponível e compensação futura"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="advance-summary-grid" aria-label="Resumo de pagamentos antecipados">
      <DsStatCard :label="`${filteredRows.length} lançamento(s)`" value="Total" />
      <DsStatCard :label="formatCurrencyCents(totalAmountCents)" value="Total" />
      <DsStatCard :label="formatCurrencyCents(totalCompensatedCents)" value="Compensado" />
      <DsStatCard
        :label="formatCurrencyCents(totalBalanceCents)"
        value="Saldo"
        :error="totalBalanceCents > 0 ? 'Compensação futura' : undefined"
      />
    </section>

    <section class="advance-actions" aria-label="Ações de pagamento antecipado">
      <DsButton variant="primary" @click="openIssueModal">Gerar Pagamento Antecipado</DsButton>
      <DsButton
        variant="secondary"
        :disabled="selectedIds.size !== 1"
        @click="openCompensationModal"
      >
        Compensar Selecionado
      </DsButton>
      <DsButton variant="secondary" tag="a" to="/owners">Clientes</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadAdvancePayments">Atualizar</DsButton>
    </section>

    <form class="advance-filters" aria-label="Filtros de pagamento antecipado" @submit.prevent="loadAdvancePayments">
      <DsInput
        id="advance-client"
        v-model="filters.search"
        label="Cliente"
        type="search"
        placeholder="Buscar por cliente ou documento"
      />
      <DsInput id="advance-issued-from" v-model="filters.issuedFrom" label="Emissão de" type="date" />
      <DsInput id="advance-issued-to" v-model="filters.issuedTo" label="Até" type="date" />
      <DsInput id="advance-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="available">Disponível</option>
        <option value="partially_compensated">Parcialmente compensado</option>
        <option value="compensated">Compensado</option>
      </DsInput>
      <div class="advance-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <p v-if="successMessage" class="advance-success" role="status">{{ successMessage }}</p>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="⏩"
      empty-title="Nenhum pagamento antecipado encontrado"
      empty-description="Os lançamentos aparecem somente quando o recebimento antecipado foi persistido no ledger financeiro."
      caption="Pagamentos antecipados"
      variant="hoverable"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :aria-label="`Selecionar ${advanceRow(row).client}`"
          :checked="selectedIds.has(advanceRow(row).id)"
          @change="toggleSelection(advanceRow(row).id)"
        />
      </template>
      <template #cell-client="{ row }">
        <strong>{{ advanceRow(row).client }}</strong>
        <small>{{ advanceRow(row).document }}</small>
      </template>
      <template #cell-issuedAt="{ row }">
        {{ formatDate(advanceRow(row).issuedAt) }}
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrencyCents(advanceRow(row).totalCents) }}
      </template>
      <template #cell-compensated="{ row }">
        {{ formatCurrencyCents(advanceRow(row).compensatedCents) }}
      </template>
      <template #cell-balance="{ row }">
        <strong>{{ formatCurrencyCents(advanceRow(row).balanceCents) }}</strong>
      </template>
      <template #cell-origin="{ row }">
        <span class="origin-cell">{{ advanceRow(row).origin }}</span>
        <small>{{ advanceRow(row).notes || 'Sem observações' }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="advanceStatusLabel(advanceRow(row).status)"
          :variant="advanceStatusVariant(advanceRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="`/owners/${advanceRow(row).ownerId}`" class="open-link">Abrir</RouterLink>
      </template>
    </DataTable>

    <DsModal
      :open="issueModalOpen"
      :teleport="false"
      title="Gerar pagamento antecipado"
      size="md"
      @close="closeIssueModal"
    >
      <DsAlert v-if="issueError" variant="danger">{{ issueError }}</DsAlert>
      <p class="modal-helper">
        Registre o fato financeiro em centavos de BRL. A compensação futura será lançada separadamente e não altera este registro.
      </p>
      <DsInput id="advance-owner" v-model="issueForm.ownerId" type="select" label="Cliente" required>
        <option value="" disabled>Selecione um cliente</option>
        <option v-for="owner in ownerOptions" :key="owner.id" :value="owner.id">
          {{ owner.fullName }}{{ owner.documentId ? ` · ${owner.documentId}` : '' }}
        </option>
      </DsInput>
      <DsInput
        id="advance-amount-cents"
        v-model.number="issueForm.amountCents"
        type="number"
        label="Valor (centavos de BRL)"
        min="1"
        step="1"
        required
      />
      <p class="modal-amount-preview">Valor exibido: {{ formatCurrencyCents(issueForm.amountCents || 0) }}</p>
      <DsInput id="advance-source-id" v-model="issueForm.sourceId" label="Identificador da origem" placeholder="Ex.: recibo-caixa-2026-0001" required />
      <DsInput id="advance-reference" v-model="issueForm.reference" label="Referência" placeholder="Ex.: Caixa 1" />
      <DsInput id="advance-notes" v-model="issueForm.notes" type="textarea" label="Observações" :rows="3" />
      <template #footer>
        <DsButton variant="secondary" @click="closeIssueModal">Cancelar</DsButton>
        <DsButton variant="primary" :loading="submitting" :disabled="!canSubmitIssue" @click="submitIssue">
          Registrar recebimento
        </DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="compensationModalOpen"
      :teleport="false"
      title="Compensar pagamento antecipado"
      size="sm"
      @close="closeCompensationModal"
    >
      <DsAlert v-if="compensationError" variant="danger">{{ compensationError }}</DsAlert>
      <p v-if="selectedPayment" class="modal-helper">
        {{ selectedPayment.ownerName }} · saldo disponível {{ formatCurrencyCents(selectedPayment.balanceCents) }}.
      </p>
      <DsInput
        id="advance-compensation-amount-cents"
        v-model.number="compensationForm.amountCents"
        type="number"
        label="Valor (centavos de BRL)"
        min="1"
        step="1"
        required
      />
      <DsInput id="advance-compensation-reference" v-model="compensationForm.reference" label="Referência da compensação" placeholder="Ex.: atendimento-2026-0001" required />
      <DsInput id="advance-compensation-notes" v-model="compensationForm.notes" type="textarea" label="Observações" :rows="3" />
      <template #footer>
        <DsButton variant="secondary" @click="closeCompensationModal">Cancelar</DsButton>
        <DsButton variant="primary" :loading="submitting" :disabled="!canSubmitCompensation" @click="submitCompensation">
          Registrar compensação
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { ownerService } from '@/services/owner';
import type { OwnerSummary } from '@/types/owner';
import {
  advancePaymentsService,
  type AdvancePaymentStatus,
  type AdvancePaymentSummary
} from '@/services/advance-payments';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type FilterStatus = '' | AdvancePaymentStatus;

interface AdvancePaymentRow extends DataTableRow {
  readonly id: string;
  readonly ownerId: string;
  readonly client: string;
  readonly document: string;
  readonly issuedAt: string;
  readonly totalCents: number;
  readonly compensatedCents: number;
  readonly balanceCents: number;
  readonly origin: string;
  readonly status: AdvancePaymentStatus;
  readonly notes: string;
}

const columns: readonly DataTableColumn[] = [
  { key: 'select', label: '', width: '48px' },
  { key: 'client', label: 'Cliente' },
  { key: 'issuedAt', label: 'Emissão' },
  { key: 'total', label: 'Total' },
  { key: 'compensated', label: 'Compensado' },
  { key: 'balance', label: 'Saldo' },
  { key: 'origin', label: 'Origem' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const filters = reactive({
  search: '',
  issuedFrom: '',
  issuedTo: '',
  status: '' as FilterStatus
});
const payments = ref<readonly AdvancePaymentSummary[]>([]);
const ownerOptions = ref<OwnerSummary[]>([]);
const loading = ref(false);
const ownerLoading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const issueError = ref('');
const compensationError = ref('');
const issueModalOpen = ref(false);
const compensationModalOpen = ref(false);
const selectedIds = ref(new Set<string>());
const issueForm = reactive({
  ownerId: '',
  amountCents: null as number | null,
  sourceId: '',
  reference: '',
  notes: ''
});
const compensationForm = reactive({
  amountCents: null as number | null,
  reference: '',
  notes: ''
});

const rows = computed<readonly DataTableRow[]>(() => payments.value.map(toAdvancePaymentRow));
const filteredRows = computed(() => rows.value);
const totalAmountCents = computed(() => payments.value.reduce((sum, item) => sum + item.amountCents, 0));
const totalCompensatedCents = computed(() =>
  payments.value.reduce((sum, item) => sum + item.compensatedAmountCents, 0)
);
const totalBalanceCents = computed(() => payments.value.reduce((sum, item) => sum + item.balanceCents, 0));
const selectedPayment = computed(() => {
  if (selectedIds.value.size !== 1) return undefined;
  const selectedId = [...selectedIds.value][0];
  return payments.value.find((item) => item.id === selectedId);
});
const canSubmitIssue = computed(() =>
  Boolean(
    issueForm.ownerId &&
      issueForm.sourceId.trim() &&
      Number.isSafeInteger(issueForm.amountCents) &&
      (issueForm.amountCents as number) > 0
  ) && !submitting.value && !ownerLoading.value
);
const canSubmitCompensation = computed(() =>
  Boolean(
    selectedPayment.value &&
      compensationForm.reference.trim() &&
      Number.isSafeInteger(compensationForm.amountCents) &&
      (compensationForm.amountCents as number) > 0 &&
      (compensationForm.amountCents as number) <= selectedPayment.value.balanceCents
  ) && !submitting.value
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-advance-payments',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadAdvancePayments()
  }
]);

onMounted(() => {
  void loadAdvancePayments();
});

async function loadAdvancePayments() {
  loading.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    payments.value = await advancePaymentsService.list({
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.issuedFrom ? { dateFrom: filters.issuedFrom } : {}),
      ...(filters.issuedTo ? { dateTo: filters.issuedTo } : {})
    });
    selectedIds.value = new Set(
      [...selectedIds.value].filter((id) => payments.value.some((item) => item.id === id))
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar pagamentos antecipados.';
    payments.value = [];
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.issuedFrom = '';
  filters.issuedTo = '';
  filters.status = '';
  void loadAdvancePayments();
}

async function openIssueModal() {
  issueModalOpen.value = true;
  issueError.value = '';
  if (ownerOptions.value.length > 0) return;
  ownerLoading.value = true;
  try {
    ownerOptions.value = await ownerService.list({
      search: '',
      status: 'active',
      page: 1,
      pageSize: 100
    });
  } catch (err) {
    issueError.value = err instanceof Error ? err.message : 'Não foi possível carregar os clientes.';
  } finally {
    ownerLoading.value = false;
  }
}

function closeIssueModal() {
  if (submitting.value) return;
  issueModalOpen.value = false;
  issueError.value = '';
  issueForm.ownerId = '';
  issueForm.amountCents = null;
  issueForm.sourceId = '';
  issueForm.reference = '';
  issueForm.notes = '';
}

async function submitIssue() {
  if (!canSubmitIssue.value) return;
  submitting.value = true;
  issueError.value = '';
  try {
    await advancePaymentsService.create({
      ownerId: issueForm.ownerId,
      amountCents: issueForm.amountCents as number,
      sourceId: issueForm.sourceId.trim(),
      ...(issueForm.reference.trim() ? { reference: issueForm.reference.trim() } : {}),
      ...(issueForm.notes.trim() ? { notes: issueForm.notes.trim() } : {})
    });
    closeIssueModal();
    successMessage.value = 'Pagamento antecipado registrado com sucesso.';
    await loadAdvancePayments();
  } catch (err) {
    issueError.value = err instanceof Error ? err.message : 'Não foi possível registrar o recebimento.';
  } finally {
    submitting.value = false;
  }
}

function openCompensationModal() {
  const payment = selectedPayment.value;
  if (!payment) return;
  compensationModalOpen.value = true;
  compensationError.value = '';
  compensationForm.amountCents = payment.balanceCents;
  compensationForm.reference = '';
  compensationForm.notes = '';
}

function closeCompensationModal() {
  if (submitting.value) return;
  compensationModalOpen.value = false;
  compensationError.value = '';
  compensationForm.amountCents = null;
  compensationForm.reference = '';
  compensationForm.notes = '';
}

async function submitCompensation() {
  const payment = selectedPayment.value;
  if (!payment || !canSubmitCompensation.value) return;
  submitting.value = true;
  compensationError.value = '';
  try {
    await advancePaymentsService.compensate(payment.id, {
      amountCents: compensationForm.amountCents as number,
      reference: compensationForm.reference.trim(),
      ...(compensationForm.notes.trim() ? { notes: compensationForm.notes.trim() } : {})
    });
    closeCompensationModal();
    successMessage.value = 'Compensação registrada com sucesso.';
    await loadAdvancePayments();
  } catch (err) {
    compensationError.value = err instanceof Error ? err.message : 'Não foi possível registrar a compensação.';
  } finally {
    submitting.value = false;
  }
}

function toggleSelection(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
}

function toAdvancePaymentRow(item: AdvancePaymentSummary): AdvancePaymentRow {
  return {
    id: item.id,
    ownerId: item.ownerId,
    client: item.ownerName,
    document: item.documentId || 'Sem documento',
    issuedAt: item.issuedAt,
    totalCents: item.amountCents,
    compensatedCents: item.compensatedAmountCents,
    balanceCents: item.balanceCents,
    origin: `${item.sourceType === 'manual' ? 'Manual' : item.sourceType} · ${item.sourceId}`,
    status: item.status,
    notes: item.notes ?? ''
  };
}

function formatCurrencyCents(value: number | null): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format((value ?? 0) / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function advanceStatusLabel(status: AdvancePaymentStatus): string {
  if (status === 'partially_compensated') return 'Parcialmente compensado';
  if (status === 'compensated') return 'Compensado';
  return 'Disponível';
}

function advanceStatusVariant(status: AdvancePaymentStatus) {
  if (status === 'compensated') return 'success';
  if (status === 'partially_compensated') return 'warning';
  return 'info';
}

function advanceRow(row: unknown): AdvancePaymentRow {
  return row as AdvancePaymentRow;
}
</script>

<style scoped>
.advance-payments-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.advance-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.advance-actions,
.advance-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.advance-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr)) auto;
}

.advance-filters__actions {
  display: flex;
  gap: 8px;
}

.advance-success {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #86efac;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
}

.origin-cell,
.open-link {
  font-weight: 700;
}

.origin-cell,
.advance-payments-page small {
  display: block;
}

.advance-payments-page small {
  margin-top: 3px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.open-link {
  color: var(--color-primary-700, #1d4ed8);
  text-decoration: none;
}

.open-link:hover {
  text-decoration: underline;
}

.modal-helper,
.modal-amount-preview {
  margin: 0 0 14px;
  color: var(--color-text-muted, #64748b);
  line-height: 1.5;
}

.modal-amount-preview {
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

@media (max-width: 980px) {
  .advance-filters {
    grid-template-columns: 1fr;
  }
}
</style>
