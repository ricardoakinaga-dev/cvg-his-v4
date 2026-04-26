<template>
  <div class="inventory-price-adjustments-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Reajuste de Preços']"
      title="Reajuste de Preços"
      subtitle="Simulação e aplicação de novos preços por produto, margem, custo e tabela comercial"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory/price-audit" icon="🏷️">Auditoria</DsButton>
        <DsButton variant="primary" tag="a" to="/tabelas-de-preco" icon="📋">Tabelas</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo do reajuste de preços">
      <DsStatCard :label="`${products.length} produto(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${activeTableCount} tabela(s) ativa(s)`" value="" icon="📋" />
      <DsStatCard :label="`${lowMarginCount} margem baixa`" value="" icon="📉" />
      <DsStatCard :label="`${adjustedRows.length} reajuste(s)`" value="" icon="📈" />
    </section>

    <section class="adjustment-layout">
      <form class="adjustment-panel" aria-label="Aplicar reajuste de preço" @submit.prevent="submitAdjustment">
        <h2>Reajuste</h2>
        <div class="adjustment-grid">
          <label class="field">
            <span>Tabela</span>
            <select v-model="adjustment.tableId" data-testid="adjustment-table">
              <option value="">Preço padrão</option>
              <option v-for="table in priceTables" :key="table.id" :value="table.id">
                {{ table.description }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Tipo</span>
            <select v-model="adjustment.type" data-testid="adjustment-type">
              <option value="percent">Percentual</option>
              <option value="amount">Valor</option>
              <option value="fixed">Preço fixo</option>
            </select>
          </label>

          <label class="field field--wide">
            <span>Produto</span>
            <select v-model="adjustment.productId" data-testid="adjustment-product">
              <option value="">Selecione</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.code || product.id }} - {{ product.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Código</span>
            <input v-model="adjustment.code" type="search" autocomplete="off" data-testid="adjustment-code" />
          </label>

          <label class="field">
            <span>Valor do Reajuste</span>
            <input v-model.number="adjustment.value" type="number" step="0.01" data-testid="adjustment-value" />
          </label>

          <label class="field">
            <span>Arredondamento</span>
            <select v-model="adjustment.rounding" data-testid="adjustment-rounding">
              <option value="none">Sem arredondar</option>
              <option value="cent">Centavos</option>
              <option value="whole">Inteiro</option>
            </select>
          </label>

          <label class="field">
            <span>Margem mínima %</span>
            <input v-model.number="adjustment.minMarginPercent" type="number" min="0" step="1" data-testid="adjustment-margin" />
          </label>

          <label class="field field--wide">
            <span>Motivo</span>
            <input v-model="adjustment.reason" type="text" maxlength="180" data-testid="adjustment-reason" />
          </label>
        </div>

        <div class="adjustment-preview">
          <span>Preço atual: {{ selectedProduct ? formatCurrency(selectedProduct.basePrice) : 'Selecione um produto' }}</span>
          <strong>Novo preço: {{ previewPriceLabel }}</strong>
        </div>

        <div class="adjustment-actions">
          <DsButton type="submit" variant="primary" :loading="saving">Aplicar</DsButton>
          <DsButton type="button" variant="secondary" @click="resetAdjustment">Limpar</DsButton>
        </div>
      </form>

      <section class="filter-panel" aria-label="Filtros de reajuste de preços">
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
            <span>Tabela</span>
            <input v-model="draftFilters.table" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="draftFilters.status">
              <option value="">Todas</option>
              <option value="suggested">Sugerido</option>
              <option value="attention">Atenção</option>
              <option value="applied">Aplicado</option>
            </select>
          </label>
          <label class="field">
            <span>Margem mínima %</span>
            <input v-model.number="draftFilters.minMarginPercent" type="number" min="0" step="1" />
          </label>
          <DsButton type="submit" variant="primary">Pesquisar</DsButton>
        </form>
      </section>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="📈"
      empty-title="Nenhum reajuste encontrado"
      empty-description="Produtos, margens e tabelas de preço retornados pela API aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as PriceAdjustmentRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as PriceAdjustmentRow).product }}</strong>
      </template>
      <template #cell-currentPrice="{ row }">
        {{ formatCurrency((row as PriceAdjustmentRow).currentPrice) }}
      </template>
      <template #cell-newPrice="{ row }">
        {{ formatCurrency((row as PriceAdjustmentRow).newPrice) }}
      </template>
      <template #cell-cost="{ row }">
        {{ formatCurrency((row as PriceAdjustmentRow).cost) }}
      </template>
      <template #cell-margin="{ row }">
        {{ (row as PriceAdjustmentRow).marginLabel }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as PriceAdjustmentRow).statusLabel"
          :variant="(row as PriceAdjustmentRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as PriceAdjustmentRow).date) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as PriceAdjustmentRow).detailPath"
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
import { listPriceTables, type PriceTableSummary } from '@/services/commercial';
import { inventoryService } from '@/services/inventory';
import { productsService, type ProductSummary } from '@/services/products';
import type { InventoryItemSummary } from '@/types/inventory';

type AdjustmentType = 'percent' | 'amount' | 'fixed';
type RoundingMode = 'none' | 'cent' | 'whole';
type AdjustmentStatus = 'suggested' | 'attention' | 'applied';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface PriceAdjustmentRow {
  id: string;
  code: string;
  product: string;
  tableLabel: string;
  currentPrice: number;
  newPrice: number;
  variationLabel: string;
  cost: number;
  marginPercent: number | null;
  marginLabel: string;
  stockLabel: string;
  status: AdjustmentStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  date: string;
  detailPath: string;
}

const products = ref<ProductSummary[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const priceTables = ref<readonly PriceTableSummary[]>([]);
const adjustedRows = ref<PriceAdjustmentRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');

const adjustment = reactive({
  tableId: '',
  type: 'percent' as AdjustmentType,
  productId: '',
  code: '',
  value: 10,
  rounding: 'cent' as RoundingMode,
  minMarginPercent: 20,
  reason: ''
});
const draftFilters = reactive({
  code: '',
  product: '',
  table: '',
  status: '',
  minMarginPercent: 20
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'tableLabel', label: 'Tabela', width: '160px' },
  { key: 'currentPrice', label: 'Preço Atual', width: '120px' },
  { key: 'newPrice', label: 'Novo Preço', width: '120px' },
  { key: 'variationLabel', label: 'Variação', width: '120px' },
  { key: 'cost', label: 'Custo', width: '120px' },
  { key: 'margin', label: 'Margem', width: '130px' },
  { key: 'stockLabel', label: 'Saldo', width: '140px' },
  { key: 'status', label: 'Situação', width: '120px' },
  { key: 'date', label: 'Data', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const inventoryBySku = computed<Record<string, InventoryItemSummary>>(() =>
  Object.fromEntries(inventoryItems.value.map((item) => [normalizeKey(item.sku), item]))
);
const selectedProduct = computed(() =>
  products.value.find((product) => product.id === adjustment.productId)
    ?? products.value.find((product) => normalizeKey(product.code ?? product.id) === normalizeKey(adjustment.code))
    ?? null
);
const selectedTable = computed(() =>
  priceTables.value.find((table) => table.id === adjustment.tableId) ?? null
);
const previewPrice = computed(() =>
  selectedProduct.value ? calculateAdjustedPrice(selectedProduct.value.basePrice) : null
);
const previewPriceLabel = computed(() =>
  previewPrice.value === null ? 'Selecione produto e regra' : formatCurrency(previewPrice.value)
);
const activeTableCount = computed(() =>
  priceTables.value.filter((table) => table.isActive).length
);
const rows = computed<PriceAdjustmentRow[]>(() => {
  const suggestedRows = products.value.map(productToSuggestedRow);
  return [...adjustedRows.value, ...suggestedRows].sort((left, right) =>
    right.date.localeCompare(left.date)
  );
});
const lowMarginCount = computed(() =>
  rows.value.filter((row) => row.marginPercent !== null && row.marginPercent < appliedFilters.minMarginPercent).length
);
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const table = normalizeSearch(appliedFilters.table);
  const status = appliedFilters.status;
  const minMargin = Number(appliedFilters.minMarginPercent);

  return rows.value.filter((row) => {
    if (status && row.status !== status) return false;
    if (Number.isFinite(minMargin) && row.marginPercent !== null && row.marginPercent < minMargin) {
      return row.status !== 'suggested';
    }
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    if (table && !normalizeSearch(row.tableLabel).includes(table)) return false;
    return true;
  });
});

watch(
  () => adjustment.productId,
  (productId) => {
    const product = products.value.find((candidate) => candidate.id === productId);
    if (product) {
      adjustment.code = product.code ?? product.id;
    }
  }
);

function productToSuggestedRow(product: ProductSummary): PriceAdjustmentRow {
  const inventoryItem = inventoryBySku.value[normalizeKey(product.code ?? product.id)];
  const cost = inventoryItem?.unitCostAmount ?? 0;
  const marginPercent = calculateMarginPercent(product.basePrice, cost);
  const needsMargin = marginPercent !== null && marginPercent < appliedFilters.minMarginPercent;
  const suggestedPrice = needsMargin && cost > 0
    ? roundPrice(cost / (1 - appliedFilters.minMarginPercent / 100), 'cent')
    : calculateAdjustedPrice(product.basePrice);

  return {
    id: `suggested-adjustment-${product.id}`,
    code: product.code ?? product.id,
    product: product.name,
    tableLabel: activeTableCount.value > 0 ? `${activeTableCount.value} tabela(s) ativa(s)` : 'Preço padrão',
    currentPrice: product.basePrice,
    newPrice: suggestedPrice,
    variationLabel: formatVariation(product.basePrice, suggestedPrice),
    cost,
    marginPercent: calculateMarginPercent(suggestedPrice, cost),
    marginLabel: formatMargin(calculateMarginPercent(suggestedPrice, cost)),
    stockLabel: inventoryItem ? `${formatNumber(inventoryItem.onHandQuantity)} ${inventoryItem.unit}` : 'Sem saldo vinculado',
    status: needsMargin ? 'attention' : 'suggested',
    statusLabel: needsMargin ? 'Atenção' : 'Sugerido',
    statusVariant: needsMargin ? 'warning' : 'info',
    date: product.updatedAt || product.createdAt,
    detailPath: `/products/${product.id}`
  };
}

function adjustedProductToRow(product: ProductSummary, previousPrice: number): PriceAdjustmentRow {
  const inventoryItem = inventoryBySku.value[normalizeKey(product.code ?? product.id)];
  const cost = inventoryItem?.unitCostAmount ?? 0;
  const marginPercent = calculateMarginPercent(product.basePrice, cost);
  return {
    id: `applied-adjustment-${product.id}-${Date.now()}`,
    code: product.code ?? product.id,
    product: product.name,
    tableLabel: selectedTable.value?.description ?? 'Preço padrão',
    currentPrice: previousPrice,
    newPrice: product.basePrice,
    variationLabel: formatVariation(previousPrice, product.basePrice),
    cost,
    marginPercent,
    marginLabel: formatMargin(marginPercent),
    stockLabel: inventoryItem ? `${formatNumber(inventoryItem.onHandQuantity)} ${inventoryItem.unit}` : 'Sem saldo vinculado',
    status: 'applied',
    statusLabel: 'Aplicado',
    statusVariant: 'success',
    date: product.updatedAt || new Date().toISOString(),
    detailPath: `/products/${product.id}`
  };
}

function calculateAdjustedPrice(currentPrice: number): number {
  const value = Number(adjustment.value);
  if (!Number.isFinite(value)) return currentPrice;
  if (adjustment.type === 'fixed') return roundPrice(Math.max(value, 0), adjustment.rounding);
  if (adjustment.type === 'amount') return roundPrice(Math.max(currentPrice + value, 0), adjustment.rounding);
  return roundPrice(Math.max(currentPrice * (1 + value / 100), 0), adjustment.rounding);
}

function roundPrice(value: number, mode: RoundingMode): number {
  if (mode === 'whole') return Math.round(value);
  return Number(value.toFixed(mode === 'cent' ? 2 : 4));
}

function calculateMarginPercent(price: number, cost: number): number | null {
  if (price <= 0 || cost <= 0) return null;
  return ((price - cost) / price) * 100;
}

function formatMargin(value: number | null): string {
  if (value === null) return 'Sem custo';
  return `${formatNumber(value)}%`;
}

function formatVariation(previousPrice: number, newPrice: number): string {
  const diff = newPrice - previousPrice;
  const percent = previousPrice > 0 ? (diff / previousPrice) * 100 : 0;
  const signal = diff >= 0 ? '+' : '';
  return `${signal}${formatCurrency(diff)} (${signal}${formatNumber(percent)}%)`;
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function normalizeKey(value: string): string {
  return normalizeSearch(value).replace(/\s+/g, '');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
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

function resetAdjustment() {
  adjustment.tableId = '';
  adjustment.type = 'percent';
  adjustment.productId = '';
  adjustment.code = '';
  adjustment.value = 10;
  adjustment.rounding = 'cent';
  adjustment.minMarginPercent = 20;
  adjustment.reason = '';
}

async function submitAdjustment() {
  error.value = '';
  successMessage.value = '';
  const product = selectedProduct.value;
  if (!product) {
    error.value = 'Selecione um produto para aplicar o reajuste';
    return;
  }

  const newPrice = previewPrice.value;
  if (newPrice === null || !Number.isFinite(newPrice) || newPrice < 0) {
    error.value = 'Informe uma regra de reajuste válida';
    return;
  }

  saving.value = true;
  try {
    const previousPrice = product.basePrice;
    const updated = await productsService.update(product.id, { basePrice: newPrice });
    products.value = products.value.map((candidate) => candidate.id === updated.id ? updated : candidate);
    adjustedRows.value = [adjustedProductToRow(updated, previousPrice), ...adjustedRows.value];
    successMessage.value = `${updated.name} reajustado para ${formatCurrency(updated.basePrice)}`;
    resetAdjustment();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao aplicar reajuste de preço';
  } finally {
    saving.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const query = draftFilters.product || draftFilters.code || undefined;
    const [loadedProducts, loadedInventory, loadedTables] = await Promise.all([
      productsService.list(query),
      inventoryService.list(query),
      listPriceTables({ search: draftFilters.table || undefined })
    ]);
    products.value = loadedProducts;
    inventoryItems.value = loadedInventory;
    priceTables.value = loadedTables;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar reajustes de preço';
    products.value = [];
    inventoryItems.value = [];
    priceTables.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-price-adjustments-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.adjustment-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
  align-items: start;
}

.adjustment-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.adjustment-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.adjustment-grid,
.filters {
  display: grid;
  gap: 12px;
}

.adjustment-grid {
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

.adjustment-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.adjustment-actions {
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
  .adjustment-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .adjustment-grid {
    grid-template-columns: 1fr;
  }
}
</style>
