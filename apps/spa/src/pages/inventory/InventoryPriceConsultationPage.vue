<template>
  <div class="inventory-price-consultation-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Consulta de Preços']"
      title="Consulta de Preços"
      subtitle="Consulta rápida de preço, custo, saldo e disponibilidade para balcão, comanda e atendimento"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/products/new" icon="➕">Novo Produto</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da consulta de preços">
      <DsStatCard :label="`${rows.length} item(ns)`" value="" icon="🔎" />
      <DsStatCard :label="`${availableCount} com saldo`" value="" icon="📦" />
      <DsStatCard :label="`${lowStockCount} abaixo do ponto`" value="" icon="⚠️" />
      <DsStatCard :label="averageMarginLabel" value="" icon="💵" />
    </section>

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
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="🔎"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou cadastre produtos e itens de estoque."
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
        <span :class="{ 'text-danger': (row as PriceConsultationRow).marginAmount < 0 }">
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
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
  salePrice: number;
  costAmount: number;
  marginAmount: number;
  stockQuantity: number | null;
  unit: string;
  stockLabel: string;
  statusLabel: string;
  statusVariant: StatusVariant;
  detailPath: string;
}

const products = ref<ProductSummary[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const loading = ref(false);
const error = ref('');
const draftFilters = reactive({
  code: '',
  name: '',
  source: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '140px' },
  { key: 'name', label: 'Produto' },
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

const availableCount = computed(() =>
  rows.value.filter((row) => row.stockQuantity === null || row.stockQuantity > 0).length
);
const lowStockCount = computed(() =>
  rows.value.filter((row) => row.statusLabel === 'Abaixo do ponto').length
);
const averageMarginLabel = computed(() => {
  const pricedRows = rows.value.filter((row) => row.marginAmount !== 0);
  if (!pricedRows.length) return '0 margem média';
  const average = pricedRows.reduce((sum, row) => sum + row.marginAmount, 0) / pricedRows.length;
  return `${formatCurrency(average)} margem média`;
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
    costAmount: 0,
    marginAmount: product.basePrice,
    stockQuantity: null,
    unit: 'un',
    stockLabel: 'Sem saldo vinculado',
    statusLabel: product.active ? 'Ativo' : 'Inativo',
    statusVariant: product.active ? 'success' : 'neutral',
    detailPath: `/products/${product.id}`
  };
}

function inventoryItemToRow(item: InventoryItemSummary): PriceConsultationRow {
  const salePrice = Math.round(item.unitCostAmount * 1.35 * 100) / 100;
  const lowStock = item.onHandQuantity <= item.reorderLevel;
  return {
    id: item.id,
    source: 'inventory',
    sourceLabel: 'Estoque',
    code: item.sku,
    name: item.name,
    description: 'Item de estoque com custo e saldo operacional',
    salePrice,
    costAmount: item.unitCostAmount,
    marginAmount: salePrice - item.unitCostAmount,
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
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
    const [productItems, stockItems] = await Promise.all([
      productsService.list(query),
      inventoryService.list(query)
    ]);
    products.value = productItems;
    inventoryItems.value = stockItems;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar consulta de preços';
    products.value = [];
    inventoryItems.value = [];
  } finally {
    loading.value = false;
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

.hub-kpis {
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
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
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

@media (max-width: 900px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
