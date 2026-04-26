<template>
  <div class="inventory-validity-page">
    <AppPageHeader
      title="Validade de Produtos"
      :breadcrumbs="['Estoque', 'Controles', 'Validade de Produtos']"
      subtitle="Controle de vencimento, lote, localização e criticidade dos produtos em estoque"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory/nf" icon="🧾">Entrada NF</DsButton>
        <DsButton variant="primary" tag="a" to="/inventory/movements" icon="📥">Transação</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da validade de produtos">
      <DsStatCard :label="`${rows.length} item(ns) monitorado(s)`" value="" icon="📅" />
      <DsStatCard :label="`${expiredCount} vencido(s)`" value="" icon="⛔" />
      <DsStatCard :label="`${expiringCount} vencendo`" value="" icon="⚠️" />
      <DsStatCard :label="riskValueLabel" value="" icon="💵" />
    </section>

    <section class="validity-alerts">
      <DsAlert v-if="expiredCount > 0" variant="danger" dismissible>
        <strong>Bloqueio:</strong> {{ expiredCount }} lote(s) já ultrapassaram a validade e exigem conferência antes da saída.
      </DsAlert>
      <DsAlert v-else-if="expiringCount > 0" variant="warning" dismissible>
        <strong>Atenção:</strong> {{ expiringCount }} lote(s) vencem em até 30 dias.
      </DsAlert>
    </section>

    <section class="validity-layout">
      <section class="action-panel" aria-label="Conferência de validade">
        <h2>Conferência</h2>
        <div class="action-grid">
          <label class="field">
            <span>Produto</span>
            <select v-model="selectedRowId" data-testid="validity-product">
              <option value="">Selecione</option>
              <option v-for="row in rows" :key="row.id" :value="row.id">
                {{ row.code }} - {{ row.product }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Localização</span>
            <input :value="selectedRow?.location ?? 'Selecione um produto'" type="text" readonly />
          </label>

          <label class="field">
            <span>Lote</span>
            <input :value="selectedRow?.lotNumber ?? 'Selecione um produto'" type="text" readonly />
          </label>

          <label class="field">
            <span>Validade</span>
            <input :value="selectedRow ? formatOptionalDate(selectedRow.expiryDate) : 'Selecione um produto'" type="text" readonly />
          </label>
        </div>

        <div class="validity-preview">
          <span>Situação: {{ selectedRow?.statusLabel ?? 'Selecione um produto' }}</span>
          <strong>{{ selectedRow ? selectedRow.actionLabel : 'Nenhuma ação selecionada' }}</strong>
        </div>

        <div class="validity-actions">
          <DsButton
            tag="a"
            :to="selectedRow?.detailPath ?? '/inventory'"
            variant="primary"
            :disabled="!selectedRow"
          >
            Abrir Produto
          </DsButton>
          <DsButton tag="a" to="/inventory/nf" variant="secondary">Entrada NF</DsButton>
          <DsButton tag="a" to="/inventory/movements" variant="secondary">Transação</DsButton>
        </div>
      </section>

      <section class="filter-panel" aria-label="Filtros da validade de produtos">
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
            <span>Lote</span>
            <input v-model="draftFilters.lot" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Fornecedor</span>
            <input v-model="draftFilters.supplier" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Validade até</span>
            <input v-model="draftFilters.expiryUntil" type="date" />
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="draftFilters.status">
              <option value="">Todas</option>
              <option value="expired">Vencido</option>
              <option value="expiring">Vencendo</option>
              <option value="active">Ativo</option>
              <option value="depleted">Esgotado</option>
              <option value="untracked">Sem validade</option>
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
      empty-icon="📅"
      empty-title="Nenhum registro encontrado"
      empty-description="Lotes e produtos retornados pela API aparecerão aqui conforme os filtros."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as ValidityRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as ValidityRow).product }}</strong>
        <span class="muted"><br />{{ (row as ValidityRow).sourceLabel }}</span>
      </template>
      <template #cell-manufactureDate="{ row }">
        {{ formatOptionalDate((row as ValidityRow).manufactureDate) }}
      </template>
      <template #cell-expiryDate="{ row }">
        <span :class="dateClass((row as ValidityRow).status)">
          {{ formatOptionalDate((row as ValidityRow).expiryDate) }}
        </span>
      </template>
      <template #cell-daysToExpire="{ row }">
        {{ (row as ValidityRow).daysLabel }}
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as ValidityRow).quantity, (row as ValidityRow).unit) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as ValidityRow).statusLabel"
          :variant="(row as ValidityRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as ValidityRow).detailPath"
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

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type ValidityStatus = InventoryLotSummary['status'] | 'untracked';

