<template>
  <div class="cheques-page">
    <AppPageHeader
      title="Cheques"
      :breadcrumbs="['Financeiro', 'Controles', 'Cheques']"
      subtitle="Cadastro operacional de cheques recebidos ou emitidos, vencimento, baixa e devolução"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="cheques-summary-grid" aria-label="Resumo de cheques">
      <DsStatCard :label="`${filteredRows.length} cheque(s)`" value="Total" />
      <DsStatCard :label="formatCurrency(totalAmount)" value="Valor" />
      <DsStatCard :label="formatCurrency(totalPending)" value="A Depositar" />
      <DsStatCard
        :label="formatCurrency(totalReturned)"
        value="Devolvido"
        :error="totalReturned > 0 ? 'Requer tratativa' : undefined"
      />
    </section>

    <section class="cheques-actions" aria-label="Ações de cheques">
      <DsButton variant="primary" disabled>Cadastrar Cheque</DsButton>
      <DsButton variant="secondary" :disabled="selectedIds.size === 0">Baixar Cheques Em Lote</DsButton>
      <DsButton variant="secondary" tag="a" to="/counter-sales">Comandas</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadCheques">Atualizar</DsButton>
    </section>

    <form class="cheques-filters" aria-label="Filtros de cheques" @submit.prevent="loadCheques">
      <DsInput
        id="cheque-search"
        v-model="filters.search"
        label="Cliente/Referência"
        type="search"
        placeholder="Buscar por referência, comanda ou observação"
      />
      <DsInput id="cheque-due-from" v-model="filters.dueFrom" label="Vencimento de" type="date" />
      <DsInput id="cheque-due-to" v-model="filters.dueTo" label="Até" type="date" />
      <DsInput id="cheque-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="pending">A Depositar</option>
        <option value="settled">Baixado</option>
        <option value="returned">Devolvido</option>
      </DsInput>
      <DsInput id="cheque-kind" v-model="filters.kind" label="Tipo" type="select">
        <option value="">Todos</option>
        <option value="received">Recebido</option>
        <option value="issued">Emitido</option>
      </DsInput>
      <div class="cheques-filters__actions">
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
      empty-icon="📄"
      empty-title="Nenhum cheque encontrado"
      empty-description="Cheques aparecem quando uma comanda possui pagamento com método cheque."
      caption="Cheques"
      variant="hoverable"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :aria-label="`Selecionar ${chequeRow(row).reference}`"
          :checked="selectedIds.has(chequeRow(row).id)"
          @change="toggleSelection(chequeRow(row).id)"
        />
      </template>
      <template #cell-reference="{ row }">
        <strong>{{ chequeRow(row).reference }}</strong>
        <small>{{ chequeRow(row).notes }}</small>
      </template>
      <template #cell-kind="{ row }">
        <StatusBadge :label="chequeKindLabel(chequeRow(row).kind)" variant="info" />
      </template>
      <template #cell-issuedAt="{ row }">
        {{ formatDate(chequeRow(row).issuedAt) }}
      </template>
      <template #cell-dueAt="{ row }">
        {{ formatDate(chequeRow(row).dueAt) }}
      </template>
      <template #cell-amount="{ row }">
        <strong>{{ formatCurrency(chequeRow(row).amount) }}</strong>
      </template>
      <template #cell-origin="{ row }">
        <span class="origin-cell">{{ chequeRow(row).origin }}</span>
        <small>{{ chequeRow(row).saleNumber }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="chequeStatusLabel(chequeRow(row).status)"
          :variant="chequeStatusVariant(chequeRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="`/counter-sales/${chequeRow(row).saleId}`" class="open-link">Abrir</RouterLink>
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
  counterSalesService,
  type CounterSaleDetail,
  type CounterSalePaymentSummary
} from '@/services/counterSales';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type ChequeKind = 'received' | 'issued';
type ChequeStatus = 'pending' | 'settled' | 'returned';
type FilterKind = '' | ChequeKind;
type FilterStatus = '' | ChequeStatus;

interface ChequeRow {
  id: string;
  saleId: string;
  saleNumber: string;
  reference: string;
  kind: ChequeKind;
  issuedAt: string | null;
  dueAt: string | null;
  amount: number;
  origin: string;
  status: ChequeStatus;
  notes: string;
}

