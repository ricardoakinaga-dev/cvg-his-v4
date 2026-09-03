<template>
  <div class="accounts-payable-page">
    <AppPageHeader
      title="Contas a Pagar"
      :breadcrumbs="['Financeiro', 'Controles', 'Contas a Pagar']"
      subtitle="Obrigações por fornecedor com emissão, vencimento, total, pago e saldo a pagar"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="payable-summary-grid" aria-label="Resumo de contas a pagar">
      <DsStatCard :label="`${filteredRows.length} título(s)`" value="Total" />
      <DsStatCard :label="formatCurrency(totalAmount)" value="Total Geral" />
      <DsStatCard :label="formatCurrency(totalPaid)" value="Pago" />
      <DsStatCard
        :label="formatCurrency(totalOutstanding)"
        value="A Pagar"
        :error="totalOutstanding > 0 ? 'Saldo pendente' : undefined"
      />
    </section>

    <section class="payable-actions" aria-label="Ações de contas a pagar">
      <DsButton
        variant="primary"
        :loading="creating"
        :disabled="!canCreatePayable"
        @click="createPayable"
      >
        Gerar Conta Avulsa
      </DsButton>
      <DsButton
        variant="secondary"
        :disabled="selectedOpenRows.length === 0"
        :loading="settlingBatch"
        @click="paySelected"
      >
        Baixar Contas Em Lote
      </DsButton>
      <DsButton variant="secondary" tag="a" to="/expenses">Custos e Despesas</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadPayables">Atualizar</DsButton>
    </section>

    <form
      class="payable-settlement"
      aria-label="Configuração de baixa de contas a pagar"
      @submit.prevent
    >
      <DsInput
        id="payable-payment-method"
        v-model="settlement.paymentMethod"
        label="Método de Baixa"
        type="select"
      >
        <option value="cash">Dinheiro/Gaveta</option>
        <option value="bank_transfer">Transferência Bancária</option>
        <option value="pix">PIX</option>
        <option value="card">Cartão</option>
        <option value="cheque">Cheque</option>
        <option value="other">Outro</option>
      </DsInput>
      <DsInput
        id="payable-payment-reference"
        v-model="settlement.paymentReference"
        label="Referência"
      />
    </form>

    <form
      class="payable-filters"
      aria-label="Filtros de contas a pagar"
      @submit.prevent="loadPayables"
    >
      <DsInput
        id="payable-supplier"
        v-model="filters.search"
        label="Fornecedor"
        type="search"
        placeholder="Buscar por fornecedor, categoria ou centro de custo"
      />
      <DsInput id="payable-due-from" v-model="filters.dueFrom" label="Vencimento de" type="date" />
      <DsInput id="payable-due-to" v-model="filters.dueTo" label="Até" type="date" />
      <DsInput id="payable-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="open">A Pagar</option>
        <option value="partial">Parcial</option>
        <option value="cancelled">Cancelada</option>
        <option value="paid">Paga</option>
      </DsInput>
      <div class="payable-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <form
      class="payable-create"
      aria-label="Gerar conta a pagar avulsa"
      @submit.prevent="createPayable"
    >
      <DsInput id="payable-new-supplier" v-model="newPayable.supplierName" label="Fornecedor" />
      <DsInput id="payable-new-description" v-model="newPayable.description" label="Descrição" />
      <DsInput id="payable-new-category" v-model="newPayable.category" label="Categoria" />
      <DsInput
        id="payable-new-cost-center"
        v-model="newPayable.costCenterCode"
        label="Centro de Custo"
      />
      <DsInput id="payable-new-due" v-model="newPayable.dueAt" label="Vencimento" type="date" />
      <DsInput
        id="payable-new-total"
        v-model="newPayable.totalAmount"
        label="Valor"
        type="number"
      />
      <DsInput id="payable-new-notes" v-model="newPayable.notes" label="Observação" />
    </form>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="💸"
      empty-title="Nenhuma conta a pagar encontrada"
      empty-description="As obrigações aparecem a partir do catálogo persistido de fornecedores, custos e despesas."
      caption="Contas a pagar"
      variant="hoverable"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :aria-label="`Selecionar ${payableRow(row).supplierName}`"
          :checked="selectedIds.has(payableRow(row).id)"
          @change="toggleSelection(payableRow(row).id)"
        />
      </template>
      <template #cell-supplier="{ row }">
        <strong>{{ payableRow(row).supplierName }}</strong>
        <small>{{ payableRow(row).description }}</small>
      </template>
      <template #cell-issuedAt="{ row }">
        {{ formatDate(payableRow(row).issuedAt) }}
      </template>
      <template #cell-dueAt="{ row }">
        {{ formatDate(payableRow(row).dueAt) }}
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrency(payableRow(row).totalAmount) }}
      </template>
      <template #cell-paid="{ row }">
        {{ formatCurrency(payableRow(row).paidAmount) }}
      </template>
      <template #cell-outstanding="{ row }">
        <strong>{{ formatCurrency(payableRow(row).outstandingAmount) }}</strong>
      </template>
      <template #cell-origin="{ row }">
        <span class="origin-cell">{{ payableRow(row).category }}</span>
        <small>{{ payableRow(row).costCenterName }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="payableStatusLabel(payableRow(row).status)"
          :variant="payableStatusVariant(payableRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <div class="payable-row-actions">
          <DsButton
            v-if="payableRow(row).status === 'open' || payableRow(row).status === 'partial'"
            size="sm"
            variant="secondary"
            :loading="settlingId === payableRow(row).id"
            @click="payPayable(payableRow(row))"
          >
            Baixar
          </DsButton>
          <DsButton
            v-if="canReconcilePayable(payableRow(row))"
            size="sm"
            variant="secondary"
            :loading="reconcilingId === payableRow(row).id"
            @click="reconcilePayable(payableRow(row))"
          >
            Conciliar
          </DsButton>
          <RouterLink
            :to="`/expenses?search=${encodeURIComponent(payableRow(row).supplierName)}`"
            class="open-link"
          >
            Abrir
          </RouterLink>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import {
  financialPayablesService,
  type FinancialPayablePaymentMethod,
  type FinancialPayableListResponse,
  type FinancialPayableRecord,
  type FinancialPayableStatus
} from '@/services/financialPayables';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type PayableStatus = FinancialPayableStatus;
type FilterStatus = '' | PayableStatus;

const columns: DataTableColumn[] = [
  { key: 'select', label: '', width: '48px' },
  { key: 'supplier', label: 'Fornecedor' },
  { key: 'issuedAt', label: 'Emissão' },
  { key: 'dueAt', label: 'Vencimento' },
  { key: 'total', label: 'Total' },
  { key: 'paid', label: 'Pago' },
  { key: 'outstanding', label: 'A Pagar' },
  { key: 'origin', label: 'Origem' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];
const emptyResponse: FinancialPayableListResponse = {
  data: [],
  page: 1,
  pageSize: 50,
  total: 0,
  openCount: 0,
  paidCount: 0,
  cancelledCount: 0,
  totalAmount: 0,
  totalPaid: 0,
  totalOutstanding: 0
};

const filters = reactive({
  search: '',
  dueFrom: '',
  dueTo: '',
  status: '' as FilterStatus
});
const newPayable = reactive({
  supplierName: '',
  description: '',
  category: '',
  costCenterCode: '',
  costCenterName: '',
  dueAt: '',
  totalAmount: '',
  notes: ''
});
const settlement = reactive({
  paymentMethod: 'cash' as FinancialPayablePaymentMethod,
  paymentReference: 'gaveta-principal'
});
const response = ref<FinancialPayableListResponse>({ ...emptyResponse });
const loading = ref(false);
const creating = ref(false);
const settlingId = ref('');
const reconcilingId = ref('');
const settlingBatch = ref(false);
const error = ref('');
const selectedIds = ref(new Set<string>());

const rows = computed(() => response.value.data as unknown as DataTableRow[]);
const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const payable = payableRow(row);
    if (filters.status && payable.status !== filters.status) return false;
    return matchesDueFilters(payable);
  })
);
const selectedOpenRows = computed(() =>
  response.value.data.filter((row) => selectedIds.value.has(row.id) && isPayableOpen(row))
);
const canCreatePayable = computed(() =>
  Boolean(
    newPayable.supplierName.trim() &&
    newPayable.description.trim() &&
    newPayable.category.trim() &&
    newPayable.costCenterCode.trim() &&
    newPayable.dueAt &&
    Number(newPayable.totalAmount) > 0
  )
);
const totalAmount = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + payableRow(row).totalAmount, 0)
);
const totalPaid = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + payableRow(row).paidAmount, 0)
);
const totalOutstanding = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + payableRow(row).outstandingAmount, 0)
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-payables',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadPayables()
  }
]);

