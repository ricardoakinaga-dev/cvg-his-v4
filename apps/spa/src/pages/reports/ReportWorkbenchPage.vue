<template>
  <div class="report-page">
    <AppPageHeader
      :title="spec.title"
      :breadcrumbs="['Relatórios', spec.group, spec.title]"
      :subtitle="reportSubtitle"
    >
      <template v-if="reportKey !== 'dre'" #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadReport">Atualizar</DsButton>
        <DsButton
          v-if="spec.exportable"
          variant="primary"
          :loading="exporting"
          :disabled="loading || loadFailed || !reportReady || serverFiltersChanged || exportPending"
          @click="exportCurrentReport"
        >
          {{ spec.primaryAction }}
        </DsButton>
        <DsButton v-else-if="spec.primaryDisabled" variant="primary" disabled>{{
          spec.primaryAction
        }}</DsButton>
        <DsButton v-else variant="primary" tag="a" :to="spec.primaryPath">{{
          spec.primaryAction
        }}</DsButton>
      </template>
    </AppPageHeader>

    <section v-if="reportKey === 'dre'" class="report-unavailable" aria-labelledby="dre-unavailable-title">
      <span class="report-unavailable__mark" aria-hidden="true">—</span>
      <h2 id="dre-unavailable-title">DRE indisponível</h2>
      <p>{{ spec.emptyDescription }}</p>
      <DsButton tag="a" to="/reports/accounts" variant="secondary">Relatórios financeiros</DsButton>
    </section>
    <template v-else>
    <details class="report-filter-disclosure">
      <summary>Filtros da consulta</summary>
    <section class="report-filters">
      <DsInput
        v-if="isDeletedSalesCounterSalesReport"
        id="cancellation-report-view"
        class="report-filter-mode"
        :model-value="cancellationReportView"
        type="select"
        label="Consultar"
        :disabled="loading || exporting"
        @update:model-value="changeCancellationReportView"
      >
        <option value="history">Histórico por data de cancelamento</option>
        <option value="opening-date">Canceladas por data de abertura</option>
      </DsInput>
      <DsInput v-model="filters.dateFrom" type="date" :label="dateFromLabel" />
      <DsInput v-model="filters.dateTo" type="date" :label="dateToLabel" />
      <p v-if="inventoryPeriodHint" class="report-period-hint">{{ inventoryPeriodHint }}</p>
      <template v-if="isServiceInvoicesReport">
        <DsInput
          v-model="filters.search"
          label="Cliente, serviço ou código"
          placeholder="Nome, documento ou código do serviço"
          :maxlength="200"
        />
        <DsInput id="service-invoice-status" v-model="filters.status" type="select" label="Status">
          <option value="">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="issued">Emitida</option>
          <option value="cancelled">Cancelada</option>
          <option value="error">Erro</option>
        </DsInput>
      </template>
      <template v-if="isAdvancePaymentsReport">
        <DsInput
          v-model="filters.search"
          label="Cliente ou documento"
          placeholder="Nome ou documento do cliente"
          :maxlength="200"
        />
        <DsInput id="advance-payment-status" v-model="filters.status" type="select" label="Status">
          <option value="">Todos os status</option>
          <option value="available">Disponível</option>
          <option value="partially_compensated">Parcialmente compensado</option>
          <option value="compensated">Compensado</option>
        </DsInput>
      </template>
      <template v-if="isAppointmentsReport">
        <DsInput
          v-model="filters.search"
          label="ID ou texto do agendamento"
          placeholder="ID, motivo, unidade ou especialidade"
          :maxlength="200"
        />
        <DsInput
          id="appointment-report-status"
          v-model="filters.status"
          type="select"
          label="Status"
        >
          <option value="">Todos os status</option>
          <option value="scheduled">Agendado</option>
          <option value="checked_in">Check-in</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </DsInput>
      </template>
      <template v-if="isDeletedSalesCounterSalesReport">
        <DsInput
          v-model="filters.search"
          :label="
            isCancellationHistoryReport ? 'Número, motivo ou responsável' : 'Número ou observação'
          "
          :placeholder="
            isCancellationHistoryReport
              ? 'Número da comanda, motivo ou ID do responsável'
              : 'Número da comanda ou texto da observação'
          "
          :maxlength="200"
        />
      </template>
      <template
        v-if="isInventoryMovementsReport || isInventoryProductsReport || isInventoryStockReport"
      >
        <DsInput
          v-model="filters.search"
          label="Código ou produto"
          placeholder="SKU ou nome do produto"
          :maxlength="200"
        />
      </template>
      <template v-if="isInventoryInvoicesReport">
        <DsInput
          v-model="filters.search"
          label="Fornecedor ou referência NF"
          placeholder="Fornecedor ou referência armazenada"
          :maxlength="200"
        />
        <DsInput
          id="inventory-invoice-status"
          v-model="filters.status"
          type="select"
          label="Status"
        >
          <option value="">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="approved">Aprovada</option>
          <option value="partially_received">Parcialmente recebida</option>
          <option value="received">Recebida</option>
          <option value="cancelled">Cancelada</option>
        </DsInput>
      </template>
      <template v-if="isAuditAppointments">
        <DsInput
          v-model="filters.client"
          label="Cliente"
          placeholder="Nome, animal ou id do agendamento"
        />
        <DsInput v-model="filters.user" label="Usuário" placeholder="Usuário ou ator auditado" />
        <label class="report-field">
          <span>Ação</span>
          <select v-model="filters.action">
            <option value="">Selecione a ação</option>
            <option v-for="action in auditActionOptions" :key="action" :value="action">
              {{ action }}
            </option>
          </select>
        </label>
        <label class="report-field">
          <span>Tipo</span>
          <select v-model="filters.type">
            <option value="">Selecione os tipos</option>
            <option v-for="type in auditTypeOptions" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>
      </template>
      <div class="report-filters__actions">
        <DsButton variant="primary" :loading="loading" @click="loadReport">Aplicar</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>
    </details>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="exportPending" class="report-export-recovery" role="status" aria-live="polite">
      <strong>Exportação em reconciliação</strong>
      <span v-if="pendingExport"
        >Verifique o artefato persistido antes de iniciar qualquer novo processamento.</span
      >
      <div class="report-filters__actions">
        <DsButton
          type="button"
          variant="secondary"
          :loading="exporting"
          :disabled="exporting"
          @click="reconcilePendingExport"
        >
          Verificar exportação pendente
        </DsButton>
        <DsButton
          v-if="exportRetryAvailable"
          type="button"
          variant="ghost"
          :loading="exporting"
          :disabled="exporting"
          @click="retryPendingExport"
        >
          Repetir com a mesma chave
        </DsButton>
      </div>
    </div>

    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
    </DsAlert>

    <p v-if="reportFiltersChanged" class="report-query-note" role="status">Filtros alterados. A tabela mostra a última execução server-side; aplique os filtros para atualizar e exportar exatamente o mesmo recorte.</p>
    <section class="report-results" :data-execution-id="activeServerExecution?.id || undefined">
      <h2>{{ spec.tableTitle }}</h2>
      <DataTable
        :columns="spec.columns"
        :rows="rows"
        :loading="loading"
        :empty-icon="spec.icon"
        :empty-title="
          loadFailed
            ? 'Não foi possível carregar o relatório'
            : reportHasActiveFilters && reportReady && rows.length === 0
              ? 'Sem resultados para os filtros'
              : spec.emptyTitle
        "
        :empty-description="
          loadFailed
            ? 'Tente novamente para consultar os registros.'
            : reportHasActiveFilters && reportReady && rows.length === 0
              ? 'Nenhum registro corresponde ao recorte atual. Limpe os filtros para consultar o período completo.'
              : spec.emptyDescription
        "
        :caption="
          isChequesReport
            ? 'Cheques'
            : isDeletedSalesCounterSalesReport
              ? spec.tableTitle
              : spec.tableTitle
        "
        variant="hoverable"
      >
        <template v-if="loadFailed" #emptyAction>
          <DsButton variant="secondary" :loading="loading" @click="loadReport">
            Tentar novamente
          </DsButton>
        </template>
        <template v-else-if="reportHasActiveFilters && reportReady && rows.length === 0" #emptyAction>
          <DsButton variant="secondary" :loading="loading" @click="resetFilters">
            Limpar filtros
          </DsButton>
        </template>
        <template #cell-amount="{ row }">
          <span class="report-money">{{ formatNullableCurrency(row, 'amount') }}</span>
        </template>
        <template #cell-amountPaid="{ row }"><span class="report-money">{{ formatNullableCurrency(row, 'amountPaid') }}</span></template>
        <template #cell-amountOutstanding="{ row }"><span class="report-money">{{ formatNullableCurrency(row, 'amountOutstanding') }}</span></template>
        <template v-if="isFinancialPayablesReport || isFinancialReceivablesReport" #cell-status="{ row }">{{ financialStatusLabel(stringValue(row, 'status')) }}</template>
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
    <details v-if="reportReady && cards.length" class="report-summary">
      <summary>Resumo da consulta</summary>
      <dl><div v-for="card in cards" :key="card.label"><dt>{{ card.label }}</dt><dd>{{ card.value }}</dd></div></dl>
    </details>
    <details v-if="reportNote" class="report-assumptions">
      <summary>Sobre este relatório</summary><p>{{ reportNote }}</p>
    </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { packagesService, type CustomerPackageDetail } from '@/services/packages';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import {
  administrativeReportsService,
  type AdministrativeReportsResponse
} from '@/services/administrativeReports';
import { auditService } from '@/services/audit';
import {
  DownloadTimeoutError,
  saveBrowserDownload,
  withDownloadTimeout
} from '@/services/download';

import { reportsService, type ReportExecutionDetail } from '@/services/reports';
import { ApiError } from '@/services/api';

import { patientStatusLabel, sexLabel, speciesLabel } from '@/utils/labels';
import { buildReportCsv } from '@/utils/report-export';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';
import type { ReportCard, ReportSpec } from './reportWorkbenchTypes';
import { useCancellationReports } from './useCancellationReports';
import { createReportSpecs } from './reportWorkbenchSpecs';

import type {
  AdvancePaymentReportRow,
  AppointmentReportRow,
  ChequeReportRow,
  FinancialPayableReportRow,
  FinancialPayableServerRow,
  FinancialReceivableReportRow,
  FinancialReceivableServerRow,
  InventoryMovementReportRow,
  InventoryProductReportRow,
  InventoryPurchaseReportRow,
  InventoryStockReportRow,
  ProfessionalCareReportRow,
  RegisterOwnersReportRow,
  RegisterPatientsReportRow,
  RegisterServicesReportRow,
  ReportKey,
  ServiceInvoiceReportRow,
  SupplierReportRow
} from './reportWorkbenchModels';

const props = defineProps<{
  reportKey: ReportKey;
}>();

const loading = ref(true);
const loadFailed = ref(false);
const reportReady = ref(false);
const appliedServerFilters = ref('');
let reportRequestId = 0;
const customerPackages = ref<CustomerPackageDetail[]>([]);
const exporting = ref(false);
const exportPending = ref(false);
const exportRetryAvailable = ref(false);
const pendingExport = ref<{ executionId: string; format: 'csv' } | null>(null);
const error = ref('');
const success = ref('');
const report = ref<AdministrativeReportsResponse | null>(null);
const auditEvents = ref<AuditEventSummary[]>([]);
const services = ref<RegisterServicesReportRow[]>([]);
const owners = ref<RegisterOwnersReportRow[]>([]);
const patients = ref<RegisterPatientsReportRow[]>([]);
const suppliers = ref<SupplierReportRow[]>([]);
const financialPayables = ref<FinancialPayableReportRow[]>([]);
const financialReceivables = ref<FinancialReceivableReportRow[]>([]);
const appointmentReportExecution = ref<ReportExecutionDetail | null>(null);
const professionalCareReportExecution = ref<ReportExecutionDetail | null>(null);
const chequeReportExecution = ref<ReportExecutionDetail | null>(null);
const advancePaymentReportExecution = ref<ReportExecutionDetail | null>(null);
const cancellationReports = useCancellationReports({ formatCurrency, formatDateTime });
const { view: cancellationReportView } = cancellationReports;
let cancellationReportRequestId = 0;
const serviceInvoiceReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryProductReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryStockReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryMovementReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryInvoiceReportExecution = ref<ReportExecutionDetail | null>(null);
const activeServerExecution = ref<ReportExecutionDetail | null>(null);
const REPORT_FILTER_KEYS = [
  'dateFrom',
  'dateTo',
  'search',
  'status',
  'client',
  'user',
  'action',
  'type'
] as const;
const filters = ref(readReportFiltersFromUrl());

const APPOINTMENT_AUDIT_ENTITY_TYPES = [
  'appointment',
  'appointment-recommendation',
  'appointment-sync'
];

const money = (value: number | undefined | null) => value == null || !Number.isFinite(value) ? '—' : formatCurrency(value);
const count = (value: number | undefined | null) => String(value ?? 0);

const financialPayableColumns: DataTableColumn[] = [
  { key: 'supplierName', label: 'Fornecedor' },
  { key: 'description', label: 'Descrição' },
  { key: 'category', label: 'Categoria' },
  { key: 'issuedAt', label: 'Emissão' },
  { key: 'dueAt', label: 'Vencimento' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'paidAmount', label: 'Pago' },
  { key: 'outstandingAmount', label: 'A Pagar' },
  { key: 'status', label: 'Status' },
  { key: 'paymentMethod', label: 'Método' },
  { key: 'reconciliationStatus', label: 'Reconciliação' }
];

