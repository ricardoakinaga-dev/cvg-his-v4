<template>
  <div class="inventory-transfers-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Transferência entre Estoques']"
      title="Transferência entre Estoques"
      subtitle="Conferência operacional de origem, destino, lote e saldo para remanejamento interno"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory/movements" icon="📥">Transação</DsButton>
        <DsButton variant="primary" tag="a" to="/warehouses" icon="🏬">Estoques</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da transferência entre estoques">
      <DsStatCard :label="`${items.length} item(ns)`" value="" icon="📦" />
      <DsStatCard :label="`${locationCount} local(is)`" value="" icon="🏬" />
      <DsStatCard :label="`${lowStockCount} abaixo do ponto`" value="" icon="⚠️" />
      <DsStatCard :label="`${preparedRows.length} preparada(s)`" value="" icon="🔄" />
    </section>

    <section class="transfer-layout">
      <form class="transfer-panel" aria-label="Preparar transferência entre estoques" @submit.prevent="submitTransfer">
        <h2>Transferência</h2>
        <div class="transfer-grid">
          <label class="field">
            <span>Origem</span>
            <select v-model="transfer.origin" data-testid="transfer-origin">
              <option v-for="location in availableLocations" :key="location" :value="location">
                {{ location }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Destino</span>
            <select v-model="transfer.destination" data-testid="transfer-destination">
              <option v-for="location in destinationLocations" :key="location" :value="location">
                {{ location }}
              </option>
            </select>
          </label>

          <label class="field field--wide">
            <span>Produto</span>
            <select v-model="transfer.inventoryItemId" data-testid="transfer-product">
              <option value="">Selecione</option>
              <option v-for="item in items" :key="item.id" :value="item.id">
                {{ item.sku }} - {{ item.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Código de Barras</span>
            <input v-model="transfer.code" type="search" autocomplete="off" data-testid="transfer-code" />
          </label>

          <label class="field">
            <span>Lote</span>
            <select v-model="transfer.lotId" data-testid="transfer-lot">
              <option value="">Sem lote</option>
              <option v-for="lot in selectableLots" :key="lot.id" :value="lot.id">
                {{ lot.lotNumber }} - {{ locationLabel(lot.location) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Quantidade</span>
            <input v-model.number="transfer.quantity" type="number" min="0.01" step="0.01" data-testid="transfer-quantity" />
          </label>

          <label class="field">
            <span>Responsável</span>
            <input v-model="transfer.responsible" type="text" autocomplete="off" data-testid="transfer-responsible" />
          </label>

          <label class="field field--wide">
            <span>Observação</span>
            <input v-model="transfer.notes" type="text" maxlength="180" data-testid="transfer-notes" />
          </label>
        </div>

        <div class="transfer-preview">
          <span>Saldo origem: {{ originBalanceLabel }}</span>
          <strong>Após separar: {{ previewBalanceLabel }}</strong>
        </div>

        <div class="transfer-actions">
          <DsButton type="submit" variant="primary" :loading="saving">Preparar</DsButton>
          <DsButton type="button" variant="secondary" @click="resetTransfer">Limpar</DsButton>
        </div>
      </form>

      <section class="filter-panel" aria-label="Filtros de transferência entre estoques">
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
            <span>Origem</span>
            <select v-model="draftFilters.origin">
              <option value="">Todas</option>
              <option v-for="location in availableLocations" :key="location" :value="location">
                {{ location }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Destino</span>
            <select v-model="draftFilters.destination">
              <option value="">Todos</option>
              <option v-for="location in destinationLocations" :key="location" :value="location">
                {{ location }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="draftFilters.status">
              <option value="">Todas</option>
              <option value="ready">Disponível</option>
              <option value="attention">Atenção</option>
              <option value="blocked">Bloqueada</option>
              <option value="prepared">Preparada</option>
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
      empty-icon="🔄"
      empty-title="Nenhuma transferência encontrada"
      empty-description="Itens, lotes e transferências preparadas aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as TransferRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as TransferRow).product }}</strong>
      </template>
      <template #cell-lot="{ row }">
        {{ (row as TransferRow).lot }}
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as TransferRow).quantity, (row as TransferRow).unit) }}
      </template>
      <template #cell-balance="{ row }">
        {{ (row as TransferRow).balanceLabel }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as TransferRow).statusLabel"
          :variant="(row as TransferRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as TransferRow).date) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as TransferRow).detailPath"
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

type TransferStatus = 'ready' | 'attention' | 'blocked' | 'prepared';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface TransferRow {
  id: string;
  code: string;
  product: string;
  origin: string;
  destination: string;
  lot: string;
  quantity: number;
  unit: string;
  balanceLabel: string;
  status: TransferStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  responsible: string;
  date: string;
  detailPath: string;
}

const defaultLocations = [
  'Estoque principal',
  'Farmácia',
  'Internação',
  'Laboratório',
  'Centro cirúrgico',
  'Quarentena'
];

const items = ref<InventoryItemSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const preparedRows = ref<TransferRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');

const transfer = reactive({
  origin: 'Estoque principal',
  destination: 'Farmácia',
  inventoryItemId: '',
  code: '',
  lotId: '',
  quantity: 1,
  responsible: '',
  notes: ''
});

const draftFilters = reactive({
  code: '',
  product: '',
  origin: '',
  destination: '',
  status: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'origin', label: 'Origem', width: '150px' },
  { key: 'destination', label: 'Destino', width: '150px' },
  { key: 'lot', label: 'Lote', width: '160px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'balance', label: 'Saldo', width: '140px' },
  { key: 'status', label: 'Situação', width: '130px' },
  { key: 'responsible', label: 'Responsável', width: '140px' },
  { key: 'date', label: 'Data', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const itemsById = computed<Record<string, InventoryItemSummary>>(() =>
  Object.fromEntries(items.value.map((item) => [item.id, item]))
);
const availableLocations = computed(() => {
  const discovered = lots.value.map((lot) => locationLabel(lot.location));
  return Array.from(new Set([...defaultLocations, ...discovered])).filter(Boolean);
});
const destinationLocations = computed(() =>
  availableLocations.value.filter((location) => location !== transfer.origin)
);
const selectedItem = computed(() =>
  items.value.find((item) => item.id === transfer.inventoryItemId)
    ?? items.value.find((item) => normalizeSearch(item.sku) === normalizeSearch(transfer.code))
    ?? null
);
const selectableLots = computed(() =>
  lots.value.filter((lot) =>
    selectedItem.value
      ? lot.inventoryItemId === selectedItem.value.id
      : lot.quantity > 0
  )
);
const selectedLot = computed(() =>
  selectableLots.value.find((lot) => lot.id === transfer.lotId)
    ?? selectableLots.value.find((lot) => locationLabel(lot.location) === transfer.origin)
    ?? null
);
const originBalance = computed(() => {
  if (selectedLot.value) return selectedLot.value.quantity;
  return selectedItem.value?.onHandQuantity ?? null;
});
const originBalanceLabel = computed(() => {
  if (!selectedItem.value || originBalance.value === null) return 'Selecione um produto';
  return formatQuantity(originBalance.value, selectedItem.value.unit);
});
const previewBalance = computed(() => {
  if (originBalance.value === null) return null;
  const quantity = Number(transfer.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  return Number((originBalance.value - quantity).toFixed(2));
});
const previewBalanceLabel = computed(() => {
  if (!selectedItem.value || previewBalance.value === null) return 'Selecione produto e quantidade';
  return formatQuantity(previewBalance.value, selectedItem.value.unit);
});
const locationCount = computed(() => availableLocations.value.length);
const lowStockCount = computed(() =>
  items.value.filter((item) => item.onHandQuantity <= item.reorderLevel).length
);
const rows = computed<TransferRow[]>(() => {
  const lotRows = lots.value.map(lotToRow);
  const criticalRows = items.value
    .filter((item) => item.onHandQuantity <= item.reorderLevel)
    .map(itemToCriticalRow);
  return [...preparedRows.value, ...criticalRows, ...lotRows].sort((left, right) =>
    right.date.localeCompare(left.date)
  );
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const origin = normalizeSearch(appliedFilters.origin);
  const destination = normalizeSearch(appliedFilters.destination);
  const status = appliedFilters.status;

  return rows.value.filter((row) => {
    if (status && row.status !== status) return false;
    if (origin && normalizeSearch(row.origin) !== origin) return false;
    if (destination && normalizeSearch(row.destination) !== destination) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    return true;
  });
});

watch(
  () => transfer.inventoryItemId,
  (itemId) => {
    const item = items.value.find((candidate) => candidate.id === itemId);
    if (!item) return;
    transfer.code = item.sku;
    const itemLot = lots.value.find((lot) => lot.inventoryItemId === item.id && lot.quantity > 0);
    if (itemLot) {
      transfer.lotId = itemLot.id;
      transfer.origin = locationLabel(itemLot.location);
    }
  }
);

watch(
  () => transfer.origin,
  () => {
    if (transfer.destination === transfer.origin) {
      transfer.destination = destinationLocations.value[0] ?? 'Farmácia';
    }
  }
);

function lotToRow(lot: InventoryLotSummary): TransferRow {
  const item = itemsById.value[lot.inventoryItemId];
  const status = lotStatus(lot);
  return {
    id: `lot-transfer-${lot.id}`,
    code: lot.sku,
    product: lot.itemName,
    origin: locationLabel(lot.location),
    destination: suggestedDestination(lot, item),
    lot: lot.lotNumber,
    quantity: lot.quantity,
    unit: lot.unit,
    balanceLabel: item ? formatQuantity(item.onHandQuantity, item.unit) : formatQuantity(lot.quantity, lot.unit),
    status,
    statusLabel: statusLabel(status),
    statusVariant: statusVariant(status),
    responsible: 'Estoque',
    date: lot.updatedAt || lot.createdAt,
    detailPath: item ? `/inventory/${item.id}` : '/inventory'
  };
}

function itemToCriticalRow(item: InventoryItemSummary): TransferRow {
  return {
    id: `critical-transfer-${item.id}`,
    code: item.sku,
    product: item.name,
    origin: 'Estoque principal',
    destination: preferredDestination(item),
    lot: 'Conferir lote',
    quantity: Math.max(Number((item.reorderLevel - item.onHandQuantity).toFixed(2)), 1),
    unit: item.unit,
    balanceLabel: formatQuantity(item.onHandQuantity, item.unit),
    status: 'attention',
    statusLabel: 'Atenção',
    statusVariant: 'warning',
    responsible: 'Reposição',
    date: item.updatedAt || item.createdAt,
    detailPath: `/inventory/${item.id}`
  };
}

function lotStatus(lot: InventoryLotSummary): TransferStatus {
  if (lot.status === 'expired' || lot.status === 'depleted') return 'blocked';
  if (lot.status === 'expiring' || lot.quantity <= 0) return 'attention';
  return 'ready';
}

function statusLabel(status: TransferStatus): string {
  if (status === 'prepared') return 'Preparada';
  if (status === 'blocked') return 'Bloqueada';
  if (status === 'attention') return 'Atenção';
  return 'Disponível';
}

function statusVariant(status: TransferStatus): StatusVariant {
  if (status === 'prepared') return 'info';
  if (status === 'blocked') return 'danger';
  if (status === 'attention') return 'warning';
  return 'success';
}

function locationLabel(location?: string): string {
  const normalized = location?.trim();
  return normalized || 'Estoque principal';
}

function preferredDestination(item: InventoryItemSummary): string {
  const searchable = normalizeSearch(`${item.sku} ${item.name} ${item.unit}`);
  if (searchable.includes('med') || searchable.includes('ampola') || searchable.includes('farmacia')) return 'Farmácia';
  if (searchable.includes('cateter') || searchable.includes('cirurg')) return 'Centro cirúrgico';
  return 'Estoque principal';
}

function suggestedDestination(lot: InventoryLotSummary, item?: InventoryItemSummary): string {
  if (lot.status === 'expired' || lot.status === 'depleted') return 'Quarentena';
  const preferred = item ? preferredDestination(item) : 'Estoque principal';
  return preferred === locationLabel(lot.location) ? 'Estoque principal' : preferred;
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

function resetTransfer() {
  transfer.origin = 'Estoque principal';
  transfer.destination = 'Farmácia';
  transfer.inventoryItemId = '';
  transfer.code = '';
  transfer.lotId = '';
  transfer.quantity = 1;
  transfer.responsible = '';
  transfer.notes = '';
}

async function submitTransfer() {
  error.value = '';
  successMessage.value = '';
  const item = selectedItem.value;
  if (!item) {
    error.value = 'Selecione um produto para preparar a transferência';
    return;
  }

  if (transfer.origin === transfer.destination) {
    error.value = 'Origem e destino precisam ser diferentes';
    return;
  }

  const quantity = Number(transfer.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    error.value = 'Informe uma quantidade maior que zero';
    return;
  }

  if (originBalance.value !== null && quantity > originBalance.value) {
    error.value = 'A transferência não pode separar quantidade maior que o saldo de origem';
    return;
  }

  saving.value = true;
  try {
    const row: TransferRow = {
      id: `prepared-transfer-${Date.now()}`,
      code: item.sku,
      product: item.name,
      origin: transfer.origin,
      destination: transfer.destination,
      lot: selectedLot.value?.lotNumber ?? 'Sem lote',
      quantity,
      unit: item.unit,
      balanceLabel: formatQuantity(item.onHandQuantity, item.unit),
      status: 'prepared',
      statusLabel: 'Preparada',
      statusVariant: 'info',
      responsible: transfer.responsible.trim() || 'Estoque',
      date: new Date().toISOString(),
      detailPath: `/inventory/${item.id}`
    };
    preparedRows.value = [row, ...preparedRows.value];
    successMessage.value = `${item.name} preparado para transferência de ${transfer.origin} para ${transfer.destination}`;
    resetTransfer();
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
    error.value = err instanceof Error ? err.message : 'Erro ao carregar transferências entre estoques';
    items.value = [];
    lots.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-transfers-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.transfer-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
  align-items: start;
}

.transfer-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.transfer-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.transfer-grid,
.filters {
  display: grid;
  gap: 12px;
}

.transfer-grid {
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

.transfer-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.transfer-actions {
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
  .transfer-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .transfer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
