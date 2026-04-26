<template>
  <div class="inventory-list-page">
    <AppPageHeader
      title="Estoque"
      :breadcrumbs="['Estoque', 'Controles', 'Estoque']"
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
      <DsCard title="Cadastros beta" variant="compact">
        <div class="hub-links">
          <DsButton variant="secondary" tag="a" to="/products">Produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/warehouses">Estoques</DsButton>
          <DsButton variant="secondary" tag="a" to="/suppliers">Fornecedores e despesas</DsButton>
          <DsButton variant="secondary" tag="a" to="/manufacturers">Fabricantes</DsButton>
          <DsButton variant="secondary" tag="a" to="/product-groups">Grupos de produto</DsButton>
        </div>
      </DsCard>
      <DsCard title="Operação legacy mapeada" variant="compact">
        <div class="hub-links">
          <DsButton variant="secondary" tag="a" to="/inventory/movements">Transação no estoque</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/movements">Transferência entre estoques</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/nf">Entrada de nota fiscal</DsButton>
          <DsButton variant="secondary" tag="a" to="/quotes">Compras e orçamentos</DsButton>
        </div>
      </DsCard>
      <DsCard title="Consulta balcão" variant="compact">
        <div class="hub-links">
          <DsButton variant="secondary" tag="a" to="/inventory/price-consultation">Consulta de preços</DsButton>
          <DsButton variant="secondary" tag="a" to="/counter-sales">Consumir em comanda</DsButton>
          <DsButton variant="secondary" tag="a" to="/billing">Reflexo financeiro</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="inventory-domain-map">
      <DsCard title="Cadeia operacional do estoque">
        <div class="domain-flow">
          <article v-for="step in domainFlow" :key="step.title" class="domain-flow__card">
            <span>{{ step.eyebrow }}</span>
            <strong>{{ step.title }}</strong>
            <p>{{ step.description }}</p>
          </article>
        </div>
      </DsCard>
    </section>

    <section class="inventory-operations-grid">
      <DsCard title="Consulta de Preços e Saldo">
        <div v-if="items.length === 0" class="inventory-empty-inline">
          Nenhum item carregado para consulta operacional.
        </div>
        <div v-else class="price-lookup-list">
          <article v-for="item in priceLookupItems" :key="item.id" class="price-lookup-card">
            <div>
              <strong>{{ item.name }}</strong>
              <span>SKU/Cód. barras: {{ item.sku }}</span>
            </div>
            <div class="price-lookup-card__metrics">
              <span>Saldo em Estoque: {{ item.onHandQuantity }} {{ item.unit }}</span>
              <span>Custo Unitário: {{ formatCurrency(item.unitCostAmount) }}</span>
              <span :class="{ 'text-danger': isLowStock(item) }">
                {{ isLowStock(item) ? 'Abaixo do ponto de reposição' : 'Saldo operacional' }}
              </span>
            </div>
          </article>
        </div>
      </DsCard>

      <DsCard title="Estoques físicos e setoriais">
        <div class="stock-location-grid">
          <article v-for="location in stockLocations" :key="location.name" class="stock-location-card">
            <strong>{{ location.name }}</strong>
            <span>{{ location.role }}</span>
          </article>
        </div>
      </DsCard>
    </section>

    <section class="legacy-operation-grid">
      <article v-for="operation in legacyOperations" :key="operation.title" class="legacy-operation-card">
        <span>{{ operation.route }}</span>
        <strong>{{ operation.title }}</strong>
        <p>{{ operation.description }}</p>
        <small>{{ operation.fields }}</small>
      </article>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <DsInput
        v-model="search"
        type="search"
        placeholder="Buscar por SKU, código de barras, nome ou unidade..."
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

const domainFlow = [
  {
    eyebrow: 'Beta',
    title: 'Cadastro mestre',
    description: 'Produtos, estoques, fornecedores, fabricantes e grupos estruturam o catálogo.'
  },
  {
    eyebrow: 'Legacy',
    title: 'Movimentação real',
    description: 'Nota fiscal, compra, estocagem manual e transferência alteram saldo e custo.'
  },
  {
    eyebrow: 'Operação',
    title: 'Preço e disponibilidade',
    description: 'Consulta de preço/saldo apoia balcão, comanda, venda e atendimento.'
  },
  {
    eyebrow: 'Financeiro',
    title: 'Reflexo monetário',
    description: 'Compra gera custo/contas a pagar; venda e comanda geram receita.'
  }
];

const stockLocations = [
  { name: 'Geladeira Vacinas', role: 'Cadeia fria e vacinas' },
  { name: 'Farmácia', role: 'Medicamentos e controlados' },
  { name: 'Centro Cirúrgico', role: 'Insumos cirúrgicos' },
  { name: 'Laboratório', role: 'Materiais diagnósticos' },
  { name: 'Recepção/Escritório', role: 'Balcão e consumo administrativo' }
];

const legacyOperations = [
  {
    title: 'Entrada de Nota Fiscal',
    route: 'EntradaNotaFiscal.htm',
    description: 'Registra fornecedor, nota, data de entrada, quantidade e valor unitário.',
    fields: 'Nota Fiscal · Data da Entrada · Fornecedor · Produto · Unidade'
  },
  {
    title: 'Transação no Estoque',
    route: 'TransacaoNoEstoque.htm',
    description: 'Estocagem manual com estoque alvo, saldo atual, quantidade e observação.',
    fields: 'Estoque · Código de Barras · Produto · Quantidade a Estocar'
  },
  {
    title: 'Transferência entre Estoques',
    route: 'TransferenciaEntreEstoques.htm',
    description: 'Move saldo entre locais físicos com leitura de origem e destino.',
    fields: 'Estoque Origem · Estoque Destino · Saldo Origem · Saldo Destino'
  },
  {
    title: 'Compras',
    route: 'Compras.htm',
    description: 'Planeja e registra aquisição antes da entrada fiscal efetiva.',
    fields: 'Fornecedor · Data · Compras fechadas · Abrir'
  }
];

const lowStockCount = computed(() => items.value.filter((item) => isLowStock(item)).length);
const totalQuantity = computed(() => items.value.reduce((sum, item) => sum + item.onHandQuantity, 0));
const totalValueFormatted = computed(() =>
  formatCurrency(items.value.reduce((sum, item) => sum + item.onHandQuantity * item.unitCostAmount, 0))
);
const priceLookupItems = computed(() => items.value.slice(0, 5));
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

.inventory-domain-map,
.inventory-operations-grid {
  display: grid;
  gap: 12px;
}

.domain-flow,
.legacy-operation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.domain-flow__card,
.legacy-operation-card,
.price-lookup-card,
.stock-location-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  padding: 14px;
}

.domain-flow__card,
.legacy-operation-card {
  display: grid;
  gap: 8px;
}

.domain-flow__card span,
.legacy-operation-card span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.domain-flow__card p,
.legacy-operation-card p,
.legacy-operation-card small {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.legacy-operation-card small {
  font-size: 12px;
}

.inventory-operations-grid {
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
}

.price-lookup-list,
.stock-location-grid {
  display: grid;
  gap: 10px;
}

.price-lookup-card {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.price-lookup-card > div,
.price-lookup-card__metrics,
.stock-location-card {
  display: grid;
  gap: 5px;
}

.price-lookup-card span,
.stock-location-card span,
.inventory-empty-inline {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
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

@media (max-width: 920px) {
  .inventory-operations-grid {
    grid-template-columns: 1fr;
  }

  .price-lookup-card {
    flex-direction: column;
  }
}
</style>
