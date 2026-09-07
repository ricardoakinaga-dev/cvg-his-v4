<template>
  <div class="card-transactions-page">
    <AppPageHeader
      title="Transações de Cartão"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Transações de Cartão']"
      subtitle="Consulte valores, capturas e conciliações de cartões."
    />

    <p class="query-note">Consulta de cartões. Esta tela não realiza capturas ou baixas.</p>
    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>

    <form class="card-transactions-filters" aria-label="Filtros de transações de cartão" @submit.prevent="loadTransactions">
      <DsInput
        id="card-transactions-search"
        v-model="filters.search"
        label="Cliente ou transação"
        placeholder="Cliente, paciente ou código da transação"
      />
      <details class="advanced-filters">
        <summary>Mais filtros<span v-if="ready && activeFilterCount"> · {{ activeFilterCount }} aplicado{{ activeFilterCount > 1 ? 's' : '' }}</span></summary>
        <div class="advanced-filters__fields">
      <DsInput id="card-transactions-provider" v-model="filters.provider" label="Provedor" type="select">
        <option value="">Todos</option>
        <option value="pagarme-card">Pagar.me</option>
        <option value="local-card">Cartão local</option>
      </DsInput>
      <DsInput id="card-transactions-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="captured">Capturada</option>
        <option value="authorized_pending_capture">Autorizada</option>
        <option value="failed">Falhou</option>
        <option value="not_authorized">Não autorizada</option>
      </DsInput>
      <DsInput id="card-transactions-reconciliation" v-model="filters.reconciliation" label="Conciliação" type="select">
        <option value="">Todas</option>
        <option value="reconciled">Conciliada</option>
        <option value="pending">Pendente</option>
        <option value="attention_required">Atenção</option>
      </DsInput>
        </div>
      </details>
      <div class="card-transactions-filters__actions">
        <DsButton variant="primary" type="submit" :loading="loading" :disabled="loading">Pesquisar</DsButton>
        <DsButton variant="ghost" type="button" :disabled="loading" @click="resetFilters">Limpar</DsButton>
      </div>
    </form>

    <p v-if="!loading && !failed" class="query-note" role="status">{{ visibleRows.length }} registros nesta consulta · até 100 registros carregados.</p>
    <EmptyState v-if="failed && !loading" icon="credit-card" title="Transações indisponíveis" description="Não foi possível carregar os dados. Tente novamente para consultar as transações." size="sm">
      <template #action><DsButton variant="secondary" @click="loadTransactions">Tentar novamente</DsButton></template>
    </EmptyState>
    <DataTable v-else
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="💳"
      empty-title="Nenhuma transação de cartão encontrada"
      empty-description="Ajuste os filtros para visualizar capturas, autorizações e conciliação."
      caption="Transações de cartão"
      row-key-field="transactionId"
      variant="hoverable"
    >
      <template #cell-transaction="{ row }">
        <strong>{{ transactionRow(row).description }}</strong>
        <small>{{ transactionRow(row).transactionId }}</small>
      </template>
      <template #cell-client="{ row }">
        <strong>{{ transactionRow(row).client }}</strong>
        <small>{{ transactionRow(row).patient }}</small>
      </template>
      <template #cell-card="{ row }">
        <strong>{{ transactionRow(row).cardLabel }}</strong>
        <small>{{ transactionRow(row).providerLabel }}</small>
      </template>
      <template #cell-date="{ row }">
        <span>{{ formatDate(transactionRow(row).date) }}</span>
      </template>
      <template #cell-installments="{ row }">
        <span>{{ transactionRow(row).installments === null ? '—' : `${transactionRow(row).installments}x` }}</span>
      </template>
      <template #cell-gross="{ row }">
        <span>{{ formatCurrency(transactionRow(row).gross) }}</span>
      </template>
      <template #cell-fee="{ row }">
        <span>{{ formatCurrency(transactionRow(row).fee) }}</span>
      </template>
      <template #cell-net="{ row }">
        <strong>{{ formatCurrency(transactionRow(row).net) }}</strong>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="statusLabel(transactionRow(row).status)" :variant="statusVariant(transactionRow(row).status)" />
      </template>
      <template #cell-reconciliation="{ row }">
        <StatusBadge
          :label="reconciliationLabel(transactionRow(row).reconciliationState)"
          :variant="reconciliationVariant(transactionRow(row).reconciliationState)"
        />
      </template>
    </DataTable>
    <details class="query-summary">
      <summary>Resumo da consulta</summary>
      <dl>
        <div><dt>Valor bruto</dt><dd>{{ ready ? formatCurrency(totalGross) : '—' }}</dd></div>
        <div><dt>Taxas informadas</dt><dd>{{ ready ? formatCurrency(totalFees) : '—' }}</dd></div>
        <div><dt>Líquido informado</dt><dd>{{ ready ? formatCurrency(totalNet) : '—' }}</dd></div>
        <div><dt>Conciliações com atenção</dt><dd>{{ ready ? attentionCount : '—' }}</dd></div>
      </dl>
      <p>Valores dos registros carregados nesta consulta, em todos os estados exibidos. O traço indica valor não informado ou moedas diferentes no total.</p>
    </details>
    <nav class="card-transactions-actions" aria-label="Rotinas relacionadas">
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-machines">Maquininhas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-accounts">Contas Adm. Cartão</DsButton>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import EmptyState from '@/components/EmptyState.vue';
import { cardMoney, sumCardMoney, formatCardMoney, type CardMoney } from '@/utils/financeCardMoney';
import { financeCardsService, type FinanceCardRow } from '@/services/financeCards';

