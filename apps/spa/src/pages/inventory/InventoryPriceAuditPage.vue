<template>
  <div class="inventory-price-audit-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Auditoria de Preços']"
      title="Auditoria de Preços"
      subtitle="Conferência operacional de preços, custos, margens e tabelas comerciais"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory/price-consultation" icon="🔎">Consulta</DsButton>
        <DsButton variant="primary" tag="a" to="/tabelas-de-preco" icon="🏷️">Tabelas</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da auditoria de preços">
      <DsStatCard :label="`${rows.length} registro(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${divergenceCount} divergência(s)`" value="" icon="⚠️" />
      <DsStatCard :label="`${lowMarginCount} margem baixa`" value="" icon="📉" />
      <DsStatCard :label="`${activeTableCount} tabela(s) ativa(s)`" value="" icon="📋" />
    </section>

    <section class="price-audit-layout">
      <section class="audit-panel" aria-label="Conferência de preço">
        <h2>Conferência</h2>
        <div class="audit-grid">
          <label class="field">
            <span>Registro</span>
            <select v-model="selectedRowId" data-testid="price-audit-record">
              <option value="">Selecione</option>
              <option v-for="row in rows" :key="row.id" :value="row.id">
                {{ row.code }} - {{ row.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Preço atual</span>
            <input :value="selectedRow ? formatCurrency(selectedRow.salePrice) : 'Selecione um registro'" type="text" readonly />
          </label>

          <label class="field">
            <span>Custo</span>
            <input :value="selectedRow ? formatCurrency(selectedRow.costAmount) : 'Selecione um registro'" type="text" readonly />
          </label>

          <label class="field">
            <span>Margem</span>
            <input :value="selectedRow?.marginLabel ?? 'Selecione um registro'" type="text" readonly />
          </label>
        </div>

        <div class="audit-preview">
          <span>Tabela: {{ selectedRow?.tableLabel ?? 'Selecione um registro' }}</span>
          <strong>{{ selectedRow?.auditLabel ?? 'Nenhuma auditoria selecionada' }}</strong>
        </div>

        <div class="audit-actions">
          <DsButton
            tag="a"
            :to="selectedRow?.detailPath ?? '/products'"
            variant="primary"
            :disabled="!selectedRow"
          >
            Abrir Cadastro
          </DsButton>
          <DsButton tag="a" to="/inventory/price-consultation" variant="secondary">Consulta</DsButton>
          <DsButton tag="a" to="/tabelas-de-preco" variant="secondary">Tabelas</DsButton>
        </div>
      </section>

      <section class="filter-panel" aria-label="Filtros da auditoria de preços">
        <form class="filters" @submit.prevent="applyFilters">
          <label class="field">
            <span>Código</span>
            <input v-model="draftFilters.code" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Produto</span>
            <input v-model="draftFilters.name" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Tabela</span>
            <input v-model="draftFilters.table" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Origem</span>
            <select v-model="draftFilters.source">
              <option value="">Todas</option>
              <option value="product">Produtos</option>
              <option value="inventory">Estoque</option>
              <option value="price_table">Tabela</option>
            </select>
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="draftFilters.status">
              <option value="">Todas</option>
              <option value="ok">Conferido</option>
              <option value="attention">Atenção</option>
              <option value="divergence">Divergência</option>
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
      empty-icon="🏷️"
      empty-title="Nenhum registro encontrado"
      empty-description="Produtos, itens de estoque e tabelas de preço retornados pela API aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as PriceAuditRow).code }}</span>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as PriceAuditRow).name }}</strong>
        <span class="muted"><br />{{ (row as PriceAuditRow).description }}</span>
      </template>
      <template #cell-source="{ row }">
        <StatusBadge
          :label="(row as PriceAuditRow).sourceLabel"
          :variant="(row as PriceAuditRow).sourceVariant"
          size="sm"
        />
      </template>
      <template #cell-salePrice="{ row }">
        {{ formatCurrency((row as PriceAuditRow).salePrice) }}
      </template>
      <template #cell-costAmount="{ row }">
        {{ formatCurrency((row as PriceAuditRow).costAmount) }}
      </template>
      <template #cell-margin="{ row }">
        <span :class="{ 'text-danger': (row as PriceAuditRow).marginAmount < 0 }">
          {{ (row as PriceAuditRow).marginLabel }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as PriceAuditRow).statusLabel"
          :variant="(row as PriceAuditRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as PriceAuditRow).date) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as PriceAuditRow).detailPath"
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
import { computed, onMounted, reactive, ref } from 'vue';
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

type PriceAuditSource = 'product' | 'inventory' | 'price_table';
type PriceAuditStatus = 'ok' | 'attention' | 'divergence';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface PriceAuditRow {
  id: string;
  code: string;
  name: string;
  description: string;
  source: PriceAuditSource;
  sourceLabel: string;
  sourceVariant: StatusVariant;
  tableLabel: string;
  salePrice: number;
  costAmount: number;
  marginAmount: number;
  marginPercent: number | null;
  marginLabel: string;
  stockLabel: string;
  status: PriceAuditStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  auditLabel: string;
  date: string;
  detailPath: string;
}

const products = ref<ProductSummary[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const priceTables = ref<readonly PriceTableSummary[]>([]);
const loading = ref(false);
const error = ref('');
const selectedRowId = ref('');
const draftFilters = reactive({
  code: '',
  name: '',
  table: '',
  source: '',
  status: '',
  minMarginPercent: 20
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'name', label: 'Produto / Tabela' },
  { key: 'source', label: 'Origem', width: '120px' },
  { key: 'tableLabel', label: 'Tabela', width: '160px' },
  { key: 'salePrice', label: 'Preço', width: '120px' },
  { key: 'costAmount', label: 'Custo', width: '120px' },
  { key: 'margin', label: 'Margem', width: '130px' },
  { key: 'stockLabel', label: 'Saldo', width: '140px' },
  { key: 'status', label: 'Situação', width: '130px' },
  { key: 'date', label: 'Data', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const inventoryBySku = computed<Record<string, InventoryItemSummary>>(() =>
  Object.fromEntries(inventoryItems.value.map((item) => [normalizeKey(item.sku), item]))
);
const productsByCode = computed<Record<string, ProductSummary>>(() =>
  Object.fromEntries(products.value.map((product) => [normalizeKey(product.code ?? product.id), product]))
);
const activeTableCount = computed(() =>
  priceTables.value.filter((table) => table.isActive).length
);
const rows = computed<PriceAuditRow[]>(() => {
  const productRows = products.value.map(productToRow);
  const productCodes = new Set(products.value.map((product) => normalizeKey(product.code ?? product.id)));
  const inventoryRows = inventoryItems.value
    .filter((item) => !productCodes.has(normalizeKey(item.sku)))
    .map(inventoryItemToRow);
  const tableRows = priceTables.value.map(priceTableToRow);
  return [...productRows, ...inventoryRows, ...tableRows].sort((left, right) =>
    statusRank(left.status) - statusRank(right.status) || left.name.localeCompare(right.name)
  );
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const name = normalizeSearch(appliedFilters.name);
  const table = normalizeSearch(appliedFilters.table);
  const source = appliedFilters.source;
  const status = appliedFilters.status;
  const minMarginPercent = Number(appliedFilters.minMarginPercent);
  return rows.value.filter((row) => {
    if (source && row.source !== source) return false;
    if (status && row.status !== status) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (name && !normalizeSearch(row.name).includes(name)) return false;
    if (table && !normalizeSearch(row.tableLabel).includes(table)) return false;
    if (Number.isFinite(minMarginPercent) && row.marginPercent !== null && row.marginPercent < minMarginPercent) {
      return row.status !== 'ok';
    }
    return true;
  });
});
const selectedRow = computed(() =>
  rows.value.find((row) => row.id === selectedRowId.value) ?? null
);
const divergenceCount = computed(() =>
  rows.value.filter((row) => row.status === 'divergence').length
);
const lowMarginCount = computed(() =>
  rows.value.filter((row) => row.status === 'attention').length
);

function productToRow(product: ProductSummary): PriceAuditRow {
  const inventoryItem = inventoryBySku.value[normalizeKey(product.code ?? product.id)];
  const costAmount = inventoryItem?.unitCostAmount ?? 0;
  const margin = buildMargin(product.basePrice, costAmount);
  const hasCost = costAmount > 0;
  const status: PriceAuditStatus = !product.active || product.basePrice <= 0
    ? 'divergence'
    : hasCost && margin.percent !== null && margin.percent < 20
      ? 'attention'
      : 'ok';
  return {
    id: `product-${product.id}`,
    code: product.code ?? product.id,
    name: product.name,
    description: product.description ?? 'Cadastro comercial',
    source: 'product',
    sourceLabel: 'Produtos',
    sourceVariant: 'neutral',
    tableLabel: activeTableCount.value > 0 ? `${activeTableCount.value} tabela(s) ativa(s)` : 'Sem tabela ativa',
    salePrice: product.basePrice,
    costAmount,
    marginAmount: margin.amount,
    marginPercent: margin.percent,
    marginLabel: margin.label,
    stockLabel: inventoryItem ? `${formatQuantity(inventoryItem.onHandQuantity)} ${inventoryItem.unit}` : 'Sem saldo vinculado',
    status,
    statusLabel: auditStatusLabel(status),
    statusVariant: auditStatusVariant(status),
    auditLabel: productAuditLabel(product, costAmount, margin.percent),
    date: product.updatedAt || product.createdAt,
    detailPath: `/products/${product.id}`
  };
}

function inventoryItemToRow(item: InventoryItemSummary): PriceAuditRow {
  const salePrice = roundMoney(item.unitCostAmount * 1.35);
  const margin = buildMargin(salePrice, item.unitCostAmount);
  return {
    id: `inventory-${item.id}`,
    code: item.sku,
    name: item.name,
    description: 'Item de estoque sem cadastro comercial equivalente',
    source: 'inventory',
    sourceLabel: 'Estoque',
    sourceVariant: 'info',
    tableLabel: 'Sem tabela aplicada',
    salePrice,
    costAmount: item.unitCostAmount,
    marginAmount: margin.amount,
    marginPercent: margin.percent,
    marginLabel: margin.label,
    stockLabel: `${formatQuantity(item.onHandQuantity)} ${item.unit}`,
    status: 'divergence',
    statusLabel: 'Divergência',
    statusVariant: 'danger',
    auditLabel: 'Item de estoque sem preço comercial cadastrado',
    date: item.updatedAt || item.createdAt,
    detailPath: `/inventory/${item.id}`
  };
}

function priceTableToRow(table: PriceTableSummary): PriceAuditRow {
  const status: PriceAuditStatus = table.isActive ? 'ok' : 'attention';
  return {
    id: `table-${table.id}`,
    code: table.legacyId ?? table.id,
    name: table.description,
    description: table.context ?? 'Tabela comercial',
    source: 'price_table',
    sourceLabel: 'Tabela',
    sourceVariant: table.isActive ? 'success' : 'warning',
    tableLabel: table.description,
    salePrice: 0,
    costAmount: 0,
    marginAmount: 0,
    marginPercent: null,
    marginLabel: 'Tabela',
    stockLabel: 'Não se aplica',
    status,
    statusLabel: auditStatusLabel(status),
    statusVariant: auditStatusVariant(status),
    auditLabel: table.isActive ? 'Tabela ativa para aplicação comercial' : 'Tabela inativa para revisão',
    date: '2026-04-26T00:00:00.000Z',
    detailPath: '/tabelas-de-preco'
  };
}

function buildMargin(salePrice: number, costAmount: number): { amount: number; percent: number | null; label: string } {
  const amount = roundMoney(salePrice - costAmount);
  if (costAmount <= 0) {
    return { amount, percent: null, label: `${formatCurrency(amount)} sem custo` };
  }
  const percent = Math.round((amount / costAmount) * 100);
  return { amount, percent, label: `${formatCurrency(amount)} (${percent}%)` };
}

function productAuditLabel(product: ProductSummary, costAmount: number, marginPercent: number | null): string {
  if (!product.active) return 'Produto inativo com preço cadastrado';
  if (product.basePrice <= 0) return 'Produto sem preço comercial';
  if (costAmount <= 0) return 'Produto sem custo de estoque vinculado';
  if (marginPercent !== null && marginPercent < 20) return 'Margem abaixo da política mínima';
  return 'Preço conferido contra custo e tabela';
}

function auditStatusLabel(status: PriceAuditStatus): string {
  switch (status) {
    case 'divergence':
      return 'Divergência';
    case 'attention':
      return 'Atenção';
    default:
      return 'Conferido';
  }
}

function auditStatusVariant(status: PriceAuditStatus): StatusVariant {
  switch (status) {
    case 'divergence':
      return 'danger';
    case 'attention':
      return 'warning';
    default:
      return 'success';
  }
}

function statusRank(status: PriceAuditStatus): number {
  if (status === 'divergence') return 0;
  if (status === 'attention') return 1;
  return 2;
}

function normalizeKey(value: string): string {
  return normalizeSearch(value).replace(/[^a-z0-9]/g, '');
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
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

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const query = draftFilters.name || draftFilters.code || undefined;
    const [loadedProducts, loadedInventoryItems, loadedPriceTables] = await Promise.all([
      productsService.list(query),
      inventoryService.list(query),
      listPriceTables({ search: draftFilters.table || undefined })
    ]);
    products.value = loadedProducts;
    inventoryItems.value = loadedInventoryItems;
    priceTables.value = loadedPriceTables;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar auditoria de preços';
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
.inventory-price-audit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.price-audit-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) minmax(340px, 1fr);
  gap: 16px;
  align-items: start;
}

.audit-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.audit-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.audit-grid,
.filters {
  display: grid;
  gap: 12px;
}

.audit-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.filters {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
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

.field input[readonly] {
  background: var(--color-surface-muted, #f8fafc);
}

.audit-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.audit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.record-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.muted {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.text-danger {
  color: var(--color-danger, #b91c1c);
  font-weight: 700;
}

@media (max-width: 980px) {
  .price-audit-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .audit-grid,
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
