<template>
    <section class="report-results" :data-execution-id="props.executionId || undefined">
      <h2>{{ props.spec.tableTitle }}</h2>
      <DataTable
        :columns="props.spec.columns"
        :rows="props.rows"
        :loading="props.loading"
        :empty-icon="props.spec.icon"
        :empty-title="
          props.loadFailed
            ? 'Não foi possível carregar o relatório'
            : props.reportHasActiveFilters && props.reportReady && props.rows.length === 0
              ? 'Sem resultados para os filtros'
              : props.spec.emptyTitle
        "
        :empty-description="
          props.loadFailed
            ? 'Tente novamente para consultar os registros.'
            : props.reportHasActiveFilters && props.reportReady && props.rows.length === 0
              ? 'Nenhum registro corresponde ao recorte atual. Limpe os filtros para consultar o período completo.'
              : props.spec.emptyDescription
        "
        :caption="props.caption"
        variant="hoverable"
      >
        <template v-if="props.loadFailed" #emptyAction>
          <DsButton variant="secondary" :loading="props.loading" @click="emit('retry')">
            Tentar novamente
          </DsButton>
        </template>
        <template v-else-if="props.reportHasActiveFilters && props.reportReady && props.rows.length === 0" #emptyAction>
          <DsButton variant="secondary" :loading="props.loading" @click="emit('reset-filters')">
            Limpar filtros
          </DsButton>
        </template>
        <template #cell-amount="{ row }">
          <span class="report-money">{{ formatNullableCurrency(row, 'amount') }}</span>
        </template>
        <template #cell-amountPaid="{ row }"><span class="report-money">{{ formatNullableCurrency(row, 'amountPaid') }}</span></template>
        <template #cell-amountOutstanding="{ row }"><span class="report-money">{{ formatNullableCurrency(row, 'amountOutstanding') }}</span></template>
        <template v-if="props.showFinancialStatusLabels" #cell-status="{ row }">{{ financialStatusLabel(stringValue(row, 'status')) }}</template>
        <template #cell-reconciliationStatus="{ row }">{{ reconciliationLabel(stringValue(row, 'reconciliationStatus')) }}</template>
        <template #cell-total="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'total')) }}</span>
        </template>
        <template #cell-numero="{ row }">
          {{ numberValue(row, 'numero') }}
        </template>
        <template #cell-competencia="{ row }">
          {{ formatDate(stringValue(row, 'competencia')) }}
        </template>
        <template #cell-serviceSubtotal="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'serviceSubtotal')) }}</span>
        </template>
        <template #cell-totalIss="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalIss')) }}</span>
        </template>
        <template #cell-totalPis="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalPis')) }}</span>
        </template>
        <template #cell-totalCofins="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalCofins')) }}</span>
        </template>
        <template #cell-totalCsll="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalCsll')) }}</span>
        </template>
        <template #cell-totalIrrf="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalIrrf')) }}</span>
        </template>
        <template #cell-totalInss="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalInss')) }}</span>
        </template>
        <template #cell-totalDocument="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalDocument')) }}</span>
        </template>
        <template #cell-revenue="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'revenue')) }}</span>
        </template>
        <template #cell-basePrice="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'basePrice')) }}</span>
        </template>
        <template #cell-unitCostAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'unitCostAmount')) }}</span>
        </template>
        <template #cell-quantityDelta="{ row }">
          {{ numberValue(row, 'quantityDelta') }}
        </template>
        <template #cell-balanceBefore="{ row }">
          {{ numberValue(row, 'balanceBefore') }}
        </template>
        <template #cell-balanceAfter="{ row }">
          {{ numberValue(row, 'balanceAfter') }}
        </template>
        <template #cell-stockValue="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'stockValue')) }}</span>
        </template>
        <template #cell-costAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'costAmount')) }}</span>
        </template>
        <template #cell-receivedAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'receivedAmount')) }}</span>
        </template>
        <template #cell-payableAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'payableAmount')) }}</span>
        </template>
        <template #cell-paidAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'paidAmount')) }}</span>
        </template>
        <template #cell-totalAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'totalAmount')) }}</span>
        </template>
        <template #cell-amountOriginal="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'amountOriginal')) }}</span>
        </template>
        <template #cell-originalAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'originalAmount')) }}</span>
        </template>
        <template #cell-compensatedAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'compensatedAmount')) }}</span>
        </template>
        <template #cell-balance="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'balance')) }}</span>
        </template>
        <template #cell-outstandingAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'outstandingAmount')) }}</span>
        </template>
        <template #cell-issuedAt="{ row }">
          {{ formatDate(stringValue(row, 'issuedAt')) }}
        </template>
        <template #cell-dueAt="{ row }">
          {{ formatDate(stringValue(row, 'dueAt')) }}
        </template>
        <template #cell-settledAt="{ row }">
          {{ formatDateTime(stringValue(row, 'settledAt')) }}
        </template>
        <template #cell-createdAt="{ row }">
          {{ formatDate(stringValue(row, 'createdAt')) }}
        </template>
        <template #cell-receivedAt="{ row }">
          {{ formatDate(stringValue(row, 'receivedAt')) }}
        </template>
        <template #cell-updatedAt="{ row }">
          {{ formatDate(stringValue(row, 'updatedAt')) }}
        </template>
        <template #cell-expiryDate="{ row }">
          {{ formatDate(stringValue(row, 'expiryDate')) }}
        </template>
        <template #cell-openedAt="{ row }">
          {{ formatDateTime(stringValue(row, 'openedAt')) }}
        </template>
        <template #cell-closedAt="{ row }">
          {{ formatDateTime(stringValue(row, 'closedAt')) }}
        </template>
        <template #cell-occurredAt="{ row }">
          {{ formatDateTime(stringValue(row, 'occurredAt')) }}
        </template>
        <template #cell-recordedAt="{ row }">
          {{ formatDateTime(stringValue(row, 'recordedAt')) }}
        </template>
        <template #cell-scheduledAt="{ row }">
          {{ formatDateTime(stringValue(row, 'scheduledAt')) }}
        </template>
        <template #cell-openingAmount="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'openingAmount')) }}</span>
        </template>
        <template #cell-closingAmount="{ row }">
          <span class="report-money">{{ formatNullableCurrency(row, 'closingAmount') }}</span>
        </template>
        <template #cell-runningBalance="{ row }">
          <span class="report-money">{{ formatCurrency(numberValue(row, 'runningBalance')) }}</span>
        </template>
        <template #cell-difference="{ row }">
          <span class="report-money">{{ formatNullableCurrency(row, 'difference') }}</span>
        </template>
      </DataTable>
    </section>
