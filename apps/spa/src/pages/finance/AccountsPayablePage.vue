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
      <DsButton variant="primary" disabled>Gerar Conta Avulsa</DsButton>
      <DsButton variant="secondary" :disabled="selectedIds.size === 0">Baixar Contas Em Lote</DsButton>
      <DsButton variant="secondary" tag="a" to="/expenses">Custos e Despesas</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadPayables">Atualizar</DsButton>
    </section>

    <form class="payable-filters" aria-label="Filtros de contas a pagar" @submit.prevent="loadPayables">
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
        <option value="cancelled">Cancelada</option>
        <option value="paid">Paga</option>
      </DsInput>
      <div class="payable-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
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
          :aria-label="`Selecionar ${payableRow(row).supplier}`"
          :checked="selectedIds.has(payableRow(row).id)"
          @change="toggleSelection(payableRow(row).id)"
        />
      </template>
      <template #cell-supplier="{ row }">
        <strong>{{ payableRow(row).supplier }}</strong>
        <small>{{ payableRow(row).description }}</small>
      </template>
      <template #cell-issuedAt="{ row }">
        {{ formatDate(payableRow(row).issuedAt) }}
      </template>
      <template #cell-dueAt="{ row }">
        {{ formatDate(payableRow(row).dueAt) }}
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrency(payableRow(row).total) }}
      </template>
      <template #cell-paid="{ row }">
        {{ formatCurrency(payableRow(row).paid) }}
      </template>
      <template #cell-outstanding="{ row }">
        <strong>{{ formatCurrency(payableRow(row).outstanding) }}</strong>
      </template>
      <template #cell-origin="{ row }">
        <span class="origin-cell">{{ payableRow(row).origin }}</span>
        <small>{{ payableRow(row).costCenter }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="payableStatusLabel(payableRow(row).status)"
          :variant="payableStatusVariant(payableRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="`/expenses?search=${encodeURIComponent(payableRow(row).supplier)}`" class="open-link">
          Abrir
        </RouterLink>
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
import { expensesCatalogService, type ExpenseCatalogItem } from '@/services/expensesCatalog';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type PayableStatus = 'open' | 'cancelled' | 'paid';
type FilterStatus = '' | PayableStatus;

interface AccountsPayableRow {
  id: string;
  supplier: string;
  issuedAt: string | null;
  dueAt: string | null;
  total: number;
  paid: number;
  outstanding: number;
  origin: string;
  costCenter: string;
  status: PayableStatus;
  description: string;
}

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

const filters = reactive({
  search: '',
  dueFrom: '',
  dueTo: '',
  status: '' as FilterStatus
});
const expenses = ref<ExpenseCatalogItem[]>([]);
const loading = ref(false);
const error = ref('');
const selectedIds = ref(new Set<string>());

const rows = computed(() => expenses.value.map(toPayableRow) as unknown as DataTableRow[]);
const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const payable = payableRow(row);
    if (filters.status && payable.status !== filters.status) return false;
    return matchesDueFilters(payable);
  })
);
const totalAmount = computed(() => filteredRows.value.reduce((sum, row) => sum + payableRow(row).total, 0));
const totalPaid = computed(() => filteredRows.value.reduce((sum, row) => sum + payableRow(row).paid, 0));
const totalOutstanding = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + payableRow(row).outstanding, 0)
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
    const response = await expensesCatalogService.list({
      search: filters.search.trim(),
      page: 1,
      pageSize: 50,
      sort: 'name',
      order: 'asc'
    });
    expenses.value = response.items ?? [];
    selectedIds.value = new Set([...selectedIds.value].filter((id) => expenses.value.some((expense) => expense.id === id)));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar contas a pagar.';
    expenses.value = [];
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

function matchesDueFilters(row: AccountsPayableRow): boolean {
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

function toPayableRow(expense: ExpenseCatalogItem): AccountsPayableRow {
  return {
    id: expense.id,
    supplier: expense.name,
    issuedAt: null,
    dueAt: null,
    total: 0,
    paid: 0,
    outstanding: 0,
    origin: expense.category,
    costCenter: expense.costCenterName,
    status: 'open',
    description: expense.description || expense.kind
  };
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
  return 'A Pagar';
}

function payableStatusVariant(status: PayableStatus) {
  if (status === 'paid') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
}

function payableRow(row: unknown): AccountsPayableRow {
  return row as AccountsPayableRow;
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
.payable-filters {
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

.payable-filters__actions {
  display: flex;
  gap: 8px;
}

.origin-cell,
.open-link {
  font-weight: 700;
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
</style>
