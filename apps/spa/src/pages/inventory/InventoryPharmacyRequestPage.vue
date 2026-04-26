<template>
  <div class="inventory-pharmacy-request-page">
    <AppPageHeader
      :breadcrumbs="['Estoque', 'Controles', 'Requisição à Farmácia']"
      title="Requisição à Farmácia"
      subtitle="Solicitação e dispensação de medicamentos conectadas ao saldo de estoque"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/inventory/movements" icon="📥">Transação</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo da requisição à farmácia">
      <DsStatCard :label="`${pharmacyItems.length} item(ns) de farmácia`" value="" icon="💊" />
      <DsStatCard :label="`${availableCount} com saldo`" value="" icon="📦" />
      <DsStatCard :label="`${lowStockCount} abaixo do ponto`" value="" icon="⚠️" />
      <DsStatCard :label="`${dispensedRowsCount} dispensação(ões)`" value="" icon="📚" />
    </section>

    <section class="request-layout">
      <form class="request-panel" aria-label="Lançar requisição à farmácia" @submit.prevent="submitRequest">
        <h2>Requisição</h2>
        <div class="request-grid">
          <label class="field">
            <span>Origem</span>
            <select v-model="request.origin" data-testid="request-origin">
              <option value="Atendimento">Atendimento</option>
              <option value="Internação">Internação</option>
              <option value="Cirurgia">Cirurgia</option>
              <option value="Laboratório">Laboratório</option>
              <option value="Balcão">Balcão</option>
            </select>
          </label>

          <label class="field">
            <span>Prioridade</span>
            <select v-model="request.priority" data-testid="request-priority">
              <option value="Rotina">Rotina</option>
              <option value="Urgente">Urgente</option>
              <option value="Controlado">Controlado</option>
            </select>
          </label>

          <label class="field">
            <span>Solicitante</span>
            <input v-model="request.requester" type="text" autocomplete="off" data-testid="request-requester" />
          </label>

          <label class="field">
            <span>Atendimento / Paciente</span>
            <input v-model="request.reference" type="text" autocomplete="off" data-testid="request-reference" />
          </label>

          <label class="field field--wide">
            <span>Produto</span>
            <select v-model="request.inventoryItemId" data-testid="request-product">
              <option value="">Selecione</option>
              <option v-for="item in pharmacyItems" :key="item.id" :value="item.id">
                {{ item.sku }} - {{ item.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Código de Barras</span>
            <input v-model="request.code" type="search" autocomplete="off" data-testid="request-code" />
          </label>

          <label class="field">
            <span>Quantidade</span>
            <input v-model.number="request.quantity" type="number" min="0.01" step="0.01" data-testid="request-quantity" />
          </label>

          <label class="field field--wide">
            <span>Observação</span>
            <input v-model="request.notes" type="text" maxlength="180" data-testid="request-notes" />
          </label>
        </div>

        <div class="request-preview">
          <span>Saldo atual: {{ selectedItem ? formatQuantity(selectedItem.onHandQuantity, selectedItem.unit) : 'Selecione um produto' }}</span>
          <strong>Após dispensar: {{ previewBalanceLabel }}</strong>
        </div>

        <div class="request-actions">
          <DsButton type="submit" variant="primary" :loading="saving">Dispensar</DsButton>
          <DsButton type="button" variant="secondary" @click="resetRequest">Limpar</DsButton>
        </div>
      </form>

      <section class="filter-panel" aria-label="Filtros da requisição à farmácia">
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
            </select>
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="draftFilters.status">
              <option value="">Todas</option>
              <option value="available">Disponível</option>
              <option value="low">Atenção</option>
              <option value="dispensed">Dispensada</option>
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
      empty-icon="💊"
      empty-title="Nenhum registro encontrado"
      empty-description="Requisições e itens de farmácia retornados pela API aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as PharmacyRequestRow).code }}</span>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ (row as PharmacyRequestRow).product }}</strong>
      </template>
      <template #cell-priority="{ row }">
        <StatusBadge
          :label="(row as PharmacyRequestRow).priority"
          :variant="(row as PharmacyRequestRow).priorityVariant"
          size="sm"
        />
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as PharmacyRequestRow).quantity, (row as PharmacyRequestRow).unit) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as PharmacyRequestRow).statusLabel"
          :variant="(row as PharmacyRequestRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-costAmount="{ row }">
        {{ formatCurrency((row as PharmacyRequestRow).costAmount) }}
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as PharmacyRequestRow).date) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="(row as PharmacyRequestRow).detailPath"
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
import type { InventoryConsumptionSummary, InventoryItemSummary } from '@/types/inventory';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type PharmacyStatus = 'available' | 'low' | 'dispensed';

