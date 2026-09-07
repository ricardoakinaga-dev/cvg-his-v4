<template>
  <div class="split-exporter-page">
    <AppPageHeader
      title="Exportador de Split"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Exportador de Split']"
      subtitle="Exportação indisponível. Consulte os dados de cartão abaixo."
    />
    <form class="split-exporter-filters" aria-label="Filtros do exportador de split" @submit.prevent="loadPreview">
      <DsInput
        id="split-exporter-search"
        v-model="filters.search"
        label="Cliente/Transação"
        placeholder="Cliente, paciente ou código da transação"
      />
      <DsInput id="split-exporter-provider" v-model="filters.provider" label="Provedor" type="select">
        <option value="">Todos</option>
        <option value="pagarme-card">Pagar.me</option>
        <option value="local-card">Cartão local</option>
      </DsInput>
      <DsInput id="split-exporter-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="captured">Capturada</option>
        <option value="authorized_pending_capture">Autorizada</option>
        <option value="failed">Falhou</option>
        <option value="not_authorized">Não autorizada</option>
      </DsInput>
      <div class="split-exporter-filters__actions">
        <DsButton variant="primary" type="submit" :loading="loading">Consultar</DsButton>
        <DsButton variant="ghost" type="button" @click="resetFilters">Limpar</DsButton>
      </div>
    </form>


    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <section v-if="failed && !loading" class="split-exporter-recovery" aria-label="Falha na consulta">
      <p>Não foi possível carregar as transações. Os valores desta consulta estão indisponíveis.</p>
      <DsButton variant="secondary" @click="loadPreview">Tentar novamente</DsButton>
    </section>
    <DataTable
      v-else
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="📤"
      empty-title="Nenhuma transação nesta consulta"
      empty-description="Ajuste os filtros para consultar outras transações."
      caption="Transações da consulta · até 100 registros"
      row-key-field="transactionId"
      variant="hoverable"
    >
      <template #cell-transaction="{ row }">
        <strong>{{ exportRow(row).description }}</strong>
        <small>{{ exportRow(row).transactionId }}</small>
      </template>
      <template #cell-client="{ row }">
        <strong>{{ exportRow(row).client }}</strong>
        <small>{{ exportRow(row).patient }}</small>
      </template>
      <template #cell-receiver><span title="Recebedores não informados pela fonte">—</span></template>
      <template #cell-net="{ row }"><strong>{{ formatCardMoney(exportRow(row).net) }}</strong></template>
      <template #cell-allocation><span title="Alocação de split não informada pela fonte">—</span></template>
      <template #cell-status="{ row }">
        <StatusBadge :label="statusLabel(exportRow(row).status)" :variant="statusVariant(exportRow(row).status)" />
      </template>
      <template #cell-reconciliation="{ row }">
        <StatusBadge :label="reconciliationLabel(exportRow(row).reconciliationState)" :variant="reconciliationVariant(exportRow(row).reconciliationState)" />
      </template>
    </DataTable>

    <details class="split-exporter-summary">
      <summary>Resumo da consulta · até 100 registros</summary>
      <dl>
        <div><dt>Registros carregados</dt><dd>{{ queryReady ? transactions.length : '—' }}</dd></div>
        <div><dt>Líquido dos registros carregados</dt><dd>{{ formatCardMoney(totalNet) }}</dd></div>
      </dl>
      <p>O líquido só é totalizado quando todos os registros informam valor e a mesma moeda.</p>
    </details>
    <aside class="split-exporter-availability" aria-label="Disponibilidade da exportação">
      <p><strong>Exportação indisponível.</strong> A fonte não informa recebedores, alocação de split ou liquidação de repasses. Esta prévia é somente leitura e não gera arquivos.</p>
      <nav class="split-exporter-links" aria-label="Rotinas relacionadas">
        <DsButton variant="ghost" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
        <DsButton variant="ghost" tag="a" to="/finance/split/simulator">Simulador de Split</DsButton>
        <DsButton variant="ghost" tag="a" to="/finance/split">Configuração do Split</DsButton>
      </nav>
    </aside>
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
import { financeCardsService, type FinanceCardRow } from '@/services/financeCards';
import { cardMoney, sumCardMoney, formatCardMoney, type CardMoney } from '@/utils/financeCardMoney';