const financialReceivableColumns: DataTableColumn[] = [
  { key: 'patientName', label: 'Paciente' },
  { key: 'ownerName', label: 'Nome do tutor' },
  { key: 'patientSpecies', label: 'Espécie' },
  { key: 'encounterId', label: 'Atendimento' },
  { key: 'installmentNumber', label: 'Parcela' },
  { key: 'installmentLabel', label: 'Descrição da parcela' },
  { key: 'issuedAt', label: 'Emissão' },
  { key: 'dueAt', label: 'Vencimento' },
  { key: 'settledAt', label: 'Liquidação' },
  { key: 'amountOriginal', label: 'Original' },
  { key: 'amountPaid', label: 'Recebido' },
  { key: 'amountOutstanding', label: 'Saldo' },
  { key: 'status', label: 'Status' },
  { key: 'financialStatus', label: 'Status financeiro' },
  { key: 'encounterStatus', label: 'Atendimento' },
  { key: 'paymentCount', label: 'Pagamentos' }
];

const chequeReportColumns: DataTableColumn[] = [
  { key: 'paymentId', label: 'Pagamento' },
  { key: 'saleNumber', label: 'Comanda' },
  { key: 'saleStatus', label: 'Status da comanda' },
  { key: 'counterSaleId', label: 'ID da comanda' },
  { key: 'reference', label: 'Referência' },
  { key: 'amount', label: 'Valor' },
  { key: 'installments', label: 'Parcelas' },
  { key: 'recordedAt', label: 'Registrado em' },
  { key: 'notes', label: 'Observações' }
];

