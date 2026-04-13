<template>
  <div class="inventory-list-page">
    <AppPageHeader
      title="Estoque"
      subtitle="Controle de estoque, movimentações e níveis de reposição"
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="items.length + ' item(s)'" value="" icon="📦" />
      <DsStatCard :label="lowStockCount + ' abaixo do ponto'" value="" icon="⚠️" :error="lowStockCount > 0 ? 'Estoque precisa de atenção' : undefined" />
      <DsStatCard :label="totalQuantity + ' unidade(s)'" value="" icon="🔢" />
      <DsStatCard :label="totalValueFormatted" value="" icon="💵" />
    </section>

    <!-- Hub: Operational Alerts -->
    <section v-if="inventoryAlerts.length > 0" class="hub-alerts">
      <DsAlert
        v-for="(alert, i) in inventoryAlerts"
        :key="i"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> — {{ alert.message }}
      </DsAlert>
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Controle de Estoque" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/inventory/new" icon="➕">
            Novo Item
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/movements" icon="📥">
            Movimentações
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/validity" icon="📅">
            Validade / Lotes
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/quotes" icon="🧾">
            Orçamentos
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/fiscal" icon="📋">
            Fiscal
          </DsButton>
          <DsButton variant="ghost" :loading="loading" @click="load" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <section class="hub-sections">
      <DsCard title="Controles Operacionais" variant="compact">
        <div class="hub-links">
          <DsButton variant="secondary" tag="a" to="/inventory/movements">Entrada, saída e transferência</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/validity">Fila de validade e revisão</DsButton>
        </div>
      </DsCard>
      <DsCard title="Cadastros" variant="compact">
        <div class="hub-links">
          <DsButton variant="secondary" tag="a" to="/products">Catálogo de produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/quotes">Orçamentos vinculados</DsButton>
        </div>
      </DsCard>
      <DsCard title="Fiscal" variant="compact">
        <div class="hub-links">
          <DsButton variant="secondary" tag="a" to="/fiscal">Parâmetros fiscais</DsButton>
          <DsButton variant="secondary" tag="a" to="/fiscal/cfop">CFOP e operações</DsButton>
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
import { computed, ref } from 'vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary } from '@/types/inventory';
import { useListData } from '@/composables/useListData';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
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

const lowStockCount = computed(() => items.value.filter((item) => isLowStock(item)).length);
const totalQuantity = computed(() => items.value.reduce((sum, item) => sum + item.onHandQuantity, 0));
const totalValueFormatted = computed(() =>
  formatCurrency(items.value.reduce((sum, item) => sum + item.onHandQuantity * item.unitCostAmount, 0))
);
interface InventoryAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const inventoryAlerts = computed<InventoryAlert[]>(() => {
  const alerts: InventoryAlert[] = [];
  if (lowStockCount.value > 0) {
    alerts.push({ variant: 'warning', title: 'Estoque baixo', message: `${lowStockCount.value} item(s) estão abaixo do ponto de reposição.` });
  }
  if (lowStockCount.value === 0 && items.value.length > 0) {
    alerts.push({ variant: 'info', title: 'Estoque okay', message: 'Todos os itens estão acima do ponto de reposição.' });
  }
  return alerts;
});

const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-inventory',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => load()
  }
]);

const headerPrimaryAction = computed(() => ({
  key: 'new-item',
  label: '+ Novo Item',
  variant: 'primary' as const,
  to: '/inventory/new'
}));

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

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hub-actions {
  margin-bottom: 0;
}

.hub-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.hub-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
</style>
