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

    <section class="hub-kpis">
      <DsStatCard :label="`${consumptions.length} lançamento(s)`" value="" icon="📚" />
      <DsStatCard :label="`${assistentialCount} assistencial(is)`" value="" icon="🏥" />
      <DsStatCard :label="`${commercialCount} comercial(is)`" value="" icon="🛒" />
    </section>

    <div class="filter-bar">
      <DsInput v-model="filterType" type="select" label="Natureza">
        <option value="">Todos</option>
        <option value="assistential">Assistencial</option>
        <option value="commercial">Comercial</option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="📦"
      empty-title="Nenhum consumo registrado"
      empty-description="Os consumos lançados pelo backend aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-type="{ row }">
        <DsBadge :variant="typeVariant((row as InventoryMovementRow).type)" size="sm">
          {{ typeLabel((row as InventoryMovementRow).type) }}
        </DsBadge>
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as InventoryMovementRow).quantity, (row as InventoryMovementRow).unit) }}
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as InventoryMovementRow).date) }}
      </template>
      <template #cell-costAmount="{ row }">
        {{ formatCurrency((row as InventoryMovementRow).costAmount) }}
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
import type { InventoryConsumptionSummary, InventoryItemSummary } from '@/types/inventory';

withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  breadcrumb?: string;
}>(), {
  title: 'Ledger de Consumo',
  subtitle: 'Histórico transacional de saídas assistenciais e comerciais do estoque',
  breadcrumb: 'Movimentações'
});

interface InventoryMovementRow {
  readonly id: string;
  readonly itemName: string;
  readonly type: 'assistential' | 'commercial';
  readonly source: string;
  readonly quantity: number;
  readonly unit: string;
  readonly costAmount: number;
  readonly date: string;
}

const consumptions = ref<InventoryConsumptionSummary[]>([]);
const itemsById = ref<Record<string, InventoryItemSummary>>({});
const loading = ref(false);
const error = ref('');
const filterType = ref('');

const columns: DataTableColumn[] = [
  { key: 'itemName', label: 'Item' },
  { key: 'type', label: 'Natureza' },
  { key: 'source', label: 'Origem' },
  { key: 'quantity', label: 'Quantidade' },
  { key: 'costAmount', label: 'Custo' },
  { key: 'date', label: 'Data' }
];

const movementRows = computed<InventoryMovementRow[]>(() =>
  consumptions.value.map((consumption) => {
    const item = itemsById.value[consumption.inventoryItemId];
    const isCommercial =
      consumption.sourceEntityType === 'other' && !consumption.encounterId?.trim();

    return {
      id: consumption.id,
      itemName: item?.name ?? consumption.inventoryItemId,
      type: isCommercial ? 'commercial' : 'assistential',
      source: sourceLabel(consumption),
      quantity: consumption.quantity,
      unit: consumption.unit,
      costAmount: consumption.costAmount,
      date: consumption.createdAt
    };
  })
);

const filteredRows = computed(() =>
  movementRows.value.filter((row) => !filterType.value || row.type === filterType.value)
);
const assistentialCount = computed(
  () => movementRows.value.filter((row) => row.type === 'assistential').length
);
const commercialCount = computed(
  () => movementRows.value.filter((row) => row.type === 'commercial').length
);

function sourceLabel(consumption: InventoryConsumptionSummary): string {
  switch (consumption.sourceEntityType) {
    case 'encounter':
      return consumption.sourceEntityId || consumption.encounterId || 'Atendimento';
    case 'diagnostic_order':
      return consumption.sourceEntityId || 'Pedido laboratorial';
    case 'surgery_case':
      return consumption.sourceEntityId || 'Cirurgia';
    case 'inpatient_stay':
      return consumption.sourceEntityId || 'Internação';
    case 'prescription':
      return consumption.sourceEntityId || 'Prescrição';
    default:
      return 'Balcão / ajuste comercial';
  }
}

function typeVariant(type: InventoryMovementRow['type']): 'default' | 'success' | 'warning' {
  return type === 'commercial' ? 'default' : 'warning';
}

function typeLabel(type: InventoryMovementRow['type']): string {
  return type === 'commercial' ? 'Comercial' : 'Assistencial';
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
    const [items, allConsumptions] = await Promise.all([
      inventoryService.list(),
      inventoryService.listConsumptions()
    ]);
    itemsById.value = Object.fromEntries(items.map((item) => [item.id, item]));
    consumptions.value = allConsumptions;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar ledger de consumo';
  } finally {
    loading.value = false;
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
  max-width: 400px;
}
</style>