const advancePaymentReportColumns: DataTableColumn[] = [
  { key: 'paymentId', label: 'Pagamento' },
  { key: 'ownerName', label: 'Tutor' },
  { key: 'documentId', label: 'Documento' },
  { key: 'issuedAt', label: 'Emitido em' },
  { key: 'originalAmount', label: 'Original' },
  { key: 'compensatedAmount', label: 'Compensado' },
  { key: 'balance', label: 'Saldo' },
  { key: 'origin', label: 'Origem' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Observações' }
];

const specs: Record<ReportKey, ReportSpec> = createReportSpecs({
  count,
  money,
  financialPayableColumns,
  financialReceivableColumns,
  chequeReportColumns,
  advancePaymentReportColumns,
  receivableSpec,
  accountsPayableReportSpec,
  paidAccountsReportSpec,
  chequesReportSpec,
  advancePaymentsReportSpec,
  salesCounterSalesReportSpec,
  producedItemsReportSpec,
  productionReportSpec,
  appointmentsReportSpec,
  professionalCareReportSpec,
  serviceInvoicesReportSpec,
  registerServicesReportSpec,
  registerOwnersReportSpec,
  registerPatientsReportSpec,
  registerSuppliersReportSpec,
  cancellationSnapshotSpec: cancellationReports.snapshotSpec,
  inventoryStockReportSpec,
  inventoryMovementsReportSpec,
  inventoryInvoicesReportSpec,
  inventoryProductsReportSpec
});

const spec = computed(() =>
  props.reportKey === 'deleted-sales-counter-sales'
    ? cancellationReports.spec.value
    : specs[props.reportKey]
);
const reportFiltersChanged = computed(() =>
  Boolean(
    spec.value.serverReportId &&
      reportReady.value &&
      appliedServerFilters.value !== JSON.stringify(buildServerReportFilters())
  )
);
const serverFiltersChanged = computed(() =>
  Boolean(
    activeServerExecution.value && reportFiltersChanged.value
  )
);
const reportSubtitle = computed(() => (props.reportKey === 'accounts-payable' ? 'Títulos registrados, em todas as situações.' : spec.value.subtitle)
  .replace(/Relatório (financeiro )?legacy (de |do |da )?/gi, '')
  .replace(/Relatório Vetus-like de /g, '').replace(/Relatório server-backed do catálogo persistido de /g, 'Catálogo de ')
  .replace(/Ledger server-backed de /g, 'Registro de '));
const reportNote = computed(() => {
  const notes: Partial<Record<ReportKey, string>> = {
    'audit-appointments': 'A consulta inclui até 200 eventos de agenda retornados. Os totais e o CSV se referem a esse conjunto, filtrado nesta tela.',
    'cash-drawer': 'Gavetas retornadas na consulta. Um saldo não informado aparece como —.',
    'cash-flow': 'Indicadores consolidados do período consultado. Esta visão não apresenta uma série cronológica de entradas e saídas. Saldo não informado aparece como —.',
    'accounts-payable': 'Títulos de todas as situações. O período filtra a data de vencimento.',
    'paid-accounts': 'Títulos pagos. O período filtra a data de vencimento, não a data de pagamento.',
    'accounts-receivable': 'Recebíveis abertos. O período considera o vencimento; quando ausente, a data de emissão.',
    'received-accounts': 'Recebíveis liquidados. O período considera a liquidação; quando ausente, a data de emissão.',
    'cheques': 'Pagamentos registrados como cheque e suas comandas. O período considera a data de registro. Dados de vencimento, banco e devolução não são inferidos.',
    'advance-payments': 'Adiantamentos e alocações registrados. O saldo representa o valor ainda disponível para compensação.',
    'sales-counter-sales': 'Indicadores comerciais consolidados da consulta.',
    'produced-items': 'Lista limitada a até 5 produtos e 5 serviços em destaque. As quantidades e receitas pertencem aos itens listados; os indicadores comerciais abrangem as vendas fechadas.',
    'production': 'Valores e contagens de vendas fechadas. As linhas de produtos e serviços somam somente os destaques retornados, até 5 de cada tipo.',
    'appointments': 'Agendamentos por período, texto e situação. A consulta e a exportação ficam registradas.',
    'professional-care': 'Atendimentos agrupados por profissional. Estes indicadores não calculam comissão.',
    'service-invoices': 'Documentos NFS-e registrados, consultados por competência.',
    'register-services': 'Serviços e preços registrados no catálogo.',
    'register-owners': 'Clientes e contatos cadastrados.',
    'register-patients': 'Animais e informações cadastrais.',
    'register-suppliers': 'Fornecedores e despesas do catálogo operacional. Informações fiscais ou contatos ausentes não são inferidos.',
    'inventory-stock': 'Posição atual do estoque e sinal de reposição. O valor operacional não representa uma avaliação histórica.',
    'inventory-movements': 'Movimentações de estoque registradas, com produto, unidade e referências operacionais.',
    'inventory-invoices': 'Compras e recebimentos registrados. A referência informada na compra não é documento fiscal.',
    'deleted-sales-counter-sales': isCancellationHistoryReport.value ? spec.value.note! : 'Comandas atualmente canceladas. O período considera a data de abertura (UTC), não a data de cancelamento. Responsável, motivo e instante do cancelamento não estão disponíveis nesta visão.',
    'inventory-products': 'Produtos cadastrados e seus saldos atuais. Não representa uma avaliação histórica do estoque.'
  };
  return notes[props.reportKey] ?? spec.value.note ?? '';
});
const isAuditAppointments = computed(() => props.reportKey === 'audit-appointments');
const isAppointmentsReport = computed(() => props.reportKey === 'appointments');
const isProfessionalCareReport = computed(() => props.reportKey === 'professional-care');
const isAccountsReceivableReport = computed(() => props.reportKey === 'accounts-receivable');
const isReceivedAccountsReport = computed(() => props.reportKey === 'received-accounts');
const isAccountsPayableReport = computed(() => props.reportKey === 'accounts-payable');
const isPaidAccountsReport = computed(() => props.reportKey === 'paid-accounts');
const isChequesReport = computed(() => props.reportKey === 'cheques');
const isAdvancePaymentsReport = computed(() => props.reportKey === 'advance-payments');
const isServiceInvoicesReport = computed(() => props.reportKey === 'service-invoices');
const isRegisterServicesReport = computed(() => props.reportKey === 'register-services');
const isRegisterOwnersReport = computed(() => props.reportKey === 'register-owners');
const isRegisterPatientsReport = computed(() => props.reportKey === 'register-patients');
const isRegisterSuppliersReport = computed(() => props.reportKey === 'register-suppliers');
const isDeletedSalesCounterSalesReport = computed(
  () => props.reportKey === 'deleted-sales-counter-sales'
);
const isCancellationHistoryReport = computed(
  () => isDeletedSalesCounterSalesReport.value && cancellationReportView.value === 'history'
);
const inventoryPeriodSubject = computed(() =>
  ['inventory-stock', 'inventory-products'].includes(props.reportKey) ? 'Cadastros'
    : props.reportKey === 'inventory-invoices' ? 'Compras'
      : props.reportKey === 'inventory-movements' ? 'Movimentações' : null
);
const inventoryPeriodHint = computed(() =>
  ['inventory-stock', 'inventory-products'].includes(props.reportKey)
    ? 'Data de cadastro dos produtos (UTC). Os saldos mostrados são atuais.'
    : props.reportKey === 'inventory-invoices' ? 'Data de criação da compra, independentemente do recebimento.'
      : props.reportKey === 'inventory-movements' ? 'Data de registro da movimentação.' : null
);
const dateFromLabel = computed(() =>
  inventoryPeriodSubject.value ? `${inventoryPeriodSubject.value} de` :
  isFinancialPayablesReport.value ? 'Vencimentos de' : props.reportKey === 'packages' ? 'Inícios de' : isDeletedSalesCounterSalesReport.value
    ? isCancellationHistoryReport.value
      ? 'Cancelamentos de (UTC)'
      : 'Aberturas de (UTC)'
    : isAuditAppointments.value
      ? 'Data início'
      : 'De'
);
const dateToLabel = computed(() =>
  inventoryPeriodSubject.value ? `${inventoryPeriodSubject.value} até` :
  isFinancialPayablesReport.value ? 'Vencimentos até' : props.reportKey === 'packages' ? 'Inícios até' : isDeletedSalesCounterSalesReport.value
    ? isCancellationHistoryReport.value
      ? 'Cancelamentos até (UTC)'
      : 'Aberturas até (UTC)'
    : isAuditAppointments.value
      ? 'Data fim'
      : 'Até'
);
const isInventoryStockReport = computed(() => props.reportKey === 'inventory-stock');
const isInventoryMovementsReport = computed(() => props.reportKey === 'inventory-movements');
const isInventoryInvoicesReport = computed(() => props.reportKey === 'inventory-invoices');
const isInventoryProductsReport = computed(() => props.reportKey === 'inventory-products');
const isFinancialPayablesReport = computed(
  () => isAccountsPayableReport.value || isPaidAccountsReport.value
);
const isFinancialReceivablesReport = computed(
  () => isAccountsReceivableReport.value || isReceivedAccountsReport.value
);
const filteredAuditEvents = computed(() =>
  auditEvents.value.filter((event) => matchesAuditFilters(event))
);
const auditActionOptions = computed(() =>
  uniqueSorted(auditEvents.value.map((event) => event.action))
);
const auditTypeOptions = computed(() =>
  uniqueSorted(auditEvents.value.map((event) => event.entityType))
);
// Financial rows come from the same server-side execution used by export.
// Keeping these computed values as identity projections prevents a second,
// client-local filter from diverging from the persisted report snapshot.
const filteredFinancialPayables = computed(() => financialPayables.value);
const filteredFinancialReceivables = computed(() => financialReceivables.value);
const chequeReportRows = computed<ChequeReportRow[]>(() =>
  (chequeReportExecution.value?.rows ?? []).filter(isChequeReportRow)
);
const filteredChequeReportRows = computed(() => chequeReportRows.value);
const advancePaymentReportRows = computed<AdvancePaymentReportRow[]>(() =>
  (advancePaymentReportExecution.value?.rows ?? []).filter(isAdvancePaymentReportRow)
);
const serviceInvoiceReportRows = computed<ServiceInvoiceReportRow[]>(() =>
  (serviceInvoiceReportExecution.value?.rows ?? []).filter(isServiceInvoiceReportRow)
);
const serviceInvoiceReportCards = computed<ReportCard[]>(() => {
  const source = serviceInvoiceReportRows.value;
  return [
    { label: 'NFS-e carregadas', value: count(source.length), icon: '🧾' },
    {
      label: 'Documentos emitidos',
      value: count(source.filter((row) => row.status === 'issued').length),
      icon: '✅'
    },
    {
      label: 'Serviços registrados',
      value: count(source.reduce((total, row) => total + row.serviceQuantity, 0)),
      icon: '🛠️'
    },
    {
      label: 'Total documentado',
      value: money(source.reduce((total, row) => total + row.totalDocument, 0)),
      icon: '💰'
    }
  ];
});
const serviceInvoiceReportTableRows = computed<DataTableRow[]>(() =>
  serviceInvoiceReportRows.value.map((row) => ({
    ...row,
    id: row.documentId,
    status: serviceInvoiceStatusLabel(row.status)
  }))
);
const advancePaymentReportCards = computed<ReportCard[]>(() => {
  const source = advancePaymentReportRows.value;
  return [
    { label: 'Pagamentos carregados', value: count(source.length), icon: '⏩' },
    {
      label: 'Valor original',
      value: money(source.reduce((total, payment) => total + payment.originalAmount, 0)),
      icon: '💰'
    },
    {
      label: 'Compensado',
      value: money(source.reduce((total, payment) => total + payment.compensatedAmount, 0)),
      icon: '✅'
    },
    {
      label: 'Saldo disponível',
      value: money(source.reduce((total, payment) => total + payment.balance, 0)),
      icon: '💵'
    }
  ];
});
const advancePaymentReportTableRows = computed<DataTableRow[]>(() =>
  advancePaymentReportRows.value.map((row) => ({ ...row, id: row.paymentId }))
);
const financialPayableReportCards = computed<ReportCard[]>(() => {
  const source = filteredFinancialPayables.value;
  return [
    {
      label: isPaidAccountsReport.value ? 'Contas pagas carregadas' : 'Títulos carregados',
      value: count(source.length),
      icon: isPaidAccountsReport.value ? '✅' : '💸'
    },
    {
      label: 'Total',
      value: money(source.reduce((total, payable) => total + payable.totalAmount, 0)),
      icon: '💰'
    },
    {
      label: 'Pago',
      value: money(source.reduce((total, payable) => total + payable.paidAmount, 0)),
      icon: '✅'
    },
    {
      label: 'A pagar',
      value: money(source.reduce((total, payable) => total + payable.outstandingAmount, 0)),
      icon: '⏳'
    }
  ];
});
const financialPayableReportRows = computed<DataTableRow[]>(() =>
  filteredFinancialPayables.value.map((payable) => ({ ...payable, id: payable.id }))
);
const financialReceivableReportCards = computed<ReportCard[]>(() => {
  const source = filteredFinancialReceivables.value;
  return [
    {
      label: isReceivedAccountsReport.value ? 'Contas recebidas' : 'Recebíveis em aberto',
      value: count(source.length),
      icon: isReceivedAccountsReport.value ? '✅' : '💵'
    },
    {
      label: 'Original',
      value: money(source.reduce((total, receivable) => total + receivable.amountOriginal, 0)),
      icon: '🧾'
    },
    {
      label: 'Recebido',
      value: money(source.reduce((total, receivable) => total + receivable.amountPaid, 0)),
      icon: '💸'
    },
    {
      label: 'Saldo',
      value: money(source.reduce((total, receivable) => total + receivable.amountOutstanding, 0)),
      icon: '⏳'
    }
  ];
});
const financialReceivableReportRows = computed<DataTableRow[]>(() =>
  filteredFinancialReceivables.value.map((receivable) => ({ ...receivable, id: receivable.id }))
);
const chequeReportCards = computed<ReportCard[]>(() => {
  const source = filteredChequeReportRows.value;
  return [
    { label: 'Cheques carregados', value: count(source.length), icon: '📄' },
    {
      label: 'Valor total',
      value: money(source.reduce((total, cheque) => total + cheque.amount, 0)),
      icon: '💰'
    },
    {
      label: 'Parcelas registradas',
      value: count(source.reduce((total, cheque) => total + cheque.installments, 0)),
      icon: '🔢'
    },
    {
      label: 'Comandas relacionadas',
      value: count(new Set(source.map((cheque) => cheque.counterSaleId)).size),
      icon: '🧾'
    }
  ];
});
const chequeReportTableRows = computed<DataTableRow[]>(() =>
  filteredChequeReportRows.value.map((row) => ({
    ...row,
    id: row.paymentId,
    saleStatus: counterSaleStatusLabel(row.saleStatus)
  }))
);
const cards = computed(() => {
  if (!reportReady.value) return [];
  if (props.reportKey === 'packages') return [{label:'Pacotes na consulta',value:count(packageRows.value.length),icon:'📦'}];
  if (isAuditAppointments.value) return auditAppointmentCards.value;
  if (isAppointmentsReport.value) return appointmentReportCards.value;
  if (isProfessionalCareReport.value) return professionalCareReportCards.value;
  if (isFinancialReceivablesReport.value) return financialReceivableReportCards.value;
  if (isFinancialPayablesReport.value) return financialPayableReportCards.value;
  if (isChequesReport.value) return chequeReportCards.value;
  if (isAdvancePaymentsReport.value) return advancePaymentReportCards.value;
  if (isServiceInvoicesReport.value) return serviceInvoiceReportCards.value;
  if (isRegisterServicesReport.value) return registerServicesReportCards.value;
  if (isRegisterOwnersReport.value) return registerOwnersReportCards.value;
  if (isRegisterPatientsReport.value) return registerPatientsReportCards.value;
  if (isRegisterSuppliersReport.value) return registerSuppliersReportCards.value;
  if (isDeletedSalesCounterSalesReport.value) return cancellationReports.cards.value;
  if (isInventoryStockReport.value) return inventoryStockReportCards.value;
  if (isInventoryMovementsReport.value) return inventoryMovementsReportCards.value;
  if (isInventoryInvoicesReport.value) return inventoryInvoicesReportCards.value;
  if (isInventoryProductsReport.value) return inventoryProductsReportCards.value;
  return spec.value.cards(report.value);
});
const packageRows = computed<DataTableRow[]>(() => customerPackages.value.filter(p => {
  const day = p.startsAt.slice(0, 10);
  return (!filters.value.dateFrom || day >= filters.value.dateFrom) && (!filters.value.dateTo || day <= filters.value.dateTo);
}).map(p => ({id:p.id, number:p.number,
  packageStatus: ({draft:'Rascunho',active:'Ativo',expired:'Expirado',cancelled:'Cancelado',completed:'Concluído'} as Record<string,string>)[p.status] ?? p.status,
  startsAt: formatDateTime(p.startsAt), itemCount:p.items.length,
  remainingQuantity:p.balance.reduce((sum,item)=>sum+item.quantityAvailable,0)
})));
const rows = computed(() => {
  if (!reportReady.value) return [];
  if (props.reportKey === 'packages') return packageRows.value;
  if (isAuditAppointments.value) return auditAppointmentRows.value;
  if (isAppointmentsReport.value) return appointmentReportRows.value;
  if (isProfessionalCareReport.value) return professionalCareReportRows.value;
  if (isFinancialReceivablesReport.value) return financialReceivableReportRows.value;
  if (isFinancialPayablesReport.value) return financialPayableReportRows.value;
  if (isChequesReport.value) return chequeReportTableRows.value;
  if (isAdvancePaymentsReport.value) return advancePaymentReportTableRows.value;
  if (isServiceInvoicesReport.value) return serviceInvoiceReportTableRows.value;
  if (isRegisterServicesReport.value) return registerServicesReportRows.value;
  if (isRegisterOwnersReport.value) return registerOwnersReportRows.value;
  if (isRegisterPatientsReport.value) return registerPatientsReportRows.value;
  if (isRegisterSuppliersReport.value) return registerSuppliersReportRows.value;
  if (isDeletedSalesCounterSalesReport.value) return cancellationReports.rows.value;
  if (isInventoryStockReport.value) return inventoryStockReportRows.value;
  if (isInventoryMovementsReport.value) return inventoryMovementsReportRows.value;
  if (isInventoryInvoicesReport.value) return inventoryInvoicesReportRows.value;
  if (isInventoryProductsReport.value) return inventoryProductsReportRows.value;
  return spec.value.rows(report.value);
});
const reportHasActiveFilters = computed(() =>
  REPORT_FILTER_KEYS.some((key) => filters.value[key].trim().length > 0)
);
const auditAppointmentCards = computed<ReportCard[]>(() => [
  { label: 'Eventos de agenda', value: count(filteredAuditEvents.value.length), icon: '📅' },
  {
    label: 'Ações distintas',
    value: count(new Set(filteredAuditEvents.value.map((event) => event.action)).size),
    icon: '🧾'
  },
  {
    label: 'Usuários envolvidos',
    value: count(new Set(filteredAuditEvents.value.map((event) => event.actorId)).size),
    icon: '👤'
  }
]);
const auditAppointmentRows = computed<DataTableRow[]>(
  () =>
    filteredAuditEvents.value.map((event) => ({
      ...event,
      id: event.eventId
    })) as unknown as DataTableRow[]
);
const appointmentReportRowsData = computed<AppointmentReportRow[]>(() =>
  (appointmentReportExecution.value?.rows ?? []).filter(isAppointmentReportRow)
);
const appointmentReportCards = computed<ReportCard[]>(() => {
  const source = appointmentReportRowsData.value;
  return [
    { label: 'Agendamentos', value: count(source.length), icon: '📅' },
    {
      label: 'Comparecimentos',
      value: count(source.filter((row) => ['checked_in', 'completed'].includes(row.status)).length),
      icon: '✅'
    },
    {
      label: 'Cancelamentos',
      value: count(source.filter((row) => row.status === 'cancelled').length),
      icon: '🚫'
    }
  ];
});
const appointmentReportRows = computed<DataTableRow[]>(
  () =>
    appointmentReportRowsData.value.map((appointment) => ({
      id: appointment.appointmentId,
      scheduledAt: appointment.scheduledAt,
      status: appointmentStatusLabel(appointment.status),
      reason: appointment.reason,
      practitioner: appointment.practitionerStaffId || 'Sem profissional',
      service: appointment.serviceId || 'Sem serviço',
      unit: appointment.unit || 'Sem unidade'
    })) as DataTableRow[]
);
const professionalCareReportRowsData = computed<ProfessionalCareReportRow[]>(() =>
  (professionalCareReportExecution.value?.rows ?? []).filter(isProfessionalCareReportRow)
);
const professionalCareReportRows = computed<DataTableRow[]>(() =>
  professionalCareReportRowsData.value.map((row) => ({
    id: row.professional,
    professional: row.professional,
    scheduled: row.scheduled,
    completed: row.completed,
    checkedIn: row.checkedIn,
    cancelled: row.cancelled,
    services: row.services
  }))
);
const professionalCareReportCards = computed<ReportCard[]>(() => {
  const source = professionalCareReportRowsData.value;
  return [
    { label: 'Profissionais atendendo', value: count(source.length), icon: '🩺' },
    {
      label: 'Atendimentos executados',
      value: count(source.reduce((total, row) => total + row.completed, 0)),
      icon: '✅'
    },
    {
      label: 'Agendamentos no período',
      value: count(source.reduce((total, row) => total + row.scheduled, 0)),
      icon: '📅'
    }
  ];
});
const registerServicesReportRows = computed<DataTableRow[]>(
  () =>
    services.value.map((service, index) => ({
      ...service,
      id: `${service.code || service.name}-${index}`,
      code: service.code || 'Sem código',
      description: service.description || 'Sem descrição',
      status: service.status === 'active' ? 'Ativo' : 'Inativo'
    })) as DataTableRow[]
);
const registerServicesReportCards = computed<ReportCard[]>(() => {
  const activeCount = services.value.filter((service) => service.status === 'active').length;
  const inactiveCount = services.value.length - activeCount;
  const averagePrice = services.value.length
    ? services.value.reduce((total, service) => total + service.basePrice, 0) /
      services.value.length
    : 0;
  return [
    { label: 'Serviços cadastrados', value: count(services.value.length), icon: '🛠️' },
    { label: 'Serviços ativos', value: count(activeCount), icon: '✅' },
    { label: 'Preço médio', value: money(averagePrice), icon: '💰' },
    { label: 'Inativos', value: count(inactiveCount), icon: '📋' }
  ];
});
const registerOwnersReportRows = computed<DataTableRow[]>(
  () =>
    owners.value.map((owner, index) => ({
      id: `${owner.fullName}-${index}`,
      documentId: owner.documentId || 'Sem documento',
      fullName: owner.fullName,
      primaryContact: owner.primaryContact || 'Sem contato',
      city: owner.city || 'Sem cidade',
      financialResponsible: owner.financialResponsible,
      status: owner.status === 'active' ? 'Ativo' : 'Inativo',
      createdAt: owner.createdAt
    })) as DataTableRow[]
);
const registerOwnersReportCards = computed<ReportCard[]>(() => {
  const activeCount = owners.value.filter((owner) => owner.status === 'active').length;
  const financialResponsibleCount = owners.value.filter(
    (owner) => owner.financialResponsible === 'Sim'
  ).length;
  const withContactCount = owners.value.filter(
    (owner) => owner.primaryContact.trim().length > 0 && owner.primaryContact !== 'Sem contato'
  ).length;
  return [
    { label: 'Clientes cadastrados', value: count(owners.value.length), icon: '👤' },
    { label: 'Clientes ativos', value: count(activeCount), icon: '✅' },
    { label: 'Responsáveis financeiros', value: count(financialResponsibleCount), icon: '💵' },
    { label: 'Com contato', value: count(withContactCount), icon: '📞' }
  ];
});
const registerPatientsReportRows = computed<DataTableRow[]>(
  () =>
    patients.value.map((patient, index) => ({
      id: `${patient.code || patient.name}-${index}`,
      code: patient.code || 'Sem código',
      name: patient.name,
      species: speciesLabel(patient.species),
      breed: patient.breed || 'Sem raça',
      sex: sexLabel(patient.sex),
      microchip: patient.microchip || 'Sem chip',
      status: patientStatusLabel(patient.status),
      createdAt: patient.createdAt
    })) as DataTableRow[]
);
const registerPatientsReportCards = computed<ReportCard[]>(() => {
  const activeCount = patients.value.filter((patient) => patient.status === 'active').length;
  const deceasedCount = patients.value.filter((patient) => patient.status === 'deceased').length;
  const withMicrochipCount = patients.value.filter((patient) => Boolean(patient.microchip)).length;
  return [
    { label: 'Animais cadastrados', value: count(patients.value.length), icon: '🐾' },
    { label: 'Animais ativos', value: count(activeCount), icon: '✅' },
    { label: 'Falecidos', value: count(deceasedCount), icon: '✚' },
    { label: 'Com microchip', value: count(withMicrochipCount), icon: '🏷️' }
  ];
});
const registerSuppliersReportRows = computed<DataTableRow[]>(
  () =>
    suppliers.value.map((supplier) => ({
      id: supplier.code,
      code: supplier.code,
      name: supplier.name,
      category: supplier.category || 'Sem categoria',
      kind: supplier.kind || 'Sem tipo',
      costCenter: supplier.costCenterName
        ? `${supplier.costCenterName} · ${supplier.costCenterCode}`
        : supplier.costCenterCode || 'Sem centro de custo',
      description: supplier.description.trim() || 'Sem descrição'
    })) as DataTableRow[]
);
const registerSuppliersReportCards = computed<ReportCard[]>(() => {
  const supplierCount = suppliers.value.filter((supplier) =>
    normalizeText(supplier.category).includes('fornecedor')
  ).length;
  const expenseCount = suppliers.value.filter((supplier) =>
    normalizeText(supplier.category).includes('despesa')
  ).length;
  const withDescriptionCount = suppliers.value.filter((supplier) =>
    supplier.description.trim()
  ).length;
  return [
    { label: 'Registros cadastrados', value: count(suppliers.value.length), icon: '📦' },
    { label: 'Fornecedores', value: count(supplierCount), icon: '🚚' },
    { label: 'Despesas', value: count(expenseCount), icon: '🧾' },
    { label: 'Com descrição', value: count(withDescriptionCount), icon: '📝' }
  ];
});
const inventoryStockReportRows = computed<DataTableRow[]>(() =>
  (inventoryStockReportExecution.value?.rows ?? [])
    .filter(isInventoryStockReportRow)
    .map((row) => ({
      ...row,
      id: row.sku,
      reorderStatus: row.reorderStatus === 'below_reorder_level' ? 'Abaixo do mínimo' : 'Adequado'
    }))
);
const inventoryStockReportCards = computed<ReportCard[]>(() => {
  const stockRows = (inventoryStockReportExecution.value?.rows ?? []).filter(
    isInventoryStockReportRow
  );
  const stockValue = stockRows.reduce((total, row) => total + row.stockValue, 0);
  const belowReorderCount = stockRows.filter(
    (row) => row.reorderStatus === 'below_reorder_level'
  ).length;
  const adequateCount = stockRows.filter((row) => row.reorderStatus === 'adequate').length;
  return [
    { label: 'Itens em estoque', value: count(stockRows.length), icon: '📦' },
    { label: 'Valor em estoque', value: money(stockValue), icon: '💰' },
    { label: 'Abaixo do mínimo', value: count(belowReorderCount), icon: '⚠️' },
    { label: 'Itens adequados', value: count(adequateCount), icon: '✅' }
  ];
});
const inventoryMovementReportRows = computed<InventoryMovementReportRow[]>(() =>
  (inventoryMovementReportExecution.value?.rows ?? []).filter(isInventoryMovementReportRow)
);
const inventoryMovementsReportRows = computed<DataTableRow[]>(() =>
  inventoryMovementReportRows.value.map((row) => ({
    ...row,
    id: row.movementId,
    movementType: inventoryMovementTypeLabel(row.movementType),
    reference: row.reference || 'Sem referência'
  }))
);
const inventoryMovementsReportCards = computed<ReportCard[]>(() => {
  const movementRows = inventoryMovementReportRows.value;
  const inputCount = movementRows.filter((row) => row.movementType === 'inbound').length;
  const outputCount = movementRows.filter(
    (row) => row.movementType === 'outbound' || row.movementType === 'consumption'
  ).length;
  const movedValue = movementRows.reduce(
    (total, row) => total + Math.abs(row.quantityDelta) * row.unitCostAmount,
    0
  );
  return [
    { label: 'Movimentações registradas', value: count(movementRows.length), icon: '📥' },
    { label: 'Entradas', value: count(inputCount), icon: '📦' },
    { label: 'Saídas/consumos', value: count(outputCount), icon: '↘' },
    { label: 'Valor movimentado', value: money(movedValue), icon: '💰' }
  ];
});
const inventoryInvoiceReportRows = computed<InventoryPurchaseReportRow[]>(() =>
  (inventoryInvoiceReportExecution.value?.rows ?? []).filter(isInventoryPurchaseReportRow)
);
const inventoryInvoicesReportRows = computed<DataTableRow[]>(() =>
  inventoryInvoiceReportRows.value.map((row) => ({
    ...row,
    id: row.purchaseId,
    status: inventoryPurchaseStatusLabel(row.status)
  }))
);
const inventoryInvoicesReportCards = computed<ReportCard[]>(() => {
  const invoiceRows = inventoryInvoiceReportRows.value;
  const suppliers = new Set(invoiceRows.map((row) => row.supplierName).filter(Boolean));
  const receivedCount = invoiceRows.filter((row) => row.status === 'received').length;
  const totalValue = invoiceRows.reduce((total, row) => total + row.totalAmount, 0);
  const receivedValue = invoiceRows.reduce((total, row) => total + row.receivedAmount, 0);
  return [
    { label: 'Compras com referência de NF', value: count(invoiceRows.length), icon: '🧾' },
    { label: 'Fornecedores', value: count(suppliers.size), icon: '🚚' },
    { label: 'Valor comprado', value: money(totalValue), icon: '💰' },
    { label: 'Valor recebido', value: money(receivedValue), icon: '✅' },
    { label: 'Compras recebidas', value: count(receivedCount), icon: '📦' }
  ];
});
const inventoryProductReportRows = computed<InventoryProductReportRow[]>(() =>
  (inventoryProductReportExecution.value?.rows ?? []).filter(isInventoryProductReportRow)
);
const inventoryProductsReportRows = computed<DataTableRow[]>(() =>
  inventoryProductReportRows.value.map((row) => ({
    ...row,
    id: row.sku
  }))
);
const inventoryProductsReportCards = computed<ReportCard[]>(() => {
  const productRows = inventoryProductReportRows.value;
  const stockedCount = productRows.filter((row) => row.onHandQuantity > 0).length;
  const belowReorderCount = productRows.filter(
    (row) => row.onHandQuantity <= row.reorderLevel
  ).length;
  return [
    { label: 'Produtos cadastrados', value: count(productRows.length), icon: '🏷️' },
    { label: 'Com saldo', value: count(stockedCount), icon: '📦' },
    { label: 'Abaixo do mínimo', value: count(belowReorderCount), icon: '⚠️' }
  ];
});

async function loadReport() {
  const requestId = ++reportRequestId;
  const requestedFilters = JSON.stringify(buildServerReportFilters());
  persistReportFiltersInUrl();
  reportReady.value = false;
  loadFailed.value = false;
  activeServerExecution.value = null;
  if (props.reportKey === 'dre') { loading.value = false; error.value = ''; return; }
  async function current<T>(pending: Promise<T>): Promise<T> {
    const result = await pending;
    if (requestId !== reportRequestId) throw new Error('Superseded report query');
    return result;
  }
  const cancellationRequestId = isDeletedSalesCounterSalesReport.value
    ? ++cancellationReportRequestId
    : null;
  loading.value = true;
  error.value = '';
  success.value = '';
  if (isAppointmentsReport.value) appointmentReportExecution.value = null;
  if (isProfessionalCareReport.value) professionalCareReportExecution.value = null;
  if (isChequesReport.value) chequeReportExecution.value = null;
  if (isAdvancePaymentsReport.value) advancePaymentReportExecution.value = null;
  if (isServiceInvoicesReport.value) serviceInvoiceReportExecution.value = null;
  if (isDeletedSalesCounterSalesReport.value) cancellationReports.reset();
  if (isInventoryProductsReport.value) inventoryProductReportExecution.value = null;
  if (isInventoryStockReport.value) inventoryStockReportExecution.value = null;
  if (isInventoryMovementsReport.value) inventoryMovementReportExecution.value = null;
  if (isInventoryInvoicesReport.value) inventoryInvoiceReportExecution.value = null;
  if (isRegisterServicesReport.value) services.value = [];
  if (isRegisterOwnersReport.value) owners.value = [];
  if (isRegisterPatientsReport.value) patients.value = [];
  if (isRegisterSuppliersReport.value) suppliers.value = [];
  try {
    if (props.reportKey === 'packages') {
      customerPackages.value = await current(packagesService.list());
    } else if (isAuditAppointments.value) {
      auditEvents.value = await current(auditService.listEvents({
        entityTypes: APPOINTMENT_AUDIT_ENTITY_TYPES,
        limit: 200
      }));
      report.value = null;
    } else if (isAppointmentsReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'scheduling-appointments',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isAppointmentReportRow(row))) {
        throw new Error('Resposta inválida do relatório de agendamentos');
      }
      appointmentReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isProfessionalCareReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'scheduling-professional-care',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isProfessionalCareReportRow(row))) {
        throw new Error('Resposta inválida do relatório por profissional');
      }
      professionalCareReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isFinancialReceivablesReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'financial-receivables',
        filters: buildServerReportFilters()
      }));
      const receivableRows = execution.rows.filter(isFinancialReceivableReportRow);
      if (receivableRows.length !== execution.rows.length) {
        throw new Error('Resposta inválida do relatório de contas a receber');
      }
      financialReceivables.value = receivableRows.map((row, index) => ({
        id: `${execution.id}:receivable:${index}`,
        patientName: row.patientName,
        ownerName: row.ownerName,
        patientSpecies: row.patientSpecies,
        encounterId: row.encounterId,
        installmentNumber: row.installmentNumber,
        installmentLabel: row.installmentLabel,
        issuedAt: row.issuedAt,
        dueAt: row.dueAt,
        settledAt: row.settledAt,
        amountOriginal: row.amountOriginal,
        amountPaid: row.amountPaid,
        amountOutstanding: row.amountOutstanding,
        status: row.status,
        financialStatus: row.financialStatus,
        encounterStatus: row.encounterStatus,
        paymentCount: row.paymentCount
      }));
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isFinancialPayablesReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'financial-payables',
        filters: buildServerReportFilters()
      }));
      const payableRows = execution.rows.filter(isFinancialPayableReportRow);
      if (payableRows.length !== execution.rows.length) {
        throw new Error('Resposta inválida do relatório de contas a pagar');
      }
      financialPayables.value = payableRows.map((row, index) => ({
        id: `${execution.id}:payable:${index}`,
        supplierName: row.supplierName,
        description: row.description,
        category: row.category,
        issuedAt: row.issuedAt,
        dueAt: row.dueAt,
        totalAmount: row.totalAmount,
        paidAmount: row.paidAmount,
        outstandingAmount: row.outstandingAmount,
        status: row.status,
        paymentMethod: row.paymentMethod,
        reconciliationStatus: row.reconciliationStatus
      }));
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isChequesReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'financial-cheques',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isChequeReportRow(row))) {
        throw new Error('Resposta inválida do relatório de cheques');
      }
      chequeReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isAdvancePaymentsReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'financial-advance-payments',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isAdvancePaymentReportRow(row))) {
        throw new Error('Resposta inválida do relatório de pagamentos antecipados');
      }
      advancePaymentReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isServiceInvoicesReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'fiscal-service-invoices',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isServiceInvoiceReportRow(row))) {
        throw new Error('Resposta inválida do relatório de NF de serviços prestados');
      }
      serviceInvoiceReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isRegisterServicesReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'registration-services',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isRegisterServicesReportRow(row))) {
        throw new Error('Resposta inválida do relatório de serviços');
      }
      services.value = execution.rows.filter(isRegisterServicesReportRow);
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isRegisterOwnersReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'registration-owners',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isRegisterOwnersReportRow(row))) {
        throw new Error('Resposta inválida do relatório de clientes');
      }
      owners.value = execution.rows.filter(isRegisterOwnersReportRow);
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isRegisterPatientsReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'registration-patients',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isRegisterPatientsReportRow(row))) {
        throw new Error('Resposta inválida do relatório de animais');
      }
      patients.value = execution.rows.filter(isRegisterPatientsReportRow);
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isRegisterSuppliersReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'registration-suppliers',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isSupplierReportRow(row))) {
        throw new Error('Resposta inválida do relatório de fornecedores e despesas');
      }
      suppliers.value = execution.rows.filter(isSupplierReportRow);
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isDeletedSalesCounterSalesReport.value) {
      const isHistory = isCancellationHistoryReport.value;
      const execution = await current(reportsService.execute({
        reportId: isHistory ? 'commercial-cancellation-history' : 'commercial-deleted-sales',
        filters: buildServerReportFilters()
      }));
      if (cancellationRequestId !== cancellationReportRequestId) return;
      cancellationReports.acceptExecution(execution, isHistory ? 'history' : 'opening-date');
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isInventoryProductsReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'inventory-products',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isInventoryProductReportRow(row))) {
        throw new Error('Resposta inválida do relatório de produtos de estoque');
      }
      inventoryProductReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isInventoryStockReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'inventory-stock',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isInventoryStockReportRow(row))) {
        throw new Error('Resposta inválida do relatório de estoque');
      }
      inventoryStockReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isInventoryMovementsReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'inventory-movements',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isInventoryMovementReportRow(row))) {
        throw new Error('Resposta inválida do relatório de movimentações de estoque');
      }
      inventoryMovementReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else if (isInventoryInvoicesReport.value) {
      const execution = await current(reportsService.execute({
        reportId: 'inventory-invoices',
        filters: buildServerReportFilters()
      }));
      if (execution.rows.some((row) => !isInventoryPurchaseReportRow(row))) {
        throw new Error('Resposta inválida do relatório de entradas de compras');
      }
      inventoryInvoiceReportExecution.value = execution;
      activeServerExecution.value = execution;
      report.value = null;
    } else {
      report.value = await current(administrativeReportsService.getHubs({
        dateFrom: filters.value.dateFrom || undefined,
        dateTo: filters.value.dateTo || undefined
      }));
    }
    appliedServerFilters.value = requestedFilters;
    reportReady.value = true;
  } catch (err) {
    if (requestId === reportRequestId && (cancellationRequestId === null || cancellationRequestId === cancellationReportRequestId)) {
      loadFailed.value = true;
      error.value = err instanceof Error && /^(Resposta inválida|Falha ao executar|Não foi possível consultar)/.test(err.message)
        ? err.message : 'Não foi possível carregar o relatório. Tente novamente.';
    }
  } finally {
    if (requestId === reportRequestId && (cancellationRequestId === null || cancellationRequestId === cancellationReportRequestId)) {
      loading.value = false;
    }
  }
}

