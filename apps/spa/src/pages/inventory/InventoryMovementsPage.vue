<template>
  <div class="inventory-movements-page">
    <AppPageHeader
      :title="title"
      :breadcrumbs="['Estoque', 'Controles', breadcrumb]"
      :subtitle="subtitle"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${movements.length} movimentação(ões)`" value="" icon="📚" />
      <DsStatCard :label="`${adjustmentCount} ajuste(s)`" value="" icon="⚖️" />
      <DsStatCard :label="`${outboundCount} saída(s)`" value="" icon="📤" />
      <DsStatCard :label="formatSignedQuantity(netDelta)" value="" icon="📊" />
    </section>

    <form class="adjustment-panel" @submit.prevent="submitAdjustment">
      <div class="adjustment-panel__header">
        <h2>Registrar ajuste</h2>
        <p>Ajustes entram no ledger com saldo anterior, saldo final, usuário e justificativa.</p>
      </div>
      <div class="adjustment-grid">
        <DsInput
          id="adjustment-item"
          v-model="adjustmentForm.inventoryItemId"
          type="select"
          label="Item"
          required
        >
          <option value="">Selecione</option>
          <option v-for="item in items" :key="item.id" :value="item.id">
            {{ item.name }} · saldo {{ formatQuantity(item.onHandQuantity, item.unit) }}
          </option>
        </DsInput>
        <DsInput
          id="adjustment-delta"
          v-model.number="adjustmentForm.quantityDelta"
          type="number"
          label="Delta de quantidade"
          step="0.01"
          required
        />
        <DsInput
          id="adjustment-reason"
          v-model.trim="adjustmentForm.reason"
          label="Justificativa"
          required
        />
        <DsInput
          id="adjustment-reference"
          v-model.trim="adjustmentForm.reference"
          label="Referência"
          placeholder="Inventário, nota, auditoria"
        />
      </div>
      <div class="adjustment-panel__actions">
        <DsButton type="submit" :loading="savingAdjustment">Registrar ajuste</DsButton>
      </div>
    </form>

    <div class="filter-bar">
      <DsInput id="movement-type-filter" v-model="filterType" type="select" label="Tipo">
        <option value="">Todos</option>
        <option value="adjustment">Ajuste</option>
        <option value="inbound">Entrada</option>
        <option value="outbound">Saída</option>
        <option value="consumption">Consumo</option>
        <option value="transfer">Transferência</option>
      </DsInput>
      <DsInput id="movement-item-filter" v-model="filterItemId" type="select" label="Item">
        <option value="">Todos</option>
        <option v-for="item in items" :key="item.id" :value="item.id">
          {{ item.name }}
        </option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="📦"
      empty-title="Nenhuma movimentação registrada"
      empty-description="Ajustes, consumos, entradas, saídas e transferências aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-movementType="{ row }">
        <DsBadge :variant="typeVariant((row as InventoryMovementRow).movementType)" size="sm">
          {{ typeLabel((row as InventoryMovementRow).movementType) }}
        </DsBadge>
      </template>
      <template #cell-quantityDelta="{ row }">
        {{
          formatSignedQuantity(
            (row as InventoryMovementRow).quantityDelta,
            (row as InventoryMovementRow).unit
          )
        }}
      </template>
      <template #cell-balanceBefore="{ row }">
        {{ formatQuantity((row as InventoryMovementRow).balanceBefore, (row as InventoryMovementRow).unit) }}
      </template>
      <template #cell-balanceAfter="{ row }">
        {{ formatQuantity((row as InventoryMovementRow).balanceAfter, (row as InventoryMovementRow).unit) }}
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as InventoryMovementRow).date) }}
      </template>
      <template #cell-unitCostAmount="{ row }">
        {{ formatCurrency((row as InventoryMovementRow).unitCostAmount) }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary, InventoryStockMovementSummary } from '@/types/inventory';

withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  breadcrumb?: string;
}>(), {
  title: 'Ledger de Estoque',
  subtitle: 'Rastreabilidade transacional de entradas, saídas, consumos e ajustes',
  breadcrumb: 'Movimentações'
});

interface InventoryMovementRow {
  readonly id: string;
  readonly inventoryItemId: string;
  readonly itemName: string;
  readonly movementType: InventoryStockMovementSummary['movementType'];
  readonly quantityDelta: number;
  readonly balanceBefore: number;
  readonly balanceAfter: number;
  readonly unit: string;
  readonly unitCostAmount: number;
  readonly reason: string;
  readonly reference: string;
  readonly date: string;
}

const items = ref<InventoryItemSummary[]>([]);
const movements = ref<InventoryStockMovementSummary[]>([]);
const itemsById = ref<Record<string, InventoryItemSummary>>({});
const loading = ref(false);
const savingAdjustment = ref(false);
const error = ref('');
const success = ref('');
const filterType = ref('');
const filterItemId = ref('');
const adjustmentForm = ref({
  inventoryItemId: '',
  quantityDelta: '' as number | '',
  reason: '',
  reference: ''
});

const columns: DataTableColumn[] = [
  { key: 'itemName', label: 'Item' },
  { key: 'movementType', label: 'Tipo' },
  { key: 'quantityDelta', label: 'Delta' },
  { key: 'balanceBefore', label: 'Saldo Anterior' },
  { key: 'balanceAfter', label: 'Saldo Final' },
  { key: 'reason', label: 'Justificativa' },
  { key: 'reference', label: 'Referência' },
  { key: 'unitCostAmount', label: 'Custo Unit.' },
  { key: 'date', label: 'Data' }
];

const movementRows = computed<InventoryMovementRow[]>(() =>
  movements.value.map((movement) => {
    const item = itemsById.value[movement.inventoryItemId];
    return {
      id: movement.id,
      inventoryItemId: movement.inventoryItemId,
      itemName: item?.name ?? movement.inventoryItemId,
      movementType: movement.movementType,
      quantityDelta: movement.quantityDelta,
      balanceBefore: movement.balanceBefore,
      balanceAfter: movement.balanceAfter,
      unit: item?.unit ?? 'un',
      unitCostAmount: movement.unitCostAmount,
      reason: movement.reason,
      reference: movement.reference ?? '-',
      date: movement.createdAt
    };
  })
);

const filteredRows = computed(() =>
  movementRows.value.filter((row) => {
    const movementMatches = !filterType.value || row.movementType === filterType.value;
    const itemMatches = !filterItemId.value || row.inventoryItemId === filterItemId.value;
    return movementMatches && itemMatches;
  })
);
const adjustmentCount = computed(
  () => movements.value.filter((movement) => movement.movementType === 'adjustment').length
);
const outboundCount = computed(
  () =>
    movements.value.filter((movement) =>
      ['outbound', 'consumption'].includes(movement.movementType)
    ).length
);
const netDelta = computed(() =>
  movements.value.reduce((total, movement) => total + movement.quantityDelta, 0)
);

function typeVariant(
  type: InventoryMovementRow['movementType']
): 'default' | 'success' | 'warning' | 'danger' {
  if (type === 'inbound') return 'success';
  if (type === 'adjustment' || type === 'transfer') return 'warning';
  if (type === 'outbound' || type === 'consumption') return 'danger';
  return 'default';
}

function typeLabel(type: InventoryMovementRow['movementType']): string {
  const labels: Record<InventoryMovementRow['movementType'], string> = {
    adjustment: 'Ajuste',
    inbound: 'Entrada',
    outbound: 'Saída',
    transfer: 'Transferência',
    consumption: 'Consumo'
  };
  return labels[type];
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString('pt-BR')} ${unit}`;
}

