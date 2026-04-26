<template>
  <div class="inventory-invoices-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Entrada de Nota Fiscal']"
      title="Entrada de Nota Fiscal"
      subtitle="Conferência de entrada fiscal conectada ao estoque, lotes, custos e fornecedores"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/products/new" icon="➕">Novo Produto</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da entrada de nota fiscal">
      <DsStatCard :label="`${rows.length} item(ns) conferíveis`" value="" icon="🧾" />
      <DsStatCard :label="`${lotRowsCount} lote(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${supplierCount} fornecedor(es)`" value="" icon="🚚" />
      <DsStatCard :label="totalValueLabel" value="" icon="💵" />
    </section>

    <section class="filter-panel" aria-label="Filtros da entrada de nota fiscal">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Nota Fiscal</span>
          <input v-model="draftFilters.invoice" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Fornecedor</span>
          <input v-model="draftFilters.supplier" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Produto</span>
          <input v-model="draftFilters.product" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Lote</span>
          <input v-model="draftFilters.lot" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Status</span>
          <select v-model="draftFilters.status">
            <option value="">Todos</option>
            <option value="pending">Pendente</option>
            <option value="checked">Conferida</option>
            <option value="attention">Atenção</option>
          </select>
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="🧾"
      empty-title="Nenhum registro encontrado"
      empty-description="Entradas fiscais, lotes e itens de estoque aparecerão aqui conforme os dados da API."
      variant="hoverable"
    >
      <template #cell-invoiceNumber="{ row }">
        <span class="record-id">{{ (row as InvoiceEntryRow).invoiceNumber }}</span>
      </template>
      <template #cell-supplier="{ row }">
        <strong>{{ (row as InvoiceEntryRow).supplier }}</strong>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as InvoiceEntryRow).product }}</strong>
        <span class="muted"><br />{{ (row as InvoiceEntryRow).code }}</span>
      </template>
      <template #cell-entryDate="{ row }">
        {{ formatDate((row as InvoiceEntryRow).entryDate) }}
      </template>
      <template #cell-expiryDate="{ row }">
        {{ formatOptionalDate((row as InvoiceEntryRow).expiryDate) }}
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as InvoiceEntryRow).quantity) }} {{ (row as InvoiceEntryRow).unit }}
      </template>
      <template #cell-unitCost="{ row }">
        {{ formatCurrency((row as InvoiceEntryRow).unitCost) }}
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrency((row as InvoiceEntryRow).total) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as InvoiceEntryRow).statusLabel"
          :variant="(row as InvoiceEntryRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as InvoiceEntryRow).detailPath"
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
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';

type InvoiceStatus = 'pending' | 'checked' | 'attention';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface InvoiceEntryRow {
  id: string;
  source: 'lot' | 'inventory';
  invoiceNumber: string;
  supplier: string;
  product: string;
  code: string;
  lotNumber: string;
  entryDate: string;
  expiryDate?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  status: InvoiceStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  detailPath: string;
}

