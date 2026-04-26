<template>
  <div class="inventory-purchases-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Compras']"
      title="Compras"
      subtitle="Sugestão, cotação e preparação de compra conectadas ao saldo, ponto de reposição e lotes"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory/nf" icon="🧾">Entrada NF</DsButton>
        <DsButton variant="primary" tag="a" to="/suppliers" icon="🚚">Fornecedores</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo de compras">
      <DsStatCard :label="`${items.length} item(ns)`" value="" icon="📦" />
      <DsStatCard :label="`${suggestedRowsCount} sugestão(ões)`" value="" icon="🛒" />
      <DsStatCard :label="`${supplierCount} fornecedor(es)`" value="" icon="🚚" />
      <DsStatCard :label="totalOpenValueLabel" value="" icon="💵" />
    </section>

    <section class="purchase-layout">
      <form class="purchase-panel" aria-label="Preparar compra de estoque" @submit.prevent="submitPurchase">
        <h2>Compra</h2>
        <div class="purchase-grid">
          <label class="field">
            <span>Fornecedor</span>
            <input v-model="purchase.supplier" type="text" autocomplete="off" data-testid="purchase-supplier" />
          </label>

          <label class="field">
            <span>Condição</span>
            <select v-model="purchase.condition" data-testid="purchase-condition">
              <option value="À vista">À vista</option>
              <option value="7 dias">7 dias</option>
              <option value="15 dias">15 dias</option>
              <option value="30 dias">30 dias</option>
              <option value="Faturado">Faturado</option>
            </select>
          </label>

          <label class="field field--wide">
            <span>Produto</span>
            <select v-model="purchase.inventoryItemId" data-testid="purchase-product">
              <option value="">Selecione</option>
              <option v-for="item in items" :key="item.id" :value="item.id">
                {{ item.sku }} - {{ item.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Código</span>
            <input v-model="purchase.code" type="search" autocomplete="off" data-testid="purchase-code" />
          </label>

          <label class="field">
            <span>Quantidade</span>
            <input v-model.number="purchase.quantity" type="number" min="1" step="1" data-testid="purchase-quantity" />
          </label>

          <label class="field">
            <span>Custo Unit.</span>
            <input v-model.number="purchase.unitCost" type="number" min="0" step="0.01" data-testid="purchase-cost" />
          </label>

          <label class="field">
            <span>Previsão</span>
            <input v-model="purchase.expectedDate" type="date" data-testid="purchase-expected" />
          </label>

          <label class="field field--wide">
            <span>Observação</span>
            <input v-model="purchase.notes" type="text" maxlength="180" data-testid="purchase-notes" />
          </label>
        </div>

        <div class="purchase-preview">
          <span>Saldo atual: {{ selectedItem ? formatQuantity(selectedItem.onHandQuantity, selectedItem.unit) : 'Selecione um produto' }}</span>
          <strong>Total previsto: {{ purchaseTotalLabel }}</strong>
        </div>

        <div class="purchase-actions">
          <DsButton type="submit" variant="primary" :loading="saving">Preparar Pedido</DsButton>
          <DsButton type="button" variant="secondary" @click="resetPurchase">Limpar</DsButton>
        </div>
      </form>

      <section class="filter-panel" aria-label="Filtros de compras">
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
            <span>Fornecedor</span>
            <input v-model="draftFilters.supplier" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="draftFilters.status">
              <option value="">Todas</option>
              <option value="suggested">Sugerida</option>
              <option value="quote">Cotação</option>
              <option value="ordered">Pedido</option>
              <option value="received">Recebida</option>
            </select>
          </label>
          <label class="field">
            <span>Previsão até</span>
            <input v-model="draftFilters.expectedUntil" type="date" />
          </label>
          <DsButton type="submit" variant="primary">Pesquisar</DsButton>
        </form>
      </section>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="🛒"
      empty-title="Nenhuma compra encontrada"
      empty-description="Sugestões, cotações e pedidos preparados aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as PurchaseRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as PurchaseRow).product }}</strong>
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as PurchaseRow).quantity, (row as PurchaseRow).unit) }}
      </template>
      <template #cell-unitCost="{ row }">
        {{ formatCurrency((row as PurchaseRow).unitCost) }}
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrency((row as PurchaseRow).total) }}
      </template>
      <template #cell-stock="{ row }">
        {{ (row as PurchaseRow).stockLabel }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as PurchaseRow).statusLabel"
          :variant="(row as PurchaseRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-expectedDate="{ row }">
        {{ formatDate((row as PurchaseRow).expectedDate) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as PurchaseRow).detailPath"
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
import type { InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';

type PurchaseStatus = 'suggested' | 'quote' | 'ordered' | 'received';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface PurchaseRow {
  id: string;
  code: string;
  product: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  stockLabel: string;
  minimumLabel: string;
  status: PurchaseStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  condition: string;
  expectedDate: string;
  detailPath: string;
}

const items = ref<InventoryItemSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const preparedRows = ref<PurchaseRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');

const purchase = reactive({
  supplier: '',
  condition: 'À vista',
  inventoryItemId: '',
  code: '',
  quantity: 1,
  unitCost: 0,
  expectedDate: todayIsoDate(),
  notes: ''
});

const draftFilters = reactive({
  code: '',
  product: '',
  supplier: '',
  status: '',
  expectedUntil: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'supplier', label: 'Fornecedor', width: '170px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'unitCost', label: 'Custo Unit.', width: '120px' },
  { key: 'total', label: 'Total', width: '120px' },
  { key: 'stock', label: 'Saldo', width: '140px' },
  { key: 'minimumLabel', label: 'Mínimo', width: '120px' },
  { key: 'status', label: 'Situação', width: '120px' },
  { key: 'expectedDate', label: 'Previsão', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const selectedItem = computed(() =>
  items.value.find((item) => item.id === purchase.inventoryItemId)
    ?? items.value.find((item) => normalizeSearch(item.sku) === normalizeSearch(purchase.code))
    ?? null
);
const purchaseTotal = computed(() => {
  const quantity = Number(purchase.quantity);
  const unitCost = Number(purchase.unitCost);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return 0;
  return Number((quantity * unitCost).toFixed(2));
});
const purchaseTotalLabel = computed(() => formatCurrency(purchaseTotal.value));
const suggestedRowsCount = computed(() =>
  rows.value.filter((row) => row.status === 'suggested').length
);
const supplierCount = computed(() =>
  new Set(rows.value.map((row) => row.supplier).filter((supplier) => supplier !== 'Fornecedor não informado')).size
);
const totalOpenValueLabel = computed(() => {
  const total = rows.value
    .filter((row) => row.status !== 'received')
    .reduce((sum, row) => sum + row.total, 0);
  return `${formatCurrency(total)} em aberto`;
});
const rows = computed<PurchaseRow[]>(() => {
  const suggested = items.value
    .filter((item) => item.onHandQuantity <= item.reorderLevel)
    .map(itemToSuggestedRow);
  const lotQuoteRows = lots.value
    .filter((lot) => lot.status === 'expiring' || lot.status === 'expired' || lot.status === 'depleted')
    .map(lotToQuoteRow);
  return [...preparedRows.value, ...suggested, ...lotQuoteRows].sort((left, right) =>
    right.expectedDate.localeCompare(left.expectedDate)
  );
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const supplier = normalizeSearch(appliedFilters.supplier);
  const status = appliedFilters.status;
  const expectedUntil = appliedFilters.expectedUntil;

  return rows.value.filter((row) => {
    if (status && row.status !== status) return false;
    if (expectedUntil && row.expectedDate.slice(0, 10) > expectedUntil) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    if (supplier && !normalizeSearch(row.supplier).includes(supplier)) return false;
    return true;
  });
});

watch(
  () => purchase.inventoryItemId,
  (itemId) => {
    const item = items.value.find((candidate) => candidate.id === itemId);
    if (!item) return;
    purchase.code = item.sku;
    purchase.unitCost = item.unitCostAmount;
    purchase.quantity = suggestedQuantity(item);
    purchase.supplier = preferredSupplier(item) || purchase.supplier;
  }
);

function itemToSuggestedRow(item: InventoryItemSummary): PurchaseRow {
  const quantity = suggestedQuantity(item);
  const supplier = preferredSupplier(item) || 'Fornecedor não informado';
  return {
    id: `suggested-purchase-${item.id}`,
    code: item.sku,
    product: item.name,
    supplier,
    quantity,
    unit: item.unit,
    unitCost: item.unitCostAmount,
    total: Number((quantity * item.unitCostAmount).toFixed(2)),
    stockLabel: formatQuantity(item.onHandQuantity, item.unit),
    minimumLabel: formatQuantity(item.reorderLevel, item.unit),
    status: 'suggested',
    statusLabel: 'Sugerida',
    statusVariant: item.onHandQuantity <= 0 ? 'danger' : 'warning',
    condition: 'Cotação',
    expectedDate: addDaysIso(7),
    detailPath: `/inventory/${item.id}`
  };
}

function lotToQuoteRow(lot: InventoryLotSummary): PurchaseRow {
  const item = items.value.find((candidate) => candidate.id === lot.inventoryItemId || candidate.sku === lot.sku);
  const unitCost = item?.unitCostAmount ?? 0;
  const quantity = Math.max(item ? suggestedQuantity(item) : lot.quantity, 1);
  return {
    id: `lot-purchase-${lot.id}`,
    code: lot.sku,
    product: lot.itemName,
    supplier: lot.supplier || 'Fornecedor não informado',
    quantity,
    unit: lot.unit,
    unitCost,
    total: Number((quantity * unitCost).toFixed(2)),
    stockLabel: item ? formatQuantity(item.onHandQuantity, item.unit) : formatQuantity(lot.quantity, lot.unit),
    minimumLabel: item ? formatQuantity(item.reorderLevel, item.unit) : 'Sem mínimo',
    status: 'quote',
    statusLabel: lot.status === 'expired' || lot.status === 'depleted' ? 'Cotação urgente' : 'Cotação',
    statusVariant: lot.status === 'expired' || lot.status === 'depleted' ? 'danger' : 'info',
    condition: 'Cotação',
    expectedDate: addDaysIso(lot.status === 'expired' || lot.status === 'depleted' ? 3 : 10),
    detailPath: item ? `/inventory/${item.id}` : '/inventory'
  };
}

function suggestedQuantity(item: InventoryItemSummary): number {
  const deficit = item.reorderLevel - item.onHandQuantity;
  const buffer = Math.max(item.reorderLevel, 1);
  return Math.max(Math.ceil(deficit + buffer), 1);
}

function preferredSupplier(item: InventoryItemSummary): string {
  const lot = lots.value.find((candidate) => candidate.inventoryItemId === item.id && candidate.supplier?.trim());
  return lot?.supplier?.trim() ?? '';
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

function resetPurchase() {
  purchase.supplier = '';
  purchase.condition = 'À vista';
  purchase.inventoryItemId = '';
  purchase.code = '';
  purchase.quantity = 1;
  purchase.unitCost = 0;
  purchase.expectedDate = todayIsoDate();
  purchase.notes = '';
}

async function submitPurchase() {
  error.value = '';
  successMessage.value = '';
  const item = selectedItem.value;
  if (!item) {
    error.value = 'Selecione um produto para preparar a compra';
    return;
  }

  const quantity = Number(purchase.quantity);
  const unitCost = Number(purchase.unitCost);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    error.value = 'Informe uma quantidade maior que zero';
    return;
  }
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    error.value = 'Informe um custo unitário válido';
    return;
  }

  saving.value = true;
  try {
    const row: PurchaseRow = {
      id: `prepared-purchase-${Date.now()}`,
      code: item.sku,
      product: item.name,
      supplier: purchase.supplier.trim() || preferredSupplier(item) || 'Fornecedor não informado',
      quantity,
      unit: item.unit,
      unitCost,
      total: Number((quantity * unitCost).toFixed(2)),
      stockLabel: formatQuantity(item.onHandQuantity, item.unit),
      minimumLabel: formatQuantity(item.reorderLevel, item.unit),
      status: 'ordered',
      statusLabel: 'Pedido',
      statusVariant: 'info',
      condition: purchase.condition,
      expectedDate: purchase.expectedDate || todayIsoDate(),
      detailPath: `/inventory/${item.id}`
    };
    preparedRows.value = [row, ...preparedRows.value];
    successMessage.value = `${item.name} preparado para compra com ${row.supplier}`;
    resetPurchase();
  } finally {
    saving.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const query = draftFilters.product || draftFilters.code || undefined;
    const [loadedItems, loadedLots] = await Promise.all([
      inventoryService.list(query),
      inventoryService.listLots()
    ]);
    items.value = loadedItems;
    lots.value = loadedLots;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar compras de estoque';
    items.value = [];
    lots.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-purchases-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.purchase-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
  align-items: start;
}

.purchase-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.purchase-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.purchase-grid,
.filters {
  display: grid;
  gap: 12px;
}

.purchase-grid {
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

.purchase-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.purchase-actions {
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
  .purchase-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .purchase-grid {
    grid-template-columns: 1fr;
  }
}
</style>
