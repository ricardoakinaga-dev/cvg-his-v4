<template>
  <div class="inventory-validity-page">
    <AppPageHeader
      title="Validade e Lotes"
      subtitle="Controle de expiração, localização e criticidade dos lotes ativos do estoque"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${expiringCount} vencendo`" value="" icon="⚠️" :error="expiringCount > 0 ? 'Atenção' : undefined" />
      <DsStatCard :label="`${expiredCount} vencido(s)`" value="" icon="❌" />
      <DsStatCard :label="`${lots.length} lote(s)`" value="" icon="🏷️" />
    </section>

    <section class="hub-alerts">
      <DsAlert v-if="expiredCount > 0" variant="danger" dismissible>
        <strong>Bloqueio:</strong> {{ expiredCount }} lote(s) já ultrapassaram a validade.
      </DsAlert>
      <DsAlert v-else-if="expiringCount > 0" variant="warning" dismissible>
        <strong>Atenção:</strong> {{ expiringCount }} lote(s) vencem nos próximos 30 dias.
      </DsAlert>
    </section>

    <DataTable
      :columns="columns"
      :rows="lots"
      :loading="loading"
      empty-icon="📅"
      empty-title="Nenhum lote disponível"
      empty-description="Os lotes publicados pelo backend aparecerão aqui."
      variant="hoverable"
    >
      <template #cell-expiryDate="{ row }">
        <span :class="statusClass((row as InventoryLotRow).status)">
          {{ formatDate((row as InventoryLotRow).expiryDate) }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <DsBadge :variant="statusVariant((row as InventoryLotRow).status)" size="sm">
          {{ statusLabel((row as InventoryLotRow).status) }}
        </DsBadge>
      </template>
      <template #cell-quantity="{ row }">
        {{ formatQuantity((row as InventoryLotRow).quantity, (row as InventoryLotRow).unit) }}
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
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryLotSummary } from '@/types/inventory';

type InventoryLotRow = InventoryLotSummary;

const lots = ref<InventoryLotRow[]>([]);
const loading = ref(false);
const error = ref('');

const expiringCount = computed(() =>
  lots.value.filter((lot) => lot.status === 'expiring').length
);
const expiredCount = computed(() =>
  lots.value.filter((lot) => lot.status === 'expired').length
);

const columns: DataTableColumn[] = [
  { key: 'itemName', label: 'Item' },
  { key: 'lotNumber', label: 'Lote' },
  { key: 'quantity', label: 'Quantidade' },
  { key: 'expiryDate', label: 'Validade' },
  { key: 'location', label: 'Localização' },
  { key: 'status', label: 'Status' }
];

function statusVariant(status: InventoryLotRow['status']): 'danger' | 'warning' | 'success' | 'default' {
  switch (status) {
    case 'expired':
      return 'danger';
    case 'expiring':
      return 'warning';
    case 'depleted':
      return 'default';
    default:
      return 'success';
  }
}

function statusLabel(status: InventoryLotRow['status']): string {
  switch (status) {
    case 'expired':
      return 'Vencido';
    case 'expiring':
      return 'Vencendo';
    case 'depleted':
      return 'Esgotado';
    default:
      return 'Ativo';
  }
}

function statusClass(status: InventoryLotRow['status']): string | undefined {
  switch (status) {
    case 'expired':
      return 'text-danger';
    case 'expiring':
      return 'text-warning';
    default:
      return undefined;
  }
}

function formatDate(date?: string): string {
  if (!date) {
    return 'Sem validade';
  }

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString('pt-BR')} ${unit}`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    lots.value = await inventoryService.listLots();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar lotes';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.inventory-validity-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.text-danger {
  color: var(--color-danger, #ef4444);
}

.text-warning {
  color: var(--color-warning, #f59e0b);
}
</style>
