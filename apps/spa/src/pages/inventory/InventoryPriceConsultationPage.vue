<template>
  <div class="inventory-price-consultation-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Consulta de Preços']"
      title="Consulta de Preços"
      subtitle="Confira os preços cadastrados e os saldos de estoque."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" :disabled="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/products/new" icon="plus">Novo Produto</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="filter-panel" aria-label="Filtros da consulta de preços">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Código</span>
          <input v-model="draftFilters.code" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Produto</span>
          <input v-model="draftFilters.name" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Origem</span>
          <select v-model="draftFilters.source">
            <option value="">Todas</option>
            <option value="product">Produtos</option>
            <option value="inventory">Estoque</option>
          </select>
        </label>
        <DsButton type="submit" variant="primary" :disabled="loading">Pesquisar</DsButton>
      </form>
    </section>

    <div v-if="available && !loading" class="query-status" role="status">
      <span>{{ filteredRows.length }} {{ filteredRows.length === 1 ? 'registro encontrado' : 'registros encontrados' }}</span>
      <DsButton v-if="hasFilters" variant="ghost" @click="clearFilters">Limpar filtros</DsButton>
    </div>
    <EmptyState v-if="failed && !loading" icon="search" title="Consulta indisponível" description="Não foi possível carregar preços e saldos. Tente novamente." size="sm">
      <template #action><DsButton variant="secondary" @click="load">Tentar novamente</DsButton></template>
    </EmptyState>
    <DataTable v-else
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="🔎"
      empty-title="Nenhum registro encontrado"
      :empty-description="hasFilters ? 'Tente outro código, nome ou origem.' : 'Cadastre produtos ou itens de estoque para consultar seus dados.'"
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as PriceConsultationRow).code }}</span>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as PriceConsultationRow).name }}</strong>
        <span class="muted"><br />{{ (row as PriceConsultationRow).description }}</span>
      </template>
      <template #cell-source="{ row }">
        <StatusBadge
          :label="(row as PriceConsultationRow).sourceLabel"
          :variant="(row as PriceConsultationRow).source === 'inventory' ? 'info' : 'neutral'"
          size="sm"
        />
      </template>
      <template #cell-salePrice="{ row }">
        {{ formatCurrency((row as PriceConsultationRow).salePrice) }}
      </template>
      <template #cell-costAmount="{ row }">
        {{ formatCurrency((row as PriceConsultationRow).costAmount) }}
      </template>
      <template #cell-margin="{ row }">
        <span :class="{ 'text-danger': ((row as PriceConsultationRow).marginAmount ?? 0) < 0 }">
          {{ formatCurrency((row as PriceConsultationRow).marginAmount) }}
        </span>
      </template>
      <template #cell-stock="{ row }">
        {{ (row as PriceConsultationRow).stockLabel }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as PriceConsultationRow).statusLabel"
          :variant="(row as PriceConsultationRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as PriceConsultationRow).detailPath"
          size="sm"
          variant="secondary"
        >
          Abrir
        </DsButton>
      </template>
    </DataTable>
    <details class="query-summary">
      <summary>Resumo da consulta</summary>
      <dl>
        <div><dt>Registros</dt><dd>{{ available && !loading ? filteredRows.length : '—' }}</dd></div>
        <div><dt>Com saldo informado positivo</dt><dd>{{ available && !loading ? availableCount : '—' }}</dd></div>
        <div><dt>No ponto de reposição ou abaixo</dt><dd>{{ available && !loading ? lowStockCount : '—' }}</dd></div>
        <div><dt>Margem média</dt><dd>{{ available && !loading ? averageMarginLabel : '—' }}</dd></div>
      </dl>
      <p>Resumo dos registros desta consulta. O traço indica um valor não informado. A margem exige preço e custo vinculados ao mesmo cadastro.</p>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import EmptyState from '@/components/EmptyState.vue';
import { inventoryService } from '@/services/inventory';
import { productsService, type ProductSummary } from '@/services/products';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { InventoryItemSummary } from '@/types/inventory';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type PriceSource = 'product' | 'inventory';

interface PriceConsultationRow {
  id: string;
  source: PriceSource;
  sourceLabel: string;
  code: string;
  name: string;
  description: string;
  salePrice: number | null;
  costAmount: number | null;
  marginAmount: number | null;
  stockQuantity: number | null;
  unit: string;
  stockLabel: string;
  statusLabel: string;
  statusVariant: StatusVariant;
  detailPath: string;
}

