<template>
  <div class="inventory-list-page">
    <AppPageHeader title="Estoque" subtitle="Controle de materiais e medicamentos">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton tag="a" to="/inventory/new" variant="primary">+ Novo Item</DsButton>
      </template>
    </AppPageHeader>

    <section class="inventory-list-page__overview">
      <DsCard title="Resumo do estoque">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ items.length }}</span>
            <span class="overview-metric__label">Itens cadastrados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ lowStockCount }}</span>
            <span class="overview-metric__label">Abaixo do ponto</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ totalQuantity }}</span>
            <span class="overview-metric__label">Unidades em mãos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ totalValue }}</span>
            <span class="overview-metric__label">Valor estimado</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="inventory-list-page__story">
      <DsCard title="Leitura rápida">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <DsInput
        v-model="search"
        type="search"
        placeholder="Buscar por SKU, nome ou unidade..."
        @keyup.enter="load"
      />
      <DsButton variant="secondary" @click="load">Buscar</DsButton>
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
        <DsButton
          tag="a"
          :to="`/inventory/${(row as InventoryItemSummary).id}`"
          size="sm"
          variant="secondary"
          >Ver</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary } from '@/types/inventory';
import { useListData } from '@/composables/useListData';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { computed } from 'vue';

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

const lowStockCount = computed(() => items.value.filter((item) => isLowStock(item)).length);
const totalQuantity = computed(() => items.value.reduce((sum, item) => sum + item.onHandQuantity, 0));
const totalValue = computed(() =>
  formatCurrency(items.value.reduce((sum, item) => sum + item.onHandQuantity * item.unitCostAmount, 0))
);
const lowStockRate = computed(() => {
  if (!items.value.length) return '0%';
  return `${Math.round((lowStockCount.value / items.value.length) * 100)}%`;
});
const storyCards = computed(() => [
  { label: 'Itens', value: items.value.length.toString(), hint: 'Cadastrados no estoque' },
  { label: 'Baixo estoque', value: lowStockCount.value.toString(), hint: 'Precisam de atenção' },
  { label: 'Taxa baixa', value: lowStockRate.value, hint: 'Proporção em risco' },
  { label: 'Valor', value: totalValue.value, hint: 'Estimativa total atual' }
]);

const { items, loading, error, search, load } = useListData<InventoryItemSummary>({
  fetchFn: (q) => inventoryService.list(q),
  entityLabel: 'itens de estoque',
  withSearch: true
});
</script>

<style scoped>
.inventory-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inventory-list-page__overview {
  margin-bottom: 4px;
}

.inventory-list-page__story {
  margin-bottom: 4px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.story-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.story-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.story-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.search-bar {
  max-width: 400px;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--active {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.status-badge--inactive {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}
</style>