function formatSignedQuantity(quantity: number, unit = 'un'): string {
  const sign = quantity > 0 ? '+' : '';
  return `${sign}${formatQuantity(quantity, unit)}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [inventoryItems, stockMovements] = await Promise.all([
      inventoryService.list(),
      inventoryService.listStockMovements()
    ]);
    items.value = inventoryItems;
    itemsById.value = Object.fromEntries(inventoryItems.map((item) => [item.id, item]));
    movements.value = stockMovements;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar ledger de estoque';
  } finally {
    loading.value = false;
  }
}

async function submitAdjustment() {
  error.value = '';
  success.value = '';
  const quantityDelta = Number(adjustmentForm.value.quantityDelta);

  if (!adjustmentForm.value.inventoryItemId || !Number.isFinite(quantityDelta) || quantityDelta === 0) {
    error.value = 'Informe item e delta de quantidade diferente de zero';
    return;
  }

  if (!adjustmentForm.value.reason.trim()) {
    error.value = 'Informe uma justificativa para o ajuste';
    return;
  }

  savingAdjustment.value = true;
  try {
    await inventoryService.createStockAdjustment({
      inventoryItemId: adjustmentForm.value.inventoryItemId,
      quantityDelta,
      reason: adjustmentForm.value.reason.trim(),
      reference: adjustmentForm.value.reference.trim() || undefined
    });
    adjustmentForm.value = {
      inventoryItemId: '',
      quantityDelta: '',
      reason: '',
      reference: ''
    };
    success.value = 'Ajuste registrado no ledger de estoque';
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar ajuste de estoque';
  } finally {
    savingAdjustment.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-movements-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.adjustment-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.adjustment-panel__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.adjustment-panel__header h2,
.adjustment-panel__header p {
  margin: 0;
}

.adjustment-panel__header h2 {
  font-size: 18px;
}

.adjustment-panel__header p {
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.adjustment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.adjustment-panel__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