</template>

<script setup lang="ts">
import DataTable, { type DataTableRow } from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import type { ReportSpec } from './reportWorkbenchTypes';

const props = defineProps<{
  spec: ReportSpec;
  caption: string;
  rows: readonly DataTableRow[];
  loading: boolean;
  loadFailed: boolean;
  reportReady: boolean;
  reportHasActiveFilters: boolean;
  executionId?: string | null;
  showFinancialStatusLabels?: boolean;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'reset-filters'): void;
}>();

function numberValue(row: DataTableRow, key: string): number {
  const value = row[key];
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function stringValue(row: DataTableRow, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNullableCurrency(row: DataTableRow, key: string): string {
  const value = row[key];
  return typeof value === 'number' ? formatCurrency(value) : '—';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(parsed);
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(parsed);
}

function financialStatusLabel(value: string | null): string {
  if (value === null) return '—';
  return ({open:'Em aberto', partial:'Parcial', paid:'Pago', cancelled:'Cancelado', settled:'Liquidado'} as Record<string,string>)[value] ?? value;
}

function reconciliationLabel(value: string | null): string {
  if (value === null) return '—';
  return ({not_required:'Dispensada', pending:'Pendente', reconciled:'Conciliada'} as Record<string,string>)[value] ?? value;
}
</script>

<style scoped>
.report-results h2 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
.report-money { white-space: nowrap; font-variant-numeric: tabular-nums; }
.report-results :deep(.data-table) { min-width: 0; }
.report-results :deep(.data-table th) { white-space: normal; }
</style>
