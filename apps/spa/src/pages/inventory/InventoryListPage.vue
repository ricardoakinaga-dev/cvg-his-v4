<template>
  <div class="inventory-list-page">
    <AppPageHeader title="Estoque" :breadcrumbs="['Estoque', 'Controles', 'Estoque']" subtitle="Consulte itens, saldos e pontos de reposição.">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" :disabled="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/inventory/new" icon="plus">Novo item</DsButton>
      </template>
    </AppPageHeader>
    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <form class="search-bar" @submit.prevent="load">
      <DsInput v-model="search" label="Buscar item" type="search" placeholder="Buscar por SKU, código de barras, nome ou unidade..." />
      <DsButton type="submit" variant="primary" :disabled="loading">Buscar</DsButton>
    </form>
    <div v-if="available && !loading" class="query-status" role="status">
      <span>{{ items.length }} {{ items.length === 1 ? 'item encontrado' : 'itens encontrados' }}{{ appliedSearch ? ` para “${appliedSearch}”` : '' }}</span>
      <DsButton v-if="appliedSearch" variant="ghost" @click="clearSearch">Limpar busca</DsButton>
    </div>
    <EmptyState v-if="failed && !loading" icon="package" title="Estoque indisponível" description="Não foi possível carregar os itens. Tente novamente para consultar o estoque." size="sm">
      <template #action><DsButton variant="secondary" @click="load">Tentar novamente</DsButton></template>
    </EmptyState>
    <DataTable v-else
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="📦"
      empty-title="Nenhum item encontrado"
      :empty-description="appliedSearch ? 'Tente outro nome ou código para localizar o item.' : 'Cadastre o primeiro item de estoque para começar.'"
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
    <details class="inventory-summary">
      <summary>Resumo da consulta</summary>
      <dl class="summary-grid">
        <div><dt>Itens</dt><dd>{{ available && !loading ? items.length : '—' }}</dd></div>
        <div><dt>No ponto de reposição ou abaixo</dt><dd>{{ available && !loading ? lowStockCount : '—' }}</dd></div>
        <div><dt>Custo dos itens em estoque</dt><dd>{{ available && !loading ? totalValueFormatted : '—' }}</dd></div>
      </dl>
      <p>Valores referentes aos itens desta consulta.</p>
    </details>
    <section class="inventory-navigation" aria-labelledby="inventory-navigation-title">
      <h2 id="inventory-navigation-title">Operações de estoque</h2>
      <nav class="operation-links" aria-label="Operações de estoque">
        <DsButton v-for="link in operationalLinks" :key="link.to" tag="a" :to="link.to" variant="secondary">{{ link.label }}</DsButton>
      </nav>
      <details class="related-navigation">
        <summary>Cadastros e áreas relacionadas</summary>
        <nav class="operation-links" aria-label="Cadastros e áreas relacionadas">
          <DsButton v-for="link in relatedLinks" :key="link.to" tag="a" :to="link.to" variant="ghost">{{ link.label }}</DsButton>
        </nav>
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary } from '@/types/inventory';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DataTable from '@/components/DataTable.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const operationalLinks = [
  { label: 'Movimentações', to: '/inventory/movements' },
  { label: 'Transferências', to: '/inventory/transfers' },
  { label: 'Notas fiscais', to: '/inventory/nf' },
  { label: 'Compras', to: '/inventory/purchases' },
  { label: 'Validade e lotes', to: '/inventory/validity' },
  { label: 'Consulta de preços', to: '/inventory/price-consultation' }
];
const relatedLinks = [
  { label: 'Produtos', to: '/products' }, { label: 'Estoques', to: '/warehouses' },
  { label: 'Fornecedores e despesas', to: '/suppliers' }, { label: 'Fabricantes', to: '/manufacturers' },
  { label: 'Grupos de produto', to: '/product-groups' }, { label: 'Orçamentos', to: '/quotes' },
  { label: 'Fiscal', to: '/fiscal' }, { label: 'Comandas', to: '/counter-sales' }, { label: 'Financeiro', to: '/billing' }
];
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Item' }, { key: 'onHandQuantity', label: 'Em estoque' },
  { key: 'reorderLevel', label: 'Ponto de reposição' }, { key: 'unitCostAmount', label: 'Custo unitário' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];
const items = ref<InventoryItemSummary[]>([]);
const loading = ref(true);
const failed = ref(false);
const available = ref(false);
const error = ref('');
const search = ref('');
const appliedSearch = ref('');
let requestVersion = 0;
function isLowStock(item: InventoryItemSummary) { return item.onHandQuantity <= item.reorderLevel; }
function formatCurrency(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
const lowStockCount = computed(() => items.value.filter(isLowStock).length);
const totalValueFormatted = computed(() => formatCurrency(items.value.reduce((sum, item) => sum + item.onHandQuantity * item.unitCostAmount, 0)));
async function load() {
  const version = ++requestVersion;
  const query = search.value.trim();
  loading.value = true; failed.value = false; available.value = false; error.value = '';
  try {
    const result = await inventoryService.list(query || undefined);
    if (version !== requestVersion) return;
    items.value = result; appliedSearch.value = query; available.value = true;
  } catch (cause) {
    if (version !== requestVersion) return;
    failed.value = true;
    error.value = cause instanceof Error ? cause.message : 'Erro ao carregar o estoque.';
  } finally { if (version === requestVersion) loading.value = false; }
}
function clearSearch() { search.value = ''; void load(); }
onMounted(load);
</script>

<style scoped>
.inventory-list-page { display: grid; gap: 16px; min-width: 0; }
.search-bar { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 12px; }
.query-status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; color: var(--color-text-secondary); font-size: 14px; }
summary { min-height: 44px; box-sizing: border-box; padding-block: 12px; font-weight: 700; cursor: pointer; color: var(--color-text-secondary); }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 8px 0; }
.summary-grid > div { padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); min-width: 0; }
dt, .inventory-summary p { font-size: 13px; color: var(--color-text-secondary); }
dd { margin: 8px 0 0; font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-text); overflow-wrap: anywhere; }
.inventory-navigation { padding-top: 8px; border-top: 1px solid var(--color-border); }
h2 { font: 700 16px var(--font-family-sans); color: var(--color-text); margin: 8px 0 16px; }
.operation-links { display: flex; flex-wrap: wrap; gap: 8px; }
.operation-links :deep(.ds-btn__label) { white-space: normal; overflow: visible; text-overflow: clip; }
.text-danger { color: var(--color-danger-600); font-weight: 700; }
.muted { color: var(--color-text-secondary); font-size: 12px; }
@media (max-width: 600px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .summary-grid > div:last-child { grid-column: 1 / -1; } .operation-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
