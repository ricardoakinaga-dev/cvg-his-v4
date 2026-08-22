<template>
  <div class="accounts-receivable-page">
    <AppPageHeader
      title="Contas a Receber"
      :breadcrumbs="['Financeiro', 'Controles', 'Contas a Receber']"
      subtitle="Títulos por cliente com emissão, vencimento, total, recebido e saldo a receber"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="receivable-summary-grid" aria-label="Resumo de contas a receber">
      <DsStatCard :label="`${response.total} título(s)`" value="Total" />
      <DsStatCard :label="formatCurrency(totalOriginal)" value="Total" />
      <DsStatCard :label="formatCurrency(response.totalSettled)" value="Recebido" />
      <DsStatCard
        :label="formatCurrency(response.totalOutstanding)"
        value="A Receber"
        :error="response.totalOutstanding > 0 ? 'Saldo pendente' : undefined"
      />
    </section>

    <section class="receivable-actions" aria-label="Ações de contas a receber">
      <DsButton variant="primary" disabled>Gerar Conta Avulsa</DsButton>
      <DsButton variant="secondary" tag="a" to="/cash">Gaveta</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadReceivables">Atualizar</DsButton>
    </section>

    <DsAlert variant="info">
      A baixa financeira é registrada pelo recebimento do atendimento, conforme o meio de pagamento.
      Abra o título para continuar pelo fluxo auditável.
    </DsAlert>

    <form class="receivable-filters" aria-label="Filtros de contas a receber" @submit.prevent="loadReceivables">
      <DsInput
        id="receivable-client"
        v-model="filters.search"
        label="Cliente"
        type="search"
        placeholder="Buscar por cliente, paciente ou parcela"
      />
      <DsInput id="receivable-due-from" v-model="filters.dueFrom" label="Vencimento entre" type="date" />
      <DsInput id="receivable-due-to" v-model="filters.dueTo" label="até" type="date" />
      <DsInput id="receivable-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="open">A Receber</option>
        <option value="settled">Recebida</option>
        <option value="cancelled">Cancelada</option>
      </DsInput>
      <div class="receivable-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="💵"
      empty-title="Nenhuma conta a receber encontrada"
      empty-description="Os títulos aparecem quando a conta financeira do atendimento é gerada."
      caption="Contas a receber"
      variant="hoverable"
    >
      <template #cell-origin="{ row }">
        <span class="origin-cell">Atendimento</span>
        <small>{{ receivableRow(row).installmentLabel }}</small>
      </template>
      <template #cell-client="{ row }">
        <strong>{{ receivableRow(row).ownerName }}</strong>
        <small>{{ receivableRow(row).patientName }}</small>
      </template>
      <template #cell-issuedAt="{ row }">
        {{ formatDate(receivableRow(row).issuedAt) }}
      </template>
      <template #cell-dueAt="{ row }">
        {{ formatDate(receivableRow(row).dueAt) }}
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrency(receivableRow(row).amountOriginal) }}
      </template>
      <template #cell-received="{ row }">
        {{ formatCurrency(receivableRow(row).amountPaid) }}
      </template>
      <template #cell-outstanding="{ row }">
        <strong>{{ formatCurrency(receivableRow(row).amountOutstanding) }}</strong>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="receivableStatusLabel(receivableRow(row).status)"
          :variant="receivableStatusVariant(receivableRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <div class="receivable-row-actions">
          <RouterLink :to="`/billing/${receivableRow(row).encounterId}`" class="open-link">Abrir</RouterLink>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { financialReceivablesService } from '@/services/financialReceivables';
import type {
  FinancialReceivableListItem,
  FinancialReceivableListResponse,
  FinancialReceivableStatus
} from '@/types/financialReceivables';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';

type FilterStatus = '' | FinancialReceivableStatus | 'cancelled';

const emptyResponse: FinancialReceivableListResponse = {
  data: [],
  page: 1,
  pageSize: 20,
  total: 0,
  openCount: 0,
  settledCount: 0,
  totalOutstanding: 0,
  totalSettled: 0
};

const columns: DataTableColumn[] = [
  { key: 'origin', label: 'Origem' },
  { key: 'client', label: 'Cliente' },
  { key: 'issuedAt', label: 'Emissão' },
  { key: 'dueAt', label: 'Vencimento' },
  { key: 'total', label: 'Total' },
  { key: 'received', label: 'Recebido' },
  { key: 'outstanding', label: 'A Receber' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const filters = reactive({
  search: '',
  dueFrom: '',
  dueTo: '',
  status: '' as FilterStatus
});
const response = ref<FinancialReceivableListResponse>({ ...emptyResponse });
const loading = ref(false);
const error = ref('');

const rows = computed(() => response.value.data as unknown as DataTableRow[]);
const filteredRows = computed(() => rows.value.filter((row) => matchesDueFilters(receivableRow(row))));
const totalOriginal = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + receivableRow(row).amountOriginal, 0)
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-receivables',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadReceivables()
  }
]);

onMounted(() => {
  void loadReceivables();
});

async function loadReceivables() {
  loading.value = true;
  error.value = '';
  try {
    response.value = await financialReceivablesService.list({
      search: filters.search.trim(),
      status: filters.status === 'open' || filters.status === 'settled' ? filters.status : '',
      page: 1,
      pageSize: 20
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar contas a receber.';
    response.value = { ...emptyResponse };
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.dueFrom = '';
  filters.dueTo = '';
  filters.status = '';
  void loadReceivables();
}

function matchesDueFilters(row: FinancialReceivableListItem): boolean {
  if (!row.dueAt) return !filters.dueFrom && !filters.dueTo;
  const due = row.dueAt.slice(0, 10);
  if (filters.dueFrom && due < filters.dueFrom) return false;
  if (filters.dueTo && due > filters.dueTo) return false;
  return true;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function receivableStatusLabel(status: FinancialReceivableStatus): string {
  return status === 'settled' ? 'Recebida' : 'A Receber';
}

function receivableStatusVariant(status: FinancialReceivableStatus) {
  return status === 'settled' ? 'success' : 'warning';
}

function receivableRow(row: unknown): FinancialReceivableListItem {
  return row as FinancialReceivableListItem;
}
</script>

<style scoped>
.accounts-receivable-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.receivable-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.receivable-actions,
.receivable-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.receivable-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr)) auto;
}

.receivable-filters__actions {
  display: flex;
  gap: 8px;
}

.origin-cell,
.open-link {
  font-weight: 700;
}

.receivable-row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.origin-cell,
.accounts-receivable-page small {
  display: block;
}

.accounts-receivable-page small {
  margin-top: 3px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.open-link {
  color: var(--color-primary-700, #1d4ed8);
  text-decoration: none;
}

.open-link:hover {
  text-decoration: underline;
}

@media (max-width: 980px) {
  .receivable-filters {
    grid-template-columns: 1fr;
  }
}
</style>
