<template>
  <div class="report-page">
    <AppPageHeader
      :title="spec.title"
      :breadcrumbs="['Relatórios', spec.group, spec.title]"
      :subtitle="spec.subtitle"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadReport">Atualizar</DsButton>
        <DsButton
          v-if="spec.exportable"
          variant="primary"
          :loading="exporting"
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

    <section class="report-filters">
      <DsInput
        v-model="filters.dateFrom"
        type="date"
        :label="isAuditAppointments ? 'Data início' : 'De'"
      />
      <DsInput
        v-model="filters.dateTo"
        type="date"
        :label="isAuditAppointments ? 'Data fim' : 'Até'"
      />
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
          label="Número ou observação"
          placeholder="Número da comanda ou texto da observação"
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

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
    </DsAlert>

    <DsAlert v-if="spec.note" variant="info">
      {{ spec.note }}
    </DsAlert>

    <section class="report-kpis">
      <DsStatCard
        v-for="card in cards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
      />
    </section>

    <DsCard :title="spec.tableTitle">
      <DataTable
        :columns="spec.columns"
        :rows="rows"
        :loading="loading"
        :empty-icon="spec.icon"
        :empty-title="spec.emptyTitle"
        :empty-description="spec.emptyDescription"
        :caption="isChequesReport ? 'Cheques' : undefined"
        variant="hoverable"
      >
        <template #cell-amount="{ row }">
          {{ formatCurrency(numberValue(row, 'amount')) }}
        </template>
        <template #cell-total="{ row }">
          {{ formatCurrency(numberValue(row, 'total')) }}
        </template>
        <template #cell-numero="{ row }">
          {{ numberValue(row, 'numero') }}
        </template>
        <template #cell-competencia="{ row }">
          {{ formatDate(stringValue(row, 'competencia')) }}
        </template>
        <template #cell-serviceSubtotal="{ row }">
          {{ formatCurrency(numberValue(row, 'serviceSubtotal')) }}
        </template>
        <template #cell-totalIss="{ row }">
          {{ formatCurrency(numberValue(row, 'totalIss')) }}
        </template>
        <template #cell-totalPis="{ row }">
          {{ formatCurrency(numberValue(row, 'totalPis')) }}
        </template>
        <template #cell-totalCofins="{ row }">
          {{ formatCurrency(numberValue(row, 'totalCofins')) }}
        </template>
        <template #cell-totalCsll="{ row }">
          {{ formatCurrency(numberValue(row, 'totalCsll')) }}
        </template>
        <template #cell-totalIrrf="{ row }">
          {{ formatCurrency(numberValue(row, 'totalIrrf')) }}
        </template>
        <template #cell-totalInss="{ row }">
          {{ formatCurrency(numberValue(row, 'totalInss')) }}
        </template>
        <template #cell-totalDocument="{ row }">
          {{ formatCurrency(numberValue(row, 'totalDocument')) }}
        </template>
        <template #cell-revenue="{ row }">
          {{ formatCurrency(numberValue(row, 'revenue')) }}
        </template>
        <template #cell-basePrice="{ row }">
          {{ formatCurrency(numberValue(row, 'basePrice')) }}
        </template>
        <template #cell-unitCostAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'unitCostAmount')) }}
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
          {{ formatCurrency(numberValue(row, 'stockValue')) }}
        </template>
        <template #cell-costAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'costAmount')) }}
        </template>
        <template #cell-receivedAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'receivedAmount')) }}
        </template>
        <template #cell-payableAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'payableAmount')) }}
        </template>
        <template #cell-paidAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'paidAmount')) }}
        </template>
        <template #cell-totalAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'totalAmount')) }}
        </template>
        <template #cell-amountOriginal="{ row }">
          {{ formatCurrency(numberValue(row, 'amountOriginal')) }}
        </template>
        <template #cell-originalAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'originalAmount')) }}
        </template>
        <template #cell-compensatedAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'compensatedAmount')) }}
        </template>
        <template #cell-balance="{ row }">
          {{ formatCurrency(numberValue(row, 'balance')) }}
        </template>
        <template #cell-outstandingAmount="{ row }">
          {{ formatCurrency(numberValue(row, 'outstandingAmount')) }}
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
          {{ formatCurrency(numberValue(row, 'openingAmount')) }}
        </template>
        <template #cell-closingAmount="{ row }">
          {{ formatNullableCurrency(row, 'closingAmount') }}
        </template>
        <template #cell-runningBalance="{ row }">
          {{ formatCurrency(numberValue(row, 'runningBalance')) }}
        </template>
        <template #cell-difference="{ row }">
          {{ formatNullableCurrency(row, 'difference') }}
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import {
  administrativeReportsService,
  type AdministrativeReportsResponse
} from '@/services/administrativeReports';
import { auditService } from '@/services/audit';
import { saveBrowserDownload, withDownloadTimeout } from '@/services/download';
import {
  financialPayablesService,
  type FinancialPayableRecord
} from '@/services/financialPayables';
import { financialReceivablesService } from '@/services/financialReceivables';
import { reportsService, type ReportExecutionDetail } from '@/services/reports';
import type { FinancialReceivableListItem } from '@/types/financialReceivables';
import { patientStatusLabel, sexLabel, speciesLabel } from '@/utils/labels';
import { buildReportCsv } from '@/utils/report-export';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';