interface ValidityRow {
  id: string;
  source: 'lot' | 'inventory';
  sourceLabel: string;
  code: string;
  product: string;
  lotNumber: string;
  location: string;
  supplier: string;
  manufactureDate?: string;
  expiryDate?: string;
  daysToExpire: number | null;
  daysLabel: string;
  quantity: number;
  unit: string;
  unitCost: number;
  riskValue: number;
  status: ValidityStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  actionLabel: string;
  detailPath: string;
}

const inventoryItems = ref<InventoryItemSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const loading = ref(false);
const error = ref('');
const selectedRowId = ref('');
const draftFilters = reactive({
  code: '',
  product: '',
  lot: '',
  supplier: '',
  expiryUntil: '',
  status: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'lotNumber', label: 'Lote', width: '130px' },
  { key: 'location', label: 'Estoque', width: '140px' },
  { key: 'supplier', label: 'Fornecedor', width: '160px' },
  { key: 'manufactureDate', label: 'Fabricação', width: '120px' },
  { key: 'expiryDate', label: 'Validade', width: '120px' },
  { key: 'daysToExpire', label: 'Dias', width: '90px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'status', label: 'Situação', width: '130px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const itemsById = computed<Record<string, InventoryItemSummary>>(() =>
  Object.fromEntries(inventoryItems.value.map((item) => [item.id, item]))
);
const rows = computed<ValidityRow[]>(() => {
  const lotRows = lots.value.map(lotToRow);
  const lotItemIds = new Set(lots.value.map((lot) => lot.inventoryItemId));
  const untrackedRows = inventoryItems.value
    .filter((item) => !lotItemIds.has(item.id))
    .map(itemToRow);
  return [...lotRows, ...untrackedRows].sort(compareValidityRows);
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const lot = normalizeSearch(appliedFilters.lot);
  const supplier = normalizeSearch(appliedFilters.supplier);
  const expiryUntil = appliedFilters.expiryUntil ? new Date(`${appliedFilters.expiryUntil}T23:59:59.999Z`).getTime() : null;
  const status = appliedFilters.status;
  return rows.value.filter((row) => {
    if (status && row.status !== status) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    if (lot && !normalizeSearch(row.lotNumber).includes(lot)) return false;
    if (supplier && !normalizeSearch(row.supplier).includes(supplier)) return false;
    if (expiryUntil !== null) {
      if (!row.expiryDate) return false;
      if (new Date(row.expiryDate).getTime() > expiryUntil) return false;
    }
    return true;
  });
});
const selectedRow = computed(() =>
  rows.value.find((row) => row.id === selectedRowId.value) ?? null
);
const expiredCount = computed(() =>
  rows.value.filter((row) => row.status === 'expired').length
);
const expiringCount = computed(() =>
  rows.value.filter((row) => row.status === 'expiring').length
);
const riskValueLabel = computed(() => {
  const value = rows.value
    .filter((row) => row.status === 'expired' || row.status === 'expiring')
    .reduce((sum, row) => sum + row.riskValue, 0);
  return `${formatCurrency(value)} em risco`;
});

function lotToRow(lot: InventoryLotSummary): ValidityRow {
  const item = itemsById.value[lot.inventoryItemId];
  const status = lot.status;
  const daysToExpire = getDaysToExpire(lot.expiryDate);
  const quantity = Math.max(lot.quantity, 0);
  const unitCost = item?.unitCostAmount ?? 0;
  return {
    id: lot.id,
    source: 'lot',
    sourceLabel: 'Lote rastreado',
    code: lot.sku,
    product: lot.itemName,
    lotNumber: lot.lotNumber || 'Sem lote',
    location: lot.location || 'Estoque principal',
    supplier: lot.supplier || 'Fornecedor não informado',
    manufactureDate: lot.manufactureDate,
    expiryDate: lot.expiryDate,
    daysToExpire,
    daysLabel: formatDays(daysToExpire, status),
    quantity,
    unit: lot.unit,
    unitCost,
    riskValue: quantity * unitCost,
    status,
    statusLabel: statusLabel(status),
    statusVariant: statusVariant(status),
    actionLabel: actionLabel(status),
    detailPath: `/inventory/${lot.inventoryItemId}`
  };
}

function itemToRow(item: InventoryItemSummary): ValidityRow {
  const quantity = Math.max(item.onHandQuantity, 0);
  return {
    id: `untracked-${item.id}`,
    source: 'inventory',
    sourceLabel: 'Sem lote informado',
    code: item.sku,
    product: item.name,
    lotNumber: 'Sem lote',
    location: 'Estoque principal',
    supplier: 'Fornecedor não informado',
    daysToExpire: null,
    daysLabel: 'Sem validade',
    quantity,
    unit: item.unit,
    unitCost: item.unitCostAmount,
    riskValue: 0,
    status: 'untracked',
    statusLabel: 'Sem validade',
    statusVariant: 'neutral',
    actionLabel: 'Vincular lote na entrada fiscal',
    detailPath: `/inventory/${item.id}`
  };
}

function compareValidityRows(left: ValidityRow, right: ValidityRow): number {
  const leftRank = statusRank(left.status);
  const rightRank = statusRank(right.status);
  if (leftRank !== rightRank) return leftRank - rightRank;
  const leftDate = left.expiryDate ?? '9999-12-31T00:00:00.000Z';
  const rightDate = right.expiryDate ?? '9999-12-31T00:00:00.000Z';
  return leftDate.localeCompare(rightDate) || left.product.localeCompare(right.product);
}

function statusRank(status: ValidityStatus): number {
  switch (status) {
    case 'expired':
      return 0;
    case 'expiring':
      return 1;
    case 'active':
      return 2;
    case 'depleted':
      return 3;
    default:
      return 4;
  }
}

function statusVariant(status: ValidityStatus): StatusVariant {
  switch (status) {
    case 'expired':
      return 'danger';
    case 'expiring':
      return 'warning';
    case 'active':
      return 'success';
    case 'depleted':
      return 'neutral';
    default:
      return 'info';
  }
}

function statusLabel(status: ValidityStatus): string {
  switch (status) {
    case 'expired':
      return 'Vencido';
    case 'expiring':
      return 'Vencendo';
    case 'active':
      return 'Ativo';
    case 'depleted':
      return 'Esgotado';
    default:
      return 'Sem validade';
  }
}

function actionLabel(status: ValidityStatus): string {
  switch (status) {
    case 'expired':
      return 'Bloquear saída e revisar lote';
    case 'expiring':
      return 'Priorizar consumo e reposição';
    case 'depleted':
      return 'Repor ou encerrar lote';
    case 'untracked':
      return 'Vincular lote na entrada fiscal';
    default:
      return 'Liberado para consumo';
  }
}

function dateClass(status: ValidityStatus): string | undefined {
  if (status === 'expired') return 'text-danger';
  if (status === 'expiring') return 'text-warning';
  return undefined;
}

function getDaysToExpire(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expiry = new Date(expiryDate);
  const expiryUtc = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
  return Math.ceil((expiryUtc - todayUtc) / 86_400_000);
}

function formatDays(days: number | null, status: ValidityStatus): string {
  if (status === 'depleted') return 'Esgotado';
  if (days === null) return 'Sem validade';
  if (days < 0) return `${Math.abs(days)} vencido(s)`;
  if (days === 0) return 'Hoje';
  return `${days} dia(s)`;
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function formatQuantity(quantity: number, unit: string): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(quantity)} ${unit}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatOptionalDate(value?: string): string {
  if (!value) return 'Sem validade';
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
    const query = draftFilters.product || draftFilters.code || draftFilters.lot || undefined;
    const [items, loadedLots] = await Promise.all([
      inventoryService.list(query),
      inventoryService.listLots()
    ]);
    inventoryItems.value = items;
    lots.value = loadedLots;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar validade de produtos';
    inventoryItems.value = [];
    lots.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-validity-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.validity-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.validity-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) minmax(340px, 1fr);
  gap: 16px;
  align-items: start;
}

.action-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.action-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.action-grid,
.filters {
  display: grid;
  gap: 12px;
}

.action-grid {
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

.validity-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.validity-actions {
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
  color: var(--color-danger, #ef4444);
}

.text-warning {
  color: var(--color-warning, #f59e0b);
}

@media (max-width: 980px) {
  .validity-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .action-grid,
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
