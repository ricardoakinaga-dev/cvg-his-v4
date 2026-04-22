<template>
  <div class="list-page">
    <AppPageHeader
      title="Produtos"
      :breadcrumbs="['Estoque', 'Cadastrados', 'Produtos']"
      subtitle="Catálogo de produtos e mercadorias para estoque e comercialização">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" @click="router.push('/products/new')">Novo Produto</DsButton>
      </template>
    </AppPageHeader>

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="products.length + ' produto(s)'" value="" icon="📦" />
      <DsStatCard :label="activeCount + ' ativo(s)'" value="" icon="✅" />
      <DsStatCard :label="inactiveCount + ' inativo(s)'" value="" icon="❌" />
      <DsStatCard :label="filteredCount + ' resultado(s)'" value="" icon="🔍" />
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/products/new" icon="➕">
            Novo Produto
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory" icon="📦">
            Ver Estoque
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/sales/quotes" icon="🧾">
            Orçamentos
          </DsButton>
          <DsButton variant="ghost" :loading="loading" @click="loadData" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <DsInput v-model="searchQuery" label="" placeholder="Buscar por nome ou código..." @input="debouncedSearch" />
    </div>

    <DataTable
      :columns="columns"
      :rows="products"
      :loading="loading"
      empty-icon="📦"
      empty-title="Nenhum produto encontrado"
      empty-description="Cadastre o primeiro produto para começar."
      variant="hoverable"
    >
      <template #cell-name="{ row }">
        {{ (row as ProductSummary).name }}
      </template>
      <template #cell-code="{ row }">
        {{ (row as ProductSummary).code ?? '—' }}
      </template>
      <template #cell-basePrice="{ row }">
        {{ formatCurrency((row as ProductSummary).basePrice) }}
      </template>
      <template #cell-active="{ row }">
        <span :class="['status-badge', (row as ProductSummary).active ? 'status-badge--active' : 'status-badge--inactive']">
          {{ (row as ProductSummary).active ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/products/${(row as ProductSummary).id}`)">
            Ver
          </DsButton>
          <DsButton size="sm" variant="secondary" @click="router.push(`/products/${(row as ProductSummary).id}/edit`)">
            Editar
          </DsButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { productsService, type ProductSummary } from '@/services/products';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { computed } from 'vue';

const router = useRouter();
const products = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'code', label: 'Código' },
  { key: 'basePrice', label: 'Preço Base' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const activeCount = computed(() => products.value.filter((product) => product.active).length);
const inactiveCount = computed(() => products.value.filter((product) => !product.active).length);
const filteredCount = computed(
  () =>
    products.value.filter((product) => {
      const q = searchQuery.value.toLowerCase();
      if (!q) return true;
      return product.name.toLowerCase().includes(q) || (product.code ?? '').toLowerCase().includes(q);
    }).length
);
const activeRate = computed(() => {
  if (!products.value.length) return '0%';
  return `${Math.round((activeCount.value / products.value.length) * 100)}%`;
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadData(searchQuery.value), 300);
}

async function loadData(search?: string) {
  loading.value = true;
  error.value = '';
  try {
    products.value = await productsService.list(search);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produtos';
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-actions {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
