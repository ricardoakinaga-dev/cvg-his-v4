<template>
  <section class="inventory-operation-page">
    <AppPageHeader
      :title="config.title"
      :breadcrumbs="['Estoque', 'Operação', config.breadcrumb]"
      :subtitle="config.subtitle"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      {{ config.info }}
    </DsAlert>

    <section class="operation-kpis">
      <DsStatCard :label="`${items.length} item(ns)`" value="" icon="📦" />
      <DsStatCard :label="`${criticalItems.length} abaixo do mínimo`" value="" icon="⚠️" />
      <DsStatCard :label="`${lots.length} lote(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${expiringLots.length} lote(s) em atenção`" value="" icon="⏱️" />
    </section>

    <div class="operation-toolbar">
      <DsInput v-model="query" :label="config.searchLabel" :placeholder="config.searchPlaceholder" />
      <DsInput v-model="statusFilter" type="select" label="Filtro operacional">
        <option value="">Todos</option>
        <option value="critical">Abaixo do mínimo</option>
        <option value="attention">Lote em atenção</option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      :empty-title="config.emptyTitle"
      empty-description="Os dados de estoque retornados pela API aparecerão aqui."
      empty-icon="📦"
      variant="hoverable"
    >
      <template #cell-status="{ row }">
        <DsBadge :variant="statusVariant((row as OperationRow).status)" size="sm">
          {{ statusLabel((row as OperationRow).status) }}
        </DsBadge>
      </template>
      <template #cell-action="{ row }">
        <strong>{{ (row as OperationRow).action }}</strong>
      </template>
      <template #cell-stock="{ row }">
        {{ formatQuantity((row as OperationRow).stock, (row as OperationRow).unit) }}
      </template>
      <template #cell-reference="{ row }">
        <span>{{ (row as OperationRow).reference }}</span>
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';

type OperationMode = 'purchases' | 'transfers' | 'invoices';
type OperationStatus = 'normal' | 'critical' | 'attention';

interface OperationRow {
  id: string;
  sku: string;
  itemName: string;
  stock: number;
  unit: string;
  reference: string;
  status: OperationStatus;
  action: string;
}

const props = defineProps<{
  mode: OperationMode;
}>();

const items = ref<InventoryItemSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const loading = ref(false);
const error = ref('');
const query = ref('');
const statusFilter = ref('');

const configs = {
  purchases: {
    title: 'Compras de Estoque',
    breadcrumb: 'Compras',
    subtitle: 'Fila de reposição baseada em saldo atual, ponto de ressuprimento e lotes críticos.',
    info: 'Esta tela usa o estoque real para orientar compras e reduzir ruptura operacional.',
    searchLabel: 'Buscar item para compra',
    searchPlaceholder: 'SKU, item ou fornecedor',
    emptyTitle: 'Nenhuma sugestão de compra'
  },
  transfers: {
    title: 'Transferências entre Estoques',
    breadcrumb: 'Transferências',
    subtitle: 'Painel de transferência operacional para itens em ruptura e lotes que exigem atenção.',
    info: 'Use esta visão para preparar transferências entre almoxarifado, farmácia e estoque principal.',
    searchLabel: 'Buscar item para transferência',
    searchPlaceholder: 'SKU, item ou lote',
    emptyTitle: 'Nenhuma transferência sugerida'
  },
  invoices: {
    title: 'Notas Fiscais de Estoque',
    breadcrumb: 'NF',
    subtitle: 'Conferência de entrada fiscal conectada ao estoque e aos lotes recebidos.',
    info: 'A tela documenta a ponte operacional entre entrada de NF, lote, custo e rastreabilidade fiscal.',
    searchLabel: 'Buscar item ou lote da NF',
    searchPlaceholder: 'SKU, item, lote ou fornecedor',
    emptyTitle: 'Nenhuma conferência fiscal pendente'
  }
} satisfies Record<OperationMode, {
  title: string;
  breadcrumb: string;
  subtitle: string;
  info: string;
  searchLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
}>;

const config = computed(() => configs[props.mode]);
const columns: DataTableColumn[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'itemName', label: 'Item' },
  { key: 'stock', label: 'Saldo' },
  { key: 'reference', label: 'Referência' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Ação operacional' }
];

const criticalItems = computed(() =>
  items.value.filter((item) => item.onHandQuantity <= item.reorderLevel)
);
const expiringLots = computed(() =>
  lots.value.filter((lot) => lot.status === 'expiring' || lot.status === 'expired')
);
const rows = computed<OperationRow[]>(() => {
  if (props.mode === 'purchases') {
    return criticalItems.value.map((item) => ({
      id: item.id,
      sku: item.sku,
      itemName: item.name,
      stock: item.onHandQuantity,
      unit: item.unit,
      reference: `mínimo ${item.reorderLevel} ${item.unit}`,
      status: 'critical',
      action: `Comprar ${Math.max(item.reorderLevel - item.onHandQuantity, 1)} ${item.unit}`
    }));
  }

  if (props.mode === 'transfers') {
    return criticalItems.value.map((item) => ({
      id: item.id,
      sku: item.sku,
      itemName: item.name,
      stock: item.onHandQuantity,
      unit: item.unit,
      reference: `custo ${formatCurrency(item.unitCostAmount)}`,
      status: 'critical',
      action: 'Transferir para estoque principal'
    }));
  }

  return lots.value.map((lot) => ({
    id: lot.id,
    sku: lot.sku,
    itemName: lot.itemName,
    stock: lot.quantity,
    unit: lot.unit,
    reference: [lot.lotNumber, lot.supplier].filter(Boolean).join(' · ') || 'Lote sem fornecedor',
    status: lot.status === 'expired' || lot.status === 'expiring' ? 'attention' : 'normal',
    action: lot.status === 'depleted' ? 'Arquivar lote' : 'Conferir NF de entrada'
  }));
});
const filteredRows = computed(() => {
  const term = query.value.trim().toLowerCase();
  return rows.value
    .filter((row) => !statusFilter.value || row.status === statusFilter.value)
    .filter((row) => {
      if (!term) return true;
      return [row.sku, row.itemName, row.reference, row.action].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
});

function statusVariant(status: OperationStatus): 'success' | 'warning' | 'danger' {
  if (status === 'critical') return 'danger';
  if (status === 'attention') return 'warning';
  return 'success';
}

function statusLabel(status: OperationStatus): string {
  if (status === 'critical') return 'Abaixo do mínimo';
  if (status === 'attention') return 'Atenção';
  return 'Normal';
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString('pt-BR')} ${unit}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [loadedItems, loadedLots] = await Promise.all([
      inventoryService.list(),
      inventoryService.listLots()
    ]);
    items.value = loadedItems;
    lots.value = loadedLots;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar operação de estoque';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-operation-page {
  display: grid;
  gap: 16px;
}

.operation-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.operation-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 260px);
  gap: 12px;
  align-items: end;
}

@media (max-width: 760px) {
  .operation-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