type TransactionStatus = 'captured' | 'authorized_pending_capture' | 'failed' | 'not_authorized' | string;
type ReconciliationStatus = 'reconciled' | 'pending' | 'attention_required' | string | null | undefined;

interface CardTransactionView {
  transactionId: string;
  description: string;
  client: string;
  patient: string;
  cardLabel: string;
  providerLabel: string;
  date: string | null;
  installments: number | null;
  gross: CardMoney;
  fee: CardMoney;
  net: CardMoney;
  status: TransactionStatus;
  reconciliationState: ReconciliationStatus;
}

const columns: DataTableColumn[] = [
  { key: 'transaction', label: 'Transação', class: 'transaction-description' },
  { key: 'client', label: 'Cliente' },
  { key: 'card', label: 'Cartão' },
  { key: 'date', label: 'Data' },
  { key: 'installments', label: 'Parcelas' },
  { key: 'gross', label: 'Valor' },
  { key: 'fee', label: 'Taxa' },
  { key: 'net', label: 'Líquido' },
  { key: 'status', label: 'Status' },
  { key: 'reconciliation', label: 'Conciliação' }
];

const filters = reactive({
  search: initialQueryParam('search'),
  provider: initialQueryParam('provider'),
  status: initialQueryParam('status'),
  reconciliation: initialQueryParam('reconciliation')
});
const appliedFilters = reactive({ ...filters });
const loading = ref(true);
const failed = ref(false);
const ready = computed(() => !loading.value && !failed.value);
const activeFilterCount = computed(() => [appliedFilters.provider, appliedFilters.status, appliedFilters.reconciliation].filter(Boolean).length);
let requestVersion = 0;
const error = ref('');
const transactions = ref<FinanceCardRow[]>([]);

const rows = computed<CardTransactionView[]>(() => transactions.value.map(toTransactionView));
const visibleRows = computed(() => rows.value.filter(matchesReconciliationFilter) as unknown as DataTableRow[]);
const totalGross = computed(() => sumCardMoney(visibleRows.value.map(row => transactionRow(row).gross)));
const totalFees = computed(() => sumCardMoney(visibleRows.value.map(row => transactionRow(row).fee)));
const totalNet = computed(() => sumCardMoney(visibleRows.value.map(row => transactionRow(row).net)));
const attentionCount = computed(
  () => visibleRows.value.filter((row) => transactionRow(row).reconciliationState === 'attention_required').length
);

