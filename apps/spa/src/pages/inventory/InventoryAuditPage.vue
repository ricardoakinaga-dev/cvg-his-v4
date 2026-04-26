<template>
  <div class="inventory-audit-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Auditoria de Estoque']"
      title="Auditoria de Estoque"
      subtitle="Rastreabilidade operacional de saldos, consumos, lotes e divergências do estoque"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory/validity" icon="📅">Validade</DsButton>
        <DsButton variant="primary" tag="a" to="/inventory/movements" icon="📥">Transação</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da auditoria de estoque">
      <DsStatCard :label="`${rows.length} registro(s)`" value="" icon="🧾" />
      <DsStatCard :label="`${assistentialCount} assistencial(is)`" value="" icon="🏥" />
      <DsStatCard :label="`${commercialCount} comercial(is)`" value="" icon="🛒" />
      <DsStatCard :label="`${divergenceCount} divergência(s)`" value="" icon="⚠️" />
    </section>

    <section class="audit-layout">
      <section class="audit-panel" aria-label="Trilha de auditoria">
        <h2>Conferência</h2>
        <div class="audit-grid">
          <label class="field">
            <span>Registro</span>
            <select v-model="selectedRowId" data-testid="audit-record">
              <option value="">Selecione</option>
              <option v-for="row in rows" :key="row.id" :value="row.id">
                {{ row.code }} - {{ row.product }} - {{ row.dateLabel }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Natureza</span>
            <input :value="selectedRow?.typeLabel ?? 'Selecione um registro'" type="text" readonly />
          </label>

          <label class="field">
            <span>Origem</span>
            <input :value="selectedRow?.origin ?? 'Selecione um registro'" type="text" readonly />
          </label>

          <label class="field">
            <span>Usuário</span>
            <input :value="selectedRow?.user ?? 'Selecione um registro'" type="text" readonly />
          </label>
        </div>

        <div class="audit-preview">
          <span>Saldo auditado: {{ selectedRow?.balanceLabel ?? 'Selecione um registro' }}</span>
          <strong>{{ selectedRow?.auditLabel ?? 'Nenhuma trilha selecionada' }}</strong>
        </div>

        <div class="audit-actions">
          <DsButton
            tag="a"
            :to="selectedRow?.detailPath ?? '/inventory'"
            variant="primary"
            :disabled="!selectedRow"
          >
            Abrir Produto
          </DsButton>
          <DsButton tag="a" to="/inventory/validity" variant="secondary">Validade</DsButton>
          <DsButton tag="a" to="/inventory/nf" variant="secondary">Entrada NF</DsButton>
        </div>
      </section>

      <section class="filter-panel" aria-label="Filtros da auditoria de estoque">
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
              <option value="Atendimento">Atendimento</option>
              <option value="Internação">Internação</option>
              <option value="Cirurgia">Cirurgia</option>
              <option value="Laboratório">Laboratório</option>
              <option value="Balcão">Balcão</option>
              <option value="Estoque">Estoque</option>
              <option value="Lote">Lote</option>
            </select>
          </label>
          <label class="field">
            <span>Natureza</span>
            <select v-model="draftFilters.type">
              <option value="">Todas</option>
              <option value="balance">Saldo atual</option>
              <option value="assistential">Assistencial</option>
              <option value="commercial">Comercial</option>
              <option value="lot">Lote</option>
            </select>
          </label>
          <label class="field">
            <span>Data inicial</span>
            <input v-model="draftFilters.startDate" type="date" />
          </label>
          <label class="field">
            <span>Data final</span>
            <input v-model="draftFilters.endDate" type="date" />
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
          <DsButton type="submit" variant="primary">Pesquisar</DsButton>
        </form>
      </section>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="🧾"
      empty-title="Nenhum registro encontrado"
      empty-description="Saldos, consumos e lotes auditáveis retornados pela API aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as AuditRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as AuditRow).product }}</strong>
        <span class="muted"><br />{{ (row as AuditRow).sourceLabel }}</span>
      </template>
      <template #cell-type="{ row }">
        <StatusBadge
          :label="(row as AuditRow).typeLabel"
          :variant="(row as AuditRow).typeVariant"
          size="sm"
        />
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as AuditRow).quantity, (row as AuditRow).unit) }}
      </template>
      <template #cell-costAmount="{ row }">
        {{ formatCurrency((row as AuditRow).costAmount) }}
      </template>
      <template #cell-balance="{ row }">
        {{ (row as AuditRow).balanceLabel }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as AuditRow).statusLabel"
          :variant="(row as AuditRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-date="{ row }">
        {{ (row as AuditRow).dateLabel }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as AuditRow).detailPath"
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
import type {
  InventoryConsumptionSummary,
  InventoryItemSummary,
  InventoryLotSummary
} from '@/types/inventory';

