<template>
  <div class="card-transactions-page">
    <AppPageHeader
      title="Transações de Cartão"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Transações de Cartão']"
      subtitle="Consulta operacional de capturas, autorizações, taxas e conciliação"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Consulta somente leitura conectada à reconciliação financeira de cartões. Captura, cancelamento, baixa,
      conciliação e repasse real seguem bloqueados nesta superfície.
    </DsAlert>

    <form class="card-transactions-filters" aria-label="Filtros de transações de cartão" @submit.prevent="loadTransactions">
      <DsInput
        id="card-transactions-search"
        v-model="filters.search"
        label="Cliente/Cartão/Autorização"
        placeholder="Buscar por cliente, paciente, NSU ou descrição"
      />
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
      <div class="card-transactions-filters__actions">
        <DsButton variant="primary" type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton variant="ghost" type="button" @click="resetFilters">Limpar</DsButton>
      </div>
    </form>

    <section class="card-transactions-summary-grid" aria-label="Resumo de transações de cartão">
      <DsStatCard :label="formatCurrency(totalGross)" value="Valor Bruto" />
      <DsStatCard :label="formatCurrency(totalFees)" value="Taxas" />
      <DsStatCard :label="formatCurrency(totalNet)" value="Líquido" />
      <DsStatCard :label="`${attentionCount} pendência(s)`" value="Atenção" />
    </section>

    <section class="card-transactions-actions" aria-label="Ações de transações de cartão">
      <DsButton variant="primary" disabled>Capturar Transação</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-machines">Maquininhas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-accounts">Contas Adm. Cartão</DsButton>
      <DsButton variant="ghost" type="button" :loading="loading" @click="loadTransactions">Atualizar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
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
        <span>{{ transactionRow(row).installments }}x</span>
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
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
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
  installments: number;
  gross: number;
  fee: number;
  net: number;
  status: TransactionStatus;
  reconciliationState: ReconciliationStatus;
}

const columns: DataTableColumn[] = [
  { key: 'transaction', label: 'Transação' },
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
const loading = ref(false);
const error = ref('');
const transactions = ref<FinanceCardRow[]>([]);

const rows = computed<CardTransactionView[]>(() => transactions.value.map(toTransactionView));
const visibleRows = computed(() => rows.value.filter(matchesReconciliationFilter) as unknown as DataTableRow[]);
const totalGross = computed(() => visibleRows.value.reduce((sum, row) => sum + transactionRow(row).gross, 0));
const totalFees = computed(() => visibleRows.value.reduce((sum, row) => sum + transactionRow(row).fee, 0));
const totalNet = computed(() => visibleRows.value.reduce((sum, row) => sum + transactionRow(row).net, 0));
const attentionCount = computed(
  () => visibleRows.value.filter((row) => transactionRow(row).reconciliationState === 'attention_required').length
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-card-transactions',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: loadTransactions
  }
]);

async function loadTransactions() {
  loading.value = true;
  error.value = '';
  try {
    transactions.value = await financeCardsService.list({
      search: filters.search.trim(),
      provider: filters.provider,
      status: filters.status,
      pageSize: 100
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar transações de cartão';
    transactions.value = [];
  } finally {
    loading.value = false;
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
  return !filters.reconciliation || row.reconciliationState === filters.reconciliation;
}

function toTransactionView(card: FinanceCardRow): CardTransactionView {
  const gross = card.amount ?? 0;
  const fee = card.feeAmount ?? (card.netAmount != null ? Math.max(gross - card.netAmount, 0) : 0);
  const net = card.netAmount ?? Math.max(gross - fee, 0);
  const reference = card.providerAuthorizationCode || card.providerChargeId || card.providerReferenceId || card.transactionId;
  return {
    transactionId: card.transactionId,
    description: card.description || reference,
    client: card.ownerName || card.cardHolderName || 'Cliente não informado',
    patient: card.patientName ? `Paciente: ${card.patientName}` : 'Paciente não vinculado',
    cardLabel: `${brandLabel(card.cardBrand)} final ${card.cardLast4 || '----'}`,
    providerLabel: `${providerLabel(card.provider)} · ${reference}`,
    date: card.capturedAt || card.createdAt || null,
    installments: card.installments || 1,
    gross,
    fee,
    net,
    status: card.status || 'pending',
    reconciliationState: card.reconciliationState || 'pending'
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
  return status || 'Pendente';
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
  return 'Pendente';
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

function initialQueryParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) ?? '';
}

onMounted(loadTransactions);
</script>

<style scoped>
.card-transactions-page {
  display: grid;
  gap: 16px;
}

.card-transactions-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.card-transactions-filters__actions,
.card-transactions-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.card-transactions-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.card-transactions-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .card-transactions-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-transactions-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .card-transactions-filters,
  .card-transactions-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