type ReportKey =
  | 'audit-appointments'
  | 'cash-drawer'
  | 'cash-flow'
  | 'dre'
  | 'packages'
  | 'accounts-receivable'
  | 'received-accounts'
  | 'accounts-payable'
  | 'paid-accounts'
  | 'cheques'
  | 'advance-payments'
  | 'sales-counter-sales'
  | 'produced-items'
  | 'production'
  | 'appointments'
  | 'professional-care'
  | 'service-invoices'
  | 'register-services'
  | 'register-owners'
  | 'register-patients'
  | 'register-suppliers'
  | 'deleted-sales-counter-sales'
  | 'inventory-stock'
  | 'inventory-movements'
  | 'inventory-invoices'
  | 'inventory-products';

interface ReportSpec {
  title: string;
  group: string;
  subtitle: string;
  icon: string;
  primaryPath: string;
  primaryAction: string;
  primaryDisabled?: boolean;
  exportable?: boolean;
  serverReportId?: string;
  tableTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  note?: string;
  columns: DataTableColumn[];
  cards: (report: AdministrativeReportsResponse | null) => ReportCard[];
  rows: (report: AdministrativeReportsResponse | null) => DataTableRow[];
}

interface ReportCard {
  label: string;
  value: string;
  icon: string;
}

interface ChequeReportRow extends Record<string, unknown> {
  readonly paymentId: string;
  readonly counterSaleId: string;
  readonly saleNumber: string;
  readonly saleStatus: string;
  readonly reference: string | null;
  readonly amount: number;
  readonly installments: number;
  readonly recordedAt: string;
  readonly notes: string | null;
}

interface AdvancePaymentReportRow extends Record<string, unknown> {
  readonly paymentId: string;
  readonly ownerName: string;
  readonly documentId: string;
  readonly issuedAt: string;
  readonly originalAmount: number;
  readonly compensatedAmount: number;
  readonly balance: number;
  readonly origin: string;
  readonly status: 'available' | 'partially_compensated' | 'compensated';
  readonly notes: string;
}

