<template>
  <div class="inventory-data-collectors-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Coletores de Dados']"
      title="Coletores de Dados"
      subtitle="Conferência por coletor, código de barras, lote, saldo e divergência operacional"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory/movements" icon="📥">Transação</DsButton>
        <DsButton variant="primary" tag="a" to="/inventory/audit" icon="🧾">Auditoria</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo dos coletores de dados">
      <DsStatCard :label="`${items.length} item(ns)`" value="" icon="📦" />
      <DsStatCard :label="`${lotCount} lote(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${divergenceCount} divergência(s)`" value="" icon="⚠️" />
      <DsStatCard :label="`${collectedRows.length} coleta(s)`" value="" icon="📟" />
    </section>

    <section class="collector-layout">
      <form class="collector-panel" aria-label="Registrar coleta de dados" @submit.prevent="submitCollection">
        <h2>Coleta</h2>
        <div class="collector-grid">
          <label class="field">
            <span>Coletor</span>
            <select v-model="collection.collector" data-testid="collector-device">
              <option value="Coletor 01">Coletor 01</option>
              <option value="Coletor 02">Coletor 02</option>
              <option value="Mobile">Mobile</option>
              <option value="Balcão">Balcão</option>
            </select>
          </label>

          <label class="field">
            <span>Operação</span>
            <select v-model="collection.operation" data-testid="collector-operation">
              <option value="inventory">Inventário</option>
              <option value="entry">Entrada</option>
              <option value="exit">Saída</option>
              <option value="transfer">Transferência</option>
            </select>
          </label>

          <label class="field field--wide">
            <span>Produto</span>
            <select v-model="collection.inventoryItemId" data-testid="collector-product">
              <option value="">Selecione</option>
              <option v-for="item in items" :key="item.id" :value="item.id">
                {{ item.sku }} - {{ item.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Código de Barras</span>
            <input v-model="collection.code" type="search" autocomplete="off" data-testid="collector-code" />
          </label>

          <label class="field">
            <span>Lote</span>
            <select v-model="collection.lotId" data-testid="collector-lot">
              <option value="">Sem lote</option>
              <option v-for="lot in selectableLots" :key="lot.id" :value="lot.id">
                {{ lot.lotNumber }} - {{ locationLabel(lot.location) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Quantidade Coletada</span>
            <input v-model.number="collection.quantity" type="number" min="0" step="0.01" data-testid="collector-quantity" />
          </label>

          <label class="field">
            <span>Responsável</span>
            <input v-model="collection.responsible" type="text" autocomplete="off" data-testid="collector-responsible" />
          </label>

          <label class="field field--wide">
            <span>Observação</span>
            <input v-model="collection.notes" type="text" maxlength="180" data-testid="collector-notes" />
          </label>
        </div>

        <div class="collector-preview">
          <span>Saldo atual: {{ balanceLabel }}</span>
          <strong>Divergência: {{ divergencePreviewLabel }}</strong>
        </div>

        <div class="collector-actions">
          <DsButton type="submit" variant="primary" :loading="saving">Registrar Coleta</DsButton>
          <DsButton type="button" variant="secondary" @click="resetCollection">Limpar</DsButton>
        </div>
      </form>

      <section class="filter-panel" aria-label="Filtros de coletores de dados">
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
            <span>Coletor</span>
            <input v-model="draftFilters.collector" type="search" autocomplete="off" />
          </label>
          <label class="field">
            <span>Operação</span>
            <select v-model="draftFilters.operation">
              <option value="">Todas</option>
              <option value="inventory">Inventário</option>
              <option value="entry">Entrada</option>
              <option value="exit">Saída</option>
              <option value="transfer">Transferência</option>
            </select>
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="draftFilters.status">
              <option value="">Todas</option>
              <option value="pending">Pendente</option>
              <option value="attention">Atenção</option>
              <option value="collected">Coletado</option>
              <option value="divergence">Divergência</option>
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
      empty-icon="📟"
      empty-title="Nenhuma coleta encontrada"
      empty-description="Produtos, lotes e coletas registradas aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as DataCollectorRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as DataCollectorRow).product }}</strong>
      </template>
      <template #cell-operation="{ row }">
        {{ (row as DataCollectorRow).operationLabel }}
      </template>
      <template #cell-lot="{ row }">
        {{ (row as DataCollectorRow).lotLabel }}
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as DataCollectorRow).quantity, (row as DataCollectorRow).unit) }}
      </template>
      <template #cell-balance="{ row }">
        {{ (row as DataCollectorRow).balanceLabel }}
      </template>
      <template #cell-divergence="{ row }">
        {{ (row as DataCollectorRow).divergenceLabel }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as DataCollectorRow).statusLabel"
          :variant="(row as DataCollectorRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as DataCollectorRow).date) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as DataCollectorRow).detailPath"
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