const columns: DataTableColumn[] = [
  { key: 'select', label: '', width: '48px' },
  { key: 'reference', label: 'Referência' },
  { key: 'kind', label: 'Tipo' },
  { key: 'issuedAt', label: 'Emissão' },
  { key: 'dueAt', label: 'Vencimento' },
  { key: 'amount', label: 'Valor' },
  { key: 'origin', label: 'Origem' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const filters = reactive({
  search: '',
  dueFrom: '',
  dueTo: '',
  status: '' as FilterStatus,
  kind: '' as FilterKind
});
const chequeRows = ref<ChequeRow[]>([]);
const loading = ref(false);
const error = ref('');
const selectedIds = ref(new Set<string>());

const rows = computed(() => chequeRows.value as unknown as DataTableRow[]);
const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const cheque = chequeRow(row);
    if (filters.status && cheque.status !== filters.status) return false;
    if (filters.kind && cheque.kind !== filters.kind) return false;
    if (!matchesDueFilters(cheque)) return false;
    return matchesSearch(cheque);
  })
);
const totalAmount = computed(() => filteredRows.value.reduce((sum, row) => sum + chequeRow(row).amount, 0));
const totalPending = computed(() =>
  filteredRows.value
    .filter((row) => chequeRow(row).status === 'pending')
    .reduce((sum, row) => sum + chequeRow(row).amount, 0)
);
const totalReturned = computed(() =>
  filteredRows.value
    .filter((row) => chequeRow(row).status === 'returned')
    .reduce((sum, row) => sum + chequeRow(row).amount, 0)
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-cheques',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadCheques()
  }
]);

onMounted(() => {
  void loadCheques();
});

async function loadCheques() {
  loading.value = true;
  error.value = '';
  try {
    const sales = await counterSalesService.list({ status: 'all' });
    const details = await Promise.all(sales.map((sale) => counterSalesService.getById(sale.id)));
    chequeRows.value = details.flatMap(toChequeRows);
    selectedIds.value = new Set([...selectedIds.value].filter((id) => chequeRows.value.some((row) => row.id === id)));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar cheques.';
    chequeRows.value = [];
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.dueFrom = '';
  filters.dueTo = '';
  filters.status = '';
  filters.kind = '';
  void loadCheques();
}

function toChequeRows(sale: CounterSaleDetail): ChequeRow[] {
  return sale.payments
    .filter((payment) => payment.method === 'check')
    .map((payment) => toChequeRow(sale, payment));
}

function toChequeRow(sale: CounterSaleDetail, payment: CounterSalePaymentSummary): ChequeRow {
  const notes = payment.notes || sale.notes || 'Sem observação';
  return {
    id: payment.id,
    saleId: sale.id,
    saleNumber: sale.number,
    reference: payment.reference || payment.id,
    kind: 'received',
    issuedAt: payment.createdAt || sale.closedAt || sale.createdAt || null,
    dueAt: inferDueDate(notes, payment.createdAt || sale.closedAt || sale.createdAt),
    amount: payment.amount,
    origin: 'Comanda',
    status: inferChequeStatus(notes),
    notes
  };
}

function inferDueDate(notes: string, baseDate: string | null): string | null {
  const match = notes.match(/(?:bom para|venc(?:imento)?|vence em)\s+(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/i);
  if (!match || !baseDate) return baseDate;
  const baseYear = new Date(baseDate).getUTCFullYear();
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3] ? normalizeYear(match[3]) : baseYear;
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function normalizeYear(value: string): number {
  if (value.length === 2) return 2000 + Number(value);
  return Number(value);
}

function inferChequeStatus(notes: string): ChequeStatus {
  const normalized = notes.toLowerCase();
  if (normalized.includes('devolv')) return 'returned';
  if (normalized.includes('baixad') || normalized.includes('compensad') || normalized.includes('depositad')) return 'settled';
  return 'pending';
}

function matchesSearch(row: ChequeRow): boolean {
  const term = filters.search.trim().toLowerCase();
  if (!term) return true;
  return [row.reference, row.saleNumber, row.origin, row.notes].some((value) => value.toLowerCase().includes(term));
}

function matchesDueFilters(row: ChequeRow): boolean {
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

function chequeKindLabel(kind: ChequeKind): string {
  return kind === 'issued' ? 'Emitido' : 'Recebido';
}

function chequeStatusLabel(status: ChequeStatus): string {
  if (status === 'settled') return 'Baixado';
  if (status === 'returned') return 'Devolvido';
  return 'A Depositar';
}

function chequeStatusVariant(status: ChequeStatus) {
  if (status === 'settled') return 'success';
  if (status === 'returned') return 'danger';
  return 'warning';
}

function chequeRow(row: unknown): ChequeRow {
  return row as ChequeRow;
}
</script>

<style scoped>
.cheques-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cheques-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.cheques-actions,
.cheques-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.cheques-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(4, minmax(140px, 1fr)) auto;
}

.cheques-filters__actions {
  display: flex;
  gap: 8px;
}

.origin-cell,
.open-link {
  font-weight: 700;
}

.origin-cell,
.cheques-page small {
  display: block;
}

.cheques-page small {
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

@media (max-width: 1120px) {
  .cheques-filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .cheques-filters {
    grid-template-columns: 1fr;
  }
}
</style>