const inventoryItems = ref<InventoryItemSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const loading = ref(false);
const error = ref('');
const draftFilters = reactive({
  invoice: '',
  supplier: '',
  product: '',
  lot: '',
  status: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'invoiceNumber', label: 'Nota Fiscal', width: '140px' },
  { key: 'supplier', label: 'Fornecedor', width: '180px' },
  { key: 'product', label: 'Produto' },
  { key: 'lotNumber', label: 'Lote', width: '140px' },
  { key: 'entryDate', label: 'Entrada', width: '120px' },
  { key: 'expiryDate', label: 'Validade', width: '120px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'unitCost', label: 'Custo Unit.', width: '120px' },
  { key: 'total', label: 'Valor', width: '120px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const rows = computed<InvoiceEntryRow[]>(() => {
  const lotRows = lots.value.map(lotToRow);
  const lotItemIds = new Set(lots.value.map((lot) => lot.inventoryItemId));
  const inventoryRows = inventoryItems.value
    .filter((item) => !lotItemIds.has(item.id))
    .map(inventoryItemToRow);
  return [...lotRows, ...inventoryRows].sort((left, right) =>
    left.product.localeCompare(right.product)
  );
});

const filteredRows = computed(() => {
  const invoice = normalizeSearch(appliedFilters.invoice);
  const supplier = normalizeSearch(appliedFilters.supplier);
  const product = normalizeSearch(appliedFilters.product);
  const lot = normalizeSearch(appliedFilters.lot);
  const status = appliedFilters.status;
  return rows.value.filter((row) => {
    if (status && row.status !== status) return false;
    if (invoice && !normalizeSearch(row.invoiceNumber).includes(invoice)) return false;
    if (supplier && !normalizeSearch(row.supplier).includes(supplier)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    if (lot && !normalizeSearch(row.lotNumber).includes(lot)) return false;
    return true;
  });
});

const lotRowsCount = computed(() => rows.value.filter((row) => row.source === 'lot').length);
const supplierCount = computed(() => {
  const suppliers = rows.value
    .map((row) => row.supplier)
    .filter((supplier) => supplier !== 'Fornecedor não informado');
  return new Set(suppliers).size;
});
const totalValueLabel = computed(() => `${formatCurrency(rows.value.reduce((sum, row) => sum + row.total, 0))} em itens`);

function lotToRow(lot: InventoryLotSummary): InvoiceEntryRow {
  const status = lot.status === 'expired' || lot.status === 'expiring' ? 'attention' : 'checked';
  return {
    id: lot.id,
    source: 'lot',
    invoiceNumber: buildInvoiceNumber(lot.lotNumber || lot.sku),
    supplier: lot.supplier || 'Fornecedor não informado',
    product: lot.itemName,
    code: lot.sku,
    lotNumber: lot.lotNumber || 'Sem lote',
    entryDate: lot.createdAt,
    expiryDate: lot.expiryDate,
    quantity: lot.quantity,
    unit: lot.unit,
    unitCost: findUnitCost(lot.inventoryItemId, lot.sku),
    total: lot.quantity * findUnitCost(lot.inventoryItemId, lot.sku),
    status,
    statusLabel: status === 'attention' ? 'Atenção' : 'Conferida',
    statusVariant: status === 'attention' ? 'warning' : 'success',
    detailPath: `/inventory/${lot.inventoryItemId}`
  };
}

function inventoryItemToRow(item: InventoryItemSummary): InvoiceEntryRow {
  const quantity = Math.max(item.onHandQuantity, 0);
  return {
    id: item.id,
    source: 'inventory',
    invoiceNumber: buildInvoiceNumber(item.sku),
    supplier: 'Fornecedor não informado',
    product: item.name,
    code: item.sku,
    lotNumber: 'A conferir',
    entryDate: item.updatedAt || item.createdAt,
    quantity,
    unit: item.unit,
    unitCost: item.unitCostAmount,
    total: quantity * item.unitCostAmount,
    status: 'pending',
    statusLabel: 'Pendente',
    statusVariant: 'warning',
    detailPath: `/inventory/${item.id}`
  };
}

function findUnitCost(inventoryItemId: string, sku: string): number {
  const item = inventoryItems.value.find(
    (candidate) => candidate.id === inventoryItemId || candidate.sku === sku
  );
  return item?.unitCostAmount ?? 0;
}

function buildInvoiceNumber(seed: string): string {
  const normalized = seed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-6);
  return normalized ? `NF-${normalized}` : 'NF-AUTO';
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function formatOptionalDate(value?: string): string {
  return value ? formatDate(value) : 'Sem validade';
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const query = draftFilters.product || draftFilters.invoice || draftFilters.lot || undefined;
    const [items, loadedLots] = await Promise.all([
      inventoryService.list(query),
      inventoryService.listLots()
    ]);
    inventoryItems.value = items;
    lots.value = loadedLots;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar entrada de nota fiscal';
    inventoryItems.value = [];
    lots.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-invoices-page {
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
  grid-template-columns: minmax(120px, 0.8fr) minmax(160px, 1fr) minmax(180px, 1.2fr) minmax(120px, 0.8fr) minmax(130px, 0.7fr) auto;
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

@media (max-width: 1160px) {
  .filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
