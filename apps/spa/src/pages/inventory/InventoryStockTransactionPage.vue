<template>
  <div class="inventory-stock-transaction-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Transação no Estoque']"
      title="Transação no Estoque"
      subtitle="Lançamento operacional de entrada, saída e ajuste de saldo por produto"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/inventory/new" icon="➕">Novo Item</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da transação no estoque">
      <DsStatCard :label="`${items.length} item(ns)`" value="" icon="📦" />
      <DsStatCard :label="`${totalQuantityLabel} em saldo`" value="" icon="🔢" />
      <DsStatCard :label="`${lowStockCount} abaixo do ponto`" value="" icon="⚠️" />
      <DsStatCard :label="`${consumptions.length} lançamento(s)`" value="" icon="📚" />
    </section>

    <section class="transaction-layout">
      <form class="transaction-panel" aria-label="Lançar transação no estoque" @submit.prevent="submitTransaction">
        <h2>Transação</h2>
        <div class="transaction-grid">
          <label class="field">
            <span>Estoque</span>
            <select v-model="transaction.stockLocation" data-testid="transaction-stock">
              <option value="principal">Estoque principal</option>
              <option value="farmacia">Farmácia</option>
              <option value="internacao">Internação</option>
              <option value="laboratorio">Laboratório</option>
              <option value="centro-cirurgico">Centro cirúrgico</option>
            </select>
          </label>

          <label class="field">
            <span>Tipo</span>
            <select v-model="transaction.type" data-testid="transaction-type">
              <option value="adjustment_in">Entrada</option>
              <option value="adjustment_out">Saída</option>
              <option value="set_balance">Ajuste de saldo</option>
            </select>
          </label>

          <label class="field field--wide">
            <span>Produto</span>
            <select v-model="transaction.inventoryItemId" data-testid="transaction-product">
              <option value="">Selecione</option>
              <option v-for="item in items" :key="item.id" :value="item.id">
                {{ item.sku }} - {{ item.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Código de Barras</span>
            <input v-model="transaction.code" type="search" autocomplete="off" data-testid="transaction-code" />
          </label>

          <label class="field">
            <span>Quantidade</span>
            <input v-model.number="transaction.quantity" type="number" min="0.01" step="0.01" data-testid="transaction-quantity" />
          </label>

          <label class="field field--wide">
            <span>Observação</span>
            <input v-model="transaction.notes" type="text" maxlength="180" data-testid="transaction-notes" />
          </label>
        </div>

        <div class="transaction-preview">
          <span>Saldo atual: {{ selectedItem ? formatQuantity(selectedItem.onHandQuantity, selectedItem.unit) : 'Selecione um produto' }}</span>
          <strong>Novo saldo: {{ previewBalanceLabel }}</strong>
        </div>

        <div class="transaction-actions">
          <DsButton type="submit" variant="primary" :loading="saving">Lançar</DsButton>
          <DsButton type="button" variant="secondary" @click="resetTransaction">Limpar</DsButton>
        </div>
      </form>

      <section class="filter-panel" aria-label="Filtros de transação no estoque">
        <form class="filters" @submit.prevent="applyFilters">
          <label class="field">
            <span>Código</span>
            <input v-model="draftFilters.code" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Produto</span>
            <input v-model="draftFilters.product" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Natureza</span>
            <select v-model="draftFilters.type">
              <option value="">Todas</option>
              <option value="stock">Saldo atual</option>
              <option value="assistential">Assistencial</option>
              <option value="commercial">Comercial</option>
            </select>
          </label>
          <DsButton type="submit" variant="primary">Pesquisar</DsButton>
        </form>
      </section>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="📥"
      empty-title="Nenhum registro encontrado"
      empty-description="As movimentações e saldos retornados pela API aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as StockTransactionRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as StockTransactionRow).product }}</strong>
      </template>
      <template #cell-type="{ row }">
        <StatusBadge
          :label="(row as StockTransactionRow).typeLabel"
          :variant="(row as StockTransactionRow).typeVariant"
          size="sm"
        />
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as StockTransactionRow).quantity, (row as StockTransactionRow).unit) }}
      </template>
      <template #cell-balance="{ row }">
        {{ (row as StockTransactionRow).balanceLabel }}
      </template>
      <template #cell-costAmount="{ row }">
        {{ formatCurrency((row as StockTransactionRow).costAmount) }}
      </template>
      <template #cell-reference="{ row }">
        {{ (row as StockTransactionRow).reference }}
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as StockTransactionRow).date) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as StockTransactionRow).detailPath"
          size="sm"
          variant="secondary"
        >
          Abrir
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryConsumptionSummary, InventoryItemSummary } from '@/types/inventory';

