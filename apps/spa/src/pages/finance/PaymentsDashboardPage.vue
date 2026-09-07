<template>
  <div class="payments-dashboard-page">
    <AppPageHeader
      title="Pagamento Dashboard"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Pagamento Dashboard']"
      subtitle="Consulte captura e conciliação dos pagamentos por cartão"
    />

    <p class="query-note">
      Consulta de pagamentos. Esta tela não realiza capturas ou repasses.
    </p>

    <form class="payments-dashboard-filters" aria-label="Filtros do pagamento dashboard" @submit.prevent="loadPayments">
      <DsInput
        id="payments-dashboard-search"
        v-model="filters.search"
        label="Cliente/Transação"
        placeholder="Cliente, paciente ou código da transação"
      />
      <details class="advanced-filters">
        <summary>Mais filtros<span v-if="!loading && !failed && activeFilterCount"> · {{ activeFilterCount }} aplicado{{ activeFilterCount > 1 ? 's' : '' }}</span></summary>
        <div class="advanced-filters__fields">
      <DsInput id="payments-dashboard-provider" v-model="filters.provider" label="Provedor" type="select">
        <option value="">Todos</option>
        <option value="pagarme-card">Pagar.me</option>
        <option value="local-card">Cartão local</option>
      </DsInput>
      <DsInput id="payments-dashboard-status" v-model="filters.status" label="Captura" type="select">
        <option value="">Todas</option>
        <option value="captured">Capturada</option>
        <option value="authorized_pending_capture">Autorizada</option>
        <option value="failed">Falhou</option>
        <option value="not_authorized">Não autorizada</option>
      </DsInput>
      <DsInput id="payments-dashboard-reconciliation" v-model="filters.reconciliation" label="Conciliação" type="select">
        <option value="">Todas</option>
        <option value="reconciled">Conciliada</option>
        <option value="pending">Pendente</option>
        <option value="attention_required">Atenção</option>
      </DsInput>
        </div>
      </details>
      <div class="payments-dashboard-filters__actions">
        <DsButton variant="primary" type="submit" :loading="loading">Atualizar Dashboard</DsButton>
        <DsButton variant="ghost" type="button" @click="resetFilters">Limpar</DsButton>
      </div>
    </form>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section v-if="failed && !loading" class="payments-dashboard-failure" role="status">
      <strong>Consulta indisponível</strong>
      <p>Não foi possível carregar os pagamentos. Atualize para tentar novamente.</p>
      <DsButton variant="secondary" @click="loadPayments">Tentar novamente</DsButton>
    </section>

    <DataTable
      v-else
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="📊"
      empty-title="Nenhum pagamento encontrado"
      empty-description="Ajuste os filtros para visualizar os pagamentos."
      :caption="loading ? 'Carregando pagamentos' : 'Pagamentos da consulta • até 100 registros carregados'"
      row-key-field="transactionId"
      variant="hoverable"
    >
      <template #cell-payment="{ row }">
        <strong>{{ paymentRow(row).description }}</strong>
        <small>{{ paymentRow(row).transactionId }}</small>
      </template>
      <template #cell-provider="{ row }">
        <strong>{{ paymentRow(row).providerLabel }}</strong>
        <small>{{ paymentRow(row).reference }}</small>
      </template>
      <template #cell-client="{ row }">
        <span>{{ paymentRow(row).client }}</span>
      </template>
      <template #cell-capture="{ row }">
        <StatusBadge :label="captureLabel(paymentRow(row).captureStatus)" :variant="captureVariant(paymentRow(row).captureStatus)" />
      </template>
      <template #cell-reconciliation="{ row }">
        <StatusBadge
          :label="reconciliationLabel(paymentRow(row).reconciliationState)"
          :variant="reconciliationVariant(paymentRow(row).reconciliationState)"
        />
      </template>
      <template #cell-gross="{ row }">
        <span>{{ formatCardMoney(paymentRow(row).gross) }}</span>
      </template>
      <template #cell-net="{ row }">
        <strong>{{ formatCardMoney(paymentRow(row).net) }}</strong>
      </template>
      <template #cell-settlement="{ row }">
        <span>{{ formatCardMoney(paymentRow(row).settlement) }}</span>
      </template>
      <template #cell-next="{ row }">
        <span>{{ paymentRow(row).nextAction }}</span>
      </template>
    </DataTable>

    <details aria-label="Resumo da consulta" class="payments-dashboard-summary">
      <summary>Resumo da consulta</summary>
      <p>Até 100 registros carregados; resumo dos pagamentos exibidos após os filtros.</p>
      <dl class="payments-dashboard-summary-grid">
        <div><dt>Capturado · bruto</dt><dd>{{ formatCardMoney(totalGross) }}</dd></div>
        <div><dt>Conciliado · líquido</dt><dd>{{ formatCardMoney(totalNet) }}</dd></div>
        <div><dt>Repasse previsto</dt><dd>{{ formatCardMoney(totalSettlement) }}</dd></div>
        <div><dt>Requer atenção</dt><dd>{{ loading || failed ? '—' : attentionCount }}</dd></div>
      </dl>
      <p>Traço indica valor indisponível ou moedas diferentes. O repasse depende de informação da fonte.</p>
    </details>

    <nav class="payments-dashboard-actions" aria-label="Rotinas relacionadas">
      <DsButton variant="ghost" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
      <DsButton variant="ghost" tag="a" to="/finance/split/export">Exportador de Split</DsButton>
      <DsButton variant="ghost" tag="a" to="/finance/payment-enablement">Habilitar Pagamento</DsButton>
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
import { cardMoney, sumCardMoney, formatCardMoney, type CardMoney } from '@/utils/financeCardMoney';
import { financeCardsService, type FinanceCardRow } from '@/services/financeCards';