onMounted(() => {
  void loadPayables();
});

async function loadPayables() {
  loading.value = true;
  error.value = '';
  try {
    response.value = await financialPayablesService.list({
      search: filters.search.trim(),
      status: filters.status,
      page: 1,
      pageSize: 50
    });
    selectedIds.value = new Set(
      [...selectedIds.value].filter((id) =>
        response.value.data.some((payable) => payable.id === id)
      )
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar contas a pagar.';
    response.value = { ...emptyResponse };
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.dueFrom = '';
  filters.dueTo = '';
  filters.status = '';
  void loadPayables();
}

function matchesDueFilters(row: FinancialPayableRecord): boolean {
  if (!row.dueAt) return !filters.dueFrom && !filters.dueTo;
  const due = row.dueAt.slice(0, 10);
  if (filters.dueFrom && due < filters.dueFrom) return false;
  if (filters.dueTo && due > filters.dueTo) return false;
  return true;
}

function toggleSelection(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

async function createPayable() {
  if (!canCreatePayable.value) return;

  creating.value = true;
  error.value = '';
  try {
    await financialPayablesService.create({
      supplierName: newPayable.supplierName.trim(),
      description: newPayable.description.trim(),
      category: newPayable.category.trim(),
      costCenterCode: newPayable.costCenterCode.trim(),
      costCenterName: newPayable.costCenterName.trim() || newPayable.costCenterCode.trim(),
      dueAt: newPayable.dueAt,
      totalAmount: Number(newPayable.totalAmount),
      notes: newPayable.notes.trim() || null
    });
    newPayable.supplierName = '';
    newPayable.description = '';
    newPayable.category = '';
    newPayable.costCenterCode = '';
    newPayable.costCenterName = '';
    newPayable.dueAt = '';
    newPayable.totalAmount = '';
    newPayable.notes = '';
    await loadPayables();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível gerar a conta a pagar.';
  } finally {
    creating.value = false;
  }
}

async function payPayable(row: FinancialPayableRecord) {
  if (!isPayableOpen(row)) return;

  settlingId.value = row.id;
  error.value = '';
  try {
    await financialPayablesService.pay(row.id, {
      amountPaid: row.outstandingAmount,
      paymentMethod: settlement.paymentMethod,
      paymentReference: settlement.paymentReference.trim() || null,
      notes: 'Baixa operacional em Contas a Pagar'
    });
    selectedIds.value = new Set([...selectedIds.value].filter((id) => id !== row.id));
    await loadPayables();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível baixar a conta a pagar.';
  } finally {
    settlingId.value = '';
  }
}

async function reconcilePayable(row: FinancialPayableRecord) {
  if (!canReconcilePayable(row)) return;

  reconcilingId.value = row.id;
  error.value = '';
  try {
    await financialPayablesService.reconcile(row.id, {
      reconciliationReference: settlement.paymentReference.trim() || row.paymentReference,
      notes: 'Conciliação operacional em Contas a Pagar'
    });
    await loadPayables();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Não foi possível conciliar a conta a pagar.';
  } finally {
    reconcilingId.value = '';
  }
}

async function paySelected() {
  if (selectedOpenRows.value.length === 0) return;

  settlingBatch.value = true;
  error.value = '';
  try {
    await Promise.all(
      selectedOpenRows.value.map((row) =>
        financialPayablesService.pay(row.id, {
          amountPaid: row.outstandingAmount,
          paymentMethod: settlement.paymentMethod,
          paymentReference: settlement.paymentReference.trim() || null,
          notes: 'Baixa em lote em Contas a Pagar'
        })
      )
    );
    selectedIds.value = new Set();
    await loadPayables();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Não foi possível baixar as contas selecionadas.';
  } finally {
    settlingBatch.value = false;
  }
}

function isPayableOpen(row: FinancialPayableRecord): boolean {
  return (row.status === 'open' || row.status === 'partial') && row.outstandingAmount > 0;
}

function canReconcilePayable(row: FinancialPayableRecord): boolean {
  return (
    row.status === 'paid' &&
    row.paymentMethod !== null &&
    row.paymentMethod !== 'cash' &&
    row.reconciliationStatus === 'pending'
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function payableStatusLabel(status: PayableStatus): string {
  if (status === 'paid') return 'Paga';
  if (status === 'cancelled') return 'Cancelada';
  if (status === 'partial') return 'Parcial';
  return 'A Pagar';
}

function payableStatusVariant(status: PayableStatus) {
  if (status === 'paid') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'partial') return 'info';
  return 'warning';
}

function payableRow(row: unknown): FinancialPayableRecord {
  return row as FinancialPayableRecord;
}
</script>

<style scoped>
.accounts-payable-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.payable-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.payable-actions,
.payable-filters,
.payable-settlement,
.payable-create {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.payable-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr)) auto;
}

.payable-settlement {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
}

.payable-create {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.payable-filters__actions {
  display: flex;
  gap: 8px;
}

.origin-cell,
.open-link {
  font-weight: 700;
}

.payable-row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.origin-cell,
.accounts-payable-page small {
  display: block;
}

.accounts-payable-page small {
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

@media (max-width: 980px) {
  .payable-filters {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .payable-settlement {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