interface PharmacyRequestRow {
  id: string;
  code: string;
  product: string;
  origin: string;
  priority: string;
  priorityVariant: StatusVariant;
  quantity: number;
  unit: string;
  status: PharmacyStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  costAmount: number;
  reference: string;
  date: string;
  detailPath: string;
}

const items = ref<InventoryItemSummary[]>([]);
const consumptions = ref<InventoryConsumptionSummary[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');

const request = reactive({
  origin: 'Atendimento',
  priority: 'Rotina',
  requester: '',
  reference: '',
  inventoryItemId: '',
  code: '',
  quantity: 1,
  notes: ''
});
const draftFilters = reactive({
  code: '',
  product: '',
  origin: '',
  status: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'product', label: 'Produto' },
  { key: 'origin', label: 'Origem', width: '130px' },
  { key: 'priority', label: 'Prioridade', width: '120px' },
  { key: 'quantity', label: 'Quantidade', width: '130px' },
  { key: 'status', label: 'Situação', width: '130px' },
  { key: 'costAmount', label: 'Custo', width: '120px' },
  { key: 'reference', label: 'Referência', width: '180px' },
  { key: 'date', label: 'Data', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '100px', class: 'table__actions-col' }
];

const pharmacyItems = computed(() => items.value.filter(isPharmacyItem));
const itemsById = computed<Record<string, InventoryItemSummary>>(() =>
  Object.fromEntries(items.value.map((item) => [item.id, item]))
);
const selectedItem = computed(() =>
  pharmacyItems.value.find((item) => item.id === request.inventoryItemId)
    ?? pharmacyItems.value.find((item) => normalizeSearch(item.sku) === normalizeSearch(request.code))
    ?? null
);
const previewBalance = computed(() => {
  if (!selectedItem.value) return null;
  const quantity = Number(request.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  return Number((selectedItem.value.onHandQuantity - quantity).toFixed(2));
});
const previewBalanceLabel = computed(() => {
  if (!selectedItem.value || previewBalance.value === null) return 'Selecione produto e quantidade';
  return formatQuantity(previewBalance.value, selectedItem.value.unit);
});
const availableCount = computed(() =>
  pharmacyItems.value.filter((item) => item.onHandQuantity > 0).length
);
const lowStockCount = computed(() =>
  pharmacyItems.value.filter((item) => item.onHandQuantity <= item.reorderLevel).length
);
const dispensedRowsCount = computed(() =>
  rows.value.filter((row) => row.status === 'dispensed').length
);
const rows = computed<PharmacyRequestRow[]>(() => {
  const itemRows = pharmacyItems.value.map(itemToRow);
  const consumptionRows = consumptions.value
    .filter((consumption) => isPharmacyConsumption(consumption))
    .map(consumptionToRow);
  return [...itemRows, ...consumptionRows].sort((left, right) =>
    right.date.localeCompare(left.date)
  );
});
const filteredRows = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const product = normalizeSearch(appliedFilters.product);
  const origin = normalizeSearch(appliedFilters.origin);
  const status = appliedFilters.status;
  return rows.value.filter((row) => {
    if (status && row.status !== status) return false;
    if (origin && normalizeSearch(row.origin) !== origin) return false;
    if (code && !normalizeSearch(row.code).includes(code)) return false;
    if (product && !normalizeSearch(row.product).includes(product)) return false;
    return true;
  });
});

watch(
  () => request.inventoryItemId,
  (itemId) => {
    const item = pharmacyItems.value.find((candidate) => candidate.id === itemId);
    if (item) {
      request.code = item.sku;
    }
  }
);

function isPharmacyItem(item: InventoryItemSummary): boolean {
  const searchable = normalizeSearch(`${item.sku} ${item.name} ${item.unit}`);
  return [
    'med',
    'dipirona',
    'injetavel',
    'ampola',
    'farmacia',
    'medicamento',
    'cateter'
  ].some((term) => searchable.includes(term));
}

