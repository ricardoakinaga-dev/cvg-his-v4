<template>
  <div class="accounts-receivable-page">
    <AppPageHeader
      title="Contas a Receber"
      :breadcrumbs="['Financeiro', 'Controles', 'Contas a Receber']"
      subtitle="Títulos por cliente com emissão, vencimento, total, recebido e saldo a receber"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="receivable-summary-grid" aria-label="Resumo de contas a receber">
      <DsStatCard :value="String(response.total)" label="Títulos no recorte filtrado" />
      <DsStatCard
        :value="formatCurrency(Number(response.totalOriginal ?? 0))"
        label="Total original no recorte filtrado"
      />
      <DsStatCard
        :value="formatCurrency(response.totalSettled)"
        label="Recebido no recorte filtrado"
      />
      <DsStatCard
        :value="formatCurrency(response.totalOutstanding)"
        label="Saldo a receber no recorte filtrado"
      />
    </section>

    <p v-if="response.totalOutstanding > 0" class="receivable-balance-status" role="status">
      <strong>Saldo pendente:</strong>
      {{ formatCurrency(response.totalOutstanding) }} no recorte atual. Esse é um estado financeiro
      esperado, não uma falha técnica.
    </p>

    <section class="receivable-actions" aria-label="Ações de contas a receber">
      <DsButton variant="secondary" tag="a" to="/cash">Gaveta</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="refreshReceivables">Atualizar</DsButton>
      <p id="receivable-standalone-account-note" class="receivable-boundary-note" role="note">
        A geração de conta avulsa permanece indisponível até uma decisão explícita de
        Produto/Financeiro sobre suas regras.
      </p>
    </section>

    <DsAlert variant="info">
      A baixa financeira é registrada pelo recebimento do atendimento, conforme o meio de pagamento.
      Abra o título para continuar pelo fluxo auditável.
    </DsAlert>

    <form
      class="receivable-filters"
      aria-label="Filtros de contas a receber"
      @submit.prevent="applyFilters"
    >
      <DsInput
        id="receivable-client"
        v-model="filters.search"
        label="Cliente"
        type="search"
        placeholder="Buscar por cliente, paciente ou parcela"
      />
      <DsInput
        id="receivable-due-from"
        v-model="filters.dueFrom"
        label="Vencimento entre"
        type="date"
      />
      <DsInput id="receivable-due-to" v-model="filters.dueTo" label="até" type="date" />
      <DsInput id="receivable-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="open">A Receber</option>
        <option value="settled">Recebida</option>
      </DsInput>
      <div class="receivable-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :feedback="tableFeedback"
      empty-icon="💵"
      empty-title="Nenhuma conta a receber encontrada"
      empty-description="Os títulos aparecem quando a conta financeira do atendimento é gerada."
      caption="Contas a receber"
      variant="hoverable"
    >
      <template v-if="error" #feedbackAction>
        <DsButton type="button" variant="secondary" :loading="loading" @click="retryLoad">
          Tentar novamente
        </DsButton>
      </template>
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
          <RouterLink :to="`/billing/${receivableRow(row).encounterId}`" class="open-link"
            >Abrir</RouterLink
          >
        </div>
      </template>
    </DataTable>

    <nav
      v-if="!error && totalPages > 1"
      class="receivable-pagination"
      aria-label="Paginação de contas a receber"
    >
      <DsButton
        type="button"
        variant="secondary"
        :disabled="loading || currentPage <= 1"
        aria-label="Página anterior"
        @click="changePage(currentPage - 1)"
      >
        Anterior
      </DsButton>
      <span class="receivable-pagination__summary" role="status" aria-live="polite">
        Página {{ currentPage }} de {{ totalPages }} · {{ pageStart }}–{{ pageEnd }} de
        {{ response.total }} títulos
      </span>
      <DsButton
        type="button"
        variant="secondary"
        :disabled="loading || currentPage >= totalPages"
        aria-label="Próxima página"
        @click="changePage(currentPage + 1)"
      >
        Próxima
      </DsButton>
    </nav>
    <p
      v-else-if="response.total > 0"
      class="receivable-pagination__range"
      role="status"
      aria-live="polite"
    >
      {{ pageStart }}–{{ pageEnd }} de {{ response.total }} títulos
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
  financialReceivablesService,
  type FinancialReceivableListRequest
} from '@/services/financialReceivables';
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
import type { DataTableColumn, DataTableFeedback, DataTableRow } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';

type FilterStatus = '' | FinancialReceivableStatus;

const emptyResponse: FinancialReceivableListResponse = {
  data: [],
  page: 1,
  pageSize: 20,
  total: 0,
  openCount: 0,
  settledCount: 0,
  totalOriginal: 0,
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
const currentPage = computed(() => Math.max(1, response.value.page || 1));
const effectivePageSize = computed(() => Math.max(1, response.value.pageSize || 20));
const totalPages = computed(() =>
  Math.max(1, Math.ceil(response.value.total / effectivePageSize.value))
);
const pageStart = computed(() =>
  response.value.total === 0 ? 0 : (currentPage.value - 1) * effectivePageSize.value + 1
);
const pageEnd = computed(() =>
  Math.min(currentPage.value * effectivePageSize.value, response.value.total)
);
const tableFeedback = computed<DataTableFeedback | null>(() =>
  error.value
    ? {
        kind: 'error',
        icon: '⚠️',
        title: 'Não foi possível carregar contas a receber',
        description: 'A consulta não pôde ser concluída. Tente novamente para atualizar a lista.'
      }
    : null
);
let requestSequence = 0;
let disposed = false;

const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-receivables',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: refreshReceivables
  }
]);

onMounted(() => {
  void loadReceivables();
});

onBeforeUnmount(() => {
  disposed = true;
  requestSequence += 1;
});

function buildRequest(page: number): FinancialReceivableListRequest {
  const request: FinancialReceivableListRequest = {
    search: filters.search.trim(),
    status: filters.status,
    page,
    pageSize: 20
  };

  if (filters.dueFrom) request.dueFrom = filters.dueFrom;
  if (filters.dueTo) request.dueTo = filters.dueTo;

  return request;
}

async function loadReceivables(requestedPage = 1) {
  const requestId = ++requestSequence;
  const request = buildRequest(requestedPage);

  loading.value = true;
  error.value = '';

  try {
    const nextResponse = await financialReceivablesService.list(request);
    if (disposed || requestId !== requestSequence) return;
    response.value = nextResponse;
  } catch (err) {
    if (disposed || requestId !== requestSequence) return;

    error.value =
      err instanceof Error ? err.message : 'Não foi possível carregar contas a receber.';
  } finally {
    if (!disposed && requestId === requestSequence) loading.value = false;
  }
}

function applyFilters() {
  void loadReceivables(1);
}

function refreshReceivables() {
  void loadReceivables(currentPage.value);
}

function retryLoad() {
  void loadReceivables(currentPage.value);
}

function changePage(nextPage: number) {
  if (loading.value || nextPage < 1 || nextPage > totalPages.value) return;
  void loadReceivables(nextPage);
}

function clearFilters() {
  filters.search = '';
  filters.dueFrom = '';
  filters.dueTo = '';
  filters.status = '';
  void loadReceivables(1);
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

.receivable-balance-status {
  margin: -4px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
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

.receivable-boundary-note {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.45;
}

.receivable-boundary-note {
  flex: 1 1 100%;
}

.receivable-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.receivable-pagination__summary,
.receivable-pagination__range {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  text-align: center;
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