type CaptureStatus = 'captured' | 'authorized_pending_capture' | 'failed' | 'not_authorized' | string;
type ReconciliationStatus = 'reconciled' | 'pending' | 'attention_required' | string | null | undefined;

interface PaymentDashboardRow {
  transactionId: string;
  description: string;
  providerLabel: string;
  reference: string;
  client: string;
  captureStatus: CaptureStatus;
  reconciliationState: ReconciliationStatus;
  gross: CardMoney;
  net: CardMoney;
  settlement: CardMoney;
  nextAction: string;
}

const columns: DataTableColumn[] = [
  { key: 'payment', label: 'Pagamento' },
  { key: 'provider', label: 'Provedor' },
  { key: 'client', label: 'Cliente / paciente' },
  { key: 'capture', label: 'Captura' },
  { key: 'reconciliation', label: 'Conciliação' },
  { key: 'gross', label: 'Bruto' },
  { key: 'net', label: 'Líquido' },
  { key: 'settlement', label: 'Repasse' },
  { key: 'next', label: 'Próxima Ação' }
];

const filters = reactive({
  search: '',
  provider: '',
  status: '',
  reconciliation: ''
});
const loading = ref(true);
const failed = ref(false);
const appliedFilters = reactive({ provider: '', status: '', reconciliation: '' });
const activeFilterCount = computed(() => [appliedFilters.provider, appliedFilters.status, appliedFilters.reconciliation].filter(Boolean).length);
let latestRequest = 0;
const error = ref('');
const payments = ref<FinanceCardRow[]>([]);

const rows = computed<PaymentDashboardRow[]>(() => payments.value.map(toPaymentDashboardRow));
const visibleRows = computed(() => rows.value.filter(matchesReconciliationFilter) as unknown as DataTableRow[]);
const summaryRows = computed(() => visibleRows.value.map(paymentRow));
const totalGross = computed(() => summarize(summaryRows.value.filter(row => row.captureStatus === 'captured').map(row => row.gross)));
const totalNet = computed(() => summarize(summaryRows.value.filter(row => row.reconciliationState === 'reconciled').map(row => row.net)));
const totalSettlement = computed(() => summaryRows.value.length ? summarize(summaryRows.value.map(row => row.settlement)) : cardMoney(null));
const attentionCount = computed(() => summaryRows.value.filter(row => row.reconciliationState === 'attention_required').length);

function summarize(values: CardMoney[]): CardMoney {
  return loading.value || failed.value ? cardMoney(null) : sumCardMoney(values);
}

async function loadPayments() {
  const request = ++latestRequest;
  const query = { ...filters };
  loading.value = true;
  error.value = '';
  try {
    const result = await financeCardsService.list({
      search: query.search.trim(),
      provider: query.provider,
      status: query.status,
      pageSize: 100
    });
    if (request !== latestRequest) return;
    payments.value = result;
    Object.assign(appliedFilters, { provider: query.provider, status: query.status, reconciliation: query.reconciliation });
    failed.value = false;
  } catch (err: unknown) {
    if (request !== latestRequest) return;
    failed.value = true;
    error.value = err instanceof Error ? err.message : 'Falha ao carregar pagamento dashboard';
    payments.value = [];
  } finally {
    if (request === latestRequest) loading.value = false;
  }
}

function resetFilters() {
  filters.search = '';
  filters.provider = '';
  filters.status = '';
  filters.reconciliation = '';
  void loadPayments();
}

function matchesReconciliationFilter(row: PaymentDashboardRow): boolean {
  return !appliedFilters.reconciliation || row.reconciliationState === appliedFilters.reconciliation;
}

