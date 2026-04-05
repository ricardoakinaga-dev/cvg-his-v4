<template>
  <div class="billing-list-page">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">💰 Faturamento</h1>
        <p class="page-header__subtitle">Controle de cobrança e faturamento de atendimentos</p>
      </div>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="💰"
      empty-title="Nenhum registro de faturamento"
      empty-description="Os registros aparecem quando atendimentos são abertos."
      variant="hoverable"
    >
      <template #cell-encounter="{ row }">
        <router-link
          :to="`/encounters/${(row as BillingRecordSummary).encounterId}`"
          class="encounter-link"
        >
          {{ (row as BillingRecordSummary).encounterId.slice(0, 8) }}...
        </router-link>
      </template>
      <template #cell-patient="{ row }">
        {{ patientName((row as BillingRecordSummary).patientId) }}
      </template>
      <template #cell-owner="{ row }">
        {{ ownerName((row as BillingRecordSummary).ownerId) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="billingStatusLabel((row as BillingRecordSummary).status)"
          :variant="billingStatusVariant((row as BillingRecordSummary).status)"
        />
      </template>
      <template #cell-amount="{ row }">
        {{ formatCurrency((row as BillingRecordSummary).subtotalAmount) }}
      </template>
      <template #cell-items="{ row }">
        <router-link
          :to="`/billing/${(row as BillingRecordSummary).encounterId}`"
          class="btn btn--sm btn--secondary"
        >
          Ver itens →
        </router-link>
      </template>
      <template #cell-actions="{ row }">
        <router-link
          :to="`/billing/${(row as BillingRecordSummary).encounterId}`"
          class="btn btn--sm btn--secondary"
        >
          Gerenciar
        </router-link>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { billingService } from '@/services/billing';
import type { BillingRecordSummary, BillingStatus } from '@/types/billing';
import { useEntityCache } from '@/composables/useEntityCache';
import { useListData } from '@/composables/useListData';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const entityCache = useEntityCache();
const patientNames = ref<Record<string, string>>({});
const ownerNames = ref<Record<string, string>>({});

const columns: DataTableColumn[] = [
  { key: 'encounter', label: 'Atendimento' },
  { key: 'patient', label: 'Paciente' },
  { key: 'owner', label: 'Tutor' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Subtotal' },
  { key: 'items', label: 'Itens' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const statusLabelMap: Record<BillingStatus, string> = {
  draft: 'Rascunho',
  estimated: 'Estimado',
  open: 'Aberto',
  settled: 'Quitado'
};

const statusVariantMap: Record<BillingStatus, string> = {
  draft: 'neutral',
  estimated: 'info',
  open: 'warning',
  settled: 'success'
};

function billingStatusLabel(s: BillingStatus) {
  return statusLabelMap[s] || s;
}

function billingStatusVariant(s: BillingStatus) {
  return (statusVariantMap[s] || 'default') as any;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function patientName(id: string): string {
  return patientNames.value[id] || `Paciente ${id.slice(0, 8)}...`;
}

function ownerName(id: string): string {
  return ownerNames.value[id] || `Tutor ${id.slice(0, 8)}...`;
}

const { items, loading, error } = useListData<BillingRecordSummary>({
  fetchFn: async () => {
    const records = await billingService.list();
    const patientIds = [...new Set(records.map((r) => r.patientId))];
    const ownerIds = [...new Set(records.map((r) => r.ownerId))];
    await Promise.all([
      ...patientIds.map(async (id) => {
        patientNames.value[id] = await entityCache.getPatientName(id);
      }),
      ...ownerIds.map(async (id) => {
        ownerNames.value[id] = await entityCache.getOwnerName(id);
      })
    ]);
    return records;
  },
  entityLabel: 'faturamentos'
});
</script>

<style scoped>
.encounter-link {
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: 500;
}

.encounter-link:hover {
  text-decoration: underline;
}
</style>
