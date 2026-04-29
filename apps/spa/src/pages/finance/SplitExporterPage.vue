<template>
  <div class="split-exporter-page">
    <AppPageHeader
      title="Exportador de Split"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Exportador de Split']"
      subtitle="Prévia de exportação de repasses, recebedores e status de conciliação"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Prévia somente leitura conectada à reconciliação financeira de cartões. Gerar arquivo, enviar ao provedor,
      confirmar repasse e alterar configuração de split seguem bloqueados nesta etapa.
    </DsAlert>

    <form class="split-exporter-filters" aria-label="Filtros do exportador de split" @submit.prevent="loadPreview">
      <DsInput
        id="split-exporter-search"
        v-model="filters.search"
        label="Cliente/Transação"
        placeholder="Buscar por cliente, paciente, autorização ou descrição"
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
      <DsInput id="split-exporter-format" v-model="filters.format" label="Formato" type="select">
        <option value="CSV">CSV</option>
        <option value="OFX">OFX</option>
        <option value="JSON">JSON</option>
      </DsInput>
      <div class="split-exporter-filters__actions">
        <DsButton variant="primary" type="submit" :loading="loading">Preparar Prévia</DsButton>
        <DsButton variant="ghost" type="button" @click="resetFilters">Limpar</DsButton>
      </div>
    </form>

    <section class="split-exporter-summary-grid" aria-label="Resumo do exportador de split">
      <DsStatCard :label="`${visibleRows.length} transação(ões)`" value="Linhas" />
      <DsStatCard :label="formatCurrency(totalNet)" value="Líquido" />
      <DsStatCard :label="formatCurrency(totalCvg)" value="Centro Veterinário Guarapiranga" />
      <DsStatCard :label="formatCurrency(totalPlatform)" value="CVG Pagamentos" />
    </section>

    <section class="split-exporter-actions" aria-label="Ações do exportador de split">
      <DsButton variant="primary" disabled>Gerar Arquivo</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split/simulator">Simulador de Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="ghost" type="button" :loading="loading" @click="loadPreview">Atualizar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="📤"
      empty-title="Nenhuma transação elegível para exportação"
      empty-description="Ajuste os filtros para visualizar a prévia de repasses por recebedor."
      caption="Prévia de exportação de split"
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
      <template #cell-receiver="{ row }">
        <strong>{{ exportRow(row).primaryReceiver }}</strong>
        <small>{{ exportRow(row).secondaryReceiver }}</small>
      </template>
      <template #cell-format="{ row }">
        <span>{{ exportRow(row).format }}</span>
      </template>
      <template #cell-net="{ row }">
        <strong>{{ formatCurrency(exportRow(row).net) }}</strong>
      </template>
      <template #cell-cvg="{ row }">
        <span>{{ formatCurrency(exportRow(row).cvgAmount) }}</span>
      </template>
      <template #cell-platform="{ row }">
        <span>{{ formatCurrency(exportRow(row).platformAmount) }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="statusLabel(exportRow(row).status)" :variant="statusVariant(exportRow(row).status)" />
      </template>
      <template #cell-reconciliation="{ row }">
        <StatusBadge
          :label="reconciliationLabel(exportRow(row).reconciliationState)"
          :variant="reconciliationVariant(exportRow(row).reconciliationState)"
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

type ExportFormat = 'CSV' | 'OFX' | 'JSON';
type ExportStatus = 'captured' | 'authorized_pending_capture' | 'failed' | 'not_authorized' | string;
type ReconciliationStatus = 'reconciled' | 'pending' | 'attention_required' | string | null | undefined;

interface SplitExportRow {
  transactionId: string;
  description: string;
  client: string;
  patient: string;
  primaryReceiver: string;
  secondaryReceiver: string;
  format: ExportFormat;
  net: number;
  cvgAmount: number;
  platformAmount: number;
  status: ExportStatus;
  reconciliationState: ReconciliationStatus;
}

const cvgPercent = 85;
const platformPercent = 15;

const columns: DataTableColumn[] = [
  { key: 'transaction', label: 'Transação' },
  { key: 'client', label: 'Cliente' },
  { key: 'receiver', label: 'Recebedores' },
  { key: 'format', label: 'Formato' },
  { key: 'net', label: 'Líquido' },
  { key: 'cvg', label: 'Repasse CVG' },
  { key: 'platform', label: 'Repasse Plataforma' },
  { key: 'status', label: 'Status' },
  { key: 'reconciliation', label: 'Conciliação' }
];

const filters = reactive({
  search: '',
  provider: '',
  status: '',
  format: 'CSV' as ExportFormat
});
const loading = ref(false);
const error = ref('');
const transactions = ref<FinanceCardRow[]>([]);

const visibleRows = computed(() => transactions.value.map(toExportRow) as unknown as DataTableRow[]);
const totalNet = computed(() => visibleRows.value.reduce((sum, row) => sum + exportRow(row).net, 0));
const totalCvg = computed(() => visibleRows.value.reduce((sum, row) => sum + exportRow(row).cvgAmount, 0));
const totalPlatform = computed(() => visibleRows.value.reduce((sum, row) => sum + exportRow(row).platformAmount, 0));
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-split-exporter',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: loadPreview
  }
]);

async function loadPreview() {
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
    error.value = err instanceof Error ? err.message : 'Falha ao carregar prévia de exportação';
    transactions.value = [];
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.search = '';
  filters.provider = '';
  filters.status = '';
  filters.format = 'CSV';
  void loadPreview();
}

function toExportRow(card: FinanceCardRow): SplitExportRow {
  const gross = card.amount ?? 0;
  const fee = card.feeAmount ?? (card.netAmount != null ? Math.max(gross - card.netAmount, 0) : 0);
  const net = card.netAmount ?? Math.max(gross - fee, 0);
  return {
    transactionId: card.transactionId,
    description: card.description || card.providerAuthorizationCode || card.providerChargeId || card.transactionId,
    client: card.ownerName || card.cardHolderName || 'Cliente não informado',
    patient: card.patientName ? `Paciente: ${card.patientName}` : 'Paciente não vinculado',
    primaryReceiver: 'Centro Veterinário Guarapiranga',
    secondaryReceiver: 'CVG Pagamentos',
    format: filters.format,
    net,
    cvgAmount: roundMoney(net * (cvgPercent / 100)),
    platformAmount: roundMoney(net * (platformPercent / 100)),
    status: card.status || 'pending',
    reconciliationState: card.reconciliationState || 'pending'
  };
}

function exportRow(row: DataTableRow): SplitExportRow {
  return row as unknown as SplitExportRow;
}

function statusLabel(status: ExportStatus): string {
  if (status === 'captured') return 'Capturada';
  if (status === 'authorized_pending_capture') return 'Autorizada';
  if (status === 'failed') return 'Falhou';
  if (status === 'not_authorized') return 'Não autorizada';
  return status || 'Pendente';
}

function statusVariant(status: ExportStatus): 'success' | 'warning' | 'danger' | 'neutral' {
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

onMounted(loadPreview);
</script>

<style scoped>
.split-exporter-page {
  display: grid;
  gap: 16px;
}

.split-exporter-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.split-exporter-filters__actions,
.split-exporter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.split-exporter-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.split-exporter-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .split-exporter-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .split-exporter-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .split-exporter-filters,
  .split-exporter-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