function toPaymentDashboardRow(card: FinanceCardRow): PaymentDashboardRow {
  const gross = cardMoney(card.amount, card.currency);
  const net = cardMoney(card.netAmount, card.currency);
  const reconciliationState = card.reconciliationState;
  const settlement = cardMoney(null, card.currency);
  return {
    transactionId: card.transactionId,
    description: card.description || card.providerAuthorizationCode || card.providerChargeId || card.transactionId,
    providerLabel: providerLabel(card.provider),
    reference: card.providerAuthorizationCode || card.providerChargeId || card.providerReferenceId || card.transactionId,
    client: `${card.ownerName || card.cardHolderName || 'Cliente não informado'} · ${card.patientName || 'Paciente não vinculado'}`,
    captureStatus: card.status || '',
    reconciliationState,
    gross,
    net,
    settlement,
    nextAction: nextAction(card.status || '', reconciliationState)
  };
}

function paymentRow(row: DataTableRow): PaymentDashboardRow {
  return row as unknown as PaymentDashboardRow;
}

function nextAction(status: CaptureStatus, reconciliationState: ReconciliationStatus): string {
  if (status === 'authorized_pending_capture') return 'Acompanhar captura autorizada';
  if (status === 'failed' || status === 'not_authorized') return 'Revisar autorização';
  if (reconciliationState === 'attention_required') return 'Conferir conciliação';
  if (reconciliationState === 'reconciled') return 'Monitorar repasse';
  if (reconciliationState === 'pending') return 'Aguardar conciliação';
  return 'Sem orientação informada';
}

function captureLabel(status: CaptureStatus): string {
  if (status === 'captured') return 'Capturada';
  if (status === 'authorized_pending_capture') return 'Autorizada';
  if (status === 'failed') return 'Falhou';
  if (status === 'not_authorized') return 'Não autorizada';
  return status || 'Não informado';
}

function captureVariant(status: CaptureStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'captured') return 'success';
  if (status === 'authorized_pending_capture') return 'warning';
  if (status === 'failed' || status === 'not_authorized') return 'danger';
  return 'neutral';
}

function reconciliationLabel(status: ReconciliationStatus): string {
  if (status === 'reconciled') return 'Conciliada';
  if (status === 'attention_required') return 'Atenção';
  if (status === 'pending') return 'Pendente';
  return status || 'Não informada';
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

onMounted(loadPayments);
</script>

<style scoped>
.payments-dashboard-page { min-width: 0; display: grid; gap: 16px; }
.payments-dashboard-filters { align-items: end; display: grid; gap: 12px; grid-template-columns: minmax(240px, 2fr) minmax(300px, 3fr) auto; }
.payments-dashboard-filters__actions, .payments-dashboard-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.payments-dashboard-page :deep(input), .payments-dashboard-page :deep(select), .payments-dashboard-page :deep(button), .payments-dashboard-actions :deep(a) { min-height: 44px; }
.payments-dashboard-page :deep(th:first-child), .payments-dashboard-page :deep(td:first-child) { min-width: 240px; }
.payments-dashboard-page :deep(td:nth-child(6)), .payments-dashboard-page :deep(td:nth-child(7)), .payments-dashboard-page :deep(td:nth-child(8)) { white-space: nowrap; font-variant-numeric: tabular-nums; }
.payments-dashboard-page small { display: block; color: var(--color-text-secondary, #64748b); font-size: 12px; margin-top: 3px; }
.payments-dashboard-summary summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-size: 16px; font-weight: 600; }
.payments-dashboard-summary summary::before { content: '+'; margin-right: 8px; }
.payments-dashboard-summary[open] summary::before { content: '−'; }
.payments-dashboard-summary p, .payments-dashboard-failure p, .query-note, .payments-dashboard-summary-grid dt { color: var(--color-text-secondary, #64748b); font-size: 13px; }
.query-note { margin: 0; }
.payments-dashboard-summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); margin: 12px 0; }
.payments-dashboard-summary-grid dd { margin: 4px 0 0; font-size: 24px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.payments-dashboard-failure { padding: 24px; border: 1px solid var(--color-border, #cbd5e1); border-radius: 12px; }
.advanced-filters { min-width: 0; }
.advanced-filters summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-size: 14px; font-weight: 600; }
.advanced-filters summary::before { content: '▸'; margin-right: 8px; }
.advanced-filters[open] summary::before { content: '▾'; }
.advanced-filters summary span { white-space: pre-wrap; }
.advanced-filters__fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-top: 8px; }
@media (max-width: 900px) {
  .payments-dashboard-filters { grid-template-columns: minmax(0, 1fr); }
  .advanced-filters__fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
