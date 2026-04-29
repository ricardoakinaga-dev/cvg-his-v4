<template>
  <div class="payments-dashboard-page">
    <AppPageHeader
      title="Pagamento Dashboard"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Pagamento Dashboard']"
      subtitle="Indicadores de captura, conciliação e repasse previsto por provedor"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Dashboard somente leitura conectado à reconciliação financeira de cartões. Captura, baixa, conciliação real e
      repasse ao provedor seguem bloqueados nesta superfície.
    </DsAlert>

    <form class="payments-dashboard-filters" aria-label="Filtros do pagamento dashboard" @submit.prevent="loadPayments">
      <DsInput
        id="payments-dashboard-search"
        v-model="filters.search"
        label="Cliente/Transação"
        placeholder="Buscar por cliente, paciente, autorização ou descrição"
      />
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
      <div class="payments-dashboard-filters__actions">
        <DsButton variant="primary" type="submit" :loading="loading">Atualizar Dashboard</DsButton>
        <DsButton variant="ghost" type="button" @click="resetFilters">Limpar</DsButton>
      </div>
    </form>

    <section class="payments-dashboard-summary-grid" aria-label="Resumo do pagamento dashboard">
      <DsStatCard :label="formatCurrency(totalGross)" value="Capturado" />
      <DsStatCard :label="formatCurrency(totalNet)" value="Conciliado" />
      <DsStatCard :label="formatCurrency(totalSettlement)" value="Repasse Previsto" />
      <DsStatCard :label="`${attentionCount} pendência(s)`" value="Atenção" />
    </section>

    <section class="payments-dashboard-actions" aria-label="Ações do pagamento dashboard">
      <DsButton variant="primary" disabled>Baixar/Conciliar Pagamento</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split/export">Exportador de Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/payment-enablement">Habilitar Pagamento</DsButton>
      <DsButton variant="ghost" type="button" :loading="loading" @click="loadPayments">Atualizar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="📊"
      empty-title="Nenhum pagamento encontrado"
      empty-description="Ajuste os filtros para visualizar captura, conciliação e repasse previsto."
      caption="Pagamento dashboard"
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
      <template #cell-unit="{ row }">
        <strong>{{ paymentRow(row).unit }}</strong>
        <small>{{ paymentRow(row).client }}</small>
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
        <span>{{ formatCurrency(paymentRow(row).gross) }}</span>
      </template>
      <template #cell-net="{ row }">
        <strong>{{ formatCurrency(paymentRow(row).net) }}</strong>
      </template>
      <template #cell-settlement="{ row }">
        <span>{{ formatCurrency(paymentRow(row).settlement) }}</span>
      </template>
      <template #cell-next="{ row }">
        <span>{{ paymentRow(row).nextAction }}</span>
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

type CaptureStatus = 'captured' | 'authorized_pending_capture' | 'failed' | 'not_authorized' | string;
type ReconciliationStatus = 'reconciled' | 'pending' | 'attention_required' | string | null | undefined;

interface PaymentDashboardRow {
  transactionId: string;
  description: string;
  providerLabel: string;
  reference: string;
  unit: string;
  client: string;
  captureStatus: CaptureStatus;
  reconciliationState: ReconciliationStatus;
  gross: number;
  net: number;
  settlement: number;
  nextAction: string;
}

const settlementPercent = 0.97;

const columns: DataTableColumn[] = [
  { key: 'payment', label: 'Pagamento' },
  { key: 'provider', label: 'Provedor' },
  { key: 'unit', label: 'Unidade' },
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
const loading = ref(false);
const error = ref('');
const payments = ref<FinanceCardRow[]>([]);

const rows = computed<PaymentDashboardRow[]>(() => payments.value.map(toPaymentDashboardRow));
const visibleRows = computed(() => rows.value.filter(matchesReconciliationFilter) as unknown as DataTableRow[]);
const totalGross = computed(() => visibleRows.value.reduce((sum, row) => sum + paymentRow(row).gross, 0));
const totalNet = computed(() => visibleRows.value.reduce((sum, row) => sum + paymentRow(row).net, 0));
const totalSettlement = computed(() => visibleRows.value.reduce((sum, row) => sum + paymentRow(row).settlement, 0));
const attentionCount = computed(
  () => visibleRows.value.filter((row) => paymentRow(row).reconciliationState === 'attention_required').length
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-payments-dashboard',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: loadPayments
  }
]);

async function loadPayments() {
  loading.value = true;
  error.value = '';
  try {
    payments.value = await financeCardsService.list({
      search: filters.search.trim(),
      provider: filters.provider,
      status: filters.status,
      pageSize: 100
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar pagamento dashboard';
    payments.value = [];
  } finally {
    loading.value = false;
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
  return !filters.reconciliation || row.reconciliationState === filters.reconciliation;
}

function toPaymentDashboardRow(card: FinanceCardRow): PaymentDashboardRow {
  const gross = card.amount ?? 0;
  const fee = card.feeAmount ?? (card.netAmount != null ? Math.max(gross - card.netAmount, 0) : 0);
  const net = card.netAmount ?? Math.max(gross - fee, 0);
  const reconciliationState = card.reconciliationState || 'pending';
  return {
    transactionId: card.transactionId,
    description: card.description || card.providerAuthorizationCode || card.providerChargeId || card.transactionId,
    providerLabel: providerLabel(card.provider),
    reference: card.providerAuthorizationCode || card.providerChargeId || card.providerReferenceId || card.transactionId,
    unit: 'Centro Veterinário Guarapiranga',
    client: `${card.ownerName || card.cardHolderName || 'Cliente não informado'} · ${card.patientName || 'Paciente não vinculado'}`,
    captureStatus: card.status || 'pending',
    reconciliationState,
    gross,
    net,
    settlement: reconciliationState === 'reconciled' ? net : roundMoney(net * settlementPercent),
    nextAction: nextAction(card.status || 'pending', reconciliationState)
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
  return 'Aguardar conciliação';
}

function captureLabel(status: CaptureStatus): string {
  if (status === 'captured') return 'Capturada';
  if (status === 'authorized_pending_capture') return 'Autorizada';
  if (status === 'failed') return 'Falhou';
  if (status === 'not_authorized') return 'Não autorizada';
  return status || 'Pendente';
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

onMounted(loadPayments);
</script>

<style scoped>
.payments-dashboard-page {
  display: grid;
  gap: 16px;
}

.payments-dashboard-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.payments-dashboard-filters__actions,
.payments-dashboard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.payments-dashboard-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.payments-dashboard-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .payments-dashboard-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .payments-dashboard-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .payments-dashboard-filters,
  .payments-dashboard-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