function changeCancellationReportView(value: string | number): void {
  if (value !== 'history' && value !== 'opening-date') return;
  cancellationReportView.value = value;
  void loadReport();
}

async function exportCurrentReport(): Promise<void> {
  if (
    !spec.value.exportable ||
    exporting.value ||
    exportPending.value ||
    loading.value ||
    loadFailed.value ||
    serverFiltersChanged.value ||
    !reportReady.value
  ) return;

  exporting.value = true;
  error.value = '';
  success.value = '';
  let attemptedExecutionId: string | null = null;

  try {
    if (spec.value.serverReportId) {
      const displayedExecution = activeServerExecution.value;
      if (
        displayedExecution &&
        (!displayedExecution.reportId || displayedExecution.reportId === spec.value.serverReportId)
      ) {
        attemptedExecutionId = displayedExecution.id;
        const exported = await withDownloadTimeout((signal) =>
          reportsService.exportExecution(displayedExecution.id, 'csv', {
            signal,
            idempotencyKey: reportExportIdempotencyKey(displayedExecution.id)
          })
        );
        saveBrowserDownload(exported);
        clearPendingExport();
        success.value = isCancellationHistoryReport.value
          ? `CSV gerado com ${displayedExecution.rowCount} cancelamento(s).`
          : `Exportação server-side auditada gerada com ${displayedExecution.rowCount} linha(s).`;
        return;
      }

      const { execution, exported } = await withDownloadTimeout(async (signal) => {
        const execution = await reportsService.execute({
          reportId: spec.value.serverReportId!,
          filters: buildServerReportFilters()
        }, { signal });
        attemptedExecutionId = execution.id;
        const exported = await reportsService.exportExecution(execution.id, 'csv', {
          signal,
          idempotencyKey: reportExportIdempotencyKey(execution.id)
        });
        return { execution, exported };
      });
      saveBrowserDownload(exported);
      clearPendingExport();
      success.value = isCancellationHistoryReport.value
        ? `CSV gerado com ${execution.rowCount} cancelamento(s).`
        : `Exportação server-side auditada gerada com ${execution.rowCount} linha(s).`;
      return;
    }

    const csv = buildReportCsv(spec.value.columns, rows.value);
    saveBrowserDownload({
      content: csv,
      contentType: 'text/csv;charset=utf-8',
      filename: buildReportFilename(spec.value.title)
    });
    success.value = `Exportação CSV gerada com ${rows.value.length} linha(s).`;
    clearPendingExport();
  } catch (err) {
    if (err instanceof DownloadTimeoutError) {
      const executionId = attemptedExecutionId ?? activeServerExecution.value?.id ?? null;
      if (executionId) {
        markPendingExport(executionId);
        error.value = 'A exportação pode ainda estar sendo processada. Verifique o artefato persistido antes de repetir.';
      } else {
        error.value = 'A exportação pode ainda estar sendo processada. Atualize o relatório para obter a execução e depois reconcilie o artefato.';
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Não foi possível exportar o relatório';
    }
  } finally {
    exporting.value = false;
  }
}

function reportExportIdempotencyKey(executionId: string): string {
  return `report-export:${executionId}:csv`;
}

function markPendingExport(executionId: string): void {
  pendingExport.value = { executionId, format: 'csv' };
  exportPending.value = true;
  exportRetryAvailable.value = false;
}

function clearPendingExport(): void {
  pendingExport.value = null;
  exportPending.value = false;
  exportRetryAvailable.value = false;
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

async function reconcilePendingExport(): Promise<void> {
  const pending = pendingExport.value;
  if (!pending || exporting.value) return;

  exporting.value = true;
  error.value = '';
  success.value = '';
  try {
    const exported = await withDownloadTimeout((signal) =>
      reportsService.getExecutionExport(pending.executionId, pending.format, { signal })
    );
    saveBrowserDownload(exported);
    success.value = 'Artefato de exportação reconciliado e baixado com segurança.';
    clearPendingExport();
  } catch (err) {
    if (isNotFoundError(err)) {
      exportRetryAvailable.value = true;
      error.value = 'O artefato ainda não está disponível. Se o processamento foi interrompido, repita usando a mesma chave idempotente.';
    } else if (err instanceof DownloadTimeoutError) {
      error.value = 'A verificação excedeu o tempo limite. O artefato pode estar pendente; tente verificar novamente.';
    } else {
      error.value = err instanceof Error ? err.message : 'Não foi possível verificar a exportação pendente';
    }
  } finally {
    exporting.value = false;
  }
}

async function retryPendingExport(): Promise<void> {
  const pending = pendingExport.value;
  if (!pending || exporting.value) return;

  exporting.value = true;
  error.value = '';
  success.value = '';
  try {
    const exported = await withDownloadTimeout((signal) =>
      reportsService.exportExecution(pending.executionId, pending.format, {
        signal,
        idempotencyKey: reportExportIdempotencyKey(pending.executionId)
      })
    );
    saveBrowserDownload(exported);
    success.value = 'Exportação reconciliada com a mesma chave idempotente.';
    clearPendingExport();
  } catch (err) {
    if (err instanceof DownloadTimeoutError) {
      error.value = 'A repetição ainda está em processamento. Verifique o artefato antes de tentar novamente.';
    } else {
      error.value = err instanceof Error ? err.message : 'Não foi possível repetir a exportação pendente';
    }
  } finally {
    exporting.value = false;
  }
}

function buildServerReportFilters(): Record<string, unknown> {
  return {
    ...(isAppointmentsReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isAppointmentsReport.value && filters.value.status ? { status: filters.value.status } : {}),
    ...(isAccountsReceivableReport.value ? { status: 'open' } : {}),
    ...(isReceivedAccountsReport.value ? { status: 'settled' } : {}),
    ...(isPaidAccountsReport.value ? { status: 'paid' } : {}),
    ...(isAdvancePaymentsReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isAdvancePaymentsReport.value && filters.value.status
      ? { status: filters.value.status }
      : {}),
    ...(isServiceInvoicesReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isServiceInvoicesReport.value && filters.value.status
      ? { status: filters.value.status }
      : {}),
    ...(isDeletedSalesCounterSalesReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isInventoryProductsReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isInventoryStockReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isInventoryMovementsReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isInventoryInvoicesReport.value && filters.value.search.trim()
      ? { search: filters.value.search.trim() }
      : {}),
    ...(isInventoryInvoicesReport.value && filters.value.status
      ? { status: filters.value.status }
      : {}),
    ...(filters.value.dateFrom ? { dateFrom: filters.value.dateFrom } : {}),
    ...(filters.value.dateTo ? { dateTo: filters.value.dateTo } : {})
  };
}

function buildReportFilename(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'relatorio'}-${date}.csv`;
}

function resetFilters() {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    search: '',
    status: '',
    client: '',
    user: '',
    action: '',
    type: ''
  };
  persistReportFiltersInUrl();
  void loadReport();
}

function readReportFiltersFromUrl() {
  const defaults = {
    dateFrom: '',
    dateTo: '',
    search: '',
    status: '',
    client: '',
    user: '',
    action: '',
    type: ''
  };
  if (typeof window === 'undefined' || !isReportRoutePath(window.location.pathname)) return defaults;
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    REPORT_FILTER_KEYS.map((key) => [key, params.get(key) ?? ''])
  ) as typeof defaults;
}

function persistReportFiltersInUrl(): void {
  if (
    typeof window === 'undefined' ||
    !isReportRoutePath(window.location.pathname) ||
    typeof window.history?.replaceState !== 'function'
  ) return;
  const params = new URLSearchParams(window.location.search);
  for (const key of REPORT_FILTER_KEYS) {
    const value = filters.value[key].trim();
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  const path = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', path);
}

function isReportRoutePath(pathname: string): boolean {
  return /^(?:\/reports|\/relatorios)(?:\/|$)/.test(pathname);
}

function matchesAuditFilters(event: AuditEventSummary): boolean {
  const clientNeedle = filters.value.client.trim().toLowerCase();
  const userNeedle = filters.value.user.trim().toLowerCase();
  const occurredAt = new Date(event.occurredAt);
  const fromDate = filters.value.dateFrom
    ? new Date(`${filters.value.dateFrom}T00:00:00.000Z`)
    : null;
  const toDateExclusive = filters.value.dateTo
    ? addUtcCalendarDay(filters.value.dateTo)
    : null;
  const matchesDateFrom = !fromDate || occurredAt >= fromDate;
  const matchesDateTo = !toDateExclusive || occurredAt < toDateExclusive;
  const matchesClient =
    !clientNeedle ||
    [event.entityId, event.payloadSummary].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(clientNeedle)
    );
  const matchesUser = !userNeedle || event.actorId.toLowerCase().includes(userNeedle);
  const matchesAction = !filters.value.action || event.action === filters.value.action;
  const matchesType = !filters.value.type || event.entityType === filters.value.type;
  return (
    matchesDateFrom && matchesDateTo && matchesClient && matchesUser && matchesAction && matchesType
  );
}

function addUtcCalendarDay(dateValue: string): Date {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function financialStatusLabel(value: string | null): string {
  if (value === null) return '—';
  return ({open:'Em aberto', partial:'Parcial', paid:'Pago', cancelled:'Cancelado', settled:'Liquidado'} as Record<string,string>)[value] ?? value;
}
function reconciliationLabel(value: string | null): string {
  if (value === null) return '—';
  return ({not_required:'Dispensada', pending:'Pendente', reconciled:'Conciliada'} as Record<string,string>)[value] ?? value;
}
function appointmentStatusLabel(status: AppointmentReportRow['status']): string {
  const labels: Record<AppointmentReportRow['status'], string> = {
    scheduled: 'Agendado',
    checked_in: 'Check-in',
    completed: 'Executado',
    cancelled: 'Cancelado'
  };
  return labels[status];
}

function counterSaleStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: 'Aberta',
    closed: 'Fechada',
    cancelled: 'Cancelado'
  };
  return labels[status] ?? status;
}

function isProfessionalCareReportRow(
  row: Record<string, unknown>
): row is ProfessionalCareReportRow {
  const isCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  return (
    typeof row.professional === 'string' &&
    row.professional.length > 0 &&
    isCount(row.scheduled) &&
    isCount(row.completed) &&
    isCount(row.checkedIn) &&
    isCount(row.cancelled) &&
    isCount(row.services)
  );
}

function isRegisterServicesReportRow(
  row: Record<string, unknown>
): row is RegisterServicesReportRow {
  const allowedKeys = new Set(['code', 'name', 'description', 'basePrice', 'status', 'createdAt']);
  const isDate = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
  return (
    Object.keys(row).length === allowedKeys.size &&
    Object.keys(row).every((key) => allowedKeys.has(key)) &&
    typeof row.code === 'string' &&
    typeof row.name === 'string' &&
    row.name.trim().length > 0 &&
    typeof row.description === 'string' &&
    typeof row.basePrice === 'number' &&
    Number.isFinite(row.basePrice) &&
    (row.status === 'active' || row.status === 'inactive') &&
    isDate(row.createdAt)
  );
}

function isRegisterOwnersReportRow(row: Record<string, unknown>): row is RegisterOwnersReportRow {
  const allowedKeys = new Set([
    'documentId',
    'fullName',
    'primaryContact',
    'city',
    'financialResponsible',
    'status',
    'createdAt'
  ]);
  const isDate = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
  return (
    Object.keys(row).length === allowedKeys.size &&
    Object.keys(row).every((key) => allowedKeys.has(key)) &&
    typeof row.documentId === 'string' &&
    typeof row.fullName === 'string' &&
    row.fullName.trim().length > 0 &&
    typeof row.primaryContact === 'string' &&
    typeof row.city === 'string' &&
    (row.financialResponsible === 'Sim' || row.financialResponsible === 'Não') &&
    (row.status === 'active' || row.status === 'inactive') &&
    isDate(row.createdAt)
  );
}

function isRegisterPatientsReportRow(
  row: Record<string, unknown>
): row is RegisterPatientsReportRow {
  const allowedKeys = new Set([
    'code',
    'name',
    'species',
    'breed',
    'sex',
    'microchip',
    'status',
    'createdAt'
  ]);
  const isDate = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
  return (
    Object.keys(row).length === allowedKeys.size &&
    Object.keys(row).every((key) => allowedKeys.has(key)) &&
    typeof row.code === 'string' &&
    typeof row.name === 'string' &&
    row.name.trim().length > 0 &&
    typeof row.species === 'string' &&
    row.species.trim().length > 0 &&
    typeof row.breed === 'string' &&
    (row.sex === 'male' || row.sex === 'female' || row.sex === 'unknown') &&
    typeof row.microchip === 'string' &&
    (row.status === 'active' || row.status === 'inactive' || row.status === 'deceased') &&
    isDate(row.createdAt)
  );
}

function receivableSpec(title: string, subtitle: string, mode: 'open' | 'received'): ReportSpec {
  const isOpenReport = mode === 'open';
  return {
    title,
    group: 'Relatórios Financeiros',
    subtitle,
    icon: isOpenReport ? '💵' : '✅',
    primaryPath: '/finance/accounts-receivable',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'financial-receivables',
    tableTitle: isOpenReport ? 'Maiores recebíveis em aberto' : 'Recebimentos no período',
    emptyTitle: isOpenReport ? 'Sem recebíveis em aberto' : 'Sem conta recebida no período',
    emptyDescription: 'A movimentação financeira aparece aqui conforme o período selecionado.',
    note: isOpenReport
      ? 'A rota Vetus legacy observada e Sistema/Relatorio/ContasAReceberRelatorio.htm. Exporta CSV dos recebíveis carregados; esta visão é somente leitura, não baixa títulos nem concilia recebíveis.'
      : 'A rota Vetus legacy observada e Sistema/Relatorio/ContasRecebidasRelatorio.htm. Exporta CSV do subledger de recebíveis liquidados; esta visão é somente leitura, não baixa títulos nem concilia recebimentos.',
    columns: financialReceivableColumns,
    cards: () => [],
    rows: () => []
  };
}

function accountsPayableReportSpec(): ReportSpec {
  return {
    title: 'Contas a Pagar',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de obrigações, vencimentos e origem de despesas a pagar',
    icon: '💸',
    primaryPath: '/finance/accounts-payable',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'financial-payables',
    tableTitle: 'Obrigações a pagar',
    emptyTitle: 'Sem obrigação a pagar no período',
    emptyDescription:
      'Obrigações por fornecedor aparecem aqui a partir do subledger persistido de contas a pagar.',
    note: 'O item Vetus de Relatórios Financeiros > Contas a Pagar foi revalidado no navbar e corresponde à estrutura Financeiro/ContasAPagar.htm. Exporta CSV do subledger carregado por /financial/payables; esta visão é somente leitura e não baixa títulos nem gera conta avulsa.',
    columns: financialPayableColumns,
    cards: () => [],
    rows: () => []
  };
}

function paidAccountsReportSpec(): ReportSpec {
  return {
    title: 'Contas Pagas',
    group: 'Relatórios Financeiros',
    subtitle:
      'Relatório financeiro legacy de despesas liquidadas, desembolso efetivo e origem do pagamento',
    icon: '✅',
    primaryPath: '/finance/accounts-payable',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'financial-payables',
    tableTitle: 'Pagamentos no período',
    emptyTitle: 'Sem conta paga no período',
    emptyDescription:
      'Pagamentos quitados aparecem aqui a partir dos registros pagos do subledger de contas a pagar.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ContasPagasRelatorio.htm. Exporta CSV dos títulos pagos carregados por /financial/payables; esta visão é somente leitura e não baixa títulos nem altera fornecedores.',
    columns: financialPayableColumns,
    cards: () => [],
    rows: () => []
  };
}

function chequesReportSpec(): ReportSpec {
  return {
    title: 'Cheques',
    group: 'Relatórios Financeiros',
    subtitle:
      'Relatório financeiro legacy de pagamentos persistidos com método cheque e vínculo à comanda',
    icon: '📄',
    primaryPath: '/finance/cheques',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'financial-cheques',
    tableTitle: 'Cheques no período',
    emptyTitle: 'Sem cheque no período',
    emptyDescription:
      'Cheques aparecem aqui a partir dos pagamentos com método cheque registrados nas comandas.',
    note: 'A rota Vetus legacy observada é Sistema/Relatorio/ChequesRelatorio.htm. Esta visão consulta apenas fatos persistidos do pagamento e da comanda, usa a data de registro para o período e exporta o recorte por execução server-side auditada; vencimento, banco, baixa e devolução não são inferidos.',
    columns: chequeReportColumns,
    cards: () => [],
    rows: () => []
  };
}

function advancePaymentsReportSpec(): ReportSpec {
  return {
    title: 'Pagamento Antecipado',
    group: 'Relatórios Financeiros',
    subtitle:
      'Relatório financeiro legacy de créditos antecipados, saldo de cliente e compensação futura',
    icon: '⏩',
    primaryPath: '/finance/advance-payments',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'financial-advance-payments',
    tableTitle: 'Pagamentos antecipados no período',
    emptyTitle: 'Sem pagamento antecipado no período',
    emptyDescription:
      'Registros persistidos aparecem aqui conforme o período selecionado; ausência de registros não é substituída por saldo estimado.',
    note: 'O item Vetus de Relatórios Financeiros > Pagamento Antecipado foi revalidado no navbar e corresponde à estrutura Financeiro/PagamentoAntecipado.htm. Esta visão consulta somente a fonte persistida de pagamentos antecipados e alocações, deriva o saldo em centavos e exporta o recorte server-side auditado. Não gera pagamento, não compensa crédito e não infere valores a partir do cadastro do tutor.',
    columns: advancePaymentReportColumns,
    cards: () => [],
    rows: () => []
  };
}

function salesCounterSalesReportSpec(): ReportSpec {
  return {
    title: 'Comandas/Vendas',
    group: 'Relatórios de Atendimentos',
    subtitle:
      'Relatório legacy de consolidação comercial-operacional de comandas, vendas e fechamento econômico',
    icon: '💸',
    primaryPath: '/counter-sales',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Comandas e vendas no período',
    emptyTitle: 'Sem comanda ou venda no período',
    emptyDescription:
      'Comandas e vendas aparecem aqui conforme a consolidação comercial do período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ComandasVendasRelatorio.htm. Exporta CSV dos indicadores comerciais carregados; esta visão é somente leitura, não abre comanda, não cria venda nem finaliza cobrança.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      {
        label: 'Comandas/Vendas',
        value: count(current?.domains.commercial.counterSales.totalSales),
        icon: '💸'
      },
      {
        label: 'Receita bruta',
        value: money(current?.domains.commercial.counterSales.grossRevenue),
        icon: '📈'
      },
      {
        label: 'Ticket médio',
        value: money(current?.domains.commercial.counterSales.avgTicket),
        icon: '🧾'
      }
    ],
    rows: (current) =>
      [
        {
          id: 'total-sales',
          label: 'Volume transacional consolidado',
          amount: current?.domains.commercial.counterSales.grossRevenue ?? 0,
          records: count(current?.domains.commercial.counterSales.totalSales),
          scope: 'Comandas/Vendas'
        },
        {
          id: 'closed-sales',
          label: 'Comandas e vendas fechadas',
          amount: current?.domains.commercial.counterSales.netRevenue ?? 0,
          records: count(current?.domains.commercial.counterSales.closedCount),
          scope: 'Fechamento comercial'
        },
        {
          id: 'open-sales',
          label: 'Comandas em aberto',
          amount: null,
          records: count(current?.domains.commercial.counterSales.openCount),
          scope: 'Operação de atendimento'
        },
        {
          id: 'cancelled-sales',
          label: 'Vendas canceladas',
          amount: null,
          records: count(current?.domains.commercial.counterSales.cancelledCount),
          scope: 'Controle interno'
        },
        {
          id: 'avg-ticket',
          label: 'Ticket médio fechado',
          amount: current?.domains.commercial.counterSales.avgTicket ?? 0,
          records: count(current?.domains.commercial.counterSales.closedCount),
          scope: 'Vendas'
        }
      ] as DataTableRow[]
  };
}

function producedItemsReportSpec(): ReportSpec {
  return {
    title: 'Produtos/Serviços Produzidos',
    group: 'Relatórios de Atendimentos',
    subtitle:
      'Até 5 produtos e 5 serviços em destaque, com suas quantidades e receitas.',
    icon: '🛠️',
    primaryPath: '/sales',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Produtos e serviços em destaque',
    emptyTitle: 'Sem produto ou serviço produzido no período',
    emptyDescription:
      'Produtos e serviços produzidos aparecem aqui quando houver venda fechada no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ProdutosEServicosProduzidos.htm. Exporta CSV dos itens produzidos carregados; esta visão é somente leitura, não cria venda, não altera catálogo nem baixa estoque.',
    columns: [
      { key: 'name', label: 'Item' },
      { key: 'kind', label: 'Tipo' },
      { key: 'quantity', label: 'Quantidade' },
      { key: 'revenue', label: 'Receita' }
    ],
    cards: (current) => [
      {
        label: 'Vendas fechadas',
        value: count(current?.domains.commercial.counterSales.closedCount),
        icon: '✅'
      },
      {
        label: 'Receita comercial',
        value: money(current?.executive.commercialRevenue),
        icon: '📈'
      },
      { label: 'Tipos de itens listados', value: count(producedItemRows(current).length), icon: '🛠️' }
    ],
    rows: (current) => producedItemRows(current)
  };
}

function producedItemRows(current: AdministrativeReportsResponse | null): DataTableRow[] {
  const dashboard = current?.domains.commercial.counterSales;
  if (!dashboard) return [];
  return [
    ...dashboard.topServices.map((row) => ({ ...row, id: `service-${row.name}`, kind: 'Serviço' })),
    ...dashboard.topProducts.map((row) => ({ ...row, id: `product-${row.name}`, kind: 'Produto' }))
  ] as DataTableRow[];
}

function productionReportSpec(): ReportSpec {
  return {
    title: 'Produção',
    group: 'Relatórios de Atendimentos',
    subtitle:
      'Vendas fechadas e somas dos destaques, limitados a 5 produtos e 5 serviços.',
    icon: '🏭',
    primaryPath: '/sales',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Produção no período',
    emptyTitle: 'Sem produção no período',
    emptyDescription:
      'A produção consolidada aparece aqui quando houver comanda ou venda fechada no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ProducaoRelatorio.htm. Exporta CSV da produção consolidada carregada; esta visão é somente leitura, não abre atendimento, não cria venda nem altera produção.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      {
        label: 'Vendas fechadas',
        value: count(current?.domains.commercial.counterSales.closedCount),
        icon: '✅'
      },
      {
        label: 'Recebido em vendas fechadas',
        value: money(current?.domains.commercial.counterSales.netRevenue),
        icon: '📈'
      },
      {
        label: 'Ticket médio',
        value: money(current?.domains.commercial.counterSales.avgTicket),
        icon: '🧾'
      }
    ],
    rows: (current) => {
      const dashboard = current?.domains.commercial.counterSales;
      if (!dashboard) return [];
      const serviceQuantity = dashboard.topServices.reduce((total, row) => total + row.quantity, 0);
      const serviceRevenue = dashboard.topServices.reduce((total, row) => total + row.revenue, 0);
      const productQuantity = dashboard.topProducts.reduce((total, row) => total + row.quantity, 0);
      const productRevenue = dashboard.topProducts.reduce((total, row) => total + row.revenue, 0);
      return [
        {
          id: 'closed-output',
          label: 'Recebido em vendas fechadas',
          amount: dashboard.netRevenue,
          records: count(dashboard.closedCount),
          scope: 'Comandas/Vendas fechadas'
        },
        {
          id: 'gross-output',
          label: 'Valor das vendas fechadas',
          amount: dashboard.grossRevenue,
          records: count(dashboard.closedCount),
          scope: 'Vendas fechadas'
        },
        {
          id: 'services-output',
          label: 'Serviços em destaque',
          amount: serviceRevenue,
          records: count(serviceQuantity),
          scope: `Serviços listados: ${dashboard.topServices.length}`
        },
        {
          id: 'products-output',
          label: 'Produtos em destaque',
          amount: productRevenue,
          records: count(productQuantity),
          scope: `Produtos listados: ${dashboard.topProducts.length}`
        },
        {
          id: 'avg-ticket-output',
          label: 'Ticket médio produzido',
          amount: dashboard.avgTicket,
          records: count(dashboard.closedCount),
          scope: 'Vendas fechadas'
        }
      ] as DataTableRow[];
    }
  };
}

function appointmentsReportSpec(): ReportSpec {
  return {
    title: 'Agenda',
    group: 'Relatórios de Atendimentos',
    subtitle:
      'Relatório de agendamentos persistidos, comparecimentos, cancelamentos e ocupação operacional',
    icon: '📅',
    primaryPath: '/appointments',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'scheduling-appointments',
    tableTitle: 'Agendamentos no período',
    emptyTitle: 'Sem agendamento no período',
    emptyDescription:
      'Agendamentos aparecem aqui quando houver eventos na agenda para o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/AgendaRelatorio.htm. Consulta agendamentos persistidos com filtros de período, texto e status; a execução e a exportação CSV são server-side e auditadas. Esta visão é somente leitura, não cria agendamento, não altera status nem abre atendimento.',
    columns: [
      { key: 'scheduledAt', label: 'Data' },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Motivo' },
      { key: 'practitioner', label: 'Profissional' },
      { key: 'service', label: 'Serviço' },
      { key: 'unit', label: 'Unidade' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function professionalCareReportSpec(): ReportSpec {
  return {
    title: 'Atendimento por Profissional',
    group: 'Relatórios de Atendimentos',
    subtitle:
      'Relatório legacy de produtividade humana, volume assistencial e distribuição por profissional',
    icon: '🩺',
    primaryPath: '/staff',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'scheduling-professional-care',
    tableTitle: 'Atendimentos por profissional',
    emptyTitle: 'Sem atendimento por profissional no período',
    emptyDescription:
      'Atendimentos por profissional aparecem aqui quando houver agenda vinculada a profissional no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/AtendimentoPorProfissional.htm. Consulta o agregado persistido por profissional com execução e exportação server-side auditadas; esta visão é somente leitura, não altera profissionais, não abre atendimento nem calcula comissão.',
    columns: [
      { key: 'professional', label: 'Profissional' },
      { key: 'scheduled', label: 'Agendamentos' },
      { key: 'completed', label: 'Executados' },
      { key: 'checkedIn', label: 'Check-in' },
      { key: 'cancelled', label: 'Cancelados' },
      { key: 'services', label: 'Serviços' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function serviceInvoicesReportSpec(): ReportSpec {
  return {
    title: 'Relatório de NF de Serviços Prestados',
    group: 'Relatórios Personalizados',
    subtitle: 'Relatório legacy personalizado de documentos NFS-e persistidos por competência',
    icon: '🧾',
    primaryPath: '/fiscal/nfse',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'fiscal-service-invoices',
    tableTitle: 'Documentos NFS-e persistidos',
    emptyTitle: 'Sem documento NFS-e no período',
    emptyDescription:
      'Documentos fiscais aparecem aqui quando houver NFS-e persistida na competência selecionada.',
    note: 'A rota Vetus legacy observada é Sistema/Relatorio/RelatoriosDinamicosExecutor.htm?id=1. Esta visão é somente leitura e consulta apenas documentos NFS-e persistidos, sem emitir, cancelar, enviar para prefeitura/provider ou reconciliar vendas, serviços comerciais e financeiro.',
    columns: [
      { key: 'documentId', label: 'Documento' },
      { key: 'serie', label: 'Série' },
      { key: 'numero', label: 'Número' },
      { key: 'competencia', label: 'Competência' },
      { key: 'status', label: 'Status' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'customerDocument', label: 'Documento do cliente' },
      { key: 'provider', label: 'Provider fiscal' },
      { key: 'serviceDescriptions', label: 'Serviços' },
      { key: 'serviceCodes', label: 'Códigos de serviço' },
      { key: 'serviceQuantity', label: 'Quantidade' },
      { key: 'serviceSubtotal', label: 'Subtotal dos serviços' },
      { key: 'totalIss', label: 'ISS' },
      { key: 'totalPis', label: 'PIS' },
      { key: 'totalCofins', label: 'COFINS' },
      { key: 'totalCsll', label: 'CSLL' },
      { key: 'totalIrrf', label: 'IRRF' },
      { key: 'totalInss', label: 'INSS' },
      { key: 'totalDocument', label: 'Total do documento' },
      { key: 'observations', label: 'Observações' },
      { key: 'createdAt', label: 'Criado em' },
      { key: 'authorizationCode', label: 'Autorização' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function registerServicesReportSpec(): ReportSpec {
  return {
    title: 'Serviços',
    group: 'Relatórios de Cadastros',
    subtitle:
      'Relatório legacy do cadastro de serviços, preços e situação do catálogo assistencial',
    icon: '🛠️',
    primaryPath: '/services',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'registration-services',
    tableTitle: 'Serviços cadastrados',
    emptyTitle: 'Sem serviço cadastrado',
    emptyDescription:
      'Serviços aparecem aqui quando houver registros no cadastro operacional de serviços.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ServicosRelatorio.htm. Esta visão é somente leitura, consulta o cadastro operacional existente e exporta CSV server-side auditado a partir da fonte persistida; não cria serviço, não altera preço e não muda situação.',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Serviço' },
      { key: 'description', label: 'Descrição' },
      { key: 'basePrice', label: 'Preço base' },
      { key: 'status', label: 'Situação' },
      { key: 'createdAt', label: 'Cadastro' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function registerOwnersReportSpec(): ReportSpec {
  return {
    title: 'Clientes',
    group: 'Relatórios de Cadastros',
    subtitle:
      'Relatório legacy do cadastro de clientes, contatos, responsabilidade financeira e situação',
    icon: '👤',
    primaryPath: '/owners',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'registration-owners',
    tableTitle: 'Clientes cadastrados',
    emptyTitle: 'Sem cliente cadastrado',
    emptyDescription:
      'Clientes aparecem aqui quando houver registros no cadastro operacional de tutores.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ClientesRelatorio.htm. Esta visão é somente leitura, consulta o cadastro operacional existente e exporta CSV server-side auditado a partir da fonte persistida.',
    columns: [
      { key: 'documentId', label: 'Documento' },
      { key: 'fullName', label: 'Cliente' },
      { key: 'primaryContact', label: 'Contato' },
      { key: 'city', label: 'Cidade' },
      { key: 'financialResponsible', label: 'Resp. financeiro' },
      { key: 'status', label: 'Situação' },
      { key: 'createdAt', label: 'Cadastro' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function matchesReportPeriod(value: string): boolean {
  const date = new Date(value);
  const fromDate = filters.value.dateFrom ? new Date(`${filters.value.dateFrom}T00:00:00`) : null;
  const toDate = filters.value.dateTo ? new Date(`${filters.value.dateTo}T23:59:59`) : null;
  return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
}

function isAppointmentReportRow(row: Record<string, unknown>): row is AppointmentReportRow {
  const optionalString = (field: keyof AppointmentReportRow): boolean =>
    row[field] === null || typeof row[field] === 'string';
  return (
    typeof row.appointmentId === 'string' &&
    typeof row.scheduledAt === 'string' &&
    !Number.isNaN(Date.parse(row.scheduledAt)) &&
    (row.status === 'scheduled' ||
      row.status === 'checked_in' ||
      row.status === 'completed' ||
      row.status === 'cancelled') &&
    typeof row.reason === 'string' &&
    typeof row.patientId === 'string' &&
    typeof row.ownerId === 'string' &&
    optionalString('practitionerStaffId') &&
    optionalString('serviceId') &&
    optionalString('unit') &&
    optionalString('specialty') &&
    optionalString('resourceLabel') &&
    typeof row.createdAt === 'string' &&
    !Number.isNaN(Date.parse(row.createdAt)) &&
    typeof row.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(row.updatedAt))
  );
}

function isChequeReportRow(row: Record<string, unknown>): row is ChequeReportRow {
  return (
    typeof row.paymentId === 'string' &&
    typeof row.counterSaleId === 'string' &&
    typeof row.saleNumber === 'string' &&
    typeof row.saleStatus === 'string' &&
    (typeof row.reference === 'string' || row.reference === null) &&
    typeof row.amount === 'number' &&
    Number.isFinite(row.amount) &&
    typeof row.installments === 'number' &&
    Number.isInteger(row.installments) &&
    row.installments >= 1 &&
    typeof row.recordedAt === 'string' &&
    (typeof row.notes === 'string' || row.notes === null)
  );
}

function isFinancialPayableReportRow(
  row: Record<string, unknown>
): row is FinancialPayableServerRow {
  return (
    typeof row.supplierName === 'string' &&
    typeof row.description === 'string' &&
    typeof row.category === 'string' &&
    typeof row.issuedAt === 'string' &&
    !Number.isNaN(Date.parse(row.issuedAt)) &&
    typeof row.dueAt === 'string' &&
    !Number.isNaN(Date.parse(row.dueAt)) &&
    typeof row.totalAmount === 'number' &&
    Number.isFinite(row.totalAmount) &&
    typeof row.paidAmount === 'number' &&
    Number.isFinite(row.paidAmount) &&
    typeof row.outstandingAmount === 'number' &&
    Number.isFinite(row.outstandingAmount) &&
    (row.status === 'open' ||
      row.status === 'partial' ||
      row.status === 'paid' ||
      row.status === 'cancelled') &&
    (row.paymentMethod === null || typeof row.paymentMethod === 'string') &&
    (row.reconciliationStatus === 'not_required' ||
      row.reconciliationStatus === 'pending' ||
      row.reconciliationStatus === 'reconciled')
  );
}

function isFinancialReceivableReportRow(
  row: Record<string, unknown>
): row is FinancialReceivableServerRow {
  return (
    typeof row.patientName === 'string' &&
    typeof row.ownerName === 'string' &&
    (typeof row.patientSpecies === 'string' || row.patientSpecies === null) &&
    typeof row.encounterId === 'string' &&
    typeof row.installmentNumber === 'number' &&
    Number.isInteger(row.installmentNumber) &&
    row.installmentNumber > 0 &&
    typeof row.installmentLabel === 'string' &&
    typeof row.issuedAt === 'string' &&
    !Number.isNaN(Date.parse(row.issuedAt)) &&
    (typeof row.dueAt === 'string' || row.dueAt === null) &&
    (typeof row.settledAt === 'string' || row.settledAt === null) &&
    typeof row.amountOriginal === 'number' &&
    Number.isFinite(row.amountOriginal) &&
    typeof row.amountPaid === 'number' &&
    Number.isFinite(row.amountPaid) &&
    typeof row.amountOutstanding === 'number' &&
    Number.isFinite(row.amountOutstanding) &&
    (row.status === 'open' || row.status === 'settled') &&
    (row.financialStatus === 'pending' ||
      row.financialStatus === 'partial' ||
      row.financialStatus === 'paid') &&
    (row.encounterStatus === 'open' || row.encounterStatus === 'closed') &&
    typeof row.paymentCount === 'number' &&
    Number.isInteger(row.paymentCount) &&
    row.paymentCount >= 0
  );
}

function isAdvancePaymentReportRow(row: Record<string, unknown>): row is AdvancePaymentReportRow {
  return (
    typeof row.paymentId === 'string' &&
    typeof row.ownerName === 'string' &&
    typeof row.documentId === 'string' &&
    typeof row.issuedAt === 'string' &&
    typeof row.originalAmount === 'number' &&
    Number.isFinite(row.originalAmount) &&
    row.originalAmount > 0 &&
    typeof row.compensatedAmount === 'number' &&
    Number.isFinite(row.compensatedAmount) &&
    row.compensatedAmount >= 0 &&
    typeof row.balance === 'number' &&
    Number.isFinite(row.balance) &&
    row.balance >= 0 &&
    row.compensatedAmount + row.balance === row.originalAmount &&
    typeof row.origin === 'string' &&
    (row.status === 'available' ||
      row.status === 'partially_compensated' ||
      row.status === 'compensated') &&
    typeof row.notes === 'string'
  );
}

function isServiceInvoiceReportRow(row: Record<string, unknown>): row is ServiceInvoiceReportRow {
  const numericFields = [
    'numero',
    'serviceQuantity',
    'serviceSubtotal',
    'totalIss',
    'totalPis',
    'totalCofins',
    'totalCsll',
    'totalIrrf',
    'totalInss',
    'totalDocument'
  ] as const;
  return (
    typeof row.documentId === 'string' &&
    typeof row.serie === 'string' &&
    numericFields.every((field) => typeof row[field] === 'number' && Number.isFinite(row[field])) &&
    typeof row.competencia === 'string' &&
    (row.status === 'draft' ||
      row.status === 'issued' ||
      row.status === 'cancelled' ||
      row.status === 'error') &&
    typeof row.customerName === 'string' &&
    typeof row.customerDocument === 'string' &&
    typeof row.provider === 'string' &&
    typeof row.serviceDescriptions === 'string' &&
    typeof row.serviceCodes === 'string' &&
    typeof row.observations === 'string' &&
    typeof row.createdAt === 'string' &&
    typeof row.authorizationCode === 'string'
  );
}

function serviceInvoiceStatusLabel(status: ServiceInvoiceReportRow['status']): string {
  const labels: Record<ServiceInvoiceReportRow['status'], string> = {
    draft: 'Rascunho',
    issued: 'Emitida',
    cancelled: 'Cancelada',
    error: 'Erro'
  };
  return labels[status];
}

function isSupplierReportRow(row: Record<string, unknown>): row is SupplierReportRow {
  return (
    typeof row.code === 'string' &&
    typeof row.name === 'string' &&
    typeof row.kind === 'string' &&
    typeof row.category === 'string' &&
    typeof row.costCenterCode === 'string' &&
    typeof row.costCenterName === 'string' &&
    typeof row.description === 'string' &&
    typeof row.createdAt === 'string' &&
    typeof row.updatedAt === 'string'
  );
}

function isInventoryProductReportRow(
  row: Record<string, unknown>
): row is InventoryProductReportRow {
  const expectedKeys = new Set([
    'sku',
    'name',
    'unit',
    'onHandQuantity',
    'reorderLevel',
    'unitCostAmount',
    'createdAt',
    'updatedAt'
  ]);
  const numericFields = ['onHandQuantity', 'reorderLevel', 'unitCostAmount'] as const;
  return (
    Object.keys(row).every((key) => expectedKeys.has(key)) &&
    expectedKeys.size === Object.keys(row).length &&
    typeof row.sku === 'string' &&
    typeof row.name === 'string' &&
    typeof row.unit === 'string' &&
    numericFields.every((field) => typeof row[field] === 'number' && Number.isFinite(row[field])) &&
    typeof row.createdAt === 'string' &&
    typeof row.updatedAt === 'string'
  );
}

function isInventoryStockReportRow(row: Record<string, unknown>): row is InventoryStockReportRow {
  const expectedKeys = new Set([
    'sku',
    'name',
    'unit',
    'onHandQuantity',
    'reorderLevel',
    'unitCostAmount',
    'stockValue',
    'reorderStatus',
    'createdAt',
    'updatedAt'
  ]);
  const numericFields = ['onHandQuantity', 'reorderLevel', 'unitCostAmount', 'stockValue'] as const;
  return (
    Object.keys(row).every((key) => expectedKeys.has(key)) &&
    expectedKeys.size === Object.keys(row).length &&
    typeof row.sku === 'string' &&
    typeof row.name === 'string' &&
    typeof row.unit === 'string' &&
    numericFields.every((field) => typeof row[field] === 'number' && Number.isFinite(row[field])) &&
    (row.reorderStatus === 'below_reorder_level' || row.reorderStatus === 'adequate') &&
    typeof row.createdAt === 'string' &&
    typeof row.updatedAt === 'string'
  );
}

function isInventoryMovementReportRow(
  row: Record<string, unknown>
): row is InventoryMovementReportRow {
  const expectedKeys = new Set([
    'movementId',
    'occurredAt',
    'movementType',
    'sku',
    'name',
    'unit',
    'quantityDelta',
    'balanceBefore',
    'balanceAfter',
    'unitCostAmount',
    'reason',
    'reference',
    'recordedByUserId'
  ]);
  const numericFields = [
    'quantityDelta',
    'balanceBefore',
    'balanceAfter',
    'unitCostAmount'
  ] as const;
  return (
    Object.keys(row).every((key) => expectedKeys.has(key)) &&
    expectedKeys.size === Object.keys(row).length &&
    typeof row.movementId === 'string' &&
    typeof row.occurredAt === 'string' &&
    (row.movementType === 'adjustment' ||
      row.movementType === 'inbound' ||
      row.movementType === 'outbound' ||
      row.movementType === 'transfer' ||
      row.movementType === 'consumption') &&
    typeof row.sku === 'string' &&
    typeof row.name === 'string' &&
    typeof row.unit === 'string' &&
    numericFields.every((field) => typeof row[field] === 'number' && Number.isFinite(row[field])) &&
    typeof row.reason === 'string' &&
    typeof row.reference === 'string' &&
    typeof row.recordedByUserId === 'string'
  );
}

function isInventoryPurchaseReportRow(
  row: Record<string, unknown>
): row is InventoryPurchaseReportRow {
  const expectedKeys = new Set([
    'purchaseId',
    'invoiceNumber',
    'supplierName',
    'status',
    'totalAmount',
    'receivedAmount',
    'payableId',
    'createdByUserId',
    'approvedByUserId',
    'createdAt',
    'updatedAt',
    'receivedAt'
  ]);
  return (
    Object.keys(row).every((key) => expectedKeys.has(key)) &&
    Object.keys(row).length === expectedKeys.size &&
    typeof row.purchaseId === 'string' &&
    row.purchaseId.length > 0 &&
    typeof row.invoiceNumber === 'string' &&
    row.invoiceNumber.trim().length > 0 &&
    typeof row.supplierName === 'string' &&
    (row.status === 'draft' ||
      row.status === 'approved' ||
      row.status === 'partially_received' ||
      row.status === 'received' ||
      row.status === 'cancelled') &&
    typeof row.totalAmount === 'number' &&
    Number.isFinite(row.totalAmount) &&
    row.totalAmount >= 0 &&
    typeof row.receivedAmount === 'number' &&
    Number.isFinite(row.receivedAmount) &&
    row.receivedAmount >= 0 &&
    row.receivedAmount <= row.totalAmount &&
    (typeof row.payableId === 'string' || row.payableId === null) &&
    typeof row.createdByUserId === 'string' &&
    (typeof row.approvedByUserId === 'string' || row.approvedByUserId === null) &&
    typeof row.createdAt === 'string' &&
    !Number.isNaN(Date.parse(row.createdAt)) &&
    typeof row.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(row.updatedAt)) &&
    (row.receivedAt === null ||
      (typeof row.receivedAt === 'string' && !Number.isNaN(Date.parse(row.receivedAt))))
  );
}

function inventoryPurchaseStatusLabel(status: InventoryPurchaseReportRow['status']): string {
  const labels: Record<InventoryPurchaseReportRow['status'], string> = {
    draft: 'Rascunho',
    approved: 'Aprovada',
    partially_received: 'Parcialmente recebida',
    received: 'Recebida',
    cancelled: 'Cancelada'
  };
  return labels[status];
}

function inventoryMovementTypeLabel(
  movementType: InventoryMovementReportRow['movementType']
): string {
  const labels: Record<InventoryMovementReportRow['movementType'], string> = {
    adjustment: 'Ajuste',
    inbound: 'Entrada',
    outbound: 'Saída',
    transfer: 'Transferência',
    consumption: 'Saída'
  };
  return labels[movementType];
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function registerPatientsReportSpec(): ReportSpec {
  return {
    title: 'Animais',
    group: 'Relatórios de Cadastros',
    subtitle: 'Relatório legacy do cadastro de animais, espécie, raça, identificação e situação',
    icon: '🐾',
    primaryPath: '/patients',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'registration-patients',
    tableTitle: 'Animais cadastrados',
    emptyTitle: 'Sem animal cadastrado',
    emptyDescription:
      'Animais aparecem aqui quando houver registros no cadastro operacional de pacientes.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/AnimaisRelatorio.htm. Esta visão é somente leitura, consulta o cadastro operacional existente e exporta CSV server-side auditado a partir da fonte persistida.',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Animal' },
      { key: 'species', label: 'Espécie' },
      { key: 'breed', label: 'Raça' },
      { key: 'sex', label: 'Sexo' },
      { key: 'microchip', label: 'Microchip' },
      { key: 'status', label: 'Situação' },
      { key: 'createdAt', label: 'Cadastro' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function registerSuppliersReportSpec(): ReportSpec {
  return {
    title: 'Fornecedores',
    group: 'Relatórios de Cadastros',
    subtitle: 'Relatório legacy do catálogo de fornecedores, despesas e centros de custo',
    icon: '🚚',
    primaryPath: '/suppliers',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'registration-suppliers',
    tableTitle: 'Fornecedores cadastrados',
    emptyTitle: 'Sem fornecedor cadastrado',
    emptyDescription:
      'Fornecedores e despesas aparecem aqui quando houver registros no cadastro operacional.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/FornecedoresRelatorio.htm. Esta visão é somente leitura, consulta o catálogo operacional persistido e exporta CSV server-side auditado. A descrição é exibida como descrição; nenhum contato, dado fiscal, condição de pagamento ou fornecedor master é inferido.',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nome' },
      { key: 'category', label: 'Categoria' },
      { key: 'kind', label: 'Tipo' },
      { key: 'costCenter', label: 'Centro de custo' },
      { key: 'description', label: 'Descrição' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function inventoryStockReportSpec(): ReportSpec {
  return {
    title: 'Estoque',
    group: 'Relatórios de Estoque',
    subtitle: 'Relatório legacy da posição atual de estoque, saldo, custo e situação de reposição',
    icon: '📦',
    primaryPath: '/inventory',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Posição atual de estoque',
    emptyTitle: 'Sem item em estoque',
    emptyDescription: 'Itens aparecem aqui quando houver registros no estoque operacional.',
    serverReportId: 'inventory-stock',
    note: 'A rota Vetus legacy documentada e Sistema/Relatorio/EstoqueRelatorio.htm. Esta visão consulta somente inventory_items persistido, deriva o valor operacional corrente e o sinal de reposição, e exporta o recorte server-side auditado. Não lê lotes, não lança transação, não transfere saldo nem calcula valuation histórico.',
    columns: [
      { key: 'sku', label: 'Código' },
      { key: 'name', label: 'Produto' },
      { key: 'onHandQuantity', label: 'Saldo' },
      { key: 'unit', label: 'Unidade' },
      { key: 'reorderLevel', label: 'Mínimo' },
      { key: 'unitCostAmount', label: 'Custo unit.' },
      { key: 'stockValue', label: 'Valor estoque' },
      { key: 'reorderStatus', label: 'Situação reposição' },
      { key: 'createdAt', label: 'Cadastro' },
      { key: 'updatedAt', label: 'Atualização' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function inventoryMovementsReportSpec(): ReportSpec {
  return {
    title: 'Movimentações no Estoque',
    group: 'Relatórios de Estoque',
    subtitle: 'Ledger server-backed de entradas, saídas e referências operacionais de movimentação',
    icon: '📥',
    primaryPath: '/inventory/movements',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Movimentações de estoque',
    emptyTitle: 'Sem movimentação de estoque',
    emptyDescription:
      'Movimentações aparecem aqui quando houver lançamentos persistidos no ledger no período.',
    serverReportId: 'inventory-movements',
    note: 'A rota Vetus legacy documentada e Sistema/Relatorio/MovimentacaoEstoqueRelatorio.htm. Esta visão consulta somente o ledger persistido de inventory_stock_movements, enriquecido com SKU, produto e unidade de inventory_items, e exporta um artefato server-side auditado. Não reconstrói lotes ou consumos, não lança transação, não transfere saldo, não ajusta estoque e não atribui semântica fiscal.',
    columns: [
      { key: 'movementId', label: 'Movimento' },
      { key: 'occurredAt', label: 'Data' },
      { key: 'movementType', label: 'Tipo' },
      { key: 'sku', label: 'Código' },
      { key: 'name', label: 'Produto' },
      { key: 'unit', label: 'Unidade' },
      { key: 'quantityDelta', label: 'Variação' },
      { key: 'balanceBefore', label: 'Saldo anterior' },
      { key: 'balanceAfter', label: 'Saldo posterior' },
      { key: 'unitCostAmount', label: 'Custo unit.' },
      { key: 'reason', label: 'Motivo' },
      { key: 'reference', label: 'Referência' },
      { key: 'recordedByUserId', label: 'Usuário' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function inventoryInvoicesReportSpec(): ReportSpec {
  return {
    title: 'Entrada de NF',
    group: 'Relatórios de Estoque',
    subtitle: 'Compras de estoque persistidas com referência de NF e ciclo de recebimento',
    icon: '🧾',
    primaryPath: '/inventory/invoices',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'inventory-invoices',
    tableTitle: 'Entradas de compras',
    emptyTitle: 'Sem compra com referência de NF',
    emptyDescription:
      'Entradas aparecem aqui quando houver compras persistidas com referência armazenada no período.',
    note: 'A rota Vetus legacy documentada é Sistema/Relatorio/EntradaNotaFiscalRelatorio.htm. Esta visão consulta somente cabeçalhos persistidos de compras de estoque com referência de NF informada e exporta um artefato server-side auditado. A referência é exibida como dado operacional da compra; não é documento fiscal, não emite/cancela NF, não altera estoque e não reconstrói lotes ou itens.',
    columns: [
      { key: 'purchaseId', label: 'Compra' },
      { key: 'invoiceNumber', label: 'Referência NF' },
      { key: 'supplierName', label: 'Fornecedor informado' },
      { key: 'status', label: 'Status da compra' },
      { key: 'totalAmount', label: 'Valor comprado' },
      { key: 'receivedAmount', label: 'Valor recebido' },
      { key: 'payableId', label: 'Conta a pagar' },
      { key: 'createdByUserId', label: 'Criado por' },
      { key: 'approvedByUserId', label: 'Aprovado por' },
      { key: 'createdAt', label: 'Criado em' },
      { key: 'updatedAt', label: 'Atualizado em' },
      { key: 'receivedAt', label: 'Recebido em' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function inventoryProductsReportSpec(): ReportSpec {
  return {
    title: 'Relatório de Produtos',
    group: 'Relatórios de Estoque',
    subtitle: 'Relatório server-backed do catálogo persistido de produtos de estoque',
    icon: '🏷️',
    primaryPath: '/products',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'inventory-products',
    tableTitle: 'Produtos do estoque',
    emptyTitle: 'Sem produto cadastrado',
    emptyDescription:
      'Produtos aparecem aqui quando houver registros no catálogo operacional de estoque.',
    note: 'O acervo Vetus confirma o item Relatório de Produtos em Relatórios de Estoque. Esta visão consulta a fonte persistida de itens de estoque e exporta um artefato server-side auditado; não lê lotes para reconstruir o relatório, não altera produto, preço ou saldo e não calcula valuation histórico.',
    columns: [
      { key: 'sku', label: 'Código' },
      { key: 'name', label: 'Produto' },
      { key: 'unit', label: 'Unidade' },
      { key: 'onHandQuantity', label: 'Saldo' },
      { key: 'reorderLevel', label: 'Mínimo' },
      { key: 'unitCostAmount', label: 'Custo unit.' },
      { key: 'createdAt', label: 'Cadastro' },
      { key: 'updatedAt', label: 'Atualização' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function registerSpec(title: string, primaryPath: string, primaryAction: string): ReportSpec {
  return {
    title,
    group: 'Relatórios de Cadastros',
    subtitle: `Relatório operacional do cadastro de ${title.toLowerCase()}`,
    icon: '📋',
    primaryPath,
    primaryAction,
    tableTitle: 'Indicadores de cadastro',
    emptyTitle: 'Sem indicador específico conectado',
    emptyDescription:
      'A rota já está materializada e pronta para acoplar métricas específicas do cadastro.',
    note: 'Sem endpoint analítico específico no backend atual. A navegação Vetus foi preservada sem exibir dados simulados.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'value', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      {
        label: 'Faturamentos',
        value: count(current?.domains.financial.billing.totalRecords),
        icon: '🧾'
      },
      {
        label: 'Vendas',
        value: count(current?.domains.commercial.counterSales.totalSales),
        icon: '💸'
      },
      {
        label: 'Orçamentos',
        value: count(current?.domains.commercial.quotes.issuedCount),
        icon: '📋'
      }
    ],
    rows: (current) => [
      {
        id: 'billing',
        label: 'Registros de faturamento relacionados',
        value: count(current?.domains.financial.billing.totalRecords),
        scope: 'Faturamento'
      },
      {
        id: 'sales',
        label: 'Vendas relacionadas',
        value: count(current?.domains.commercial.counterSales.totalSales),
        scope: 'Comercial'
      }
    ]
  };
}

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

onMounted(loadReport);
watch(() => props.reportKey, () => {
  clearPendingExport();
  resetFilters();
});
onBeforeUnmount(() => { reportRequestId += 1; });
</script>

<style scoped>
.report-page {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  max-width: 100%;
  min-width: 0;
  width: 100%;
}

.report-page > * {
  max-width: 100%;
  min-width: 0;
}

.report-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  gap: 12px;
  align-items: end;
  width: 100%;
}

.report-filters__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.report-field {
  display: grid;
  gap: 6px;
}

.report-field span {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.report-field select {
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.report-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.report-query-note { margin: 0; padding: 12px 16px; border-left: 3px solid var(--color-primary); color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }
.report-export-recovery { display: grid; gap: 8px; padding: 14px 16px; border: 1px solid color-mix(in srgb, var(--color-warning, #b7791f) 45%, var(--color-border)); border-radius: 12px; background: color-mix(in srgb, var(--color-warning, #b7791f) 8%, var(--color-surface)); color: var(--color-text); }
.report-export-recovery span { color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }
.report-period-hint { grid-column: 1 / -1; margin: 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.5; }
.report-results h2 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
.report-money { white-space: nowrap; font-variant-numeric: tabular-nums; }
.report-page :deep(.data-table) { min-width: 0; }
.report-page :deep(.data-table th) { white-space: normal; }
.report-filter-disclosure, .report-summary, .report-assumptions { border: 1px solid var(--color-border); border-radius: 12px; padding: 0 16px 12px; }
.report-page summary { display: flex; align-items: center; min-height: 44px; font-weight: 600; cursor: pointer; }
.report-page summary::before { content: '▸'; margin-right: 8px; }
.report-page details[open] > summary::before { content: '▾'; }
.report-summary dl { display: flex; flex-wrap: wrap; gap: 20px; margin: 10px 0; }
.report-summary dl > div { flex: 1 1 180px; }
.report-summary dt, .report-assumptions p { color: var(--color-text-secondary); font-size: 13px; line-height: 1.6; }
.report-summary dd { margin: 5px 0 0; font-size: 20px; font-variant-numeric: tabular-nums; }
.report-unavailable { padding: clamp(20px,4vw,40px); border: 1px solid var(--color-border); border-radius: 20px; background: var(--color-surface); }
.report-unavailable__mark { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; color: var(--color-primary); background: var(--color-bg-subtle); font-size: 28px; }
.report-unavailable h2 { margin: 20px 0 10px; font-size: 24px; }
.report-unavailable p { max-width: 60ch; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 24px; }
.report-page :deep(input), .report-page :deep(select), .report-page :deep(button) { min-height: 44px; }
@media (max-width: 640px) {
  .report-filter-mode { grid-column: 1 / -1; }
  .report-filters { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .report-filters__actions { grid-column: 1 / -1; }
  .report-page :deep(.app-page-header__actions) { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; }
  .report-page :deep(.app-page-header__actions > .ds-btn) { flex: 1 1 120px; width: auto; }
}
</style>
