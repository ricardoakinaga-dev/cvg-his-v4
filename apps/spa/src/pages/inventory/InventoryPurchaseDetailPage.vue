<template>
  <div class="inventory-purchase-detail-page">
    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" label="Carregando compra..." />
    </div>

    <template v-else-if="error">
      <DsAlert variant="danger">
        {{ error }}
      </DsAlert>
      <div class="detail-error-actions">
        <DsButton type="button" variant="primary" :loading="loading" @click="load">
          Tentar novamente
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/inventory/purchases">
          Voltar às Compras
        </DsButton>
      </div>
    </template>

    <template v-else-if="purchase">
      <AppPageHeader
        title="Detalhe da compra"
        :breadcrumbs="['Estoque', 'Controles', 'Compras', purchase.supplierName]"
        :subtitle="purchase.invoiceNumber ? `NF ${purchase.invoiceNumber}` : 'NF pendente'"
      >
        <template #actions>
          <DsButton variant="secondary" tag="a" href="/inventory/purchases">
            Voltar às Compras
          </DsButton>
        </template>
      </AppPageHeader>

      <section class="summary-grid" aria-label="Resumo da compra">
        <div class="summary-card">
          <span class="summary-card__label">Fornecedor</span>
          <strong class="summary-card__value">{{ purchase.supplierName }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-card__label">Situação</span>
          <StatusBadge :label="statusLabel" :variant="statusVariant" size="sm" />
        </div>
        <div class="summary-card">
          <span class="summary-card__label">Total</span>
          <strong class="summary-card__value">{{ formatCurrency(purchase.totalAmount) }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-card__label">Recebido</span>
          <strong class="summary-card__value">{{ formatCurrency(purchase.receivedAmount) }}</strong>
        </div>
      </section>

      <DsCard title="Linhas da compra">
        <DataTable
          :columns="columns"
          :rows="purchase.lines"
          empty-icon="🛒"
          empty-title="Nenhuma linha encontrada"
          empty-description="A compra persistida não possui linhas para exibir."
          variant="hoverable"
        >
          <template #cell-sku="{ row }">
            <span class="record-id">{{ (row as PurchaseLine).sku }}</span>
          </template>
          <template #cell-orderedQuantity="{ row }">
            {{ formatQuantity((row as PurchaseLine).orderedQuantity, (row as PurchaseLine).unit) }}
          </template>
          <template #cell-receivedQuantity="{ row }">
            {{ formatQuantity((row as PurchaseLine).receivedQuantity, (row as PurchaseLine).unit) }}
          </template>
          <template #cell-unitCostAmount="{ row }">
            {{ formatCurrency((row as PurchaseLine).unitCostAmount) }}
          </template>
          <template #cell-total="{ row }">
            {{
              formatCurrency(
                (row as PurchaseLine).orderedQuantity * (row as PurchaseLine).unitCostAmount
              )
            }}
          </template>
        </DataTable>
      </DsCard>

      <section class="audit-card" aria-label="Auditoria da compra">
        <h2>Auditoria</h2>
        <dl class="audit-grid">
          <div>
            <dt>Criada em</dt>
            <dd>{{ formatDate(purchase.createdAt) }}</dd>
          </div>
          <div>
            <dt>Atualizada em</dt>
            <dd>{{ formatDate(purchase.updatedAt) }}</dd>
          </div>
          <div>
            <dt>Recebida em</dt>
            <dd>{{ formatDate(purchase.receivedAt) }}</dd>
          </div>
          <div>
            <dt>Contas a pagar</dt>
            <dd>{{ purchase.payableId || 'Não vinculada' }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryPurchaseLineSummary, InventoryPurchaseSummary } from '@/types/inventory';

type PurchaseLine = InventoryPurchaseLineSummary;
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const route = useRoute();
const purchase = ref<InventoryPurchaseSummary | null>(null);
const loading = ref(true);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'sku', label: 'Código', width: '130px' },
  { key: 'itemName', label: 'Produto' },
  { key: 'orderedQuantity', label: 'Pedida', width: '130px' },
  { key: 'receivedQuantity', label: 'Recebida', width: '130px' },
  { key: 'unitCostAmount', label: 'Custo Unit.', width: '120px' },
  { key: 'total', label: 'Total', width: '120px' }
];

const statusLabel = computed(() =>
  purchase.value ? purchaseStatusLabel(purchase.value.status) : ''
);
const statusVariant = computed<StatusVariant>(() =>
  purchase.value ? purchaseStatusVariant(purchase.value.status) : 'neutral'
);

function purchaseStatusLabel(status: InventoryPurchaseSummary['status']): string {
  switch (status) {
    case 'draft':
      return 'Rascunho';
    case 'approved':
      return 'Aprovada';
    case 'partially_received':
      return 'Recebimento parcial';
    case 'received':
      return 'Recebida';
    case 'cancelled':
      return 'Cancelada';
  }
}

function purchaseStatusVariant(status: InventoryPurchaseSummary['status']): StatusVariant {
  switch (status) {
    case 'draft':
      return 'warning';
    case 'approved':
      return 'info';
    case 'partially_received':
      return 'warning';
    case 'received':
      return 'success';
    case 'cancelled':
      return 'neutral';
  }
}

function formatQuantity(quantity: number, unit: string): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(quantity)} ${unit}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const purchaseId = String(route.params.purchaseId ?? '').trim();
    if (!purchaseId) {
      error.value = 'ID da compra não fornecido';
      return;
    }

    const purchases = await inventoryService.listPurchases();
    purchase.value = purchases.find((candidate) => candidate.id === purchaseId) ?? null;
    if (!purchase.value) error.value = 'Compra persistida não encontrada';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar compra persistida';
    purchase.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-purchase-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.detail-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.summary-card,
.audit-card {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #fff);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card__label,
dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-card__value {
  font-size: 18px;
}

.audit-card h2 {
  margin: 0 0 12px;
}

.audit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
}

.audit-grid div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

dd {
  margin: 0;
}
</style>
