<template>
  <div class="inventory-list-page">
    <AppPageHeader title="Estoque" subtitle="Controle de materiais e medicamentos">
      <template #actions>
        <router-link to="/inventory/new" class="btn btn--primary">+ Novo Item</router-link>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <input
        v-model="search"
        type="search"
        class="search-bar__input"
        placeholder="Buscar por SKU, nome ou unidade..."
        @keyup.enter="load"
      />
      <button class="btn btn--secondary" @click="load">Buscar</button>
    </div>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="📦"
      empty-title="Nenhum item encontrado"
      empty-description="Cadastre o primeiro item de estoque para começar."
      variant="hoverable"
    >
      <template #cell-name="{ row }">
        <strong>{{ (row as InventoryItemSummary).name }}</strong>
        <span class="muted"><br />SKU: {{ (row as InventoryItemSummary).sku }}</span>
      </template>
      <template #cell-onHandQuantity="{ row }">
        <span :class="{ 'text-danger': isLowStock(row as InventoryItemSummary) }">
          {{ (row as InventoryItemSummary).onHandQuantity }}
          {{ (row as InventoryItemSummary).unit }}
        </span>
      </template>
      <template #cell-reorderLevel="{ row }">
        {{ (row as InventoryItemSummary).reorderLevel }} {{ (row as InventoryItemSummary).unit }}
      </template>
      <template #cell-unitCostAmount="{ row }">
        {{ formatCurrency((row as InventoryItemSummary).unitCostAmount) }}
      </template>
      <template #cell-actions="{ row }">
        <router-link
          :to="`/inventory/${(row as InventoryItemSummary).id}`"
          class="btn btn--sm btn--secondary"
        >
          Ver
        </router-link>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary } from '@/types/inventory';
import { useListData } from '@/composables/useListData';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

function isLowStock(item: InventoryItemSummary): boolean {
  return item.onHandQuantity <= item.reorderLevel;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Item' },
  { key: 'onHandQuantity', label: 'Em Estoque' },
  { key: 'reorderLevel', label: 'Ponto de Reposição' },
  { key: 'unitCostAmount', label: 'Custo Unitário' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const { items, loading, error, search, load } = useListData<InventoryItemSummary>({
  fetchFn: (q) => inventoryService.list(q),
  entityLabel: 'itens de estoque',
  withSearch: true
});
</script>
