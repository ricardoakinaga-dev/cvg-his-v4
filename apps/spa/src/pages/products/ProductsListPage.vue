<template>
  <div class="products-list-page">
    <AppPageHeader
      title="Produtos"
      :breadcrumbs="['Estoque', 'Cadastros', 'Produtos']"
      subtitle="Cadastro comercial de produtos, códigos, preços e situação operacional"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/products/import" icon="⬆️">Importar</DsButton>
        <DsButton variant="secondary" tag="a" to="/inventory" icon="📦">Estoque</DsButton>
        <DsButton variant="primary" tag="a" to="/products/new" icon="➕">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="filter-panel" aria-label="Filtros de produtos">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="field">
          <span>Código</span>
          <input v-model="draftFilters.code" type="search" autocomplete="off" data-testid="products-code-filter" />
        </label>
        <label class="field">
          <span>Produto</span>
          <input v-model="draftFilters.product" type="search" autocomplete="off" data-testid="products-name-filter" />
        </label>
        <label class="field">
          <span>Situação</span>
          <select v-model="draftFilters.status" data-testid="products-status-filter">
            <option value="">Todas</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      v-if="loading || summaryAvailable"
      caption="Produtos cadastrados"
      :columns="columns"
      :rows="filteredProducts"
      :loading="loading"
      empty-icon="📦"
      :empty-title="hasAppliedFilters ? 'Nenhum produto corresponde aos filtros' : 'Nenhum produto cadastrado'"
      :empty-description="hasAppliedFilters
        ? 'Ajuste código, nome ou situação, ou limpe os filtros para consultar os produtos.'
        : 'Cadastre o primeiro produto para organizar o catálogo e acompanhar o estoque.'"
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton v-if="hasAppliedFilters" variant="secondary" @click="clearFilters">
          Limpar filtros
        </DsButton>
        <DsButton v-else variant="primary" tag="a" to="/products/new">Incluir produto</DsButton>
      </template>
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as ProductSummary).code ?? (row as ProductSummary).id }}</span>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as ProductSummary).name }}</strong>
      </template>
      <template #cell-description="{ row }">
        {{ (row as ProductSummary).description || 'Sem descrição' }}
      </template>
      <template #cell-basePrice="{ row }">
        {{ formatCurrency((row as ProductSummary).basePrice) }}
      </template>
      <template #cell-active="{ row }">
        <StatusBadge
          :label="(row as ProductSummary).active ? 'Ativo' : 'Inativo'"
          :variant="(row as ProductSummary).active ? 'success' : 'neutral'"
          size="sm"
        />
      </template>
      <template #cell-updatedAt="{ row }">
        {{ formatDate((row as ProductSummary).updatedAt) }}
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton tag="a" :to="`/products/${(row as ProductSummary).id}`" size="sm" variant="secondary">
            Abrir
          </DsButton>
          <DsButton tag="a" :to="`/products/${(row as ProductSummary).id}/edit`" size="sm" variant="secondary">
            Editar
          </DsButton>
        </div>
      </template>
    </DataTable>

    <EmptyState
      v-else
      icon="alert"
      title="Produtos indisponíveis"
      description="Não foi possível consultar o catálogo. Tente carregar os produtos novamente."
    >
      <template #action>
        <DsButton variant="secondary" @click="loadData">Tentar novamente</DsButton>
      </template>
    </EmptyState>

    <details v-if="summaryAvailable && !loading" class="products-summary">
      <summary>Resumo de produtos</summary>
      <section class="hub-kpis" aria-label="Resumo de produtos">
        <DsStatCard label="Produtos" :value="String(products.length)" icon="📦" />
        <DsStatCard label="Ativos" :value="String(activeCount)" icon="✅" />
        <DsStatCard label="Inativos" :value="String(inactiveCount)" icon="⏸️" />
        <DsStatCard label="Resultados" :value="String(filteredProducts.length)" icon="🔎" />
      </section>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { productsService, type ProductSummary } from '@/services/products';

const products = ref<ProductSummary[]>([]);
const loading = ref(false);
const error = ref('');
const summaryAvailable = ref(false);
const draftFilters = reactive({
  code: '',
  product: '',
  status: ''
});
const appliedFilters = reactive({ ...draftFilters });
const hasAppliedFilters = computed(() =>
  Boolean(appliedFilters.code.trim() || appliedFilters.product.trim() || appliedFilters.status)
);

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '140px' },
  { key: 'name', label: 'Produto' },
  { key: 'description', label: 'Descrição' },
  { key: 'basePrice', label: 'Preço Base', width: '130px' },
  { key: 'active', label: 'Situação', width: '120px' },
  { key: 'updatedAt', label: 'Atualizado', width: '130px' },
  { key: 'actions', label: 'Abrir', width: '150px', class: 'table__actions-col' }
];

const activeCount = computed(() => products.value.filter((product) => product.active).length);
const inactiveCount = computed(() => products.value.filter((product) => !product.active).length);
const filteredProducts = computed(() => {
  const code = normalizeSearch(appliedFilters.code);
  const productName = normalizeSearch(appliedFilters.product);
  const status = appliedFilters.status;

  return products.value.filter((product) => {
    if (status === 'active' && !product.active) return false;
    if (status === 'inactive' && product.active) return false;
    if (code && !normalizeSearch(product.code ?? product.id).includes(code)) return false;
    if (productName && !normalizeSearch(product.name).includes(productName)) return false;
    return true;
  });
});

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void loadData();
}

function clearFilters() {
  Object.assign(draftFilters, { code: '', product: '', status: '' });
  applyFilters();
}

async function loadData() {
  loading.value = true;
  error.value = '';
  summaryAvailable.value = false;
  try {
    const query = appliedFilters.product || appliedFilters.code || undefined;
    products.value = await productsService.list(query);
    summaryAvailable.value = true;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produtos';
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.products-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.field input,
.field select {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.record-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.products-summary > summary {
  min-height: 44px;
  align-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.products-summary > summary:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.products-summary[open] > summary { margin-bottom: 12px; }

@media (max-width: 820px) {
  .filters, .hub-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .filter-panel { padding: 12px; }

  .hub-kpis :deep(.ds-stat-card) { padding: 12px; gap: 10px; }
  .hub-kpis :deep(.ds-stat-card__icon) { width: 32px; height: 32px; border-radius: 10px; }
  .hub-kpis :deep(.ds-stat-card__value) { font-size: 24px; }
}
</style>