interface SupplierReportRow extends Record<string, unknown> {
  readonly code: string;
  readonly name: string;
  readonly kind: string;
  readonly category: string;
  readonly costCenterCode: string;
  readonly costCenterName: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface DeletedSalesReportRow extends Record<string, unknown> {
  readonly number: string;
  readonly status: 'cancelled';
  readonly ownerId: string | null;
  readonly openedByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly total: number;
  readonly discountAmount: number;
  readonly paidAmount: number;
  readonly balanceDue: number;
  readonly notes: string | null;
}

interface InventoryProductReportRow extends Record<string, unknown> {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface InventoryStockReportRow extends Record<string, unknown> {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
  readonly stockValue: number;
  readonly reorderStatus: 'below_reorder_level' | 'adequate';
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface InventoryMovementReportRow extends Record<string, unknown> {
  readonly movementId: string;
  readonly occurredAt: string;
  readonly movementType: 'adjustment' | 'inbound' | 'outbound' | 'transfer' | 'consumption';
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly quantityDelta: number;
  readonly balanceBefore: number;
  readonly balanceAfter: number;
  readonly unitCostAmount: number;
  readonly reason: string;
  readonly reference: string;
  readonly recordedByUserId: string;
}

interface InventoryPurchaseReportRow extends Record<string, unknown> {
  readonly purchaseId: string;
  readonly invoiceNumber: string;
  readonly supplierName: string;
  readonly status: 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled';
  readonly totalAmount: number;
  readonly receivedAmount: number;
  readonly payableId: string | null;
  readonly createdByUserId: string;
  readonly approvedByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly receivedAt: string | null;
}

interface ServiceInvoiceReportRow extends Record<string, unknown> {
  readonly documentId: string;
  readonly serie: string;
  readonly numero: number;
  readonly competencia: string;
  readonly status: 'draft' | 'issued' | 'cancelled' | 'error';
  readonly customerName: string;
  readonly customerDocument: string;
  readonly provider: string;
  readonly serviceDescriptions: string;
  readonly serviceCodes: string;
  readonly serviceQuantity: number;
  readonly serviceSubtotal: number;
  readonly totalIss: number;
  readonly totalPis: number;
  readonly totalCofins: number;
  readonly totalCsll: number;
  readonly totalIrrf: number;
  readonly totalInss: number;
  readonly totalDocument: number;
  readonly observations: string;
  readonly createdAt: string;
  readonly authorizationCode: string;
}

interface AppointmentReportRow extends Record<string, unknown> {
  readonly appointmentId: string;
  readonly scheduledAt: string;
  readonly status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled';
  readonly reason: string;
  readonly patientId: string;
  readonly ownerId: string;
  readonly practitionerStaffId: string | null;
  readonly serviceId: string | null;
  readonly unit: string | null;
  readonly specialty: string | null;
  readonly resourceLabel: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ProfessionalCareReportRow extends Record<string, unknown> {
  readonly professional: string;
  readonly scheduled: number;
  readonly completed: number;
  readonly checkedIn: number;
  readonly cancelled: number;
  readonly services: number;
}

interface RegisterServicesReportRow extends Record<string, unknown> {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly basePrice: number;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
}

interface RegisterOwnersReportRow extends Record<string, unknown> {
  readonly documentId: string;
  readonly fullName: string;
  readonly primaryContact: string;
  readonly city: string;
  readonly financialResponsible: 'Sim' | 'Não';
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
}

interface RegisterPatientsReportRow extends Record<string, unknown> {
  readonly code: string;
  readonly name: string;
  readonly species: string;
  readonly breed: string;
  readonly sex: 'male' | 'female' | 'unknown';
  readonly microchip: string;
  readonly status: 'active' | 'inactive' | 'deceased';
  readonly createdAt: string;
}

const props = defineProps<{
  reportKey: ReportKey;
}>();

const loading = ref(false);
const exporting = ref(false);
const error = ref('');
const success = ref('');
const report = ref<AdministrativeReportsResponse | null>(null);
const auditEvents = ref<AuditEventSummary[]>([]);
const services = ref<RegisterServicesReportRow[]>([]);
const owners = ref<RegisterOwnersReportRow[]>([]);
const patients = ref<RegisterPatientsReportRow[]>([]);
const suppliers = ref<SupplierReportRow[]>([]);
const financialPayables = ref<FinancialPayableRecord[]>([]);
const financialReceivables = ref<FinancialReceivableListItem[]>([]);
const appointmentReportExecution = ref<ReportExecutionDetail | null>(null);
const professionalCareReportExecution = ref<ReportExecutionDetail | null>(null);
const chequeReportExecution = ref<ReportExecutionDetail | null>(null);
const advancePaymentReportExecution = ref<ReportExecutionDetail | null>(null);
const deletedSalesReportExecution = ref<ReportExecutionDetail | null>(null);
const serviceInvoiceReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryProductReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryStockReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryMovementReportExecution = ref<ReportExecutionDetail | null>(null);
const inventoryInvoiceReportExecution = ref<ReportExecutionDetail | null>(null);
const filters = ref({
  dateFrom: '',
  dateTo: '',
  search: '',
  status: '',
  client: '',
  user: '',
  action: '',
  type: ''
});

const APPOINTMENT_AUDIT_ENTITY_TYPES = [
  'appointment',
  'appointment-recommendation',
  'appointment-sync'
];

const money = (value: number | undefined | null) => formatCurrency(value ?? 0);
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

const specs: Record<ReportKey, ReportSpec> = {
  'audit-appointments': {
    title: 'Auditoria de Agendamentos',
    group: 'Relatórios de Auditorias',
    subtitle: 'Relatório Vetus-like de alterações, usuários e tipos ligados aos agendamentos',
    icon: '🧾',
    primaryPath: '/audit',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Eventos de agenda auditados',
    emptyTitle: 'Nenhum agendamento auditado encontrado',
    emptyDescription:
      'Ajuste Data início, Data fim, Cliente, Usuário, Ação ou Tipo para localizar eventos de agenda.',
    note: 'A rota Vetus observada expõe filtros Data início, Data fim, Cliente, Usuário, Ação e Tipo. Exporta CSV dos eventos carregados; a exportação integral Vetus permanece pendente.',
    columns: [
      { key: 'occurredAt', label: 'Data' },
      { key: 'actorId', label: 'Usuário' },
      { key: 'action', label: 'Ação' },
      { key: 'entityType', label: 'Tipo' },
      { key: 'entityId', label: 'Agendamento' },
      { key: 'payloadSummary', label: 'Resumo' }
    ],
    cards: () => [],
    rows: () => []
  },
  'cash-drawer': {
    title: 'Gaveta',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de gavetas, saldos e conferência de caixa',
    icon: '🧾',
    primaryPath: '/cash',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Gavetas no período',
    emptyTitle: 'Sem gavetas no período',
    emptyDescription:
      'Gavetas abertas ou fechadas aparecem aqui quando houver movimento de caixa no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/GavetaRelatorio.htm. Exporta CSV das gavetas carregadas; esta visão é somente leitura e não abre, fecha ou movimenta caixa.',
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'openedAt', label: 'Abertura' },
      { key: 'closedAt', label: 'Fechamento' },
      { key: 'openingAmount', label: 'Abertura' },
      { key: 'closingAmount', label: 'Fechamento' },
      { key: 'runningBalance', label: 'Saldo' },
      { key: 'difference', label: 'Diferença' }
    ],
    cards: (current) => [
      {
        label: 'Gavetas no período',
        value: count(current?.domains.cash.registerCount),
        icon: '🧾'
      },
      {
        label: 'Gaveta aberta',
        value: current?.domains.cash.hasOpenRegister ? 'Sim' : 'Não',
        icon: '🏦'
      },
      { label: 'Saldo aberto', value: money(current?.executive.openCashBalance), icon: '💰' }
    ],
    rows: (current) =>
      (current?.domains.cash.recentRegisters ?? []).map((row) => ({
        ...row,
        id: row.id
      })) as unknown as DataTableRow[]
  },
  'cash-flow': {
    title: 'Fluxo de Caixa',
    group: 'Relatórios Financeiros',
    subtitle:
      'Relatório financeiro legacy de comportamento temporal de entradas, recebíveis e caixa',
    icon: '📈',
    primaryPath: '/finance/cash-flow',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Indicadores do fluxo',
    emptyTitle: 'Sem fluxo consolidado',
    emptyDescription: 'Entradas, recebíveis e caixa aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/FluxoDeCaixaRelatorio.htm. Exporta CSV dos indicadores carregados; esta visão é somente leitura e não baixa nem concilia fluxo.',
    columns: [
      { key: 'nature', label: 'Natureza' },
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      {
        label: 'Receita comercial',
        value: money(current?.executive.commercialRevenue),
        icon: '📈'
      },
      {
        label: 'Recebíveis abertos',
        value: money(current?.executive.outstandingReceivables),
        icon: '💵'
      },
      { label: 'Saldo aberto', value: money(current?.executive.openCashBalance), icon: '🏦' }
    ],
    rows: (current) =>
      [
        {
          id: 'commercial-revenue',
          nature: 'Entrada',
          label: 'Receita comercial consolidada',
          amount: current?.executive.commercialRevenue ?? 0,
          scope: 'Comercial'
        },
        {
          id: 'pix-completed',
          nature: 'Entrada',
          label: 'PIX concluídos',
          amount: current?.domains.financial.pix.completedAmount ?? 0,
          scope: 'PIX'
        },
        {
          id: 'receivables-open',
          nature: 'Previsto',
          label: 'Recebíveis em aberto',
          amount: current?.executive.outstandingReceivables ?? 0,
          scope: 'Contas a Receber'
        },
        {
          id: 'open-cash',
          nature: 'Saldo',
          label: 'Saldo da gaveta aberta',
          amount: current?.executive.openCashBalance ?? 0,
          scope: 'Gaveta'
        }
      ] as DataTableRow[]
  },
  dre: {
    title: 'DRE - Demonstrativo de Resultados',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de resultado econômico consolidado',
    icon: '💰',
    primaryPath: '/dashboards/financial',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Resultado consolidado',
    emptyTitle: 'Sem resultado consolidado',
    emptyDescription: 'Receitas, recebíveis e caixa aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/DRE.htm. Exporta CSV do recorte consolidado carregado, sem simular uma DRE contábil completa. Despesas e resultado contábil completo dependem de fonte específica ainda não exposta pelo hub atual.',
    columns: [
      { key: 'group', label: 'Grupo' },
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      {
        label: 'Receita comercial',
        value: money(current?.executive.commercialRevenue),
        icon: '📈'
      },
      {
        label: 'Faturamento bruto',
        value: money(current?.domains.financial.billing.grossAmount),
        icon: '🧾'
      },
      {
        label: 'Pipeline comercial',
        value: money(current?.executive.quotePipelineAmount),
        icon: '📋'
      }
    ],
    rows: (current) =>
      [
        {
          id: 'commercial-revenue',
          group: 'Receita',
          label: 'Receita comercial consolidada',
          amount: current?.executive.commercialRevenue ?? 0,
          scope: 'Comercial'
        },
        {
          id: 'billing-gross',
          group: 'Receita',
          label: 'Faturamento bruto registrado',
          amount: current?.domains.financial.billing.grossAmount ?? 0,
          scope: 'Faturamento'
        },
        {
          id: 'open-receivables',
          group: 'Ativo/Previsto',
          label: 'Recebíveis em aberto',
          amount: current?.executive.outstandingReceivables ?? 0,
          scope: 'Contas a Receber'
        },
        {
          id: 'quote-pipeline',
          group: 'Previsto',
          label: 'Pipeline comercial',
          amount: current?.executive.quotePipelineAmount ?? 0,
          scope: 'Orçamentos'
        },
        {
          id: 'open-cash',
          group: 'Caixa',
          label: 'Saldo da gaveta aberta',
          amount: current?.executive.openCashBalance ?? 0,
          scope: 'Gaveta'
        }
      ] as DataTableRow[]
  },
  packages: {
    title: 'Pacotes',
    group: 'Relatórios Financeiros',
    subtitle:
      'Relatório financeiro legacy de pacotes, receita relacionada e uso comercial disponível',
    icon: '📦',
    primaryPath: '/packages',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Indicadores de pacotes',
    emptyTitle: 'Sem pacote consolidado',
    emptyDescription:
      'Indicadores relacionados a pacotes aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/PacoteRelatorio.htm. Exporta CSV dos indicadores comerciais carregados; não cria pacotes nem baixa títulos. O hub financeiro ainda não expõe fonte exclusiva de pacotes, então a tela não simula registros.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'value', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      {
        label: 'Receita comercial',
        value: money(current?.executive.commercialRevenue),
        icon: '📈'
      },
      {
        label: 'Pipeline comercial',
        value: money(current?.executive.quotePipelineAmount),
        icon: '🧾'
      },
      {
        label: 'Vendas fechadas',
        value: count(current?.domains.commercial.counterSales.closedCount),
        icon: '✅'
      }
    ],
    rows: (current) => [
      {
        id: 'revenue',
        label: 'Receita comercial relacionada',
        value: money(current?.executive.commercialRevenue),
        scope: 'Comercial'
      },
      {
        id: 'pipeline',
        label: 'Pipeline comercial relacionado',
        value: money(current?.executive.quotePipelineAmount),
        scope: 'Orçamentos'
      },
      {
        id: 'sales',
        label: 'Vendas fechadas relacionadas',
        value: count(current?.domains.commercial.counterSales.closedCount),
        scope: 'Comandas/Vendas'
      }
    ]
  },
  'accounts-receivable': receivableSpec(
    'Contas a Receber',
    'Recebíveis em aberto por tutor e paciente',
    'open'
  ),
  'received-accounts': receivableSpec(
    'Contas Recebidas',
    'Recebíveis liquidados por tutor e paciente',
    'received'
  ),
  'accounts-payable': accountsPayableReportSpec(),
  'paid-accounts': paidAccountsReportSpec(),
  cheques: chequesReportSpec(),
  'advance-payments': advancePaymentsReportSpec(),
  'sales-counter-sales': salesCounterSalesReportSpec(),
  'produced-items': producedItemsReportSpec(),
  production: productionReportSpec(),
  appointments: appointmentsReportSpec(),
  'professional-care': professionalCareReportSpec(),
  'service-invoices': serviceInvoicesReportSpec(),
  'register-services': registerServicesReportSpec(),
  'register-owners': registerOwnersReportSpec(),
  'register-patients': registerPatientsReportSpec(),
  'register-suppliers': registerSuppliersReportSpec(),
  'deleted-sales-counter-sales': deletedSalesCounterSalesReportSpec(),
  'inventory-stock': inventoryStockReportSpec(),
  'inventory-movements': inventoryMovementsReportSpec(),
  'inventory-invoices': inventoryInvoicesReportSpec(),
  'inventory-products': inventoryProductsReportSpec()
};