type AuditType = 'balance' | 'assistential' | 'commercial' | 'lot';
type AuditStatus = 'ok' | 'attention' | 'divergence';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface AuditRow {
  id: string;
  code: string;
  product: string;
  sourceLabel: string;
  type: AuditType;
  typeLabel: string;
  typeVariant: StatusVariant;
  origin: string;
  user: string;
  quantity: number;
  unit: string;
  costAmount: number;
  balanceLabel: string;
  reference: string;
  status: AuditStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  auditLabel: string;
  date: string;
  dateLabel: string;
  detailPath: string;
}

const items = ref<InventoryItemSummary[]>([]);
const consumptions = ref<InventoryConsumptionSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const loading = ref(false);
const error = ref('');
const selectedRowId = ref('');
const draftFilters = reactive({
  code: '',
  product: '',
  origin: '',
  type: '',
  startDate: '',
  endDate: '',
  status: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'type', label: 'Natureza', width: '130px' },
  { key: 'origin', label: 'Origem', width: '130px' },
  { key: 'user', label: 'Usuário', width: '140px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'costAmount', label: 'Custo', width: '120px' },
  { key: 'balance', label: 'Saldo', width: '150px' },
  { key: 'reference', label: 'Referência', width: '180px' },
  { key: 'status', label: 'Situação', width: '130px' },
  { key: 'date', label: 'Data', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const itemsById = computed<Record<string, InventoryItemSummary>>(() =>
  Object.fromEntries(items.value.map((item) => [item.id, item]))
);
const lotsByItemId = computed<Record<string, InventoryLotSummary[]>>(() => {
  const grouped: Record<string, InventoryLotSummary[]> = {};
  for (const lot of lots.value) {
    grouped[lot.inventoryItemId] = [...(grouped[lot.inventoryItemId] ?? []), lot];
  }
  return grouped;
});
const rows = computed<AuditRow[]>(() => {
  const balanceRows = items.value.map(itemToBalanceRow);
  const consumptionRows = consumptions.value.map(consumptionToRow);
  const lotRows = lots.value.map(lotToRow);
  return [...consumptionRows, ...lotRows, ...balanceRows].sort((left, right) =>
    right.date.localeCompare(left.date)
  );
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const origin = normalizeSearch(appliedFilters.origin);
  const type = appliedFilters.type;
  const status = appliedFilters.status;
  const startDate = appliedFilters.startDate ? new Date(`${appliedFilters.startDate}T00:00:00.000Z`).getTime() : null;
  const endDate = appliedFilters.endDate ? new Date(`${appliedFilters.endDate}T23:59:59.999Z`).getTime() : null;
  return rows.value.filter((row) => {
    const rowTime = new Date(row.date).getTime();
    if (type && row.type !== type) return false;
    if (status && row.status !== status) return false;
    if (origin && normalizeSearch(row.origin) !== origin) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    if (startDate !== null && rowTime < startDate) return false;
    if (endDate !== null && rowTime > endDate) return false;
    return true;
  });
});
const selectedRow = computed(() =>
  rows.value.find((row) => row.id === selectedRowId.value) ?? null
);
const assistentialCount = computed(() =>
  rows.value.filter((row) => row.type === 'assistential').length
);
const commercialCount = computed(() =>
  rows.value.filter((row) => row.type === 'commercial').length
);
const divergenceCount = computed(() =>
  rows.value.filter((row) => row.status === 'divergence').length
);

function itemToBalanceRow(item: InventoryItemSummary): AuditRow {
  const lowStock = item.onHandQuantity <= item.reorderLevel;
  const itemLots = lotsByItemId.value[item.id] ?? [];
  const trackedQuantity = itemLots.reduce((sum, lot) => sum + lot.quantity, 0);
  const hasLotDivergence = itemLots.length > 0 && Number(trackedQuantity.toFixed(3)) !== Number(item.onHandQuantity.toFixed(3));
  const status: AuditStatus = hasLotDivergence ? 'divergence' : lowStock ? 'attention' : 'ok';
  return {
    id: `balance-${item.id}`,
    code: item.sku,
    product: item.name,
    sourceLabel: itemLots.length > 0 ? `${itemLots.length} lote(s) vinculado(s)` : 'Saldo sem lote informado',
    type: 'balance',
    typeLabel: 'Saldo atual',
    typeVariant: lowStock ? 'warning' : 'success',
    origin: 'Estoque',
    user: 'Sistema',
    quantity: item.onHandQuantity,
    unit: item.unit,
    costAmount: item.onHandQuantity * item.unitCostAmount,
    balanceLabel: `${formatQuantity(item.onHandQuantity, item.unit)} atual`,
    reference: hasLotDivergence
      ? `lotes ${formatQuantity(trackedQuantity, item.unit)}`
      : `mínimo ${formatQuantity(item.reorderLevel, item.unit)}`,
    status,
    statusLabel: auditStatusLabel(status),
    statusVariant: auditStatusVariant(status),
    auditLabel: hasLotDivergence ? 'Saldo diverge da soma dos lotes' : 'Saldo conferido contra ponto mínimo',
    date: item.updatedAt || item.createdAt,
    dateLabel: formatDate(item.updatedAt || item.createdAt),
    detailPath: `/inventory/${item.id}`
  };
}

function consumptionToRow(consumption: InventoryConsumptionSummary): AuditRow {
  const item = itemsById.value[consumption.inventoryItemId];
  const commercial = isCommercialConsumption(consumption);
  const origin = originLabel(consumption);
  const type: AuditType = commercial ? 'commercial' : 'assistential';
  const reference = consumption.sourceEntityId || consumption.encounterId || consumption.id;
  const status: AuditStatus = consumption.quantity <= 0 || consumption.costAmount < 0 ? 'divergence' : 'ok';
  return {
    id: consumption.id,
    code: item?.sku ?? consumption.inventoryItemId,
    product: item?.name ?? consumption.inventoryItemId,
    sourceLabel: `Consumo ${reference}`,
    type,
    typeLabel: commercial ? 'Comercial' : 'Assistencial',
    typeVariant: commercial ? 'neutral' : 'info',
    origin,
    user: consumption.recordedByUserId || 'Sistema',
    quantity: consumption.quantity,
    unit: consumption.unit,
    costAmount: consumption.costAmount,
    balanceLabel: 'Saída registrada',
    reference,
    status,
    statusLabel: auditStatusLabel(status),
    statusVariant: auditStatusVariant(status),
    auditLabel: status === 'divergence' ? 'Consumo com quantidade ou custo inválido' : 'Consumo auditável registrado',
    date: consumption.createdAt,
    dateLabel: formatDate(consumption.createdAt),
    detailPath: item ? `/inventory/${item.id}` : '/inventory'
  };
}

function lotToRow(lot: InventoryLotSummary): AuditRow {
  const item = itemsById.value[lot.inventoryItemId];
  const status: AuditStatus = lot.status === 'expired' ? 'divergence' : lot.status === 'expiring' || lot.status === 'depleted' ? 'attention' : 'ok';
  return {
    id: `lot-${lot.id}`,
    code: lot.sku,
    product: lot.itemName,
    sourceLabel: lot.lotNumber || 'Sem lote',
    type: 'lot',
    typeLabel: 'Lote',
    typeVariant: lot.status === 'expired' ? 'danger' : lot.status === 'expiring' ? 'warning' : 'success',
    origin: 'Lote',
    user: 'Sistema',
    quantity: lot.quantity,
    unit: lot.unit,
    costAmount: lot.quantity * (item?.unitCostAmount ?? 0),
    balanceLabel: `${formatQuantity(lot.quantity, lot.unit)} no lote`,
    reference: lot.expiryDate ? `validade ${formatDate(lot.expiryDate)}` : 'Sem validade',
    status,
    statusLabel: auditStatusLabel(status),
    statusVariant: auditStatusVariant(status),
    auditLabel: lotAuditLabel(lot),
    date: lot.updatedAt || lot.createdAt,
    dateLabel: formatDate(lot.updatedAt || lot.createdAt),
    detailPath: `/inventory/${lot.inventoryItemId}`
  };
}

function isCommercialConsumption(consumption: InventoryConsumptionSummary): boolean {
  return consumption.sourceEntityType === 'other' && !consumption.encounterId?.trim();
}

function originLabel(consumption: InventoryConsumptionSummary): string {
  switch (consumption.sourceEntityType) {
    case 'encounter':
    case 'prescription':
      return 'Atendimento';
    case 'diagnostic_order':
      return 'Laboratório';
    case 'surgery_case':
      return 'Cirurgia';
    case 'inpatient_stay':
      return 'Internação';
    default:
      return 'Balcão';
  }
}

function auditStatusLabel(status: AuditStatus): string {
  switch (status) {
    case 'divergence':
      return 'Divergência';
    case 'attention':
      return 'Atenção';
    default:
      return 'Conferido';
  }
}

function auditStatusVariant(status: AuditStatus): StatusVariant {
  switch (status) {
    case 'divergence':
      return 'danger';
    case 'attention':
      return 'warning';
    default:
      return 'success';
  }
}

function lotAuditLabel(lot: InventoryLotSummary): string {
  switch (lot.status) {
    case 'expired':
      return 'Lote vencido exige bloqueio operacional';
    case 'expiring':
      return 'Lote próximo do vencimento';
    case 'depleted':
      return 'Lote esgotado para encerramento';
    default:
      return 'Lote conferido';
  }
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
    const query = draftFilters.product || draftFilters.code || undefined;
    const [loadedItems, loadedConsumptions, loadedLots] = await Promise.all([
      inventoryService.list(query),
      inventoryService.listConsumptions(),
      inventoryService.listLots()
    ]);
    items.value = loadedItems;
    consumptions.value = loadedConsumptions;
    lots.value = loadedLots;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar auditoria de estoque';
    items.value = [];
    consumptions.value = [];
    lots.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-audit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.audit-layout {
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

@media (max-width: 980px) {
  .audit-layout {
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