type TransactionType = 'adjustment_in' | 'adjustment_out' | 'set_balance';
type RowType = 'stock' | 'assistential' | 'commercial';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StockTransactionRow {
  id: string;
  code: string;
  product: string;
  type: RowType;
  typeLabel: string;
  typeVariant: StatusVariant;
  quantity: number;
  unit: string;
  balanceLabel: string;
  costAmount: number;
  reference: string;
  date: string;
  detailPath: string;
}

const items = ref<InventoryItemSummary[]>([]);
const consumptions = ref<InventoryConsumptionSummary[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');
const transaction = reactive({
  stockLocation: 'principal',
  type: 'adjustment_in' as TransactionType,
  inventoryItemId: '',
  code: '',
  quantity: 1,
  notes: ''
});
const draftFilters = reactive({
  code: '',
  product: '',
  type: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'type', label: 'Natureza', width: '130px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'balance', label: 'Saldo', width: '140px' },
  { key: 'costAmount', label: 'Custo', width: '120px' },
  { key: 'reference', label: 'Referência', width: '180px' },
  { key: 'date', label: 'Data', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const itemsById = computed<Record<string, InventoryItemSummary>>(() =>
  Object.fromEntries(items.value.map((item) => [item.id, item]))
);
const selectedItem = computed(() =>
  items.value.find((item) => item.id === transaction.inventoryItemId)
    ?? items.value.find((item) => normalizeSearch(item.sku) === normalizeSearch(transaction.code))
    ?? null
);
const previewBalance = computed(() => {
  if (!selectedItem.value) return null;
  if (!Number.isFinite(transaction.quantity) || transaction.quantity < 0) return null;
  return calculateNewBalance(selectedItem.value.onHandQuantity, transaction.quantity, transaction.type);
});
const previewBalanceLabel = computed(() => {
  if (!selectedItem.value || previewBalance.value === null) return 'Selecione produto e quantidade';
  return formatQuantity(previewBalance.value, selectedItem.value.unit);
});
const totalQuantityLabel = computed(() =>
  formatNumber(items.value.reduce((sum, item) => sum + item.onHandQuantity, 0))
);
const lowStockCount = computed(() =>
  items.value.filter((item) => item.onHandQuantity <= item.reorderLevel).length
);
const rows = computed<StockTransactionRow[]>(() => {
  const stockRows = items.value.map(itemToStockRow);
  const consumptionRows = consumptions.value.map(consumptionToRow);
  return [...stockRows, ...consumptionRows].sort((left, right) =>
    right.date.localeCompare(left.date)
  );
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const type = appliedFilters.type;
  return rows.value.filter((row) => {
    if (type && row.type !== type) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    return true;
  });
});

watch(
  () => transaction.inventoryItemId,
  (itemId) => {
    const item = items.value.find((candidate) => candidate.id === itemId);
    if (item) {
      transaction.code = item.sku;
    }
  }
);

function itemToStockRow(item: InventoryItemSummary): StockTransactionRow {
  const lowStock = item.onHandQuantity <= item.reorderLevel;
  return {
    id: `stock-${item.id}`,
    code: item.sku,
    product: item.name,
    type: 'stock',
    typeLabel: lowStock ? 'Atenção' : 'Saldo atual',
    typeVariant: lowStock ? 'warning' : 'success',
    quantity: item.onHandQuantity,
    unit: item.unit,
    balanceLabel: `${formatQuantity(item.onHandQuantity, item.unit)} atual`,
    costAmount: item.onHandQuantity * item.unitCostAmount,
    reference: `mínimo ${formatQuantity(item.reorderLevel, item.unit)}`,
    date: item.updatedAt || item.createdAt,
    detailPath: `/inventory/${item.id}`
  };
}

function consumptionToRow(consumption: InventoryConsumptionSummary): StockTransactionRow {
  const item = itemsById.value[consumption.inventoryItemId];
  const isCommercial = consumption.sourceEntityType === 'other' && !consumption.encounterId?.trim();
  return {
    id: consumption.id,
    code: item?.sku ?? consumption.inventoryItemId,
    product: item?.name ?? consumption.inventoryItemId,
    type: isCommercial ? 'commercial' : 'assistential',
    typeLabel: isCommercial ? 'Comercial' : 'Assistencial',
    typeVariant: isCommercial ? 'neutral' : 'info',
    quantity: consumption.quantity,
    unit: consumption.unit,
    balanceLabel: 'Saída registrada',
    costAmount: consumption.costAmount,
    reference: sourceLabel(consumption),
    date: consumption.createdAt,
    detailPath: item ? `/inventory/${item.id}` : '/inventory'
  };
}

function sourceLabel(consumption: InventoryConsumptionSummary): string {
  switch (consumption.sourceEntityType) {
    case 'encounter':
      return consumption.sourceEntityId || consumption.encounterId || 'Atendimento';
    case 'diagnostic_order':
      return consumption.sourceEntityId || 'Pedido laboratorial';
    case 'surgery_case':
      return consumption.sourceEntityId || 'Cirurgia';
    case 'inpatient_stay':
      return consumption.sourceEntityId || 'Internação';
    case 'prescription':
      return consumption.sourceEntityId || 'Prescrição';
    default:
      return 'Balcão / ajuste comercial';
  }
}

function calculateNewBalance(current: number, quantity: number, type: TransactionType): number {
  if (type === 'adjustment_in') return Number((current + quantity).toFixed(2));
  if (type === 'adjustment_out') return Number((current - quantity).toFixed(2));
  return Number(quantity.toFixed(2));
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function formatQuantity(quantity: number, unit: string): string {
  return `${formatNumber(quantity)} ${unit}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

function resetTransaction() {
  transaction.stockLocation = 'principal';
  transaction.type = 'adjustment_in';
  transaction.inventoryItemId = '';
  transaction.code = '';
  transaction.quantity = 1;
  transaction.notes = '';
}

async function submitTransaction() {
  error.value = '';
  successMessage.value = '';
  const item = selectedItem.value;
  if (!item) {
    error.value = 'Selecione um produto para lançar a transação';
    return;
  }

  const quantity = Number(transaction.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    error.value = 'Informe uma quantidade maior que zero';
    return;
  }

  const newBalance = calculateNewBalance(item.onHandQuantity, quantity, transaction.type);
  if (newBalance < 0) {
    error.value = 'A transação não pode deixar saldo negativo';
    return;
  }

  saving.value = true;
  try {
    const updated = await inventoryService.update(item.id, { onHandQuantity: newBalance });
    items.value = items.value.map((candidate) => candidate.id === updated.id ? updated : candidate);
    successMessage.value = `${updated.name} atualizado para ${formatQuantity(updated.onHandQuantity, updated.unit)}`;
    resetTransaction();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao lançar transação no estoque';
  } finally {
    saving.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const query = draftFilters.product || draftFilters.code || undefined;
    const [loadedItems, loadedConsumptions] = await Promise.all([
      inventoryService.list(query),
      inventoryService.listConsumptions()
    ]);
    items.value = loadedItems;
    consumptions.value = loadedConsumptions;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar transações do estoque';
    items.value = [];
    consumptions.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-stock-transaction-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.transaction-layout {
  display: grid;
  grid-template-columns: minmax(320px, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
  align-items: start;
}

.transaction-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.transaction-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.transaction-grid,
.filters {
  display: grid;
  gap: 12px;
}

.transaction-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.filters {
  grid-template-columns: 1fr;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.field--wide {
  grid-column: 1 / -1;
}

.field input,
.field select {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.transaction-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.transaction-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.record-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

@media (max-width: 980px) {
  .transaction-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .transaction-grid {
    grid-template-columns: 1fr;
  }
}
</style>