const spec = computed(() => specs[props.reportKey]);
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
const filteredFinancialPayables = computed(() =>
  financialPayables.value.filter((payable) => {
    if (isPaidAccountsReport.value && payable.status !== 'paid') return false;
    const dueAt = payable.dueAt.slice(0, 10);
    if (filters.value.dateFrom && dueAt < filters.value.dateFrom) return false;
    if (filters.value.dateTo && dueAt > filters.value.dateTo) return false;
    return true;
  })
);
const filteredFinancialReceivables = computed(() =>
  financialReceivables.value.filter((receivable) => {
    const expectedStatus = isReceivedAccountsReport.value ? 'settled' : 'open';
    if (receivable.status !== expectedStatus) return false;
    const reportDate = (
      expectedStatus === 'settled'
        ? (receivable.settledAt ?? receivable.issuedAt)
        : (receivable.dueAt ?? receivable.issuedAt)
    ).slice(0, 10);
    if (filters.value.dateFrom && reportDate < filters.value.dateFrom) return false;
    if (filters.value.dateTo && reportDate > filters.value.dateTo) return false;
    return true;
  })
);
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
  if (isDeletedSalesCounterSalesReport.value) return deletedSalesCounterSalesReportCards.value;
  if (isInventoryStockReport.value) return inventoryStockReportCards.value;
  if (isInventoryMovementsReport.value) return inventoryMovementsReportCards.value;
  if (isInventoryInvoicesReport.value) return inventoryInvoicesReportCards.value;
  if (isInventoryProductsReport.value) return inventoryProductsReportCards.value;
  return spec.value.cards(report.value);
});
const rows = computed(() => {
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
  if (isDeletedSalesCounterSalesReport.value) return deletedSalesCounterSalesReportRows.value;
  if (isInventoryStockReport.value) return inventoryStockReportRows.value;
  if (isInventoryMovementsReport.value) return inventoryMovementsReportRows.value;
  if (isInventoryInvoicesReport.value) return inventoryInvoicesReportRows.value;
  if (isInventoryProductsReport.value) return inventoryProductsReportRows.value;
  return spec.value.rows(report.value);
});
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
const deletedSalesReportRows = computed<DeletedSalesReportRow[]>(() =>
  (deletedSalesReportExecution.value?.rows ?? []).filter(isDeletedSalesReportRow)
);
const deletedSalesCounterSalesReportRows = computed<DataTableRow[]>(() =>
  deletedSalesReportRows.value.map((row) => ({
    ...row,
    id: row.number,
    status: row.status === 'cancelled' ? 'Cancelado' : row.status
  }))
);
const deletedSalesCounterSalesReportCards = computed<ReportCard[]>(() => {
  const cancelledSales = deletedSalesReportRows.value;
  const cancelledAmount = cancelledSales.reduce((total, sale) => total + sale.total, 0);
  const discountAmount = cancelledSales.reduce((total, sale) => total + sale.discountAmount, 0);
  const withBalanceCount = cancelledSales.filter((sale) => sale.balanceDue > 0).length;
  return [
    { label: 'Exclusões registradas', value: count(cancelledSales.length), icon: '🧾' },
    { label: 'Valor cancelado', value: money(cancelledAmount), icon: '💸' },
    { label: 'Descontos cancelados', value: money(discountAmount), icon: '🏷️' },
    { label: 'Com saldo aberto', value: count(withBalanceCount), icon: '⚠️' }
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
  loading.value = true;
  error.value = '';
  success.value = '';
  if (isAppointmentsReport.value) appointmentReportExecution.value = null;
  if (isProfessionalCareReport.value) professionalCareReportExecution.value = null;
  if (isChequesReport.value) chequeReportExecution.value = null;
  if (isAdvancePaymentsReport.value) advancePaymentReportExecution.value = null;
  if (isServiceInvoicesReport.value) serviceInvoiceReportExecution.value = null;
  if (isDeletedSalesCounterSalesReport.value) deletedSalesReportExecution.value = null;
  if (isInventoryProductsReport.value) inventoryProductReportExecution.value = null;
  if (isInventoryStockReport.value) inventoryStockReportExecution.value = null;
  if (isInventoryMovementsReport.value) inventoryMovementReportExecution.value = null;
  if (isInventoryInvoicesReport.value) inventoryInvoiceReportExecution.value = null;
  if (isRegisterServicesReport.value) services.value = [];
  if (isRegisterOwnersReport.value) owners.value = [];
  if (isRegisterPatientsReport.value) patients.value = [];
  if (isRegisterSuppliersReport.value) suppliers.value = [];
  try {
    if (isAuditAppointments.value) {
      auditEvents.value = await auditService.listEvents({
        entityTypes: APPOINTMENT_AUDIT_ENTITY_TYPES,
        limit: 200
      });
      report.value = null;
    } else if (isAppointmentsReport.value) {
      const execution = await reportsService.execute({
        reportId: 'scheduling-appointments',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isAppointmentReportRow(row))) {
        throw new Error('Resposta inválida do relatório de agendamentos');
      }
      appointmentReportExecution.value = execution;
      report.value = null;
    } else if (isProfessionalCareReport.value) {
      const execution = await reportsService.execute({
        reportId: 'scheduling-professional-care',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isProfessionalCareReportRow(row))) {
        throw new Error('Resposta inválida do relatório por profissional');
      }
      professionalCareReportExecution.value = execution;
      report.value = null;
    } else if (isFinancialReceivablesReport.value) {
      financialReceivables.value = [];
      financialReceivables.value = await listAllFinancialReceivables(
        isReceivedAccountsReport.value ? 'settled' : 'open'
      );
      report.value = null;
    } else if (isFinancialPayablesReport.value) {
      financialPayables.value = [];
      financialPayables.value = await listAllFinancialPayables(
        isPaidAccountsReport.value ? 'paid' : ''
      );
      report.value = null;
    } else if (isChequesReport.value) {
      const execution = await reportsService.execute({
        reportId: 'financial-cheques',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isChequeReportRow(row))) {
        throw new Error('Resposta inválida do relatório de cheques');
      }
      chequeReportExecution.value = execution;
      report.value = null;
    } else if (isAdvancePaymentsReport.value) {
      const execution = await reportsService.execute({
        reportId: 'financial-advance-payments',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isAdvancePaymentReportRow(row))) {
        throw new Error('Resposta inválida do relatório de pagamentos antecipados');
      }
      advancePaymentReportExecution.value = execution;
      report.value = null;
    } else if (isServiceInvoicesReport.value) {
      const execution = await reportsService.execute({
        reportId: 'fiscal-service-invoices',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isServiceInvoiceReportRow(row))) {
        throw new Error('Resposta inválida do relatório de NF de serviços prestados');
      }
      serviceInvoiceReportExecution.value = execution;
      report.value = null;
    } else if (isRegisterServicesReport.value) {
      const execution = await reportsService.execute({
        reportId: 'registration-services',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isRegisterServicesReportRow(row))) {
        throw new Error('Resposta inválida do relatório de serviços');
      }
      services.value = execution.rows.filter(isRegisterServicesReportRow);
      report.value = null;
    } else if (isRegisterOwnersReport.value) {
      const execution = await reportsService.execute({
        reportId: 'registration-owners',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isRegisterOwnersReportRow(row))) {
        throw new Error('Resposta inválida do relatório de clientes');
      }
      owners.value = execution.rows.filter(isRegisterOwnersReportRow);
      report.value = null;
    } else if (isRegisterPatientsReport.value) {
      const execution = await reportsService.execute({
        reportId: 'registration-patients',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isRegisterPatientsReportRow(row))) {
        throw new Error('Resposta inválida do relatório de animais');
      }
      patients.value = execution.rows.filter(isRegisterPatientsReportRow);
      report.value = null;
    } else if (isRegisterSuppliersReport.value) {
      const execution = await reportsService.execute({
        reportId: 'registration-suppliers',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isSupplierReportRow(row))) {
        throw new Error('Resposta inválida do relatório de fornecedores e despesas');
      }
      suppliers.value = execution.rows.filter(isSupplierReportRow);
      report.value = null;
    } else if (isDeletedSalesCounterSalesReport.value) {
      const execution = await reportsService.execute({
        reportId: 'commercial-deleted-sales',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isDeletedSalesReportRow(row))) {
        throw new Error('Resposta inválida do relatório de vendas canceladas');
      }
      deletedSalesReportExecution.value = execution;
      report.value = null;
    } else if (isInventoryProductsReport.value) {
      const execution = await reportsService.execute({
        reportId: 'inventory-products',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isInventoryProductReportRow(row))) {
        throw new Error('Resposta inválida do relatório de produtos de estoque');
      }
      inventoryProductReportExecution.value = execution;
      report.value = null;
    } else if (isInventoryStockReport.value) {
      const execution = await reportsService.execute({
        reportId: 'inventory-stock',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isInventoryStockReportRow(row))) {
        throw new Error('Resposta inválida do relatório de estoque');
      }
      inventoryStockReportExecution.value = execution;
      report.value = null;
    } else if (isInventoryMovementsReport.value) {
      const execution = await reportsService.execute({
        reportId: 'inventory-movements',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isInventoryMovementReportRow(row))) {
        throw new Error('Resposta inválida do relatório de movimentações de estoque');
      }
      inventoryMovementReportExecution.value = execution;
      report.value = null;
    } else if (isInventoryInvoicesReport.value) {
      const execution = await reportsService.execute({
        reportId: 'inventory-invoices',
        filters: buildServerReportFilters()
      });
      if (execution.rows.some((row) => !isInventoryPurchaseReportRow(row))) {
        throw new Error('Resposta inválida do relatório de entradas de compras');
      }
      inventoryInvoiceReportExecution.value = execution;
      report.value = null;
    } else {
      report.value = await administrativeReportsService.getHubs({
        dateFrom: filters.value.dateFrom || undefined,
        dateTo: filters.value.dateTo || undefined
      });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar relatório';
  } finally {
    loading.value = false;
  }
}

async function listAllFinancialPayables(status: '' | 'paid'): Promise<FinancialPayableRecord[]> {
  const pageSize = 100;
  const all: FinancialPayableRecord[] = [];
  let page = 1;

  while (true) {
    const response = await financialPayablesService.list({ status, page, pageSize });
    all.push(...response.data);
    if (response.data.length === 0 || all.length >= response.total) return all;
    page += 1;
  }
}

async function listAllFinancialReceivables(
  status: '' | 'open' | 'settled'
): Promise<FinancialReceivableListItem[]> {
  const pageSize = 100;
  const all: FinancialReceivableListItem[] = [];
  let page = 1;

  while (true) {
    const response = await financialReceivablesService.list({ status, page, pageSize });
    all.push(...response.data);
    if (response.data.length === 0 || all.length >= response.total) return all;
    page += 1;
  }
}

async function exportCurrentReport(): Promise<void> {
  if (!spec.value.exportable || exporting.value) return;

  exporting.value = true;
  error.value = '';
  success.value = '';

  try {
    if (spec.value.serverReportId) {
      const { execution, exported } = await withDownloadTimeout(async () => {
        const execution = await reportsService.execute({
          reportId: spec.value.serverReportId!,
          filters: buildServerReportFilters()
        });
        const exported = await reportsService.exportExecution(execution.id, 'csv');
        return { execution, exported };
      });
      saveBrowserDownload(exported);
      success.value = `Exportação server-side auditada gerada com ${execution.rowCount} linha(s).`;
      return;
    }

    const csv = buildReportCsv(spec.value.columns, rows.value);
    saveBrowserDownload({
      content: csv,
      contentType: 'text/csv;charset=utf-8',
      filename: buildReportFilename(spec.value.title)
    });
    success.value = `Exportação CSV gerada com ${rows.value.length} linha(s).`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível exportar o relatório';
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
  void loadReport();
}

function matchesAuditFilters(event: AuditEventSummary): boolean {
  const clientNeedle = filters.value.client.trim().toLowerCase();
  const userNeedle = filters.value.user.trim().toLowerCase();
  const occurredAt = new Date(event.occurredAt);
  const fromDate = filters.value.dateFrom ? new Date(`${filters.value.dateFrom}T00:00:00`) : null;
  const toDate = filters.value.dateTo ? new Date(`${filters.value.dateTo}T23:59:59`) : null;
  const matchesDateFrom = !fromDate || occurredAt >= fromDate;
  const matchesDateTo = !toDate || occurredAt <= toDate;
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

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
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
          amount: 0,
          records: count(current?.domains.commercial.counterSales.openCount),
          scope: 'Operação de atendimento'
        },
        {
          id: 'cancelled-sales',
          label: 'Vendas canceladas',
          amount: 0,
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
      'Relatório legacy de mix operacional produzido por produtos, serviços, quantidade e receita',
    icon: '🛠️',
    primaryPath: '/sales',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Produtos e serviços produzidos',
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
      { label: 'Itens produzidos', value: count(producedItemRows(current).length), icon: '🛠️' }
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
      'Relatório legacy sintético de produtividade operacional, volume realizado e receita produzida',
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
        label: 'Produção fechada',
        value: count(current?.domains.commercial.counterSales.closedCount),
        icon: '✅'
      },
      {
        label: 'Receita produzida',
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
          label: 'Output operacional concluído',
          amount: dashboard.netRevenue,
          records: count(dashboard.closedCount),
          scope: 'Comandas/Vendas fechadas'
        },
        {
          id: 'gross-output',
          label: 'Volume bruto de produção comercial',
          amount: dashboard.grossRevenue,
          records: count(dashboard.totalSales),
          scope: 'Produção comercial'
        },
        {
          id: 'services-output',
          label: 'Serviços produzidos',
          amount: serviceRevenue,
          records: count(serviceQuantity),
          scope: 'Serviços'
        },
        {
          id: 'products-output',
          label: 'Produtos produzidos',
          amount: productRevenue,
          records: count(productQuantity),
          scope: 'Produtos'
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

function isDeletedSalesReportRow(row: Record<string, unknown>): row is DeletedSalesReportRow {
  return (
    typeof row.number === 'string' &&
    row.status === 'cancelled' &&
    (typeof row.ownerId === 'string' || row.ownerId === null) &&
    typeof row.openedByUserId === 'string' &&
    typeof row.createdAt === 'string' &&
    typeof row.updatedAt === 'string' &&
    typeof row.total === 'number' &&
    Number.isFinite(row.total) &&
    typeof row.discountAmount === 'number' &&
    Number.isFinite(row.discountAmount) &&
    typeof row.paidAmount === 'number' &&
    Number.isFinite(row.paidAmount) &&
    typeof row.balanceDue === 'number' &&
    Number.isFinite(row.balanceDue) &&
    (typeof row.notes === 'string' || row.notes === null)
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

function deletedSalesCounterSalesReportSpec(): ReportSpec {
  return {
    title: 'Exclusão de Vendas e Comandas',
    group: 'Relatórios de Cadastros',
    subtitle: 'Snapshot auditado de comandas atualmente canceladas; período pela data de abertura',
    icon: '🧾',
    primaryPath: '/counter-sales',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'commercial-deleted-sales',
    tableTitle: 'Vendas e comandas excluídas',
    emptyTitle: 'Sem venda ou comanda excluída',
    emptyDescription:
      'Exclusões aparecem aqui quando houver comandas ou vendas canceladas no período.',
    note: 'A rota Vetus observada é Sistema/Relatorio/ExclusaoVendaComandaRelatorio.htm. Esta visão usa apenas fatos persistidos de comandas atualmente canceladas; o filtro de período usa a data de abertura (createdAt), não um período de cancelamento. Não atribui usuário, motivo ou instante exato do cancelamento, não cancela venda, não reabre comanda, não altera pagamento e exporta um artefato server-side auditado.',
    columns: [
      { key: 'number', label: 'Número' },
      { key: 'status', label: 'Status' },
      { key: 'ownerId', label: 'Tutor (ID)' },
      { key: 'openedByUserId', label: 'Usuário de abertura (ID)' },
      { key: 'createdAt', label: 'Abertura' },
      { key: 'updatedAt', label: 'Última atualização' },
      { key: 'total', label: 'Total' },
      { key: 'discountAmount', label: 'Desconto' },
      { key: 'paidAmount', label: 'Pago' },
      { key: 'balanceDue', label: 'Saldo' },
      { key: 'notes', label: 'Observação' }
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
</style>