function isPharmacyConsumption(consumption: InventoryConsumptionSummary): boolean {
  const item = itemsById.value[consumption.inventoryItemId];
  if (!item) return false;
  return isPharmacyItem(item);
}

function itemToRow(item: InventoryItemSummary): PharmacyRequestRow {
  const lowStock = item.onHandQuantity <= item.reorderLevel;
  return {
    id: `pharmacy-${item.id}`,
    code: item.sku,
    product: item.name,
    origin: 'Farmácia',
    priority: lowStock ? 'Reposição' : 'Rotina',
    priorityVariant: lowStock ? 'warning' : 'neutral',
    quantity: item.onHandQuantity,
    unit: item.unit,
    status: lowStock ? 'low' : 'available',
    statusLabel: lowStock ? 'Atenção' : 'Disponível',
    statusVariant: lowStock ? 'warning' : 'success',
    costAmount: item.onHandQuantity * item.unitCostAmount,
    reference: `mínimo ${formatQuantity(item.reorderLevel, item.unit)}`,
    date: item.updatedAt || item.createdAt,
    detailPath: `/inventory/${item.id}`
  };
}

function consumptionToRow(consumption: InventoryConsumptionSummary): PharmacyRequestRow {
  const item = itemsById.value[consumption.inventoryItemId];
  const origin = originLabel(consumption);
  return {
    id: consumption.id,
    code: item?.sku ?? consumption.inventoryItemId,
    product: item?.name ?? consumption.inventoryItemId,
    origin,
    priority: origin === 'Internação' || origin === 'Cirurgia' ? 'Urgente' : 'Rotina',
    priorityVariant: origin === 'Internação' || origin === 'Cirurgia' ? 'danger' : 'neutral',
    quantity: consumption.quantity,
    unit: consumption.unit,
    status: 'dispensed',
    statusLabel: 'Dispensada',
    statusVariant: 'info',
    costAmount: consumption.costAmount,
    reference: consumption.sourceEntityId || consumption.encounterId || 'Dispensação',
    date: consumption.createdAt,
    detailPath: item ? `/inventory/${item.id}` : '/inventory'
  };
}

function originLabel(consumption: InventoryConsumptionSummary): string {
  switch (consumption.sourceEntityType) {
    case 'inpatient_stay':
      return 'Internação';
    case 'surgery_case':
      return 'Cirurgia';
    case 'diagnostic_order':
      return 'Laboratório';
    case 'prescription':
    case 'encounter':
      return 'Atendimento';
    default:
      return 'Balcão';
  }
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

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

function resetRequest() {
  request.origin = 'Atendimento';
  request.priority = 'Rotina';
  request.requester = '';
  request.reference = '';
  request.inventoryItemId = '';
  request.code = '';
  request.quantity = 1;
  request.notes = '';
}

async function submitRequest() {
  error.value = '';
  successMessage.value = '';
  const item = selectedItem.value;
  if (!item) {
    error.value = 'Selecione um produto para dispensar';
    return;
  }

  const quantity = Number(request.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    error.value = 'Informe uma quantidade maior que zero';
    return;
  }

  const newBalance = Number((item.onHandQuantity - quantity).toFixed(2));
  if (newBalance < 0) {
    error.value = 'A requisição não pode deixar saldo negativo';
    return;
  }

  saving.value = true;
  try {
    const updated = await inventoryService.update(item.id, { onHandQuantity: newBalance });
    items.value = items.value.map((candidate) => candidate.id === updated.id ? updated : candidate);
    successMessage.value = `${updated.name} dispensado. Saldo atual ${formatQuantity(updated.onHandQuantity, updated.unit)}`;
    resetRequest();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao dispensar requisição à farmácia';
  } finally {
    saving.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const query = draftFilters.product || draftFilters.code || undefined;
    const [loadedItems, loadedConsumptions] = await Promise.all([
      inventoryService.list(query),
      inventoryService.listConsumptions()
    ]);
    items.value = loadedItems;
    consumptions.value = loadedConsumptions;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar requisições à farmácia';
    items.value = [];
    consumptions.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-pharmacy-request-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.request-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
  align-items: start;
}

.request-panel,
.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.request-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.request-grid,
.filters {
  display: grid;
  gap: 12px;
}

.request-grid {
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

.request-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.request-actions {
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
  .request-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .request-grid {
    grid-template-columns: 1fr;
  }
}
</style>