const products = ref<ProductSummary[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const loading = ref(true);
const available = ref(false);
const failed = ref(false);
let requestVersion = 0;
const error = ref('');
const draftFilters = reactive({
  code: '',
  name: '',
  source: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '140px' },
  { key: 'name', label: 'Produto', class: 'price-product-column' },
  { key: 'source', label: 'Origem', width: '120px' },
  { key: 'salePrice', label: 'Preço', width: '120px' },
  { key: 'costAmount', label: 'Custo', width: '120px' },
  { key: 'margin', label: 'Margem', width: '120px' },
  { key: 'stock', label: 'Saldo', width: '150px' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'actions', label: 'Abrir', width: '110px', class: 'table__actions-col' }
];

const rows = computed<PriceConsultationRow[]>(() => [
  ...products.value.map(productToRow),
  ...inventoryItems.value.map(inventoryItemToRow)
].sort((left, right) => left.name.localeCompare(right.name)));

const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const name = normalizeSearch(appliedFilters.name);
  const source = appliedFilters.source;
  return rows.value.filter((row) => {
    if (source && row.source !== source) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (name && !normalizeSearch(row.name).includes(name)) return false;
    return true;
  });
});

const hasFilters = computed(() => Boolean(appliedFilters.code || appliedFilters.name || appliedFilters.source));
const availableCount = computed(() =>
  filteredRows.value.filter((row) => row.stockQuantity !== null && row.stockQuantity > 0).length
);
const lowStockCount = computed(() =>
  filteredRows.value.filter((row) => row.statusLabel === 'Abaixo do ponto').length
);
const averageMarginLabel = computed(() => {
  const margins = filteredRows.value.map(row => row.marginAmount).filter((margin): margin is number => margin !== null && Number.isFinite(margin));
  return margins.length ? formatCurrency(margins.reduce((sum, margin) => sum + margin, 0) / margins.length) : '—';
});

function productToRow(product: ProductSummary): PriceConsultationRow {
  return {
    id: product.id,
    source: 'product',
    sourceLabel: 'Produtos',
    code: product.code ?? product.id,
    name: product.name,
    description: product.description ?? 'Cadastro comercial',
    salePrice: product.basePrice,
    costAmount: null,
    marginAmount: null,
    stockQuantity: null,
    unit: 'un',
    stockLabel: 'Sem saldo vinculado',
    statusLabel: product.active ? 'Ativo' : 'Inativo',
    statusVariant: product.active ? 'success' : 'neutral',
    detailPath: `/products/${product.id}`
  };
}

function inventoryItemToRow(item: InventoryItemSummary): PriceConsultationRow {
  const lowStock = item.onHandQuantity <= item.reorderLevel;
  return {
    id: item.id,
    source: 'inventory',
    sourceLabel: 'Estoque',
    code: item.sku,
    name: item.name,
    description: 'Item de estoque com custo e saldo operacional',
    salePrice: null,
    costAmount: item.unitCostAmount,
    marginAmount: null,
    stockQuantity: item.onHandQuantity,
    unit: item.unit,
    stockLabel: `${formatQuantity(item.onHandQuantity)} ${item.unit}`,
    statusLabel: lowStock ? 'Abaixo do ponto' : 'Disponível',
    statusVariant: lowStock ? 'warning' : 'success',
    detailPath: `/inventory/${item.id}`
  };
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
}

function applyFilters() {
  void load();
}

function clearFilters() {
  Object.assign(draftFilters, { code: '', name: '', source: '' });
  void load();
}

async function load() {
  const version = ++requestVersion;
  const filters = { code: draftFilters.code.trim(), name: draftFilters.name.trim(), source: draftFilters.source };
  loading.value = true;
  available.value = false;
  failed.value = false;
  error.value = '';
  try {
    // Fetch the same complete lists as the initial view; local filtering uses
    // displayed codes and accent-insensitive names consistently across both sources.
    const [productItems, stockItems] = await Promise.all([
      productsService.list(undefined),
      inventoryService.list(undefined)
    ]);
    if (version !== requestVersion) return;
    products.value = productItems;
    inventoryItems.value = stockItems;
    Object.assign(appliedFilters, filters);
    available.value = true;
  } catch (err: unknown) {
    if (version !== requestVersion) return;
    failed.value = true;
    error.value = err instanceof Error ? err.message : 'Erro ao carregar consulta de preços';
    products.value = [];
    inventoryItems.value = [];
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-price-consultation-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.query-status { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--color-text-secondary); }
.query-summary { border: 1px solid var(--color-border); border-radius: 12px; padding: 0 16px; background: var(--color-surface); }
.query-summary summary { min-height: 44px; padding: 12px 0; cursor: pointer; font-weight: 600; }
.query-summary dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 12px 0; }
.query-summary dt { color: var(--color-text-secondary); font-size: 13px; }
.query-summary dd { margin: 4px 0 0; font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.query-summary p { color: var(--color-text-secondary); font-size: 13px; margin: 12px 0 16px; }
.filter-field input:focus-visible, .filter-field select:focus-visible, .query-summary summary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }

.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.filters {
  display: grid;
  grid-template-columns: minmax(140px, 0.7fr) minmax(220px, 1.2fr) minmax(150px, 0.7fr) auto;
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

.filter-field input,
.filter-field select {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.inventory-price-consultation-page :deep(.price-product-column) { min-width: 240px; }

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

@media (max-width: 900px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .filters, .query-summary dl { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .filter-field { min-width: 0; }
}
</style>