async function loadTransactions() {
  const version = ++requestVersion;
  const query = { ...filters, search: filters.search.trim() };
  loading.value = true;
  failed.value = false;
  error.value = '';
  try {
    const result = await financeCardsService.list({
      search: query.search,
      provider: query.provider,
      status: query.status,
      pageSize: 100
    });
    if (version !== requestVersion) return;
    transactions.value = result;
    Object.assign(appliedFilters, query);
  } catch (err: unknown) {
    if (version !== requestVersion) return;
    failed.value = true;
    error.value = err instanceof Error ? err.message : 'Falha ao carregar transações de cartão';
    transactions.value = [];
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

function resetFilters() {
  filters.search = '';
  filters.provider = '';
  filters.status = '';
  filters.reconciliation = '';
  void loadTransactions();
}

function matchesReconciliationFilter(row: CardTransactionView): boolean {
  return !appliedFilters.reconciliation || row.reconciliationState === appliedFilters.reconciliation;
}

function toTransactionView(card: FinanceCardRow): CardTransactionView {
  const gross = cardMoney(card.amount, card.currency);
  const fee = cardMoney(card.feeAmount, card.currency);
  const net = cardMoney(card.netAmount, card.currency);
  const reference = card.providerAuthorizationCode || card.providerChargeId || card.providerReferenceId || card.transactionId;
  return {
    transactionId: card.transactionId,
    description: card.description || reference,
    client: card.ownerName || card.cardHolderName || 'Cliente não informado',
    patient: card.patientName ? `Paciente: ${card.patientName}` : 'Paciente não vinculado',
    cardLabel: `${brandLabel(card.cardBrand)} final ${card.cardLast4 || '----'}`,
    providerLabel: `${providerLabel(card.provider)} · ${reference}`,
    date: card.capturedAt || card.createdAt || null,
    installments: Number.isFinite(card.installments) && card.installments > 0 ? card.installments : null,
    gross,
    fee,
    net,
    status: card.status || '',
    reconciliationState: card.reconciliationState
  };
}

function transactionRow(row: DataTableRow): CardTransactionView {
  return row as unknown as CardTransactionView;
}

function statusLabel(status: TransactionStatus): string {
  if (status === 'captured') return 'Capturada';
  if (status === 'authorized_pending_capture') return 'Autorizada';
  if (status === 'failed') return 'Falhou';
  if (status === 'not_authorized') return 'Não autorizada';
  if (status === 'pending') return 'Pendente';
  return 'Não informado';
}

function statusVariant(status: TransactionStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'captured') return 'success';
  if (status === 'authorized_pending_capture') return 'warning';
  if (status === 'failed' || status === 'not_authorized') return 'danger';
  return 'neutral';
}

function reconciliationLabel(status: ReconciliationStatus): string {
  if (status === 'reconciled') return 'Conciliada';
  if (status === 'attention_required') return 'Atenção';
  if (status === 'pending') return 'Pendente';
  return 'Não informado';
}

function reconciliationVariant(status: ReconciliationStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'reconciled') return 'success';
  if (status === 'attention_required') return 'danger';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function providerLabel(provider: string): string {
  if (provider === 'pagarme-card') return 'Pagar.me';
  if (provider === 'local-card') return 'Cartão local';
  return provider || 'Provedor não informado';
}

function brandLabel(brand?: string | null): string {
  return brand ? brand.toUpperCase() : 'Cartão';
}

function formatCurrency(value: CardMoney): string { return formatCardMoney(value); }

function formatDate(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

function initialQueryParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) ?? '';
}

onMounted(loadTransactions);
</script>

<style scoped>
.card-transactions-page { min-width: 0; display: grid; gap: 16px; }
.card-transactions-filters { align-items: end; display: grid; gap: 12px; grid-template-columns: minmax(240px, 2fr) minmax(300px, 3fr) auto; }
.card-transactions-filters__actions, .card-transactions-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.card-transactions-page :deep(input), .card-transactions-page :deep(select), .card-transactions-page :deep(button), .card-transactions-actions :deep(a) { min-height: 44px; }
.card-transactions-actions :deep(.ds-btn__label) { white-space: normal; }
.card-transactions-page :deep(th:first-child), .card-transactions-page :deep(td:first-child) { min-width: 240px; }
.card-transactions-page :deep(td:nth-child(6)), .card-transactions-page :deep(td:nth-child(7)), .card-transactions-page :deep(td:nth-child(8)) { white-space: nowrap; font-variant-numeric: tabular-nums; }
.card-transactions-page small { display: block; color: var(--color-text-secondary, #64748b); font-size: 12px; margin-top: 3px; }
.query-note, .query-summary p { color: var(--color-text-secondary); font-size: 13px; line-height: 1.5; margin: 0; }
.query-summary { padding: 0 16px 16px; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 12px; }
.query-summary summary { cursor: pointer; min-height: 44px; padding: 12px 0; box-sizing: border-box; font-weight: 600; }
.query-summary summary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.query-summary dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 16px; }
.query-summary dt { color: var(--color-text-secondary); font-size: 13px; }
.query-summary dd { margin: 6px 0 0; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.advanced-filters { min-width: 0; }
.advanced-filters summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-size: 14px; font-weight: 600; }
.advanced-filters summary::before { content: '▸'; margin-right: 8px; }
.advanced-filters[open] summary::before { content: '▾'; }
.advanced-filters summary span { white-space: pre-wrap; }
.advanced-filters__fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-top: 8px; }
@media (max-width: 900px) {
  .card-transactions-filters { grid-template-columns: minmax(0, 1fr); }
  .advanced-filters__fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