type CollectorOperation = 'inventory' | 'entry' | 'exit' | 'transfer';
type CollectorStatus = 'pending' | 'attention' | 'collected' | 'divergence';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface DataCollectorRow {
  id: string;
  code: string;
  product: string;
  collector: string;
  operation: CollectorOperation;
  operationLabel: string;
  lotLabel: string;
  quantity: number;
  unit: string;
  balanceLabel: string;
  divergence: number;
  divergenceLabel: string;
  status: CollectorStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  responsible: string;
  date: string;
  detailPath: string;
}

const items = ref<InventoryItemSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const collectedRows = ref<DataCollectorRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');

const collection = reactive({
  collector: 'Coletor 01',
  operation: 'inventory' as CollectorOperation,
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
  collector: '',
  operation: '',
  status: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'collector', label: 'Coletor', width: '130px' },
  { key: 'operation', label: 'Operação', width: '130px' },
  { key: 'lot', label: 'Lote', width: '160px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'balance', label: 'Saldo', width: '140px' },
  { key: 'divergence', label: 'Divergência', width: '130px' },
  { key: 'status', label: 'Situação', width: '120px' },
  { key: 'responsible', label: 'Responsável', width: '140px' },
  { key: 'date', label: 'Data', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const lotsByItemId = computed<Record<string, InventoryLotSummary[]>>(() => {
  const grouped: Record<string, InventoryLotSummary[]> = {};
  for (const lot of lots.value) {
    grouped[lot.inventoryItemId] = [...(grouped[lot.inventoryItemId] ?? []), lot];
  }
  return grouped;
});
const selectedItem = computed(() =>
  items.value.find((item) => item.id === collection.inventoryItemId)
    ?? items.value.find((item) => normalizeSearch(item.sku) === normalizeSearch(collection.code))
    ?? null
);
const selectableLots = computed(() =>
  selectedItem.value ? (lotsByItemId.value[selectedItem.value.id] ?? []) : lots.value
);
const selectedLot = computed(() =>
  lots.value.find((lot) => lot.id === collection.lotId) ?? null
);
const lotCount = computed(() => lots.value.length);
const balanceQuantity = computed(() => selectedLot.value?.quantity ?? selectedItem.value?.onHandQuantity ?? null);
const balanceLabel = computed(() =>
  selectedItem.value && balanceQuantity.value !== null
    ? formatQuantity(balanceQuantity.value, selectedItem.value.unit)
    : 'Selecione um produto'
);
const divergencePreview = computed(() => {
  if (balanceQuantity.value === null || !Number.isFinite(collection.quantity)) return null;
  return collection.quantity - balanceQuantity.value;
});
const divergencePreviewLabel = computed(() =>
  divergencePreview.value === null || !selectedItem.value
    ? 'Selecione produto e quantidade'
    : formatSignedQuantity(divergencePreview.value, selectedItem.value.unit)
);
const rows = computed<DataCollectorRow[]>(() => {
  const pendingRows = items.value.map(itemToPendingRow);
  return [...collectedRows.value, ...pendingRows].sort((left, right) =>
    statusRank(left.status) - statusRank(right.status) || right.date.localeCompare(left.date)
  );
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const collector = normalizeSearch(appliedFilters.collector);
  const operation = appliedFilters.operation;
  const status = appliedFilters.status;

  return rows.value.filter((row) => {
    if (operation && row.operation !== operation) return false;
    if (status && row.status !== status) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    if (collector && !normalizeSearch(row.collector).includes(collector)) return false;
    return true;
  });
});
const divergenceCount = computed(() =>
  rows.value.filter((row) => row.status === 'divergence').length
);

watch(
  () => collection.inventoryItemId,
  (itemId) => {
    const item = items.value.find((candidate) => candidate.id === itemId);
    if (item) {
      collection.code = item.sku;
      const firstLot = lotsByItemId.value[item.id]?.[0];
      collection.lotId = firstLot?.id ?? '';
    }
  }
);

function itemToPendingRow(item: InventoryItemSummary): DataCollectorRow {
  const itemLots = lotsByItemId.value[item.id] ?? [];
  const lotLabel = itemLots.length > 0 ? `${itemLots.length} lote(s)` : 'Sem lote';
  const status: CollectorStatus = item.onHandQuantity <= item.reorderLevel ? 'attention' : 'pending';
  return {
    id: `pending-collector-${item.id}`,
    code: item.sku,
    product: item.name,
    collector: 'Aguardando',
    operation: 'inventory',
    operationLabel: 'Inventário',
    lotLabel,
    quantity: item.onHandQuantity,
    unit: item.unit,
    balanceLabel: formatQuantity(item.onHandQuantity, item.unit),
    divergence: 0,
    divergenceLabel: formatSignedQuantity(0, item.unit),
    status,
    statusLabel: status === 'attention' ? 'Atenção' : 'Pendente',
    statusVariant: status === 'attention' ? 'warning' : 'info',
    responsible: 'Aguardando',
    date: item.updatedAt || item.createdAt,
    detailPath: `/inventory/${item.id}`
  };
}

function collectionToRow(item: InventoryItemSummary): DataCollectorRow {
  const currentBalance = selectedLot.value?.quantity ?? item.onHandQuantity;
  const divergence = collection.quantity - currentBalance;
  const hasDivergence = Math.abs(divergence) > 0.0001;
  return {
    id: `collected-${item.id}-${Date.now()}`,
    code: item.sku,
    product: item.name,
    collector: collection.collector,
    operation: collection.operation,
    operationLabel: operationLabel(collection.operation),
    lotLabel: selectedLot.value?.lotNumber ?? 'Sem lote',
    quantity: collection.quantity,
    unit: item.unit,
    balanceLabel: formatQuantity(currentBalance, item.unit),
    divergence,
    divergenceLabel: formatSignedQuantity(divergence, item.unit),
    status: hasDivergence ? 'divergence' : 'collected',
    statusLabel: hasDivergence ? 'Divergência' : 'Coletado',
    statusVariant: hasDivergence ? 'danger' : 'success',
    responsible: collection.responsible || 'Nao informado',
    date: new Date().toISOString(),
    detailPath: `/inventory/${item.id}`
  };
}

function statusRank(status: CollectorStatus): number {
  return {
    divergence: 0,
    attention: 1,
    collected: 2,
    pending: 3
  }[status];
}

function operationLabel(operation: CollectorOperation): string {
  return {
    inventory: 'Inventário',
    entry: 'Entrada',
    exit: 'Saída',
    transfer: 'Transferência'
  }[operation];
}

function locationLabel(value: string | undefined): string {
  return value?.trim() || 'Sem localização';
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function formatQuantity(value: number, unit: string): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function formatSignedQuantity(value: number, unit: string): string {
  const signal = value > 0 ? '+' : '';
  return `${signal}${formatQuantity(value, unit)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

function resetCollection() {
  collection.collector = 'Coletor 01';
  collection.operation = 'inventory';
  collection.inventoryItemId = '';
  collection.code = '';
  collection.lotId = '';
  collection.quantity = 1;
  collection.responsible = '';
  collection.notes = '';
}

async function submitCollection() {
  error.value = '';
  successMessage.value = '';
  const item = selectedItem.value;
  if (!item) {
    error.value = 'Selecione um produto para registrar a coleta';
    return;
  }
  if (!Number.isFinite(collection.quantity) || collection.quantity < 0) {
    error.value = 'Informe uma quantidade coletada válida';
    return;
  }

  saving.value = true;
  try {
    collectedRows.value = [collectionToRow(item), ...collectedRows.value];
    successMessage.value = `${item.name} registrado pelo ${collection.collector}`;
    resetCollection();
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
    error.value = err instanceof Error ? err.message : 'Erro ao carregar coletores de dados';
    items.value = [];
    lots.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-data-collectors-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.collector-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
  align-items: start;
}

.collector-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.collector-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.collector-grid,
.filters {
  display: grid;
  gap: 12px;
}

.collector-grid {
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

.collector-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.collector-actions {
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
  .collector-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .collector-grid {
    grid-template-columns: 1fr;
  }
}
</style>