type OptionalStatus = string | null | undefined;
interface SplitExportRow {
  transactionId: string;
  description: string;
  client: string;
  patient: string;
  net: CardMoney;
  status: OptionalStatus;
  reconciliationState: OptionalStatus;
}
const columns: DataTableColumn[] = [
  { key: 'transaction', label: 'Transação' },
  { key: 'client', label: 'Cliente' },
  { key: 'receiver', label: 'Recebedores' },
  { key: 'net', label: 'Líquido' },
  { key: 'allocation', label: 'Repasse split' },
  { key: 'status', label: 'Status' },
  { key: 'reconciliation', label: 'Conciliação' }
];
const filters = reactive({ search: '', provider: '', status: '' });
const loading = ref(true);
const failed = ref(false);
const error = ref('');
const transactions = ref<FinanceCardRow[]>([]);
let requestId = 0;
const queryReady = computed(() => !loading.value && !failed.value);
const visibleRows = computed(() => transactions.value.map(toExportRow) as unknown as DataTableRow[]);
const totalNet = computed(() => queryReady.value && transactions.value.length
  ? sumCardMoney(transactions.value.map(card => cardMoney(card.netAmount, card.currency)))
  : cardMoney(null));

async function loadPreview() {
  const id = ++requestId;
  const query = { ...filters, search: filters.search.trim() };
  loading.value = true;
  error.value = '';
  try {
    const rows = await financeCardsService.list({ search: query.search, provider: query.provider, status: query.status, pageSize: 100 });
    if (id !== requestId) return;
    transactions.value = rows;
    failed.value = false;
  } catch (err: unknown) {
    if (id !== requestId) return;
    error.value = err instanceof Error ? err.message : 'Falha ao carregar prévia de exportação';
    failed.value = true;
    transactions.value = [];
  } finally {
    if (id === requestId) loading.value = false;
  }
}
function resetFilters() {
  Object.assign(filters, { search: '', provider: '', status: '' });
  void loadPreview();
}
function toExportRow(card: FinanceCardRow): SplitExportRow {
  return {
    transactionId: card.transactionId,
    description: card.description || card.providerAuthorizationCode || card.providerChargeId || card.transactionId,
    client: card.ownerName || card.cardHolderName || 'Cliente não informado',
    patient: card.patientName ? `Paciente: ${card.patientName}` : 'Paciente não vinculado',
    net: cardMoney(card.netAmount, card.currency),
    status: card.status,
    reconciliationState: card.reconciliationState
  };
}
function exportRow(row: DataTableRow): SplitExportRow { return row as unknown as SplitExportRow; }
function statusLabel(status: OptionalStatus): string {
  if (status === 'captured') return 'Capturada';
  if (status === 'authorized_pending_capture') return 'Autorizada';
  if (status === 'failed') return 'Falhou';
  if (status === 'not_authorized') return 'Não autorizada';
  return status || 'Não informado';
}
function statusVariant(status: OptionalStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'captured') return 'success';
  if (status === 'authorized_pending_capture') return 'warning';
  if (status === 'failed' || status === 'not_authorized') return 'danger';
  return 'neutral';
}
function reconciliationLabel(status: OptionalStatus): string {
  if (status === 'reconciled') return 'Conciliada';
  if (status === 'attention_required') return 'Atenção';
  if (status === 'pending') return 'Pendente';
  return status || 'Não informada';
}
function reconciliationVariant(status: OptionalStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'reconciled') return 'success';
  if (status === 'attention_required') return 'danger';
  if (status === 'pending') return 'warning';
  return 'neutral';
}
onMounted(loadPreview);
</script>

<style scoped>
.split-exporter-page { display: grid; gap: 16px; min-width: 0; }
.split-exporter-filters { align-items: end; display: grid; gap: 12px; grid-template-columns: minmax(240px, 2fr) repeat(2, minmax(120px, 1fr)) auto; }
.split-exporter-filters__actions, .split-exporter-links { display: flex; flex-wrap: wrap; gap: 8px; }
.split-exporter-page :deep(input), .split-exporter-page :deep(select), .split-exporter-page :deep(button), .split-exporter-links :deep(a) { min-height: 44px; }
.split-exporter-page :deep(th:nth-child(-n+2)), .split-exporter-page :deep(td:nth-child(-n+2)) { min-width: 240px; }
.split-exporter-page :deep(td:nth-child(4)) { white-space: nowrap; font-variant-numeric: tabular-nums; }
.split-exporter-page small { color: var(--color-text-secondary, #64748b); display: block; font-size: 12px; margin-top: 3px; }
.split-exporter-summary, .split-exporter-availability, .split-exporter-recovery { padding: 16px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 12px; }
.split-exporter-summary summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; font-weight: 600; }
.split-exporter-summary summary::before { content: '▸'; margin-right: 8px; }
.split-exporter-summary[open] summary::before { content: '▾'; }
.split-exporter-summary dl { display: flex; flex-wrap: wrap; gap: 24px; }
.split-exporter-summary dt, .split-exporter-summary p, .split-exporter-availability p { color: var(--color-text-secondary, #64748b); font-size: 14px; }
.split-exporter-summary dd { margin: 4px 0 0; font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
.split-exporter-availability p { margin: 0 0 8px; }
@media (max-width: 1100px) { .split-exporter-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px) { .split-exporter-filters > :first-child, .split-exporter-filters__actions { grid-column: 1 / -1; } }
</style>
