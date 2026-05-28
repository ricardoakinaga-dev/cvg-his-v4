<template>
  <div class="financial-reconciliation-page">
    <AppPageHeader
      title="Conciliação Financeira"
      :breadcrumbs="['Financeiro', 'Controles', 'Conciliação Financeira']"
      subtitle="Central consolidada de PIX, cartões e contas a pagar não-caixa"
      :secondary-actions="headerSecondaryActions"
    />

    <form class="reconciliation-filters" aria-label="Filtros de conciliação financeira" @submit.prevent="loadReconciliation">
      <DsInput
        id="reconciliation-search"
        v-model="filters.search"
        label="Busca"
        type="search"
        placeholder="Cliente, fornecedor, transação ou referência"
      />
      <DsInput id="reconciliation-domain" v-model="filters.domain" label="Origem" type="select">
        <option value="">Todas</option>
        <option value="pix">PIX</option>
        <option value="card">Cartões</option>
        <option value="payable">Pagáveis</option>
      </DsInput>
      <DsInput id="reconciliation-state" v-model="filters.state" label="Conciliação" type="select">
        <option value="">Todas</option>
        <option value="reconciled">Conciliada</option>
        <option value="pending">Pendente</option>
        <option value="attention_required">Atenção</option>
      </DsInput>
      <div class="reconciliation-filters__actions">
        <DsButton type="submit" :loading="loading">Atualizar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <section class="reconciliation-summary-grid" aria-label="Resumo de conciliação financeira">
      <DsStatCard :label="`${filteredRows.length} item(ns)`" value="Total" />
      <DsStatCard :label="formatCurrency(visibleTotalAmount)" value="Valor Mapeado" />
      <DsStatCard :label="formatCurrency(visibleReconciledAmount)" value="Conciliado" />
      <DsStatCard
        :label="formatCurrency(visibleAttentionAmount)"
        value="Atenção"
        :error="visibleAttentionAmount > 0 ? 'Conferência pendente' : undefined"
      />
    </section>

    <section class="reconciliation-actions" aria-label="Ações de conciliação financeira">
      <DsButton variant="secondary" tag="a" to="/finance/accounts-payable">Contas a Pagar</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/payments-dashboard">Pagamento Dashboard</DsButton>
      <DsButton variant="secondary" tag="a" to="/pix">PIX</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadReconciliation">Atualizar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      empty-icon="🧾"
      empty-title="Nenhuma conciliação encontrada"
      empty-description="A central consolida PIX, cartões e pagáveis não-caixa com pendências de conferência."
      caption="Conciliação financeira"
      row-key-field="id"
      variant="hoverable"
    >
      <template #cell-origin="{ row }">
        <strong>{{ reconciliationRow(row).origin }}</strong>
        <small>{{ reconciliationRow(row).id }}</small>
      </template>
      <template #cell-description="{ row }">
        <strong>{{ reconciliationRow(row).description }}</strong>
        <small>{{ reconciliationRow(row).counterparty }}</small>
      </template>
      <template #cell-amount="{ row }">
        {{ formatCurrency(reconciliationRow(row).amount) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="stateLabel(reconciliationRow(row).reconciliationState)" :variant="stateVariant(reconciliationRow(row).reconciliationState)" />
      </template>
      <template #cell-reference="{ row }">
        {{ reconciliationRow(row).reference }}
      </template>
      <template #cell-next="{ row }">
        {{ reconciliationRow(row).nextAction }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import {
  financialReconciliationService,
  type ReconciliationDomain,
  type ReconciliationState,
  type UnifiedFinancialReconciliation,
  type UnifiedReconciliationRow
} from '@/services/financialReconciliation';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type DomainFilter = '' | ReconciliationDomain;
type StateFilter = '' | 'reconciled' | 'pending' | 'attention_required';

const columns: DataTableColumn[] = [
  { key: 'origin', label: 'Origem' },
  { key: 'description', label: 'Descrição' },
  { key: 'amount', label: 'Valor' },
  { key: 'status', label: 'Conciliação' },
  { key: 'reference', label: 'Referência' },
  { key: 'next', label: 'Próxima Ação' }
];

const filters = reactive({
  search: '',
  domain: '' as DomainFilter,
  state: '' as StateFilter
});
const loading = ref(false);
const error = ref('');
const reconciliation = ref<UnifiedFinancialReconciliation>({
  rows: [],
  totals: {
    totalAmount: 0,
    reconciledAmount: 0,
    pendingAmount: 0,
    attentionAmount: 0,
    totalCount: 0,
    reconciledCount: 0,
    pendingCount: 0,
    attentionCount: 0
  }
});

const filteredRows = computed(() =>
  reconciliation.value.rows.filter((row) => {
    if (filters.domain && row.domain !== filters.domain) return false;
    if (filters.state && row.reconciliationState !== filters.state) return false;
    return true;
  })
);
const tableRows = computed(() => filteredRows.value as unknown as DataTableRow[]);
const visibleTotalAmount = computed(() => sumRows(filteredRows.value));
const visibleReconciledAmount = computed(() =>
  sumRows(filteredRows.value.filter((row) => row.reconciliationState === 'reconciled'))
);
const visibleAttentionAmount = computed(() =>
  sumRows(filteredRows.value.filter((row) => row.reconciliationState === 'attention_required'))
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-reconciliation',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadReconciliation()
  }
]);

onMounted(() => {
  void loadReconciliation();
});

async function loadReconciliation() {
  loading.value = true;
  error.value = '';
  try {
    reconciliation.value = await financialReconciliationService.getUnified({
      search: filters.search.trim(),
      page: 1,
      pageSize: 100
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar a conciliação financeira.';
    reconciliation.value = { ...reconciliation.value, rows: [] };
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.domain = '';
  filters.state = '';
  void loadReconciliation();
}

function reconciliationRow(row: DataTableRow): UnifiedReconciliationRow {
  return row as unknown as UnifiedReconciliationRow;
}

function stateLabel(state: ReconciliationState): string {
  if (state === 'reconciled') return 'Conciliada';
  if (state === 'attention_required') return 'Atenção';
  if (state === 'pending') return 'Pendente';
  if (state === 'not_required') return 'Dispensada';
  return state || 'Pendente';
}

function stateVariant(state: ReconciliationState): 'success' | 'warning' | 'danger' | 'neutral' {
  if (state === 'reconciled') return 'success';
  if (state === 'attention_required') return 'danger';
  if (state === 'pending') return 'warning';
  return 'neutral';
}

function sumRows(rows: readonly UnifiedReconciliationRow[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
</script>

<style scoped>
.financial-reconciliation-page {
  display: grid;
  gap: 16px;
}

.reconciliation-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(220px, 1.5fr) repeat(2, minmax(160px, 1fr)) auto;
}

.reconciliation-filters__actions,
.reconciliation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reconciliation-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.financial-reconciliation-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .reconciliation-filters,
  .reconciliation-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .reconciliation-filters,
  .reconciliation-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
