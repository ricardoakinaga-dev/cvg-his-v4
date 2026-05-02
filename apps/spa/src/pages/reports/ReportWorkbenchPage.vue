<template>
  <div class="report-page">
    <AppPageHeader
      :title="spec.title"
      :breadcrumbs="['Relatórios', spec.group, spec.title]"
      :subtitle="spec.subtitle"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadReport">Atualizar</DsButton>
        <DsButton v-if="spec.primaryDisabled" variant="primary" disabled>{{ spec.primaryAction }}</DsButton>
        <DsButton v-else variant="primary" tag="a" :to="spec.primaryPath">{{ spec.primaryAction }}</DsButton>
      </template>
    </AppPageHeader>

    <section class="report-filters">
      <DsInput v-model="filters.dateFrom" type="date" :label="isAuditAppointments ? 'Data início' : 'De'" />
      <DsInput v-model="filters.dateTo" type="date" :label="isAuditAppointments ? 'Data fim' : 'Até'" />
      <template v-if="isAuditAppointments">
        <DsInput v-model="filters.client" label="Cliente" placeholder="Nome, animal ou id do agendamento" />
        <DsInput v-model="filters.user" label="Usuário" placeholder="Usuário ou ator auditado" />
        <label class="report-field">
          <span>Ação</span>
          <select v-model="filters.action">
            <option value="">Selecione a ação</option>
            <option v-for="action in auditActionOptions" :key="action" :value="action">{{ action }}</option>
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

    <DsAlert v-if="spec.note" variant="info">
      {{ spec.note }}
    </DsAlert>

    <section class="report-kpis">
      <DsStatCard v-for="card in cards" :key="card.label" :label="card.label" :value="card.value" :icon="card.icon" />
    </section>

    <DsCard :title="spec.tableTitle">
      <DataTable
        :columns="spec.columns"
        :rows="rows"
        :loading="loading"
        :empty-icon="spec.icon"
        :empty-title="spec.emptyTitle"
        :empty-description="spec.emptyDescription"
        variant="hoverable"
      >
        <template #cell-amount="{ row }">
          {{ formatCurrency(numberValue(row, 'amount')) }}
        </template>
        <template #cell-total="{ row }">
          {{ formatCurrency(numberValue(row, 'total')) }}
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
        <template #cell-dueAt="{ row }">
          {{ formatDate(stringValue(row, 'dueAt')) }}
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
import { appointmentService } from '@/services/appointment';
import { auditService } from '@/services/audit';
import {
  counterSalesService,
  type CounterSaleSummary
} from '@/services/counterSales';
import {
  expensesCatalogService,
  type ExpenseCatalogItem
} from '@/services/expensesCatalog';
import { inventoryService } from '@/services/inventory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { AppointmentSummary } from '@/types/appointment';
import type { InventoryConsumptionSummary, InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import { patientStatusLabel, sexLabel, speciesLabel } from '@/utils/labels';
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

const props = defineProps<{
  reportKey: ReportKey;
}>();

const loading = ref(false);
const error = ref('');
const report = ref<AdministrativeReportsResponse | null>(null);
const auditEvents = ref<AuditEventSummary[]>([]);
const appointments = ref<AppointmentSummary[]>([]);
const services = ref<ServiceSummary[]>([]);
const owners = ref<OwnerSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const suppliers = ref<ExpenseCatalogItem[]>([]);
const counterSales = ref<CounterSaleSummary[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const inventoryLots = ref<InventoryLotSummary[]>([]);
const inventoryConsumptions = ref<InventoryConsumptionSummary[]>([]);
const filters = ref({ dateFrom: '', dateTo: '', client: '', user: '', action: '', type: '' });

const APPOINTMENT_AUDIT_ENTITY_TYPES = ['appointment', 'appointment-recommendation', 'appointment-sync'];

const money = (value: number | undefined | null) => formatCurrency(value ?? 0);
const count = (value: number | undefined | null) => String(value ?? 0);

const specs: Record<ReportKey, ReportSpec> = {
  'audit-appointments': {
    title: 'Auditoria de Agendamentos',
    group: 'Relatórios de Auditorias',
    subtitle: 'Relatório Vetus-like de alterações, usuários e tipos ligados aos agendamentos',
    icon: '🧾',
    primaryPath: '/audit',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Eventos de agenda auditados',
    emptyTitle: 'Nenhum agendamento auditado encontrado',
    emptyDescription: 'Ajuste Data início, Data fim, Cliente, Usuário, Ação ou Tipo para localizar eventos de agenda.',
    note: 'A rota Vetus observada expõe filtros Data início, Data fim, Cliente, Usuário, Ação e Tipo, com ação Solicitar Excel. A exportação permanece bloqueada até existir contrato local auditável.',
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
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Gavetas no período',
    emptyTitle: 'Sem gavetas no período',
    emptyDescription: 'Gavetas abertas ou fechadas aparecem aqui quando houver movimento de caixa no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/GavetaRelatorio.htm. Esta visão é somente leitura e não abre, fecha ou movimenta caixa.',
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
      { label: 'Gavetas no período', value: count(current?.domains.cash.registerCount), icon: '🧾' },
      { label: 'Gaveta aberta', value: current?.domains.cash.hasOpenRegister ? 'Sim' : 'Não', icon: '🏦' },
      { label: 'Saldo aberto', value: money(current?.executive.openCashBalance), icon: '💰' }
    ],
    rows: (current) => (current?.domains.cash.recentRegisters ?? []).map((row) => ({
      ...row,
      id: row.id
    })) as unknown as DataTableRow[]
  },
  'cash-flow': {
    title: 'Fluxo de Caixa',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de comportamento temporal de entradas, recebíveis e caixa',
    icon: '📈',
    primaryPath: '/finance/cash-flow',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Indicadores do fluxo',
    emptyTitle: 'Sem fluxo consolidado',
    emptyDescription: 'Entradas, recebíveis e caixa aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/FluxoDeCaixaRelatorio.htm. Esta visão é somente leitura e não baixa, concilia ou exporta fluxo real.',
    columns: [
      { key: 'nature', label: 'Natureza' },
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Receita comercial', value: money(current?.executive.commercialRevenue), icon: '📈' },
      { label: 'Recebíveis abertos', value: money(current?.executive.outstandingReceivables), icon: '💵' },
      { label: 'Saldo aberto', value: money(current?.executive.openCashBalance), icon: '🏦' }
    ],
    rows: (current) => [
      { id: 'commercial-revenue', nature: 'Entrada', label: 'Receita comercial consolidada', amount: current?.executive.commercialRevenue ?? 0, scope: 'Comercial' },
      { id: 'pix-completed', nature: 'Entrada', label: 'PIX concluídos', amount: current?.domains.financial.pix.completedAmount ?? 0, scope: 'PIX' },
      { id: 'receivables-open', nature: 'Previsto', label: 'Recebíveis em aberto', amount: current?.executive.outstandingReceivables ?? 0, scope: 'Contas a Receber' },
      { id: 'open-cash', nature: 'Saldo', label: 'Saldo da gaveta aberta', amount: current?.executive.openCashBalance ?? 0, scope: 'Gaveta' }
    ] as DataTableRow[]
  },
  dre: {
    title: 'DRE - Demonstrativo de Resultados',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de resultado econômico consolidado',
    icon: '💰',
    primaryPath: '/dashboards/financial',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Resultado consolidado',
    emptyTitle: 'Sem resultado consolidado',
    emptyDescription: 'Receitas, recebíveis e caixa aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/DRE.htm. Esta visão é somente leitura e não fecha contabilidade, baixa títulos ou exporta DRE real. Despesas e resultado contábil completo dependem de fonte específica ainda não exposta pelo hub atual.',
    columns: [
      { key: 'group', label: 'Grupo' },
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Receita comercial', value: money(current?.executive.commercialRevenue), icon: '📈' },
      { label: 'Faturamento bruto', value: money(current?.domains.financial.billing.grossAmount), icon: '🧾' },
      { label: 'Pipeline comercial', value: money(current?.executive.quotePipelineAmount), icon: '📋' }
    ],
    rows: (current) => [
      { id: 'commercial-revenue', group: 'Receita', label: 'Receita comercial consolidada', amount: current?.executive.commercialRevenue ?? 0, scope: 'Comercial' },
      { id: 'billing-gross', group: 'Receita', label: 'Faturamento bruto registrado', amount: current?.domains.financial.billing.grossAmount ?? 0, scope: 'Faturamento' },
      { id: 'open-receivables', group: 'Ativo/Previsto', label: 'Recebíveis em aberto', amount: current?.executive.outstandingReceivables ?? 0, scope: 'Contas a Receber' },
      { id: 'quote-pipeline', group: 'Previsto', label: 'Pipeline comercial', amount: current?.executive.quotePipelineAmount ?? 0, scope: 'Orçamentos' },
      { id: 'open-cash', group: 'Caixa', label: 'Saldo da gaveta aberta', amount: current?.executive.openCashBalance ?? 0, scope: 'Gaveta' }
    ] as DataTableRow[]
  },
  packages: {
    title: 'Pacotes',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de pacotes, receita relacionada e uso comercial disponível',
    icon: '📦',
    primaryPath: '/packages',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Indicadores de pacotes',
    emptyTitle: 'Sem pacote consolidado',
    emptyDescription: 'Indicadores relacionados a pacotes aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/PacoteRelatorio.htm. Esta visão é somente leitura, não cria pacotes, não baixa títulos e não exporta relatório real. O hub financeiro ainda não expõe fonte exclusiva de pacotes, então a tela mostra apenas indicadores comerciais relacionados sem simular registros.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'value', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Receita comercial', value: money(current?.executive.commercialRevenue), icon: '📈' },
      { label: 'Pipeline comercial', value: money(current?.executive.quotePipelineAmount), icon: '🧾' },
      { label: 'Vendas fechadas', value: count(current?.domains.commercial.counterSales.closedCount), icon: '✅' }
    ],
    rows: (current) => [
      { id: 'revenue', label: 'Receita comercial relacionada', value: money(current?.executive.commercialRevenue), scope: 'Comercial' },
      { id: 'pipeline', label: 'Pipeline comercial relacionado', value: money(current?.executive.quotePipelineAmount), scope: 'Orçamentos' },
      { id: 'sales', label: 'Vendas fechadas relacionadas', value: count(current?.domains.commercial.counterSales.closedCount), scope: 'Comandas/Vendas' }
    ]
  },
  'accounts-receivable': receivableSpec('Contas a Receber', 'Recebíveis em aberto por tutor e paciente', 'open'),
  'received-accounts': receivedAccountsSpec(),
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
const isRegisterServicesReport = computed(() => props.reportKey === 'register-services');
const isRegisterOwnersReport = computed(() => props.reportKey === 'register-owners');
const isRegisterPatientsReport = computed(() => props.reportKey === 'register-patients');
const isRegisterSuppliersReport = computed(() => props.reportKey === 'register-suppliers');
const isDeletedSalesCounterSalesReport = computed(() => props.reportKey === 'deleted-sales-counter-sales');
const isInventoryStockReport = computed(() => props.reportKey === 'inventory-stock');
const isInventoryMovementsReport = computed(() => props.reportKey === 'inventory-movements');
const isInventoryInvoicesReport = computed(() => props.reportKey === 'inventory-invoices');
const isInventoryProductsReport = computed(() => props.reportKey === 'inventory-products');
const filteredAuditEvents = computed(() => auditEvents.value.filter((event) => matchesAuditFilters(event)));
const auditActionOptions = computed(() => uniqueSorted(auditEvents.value.map((event) => event.action)));
const auditTypeOptions = computed(() => uniqueSorted(auditEvents.value.map((event) => event.entityType)));
const cards = computed(() => {
  if (isAuditAppointments.value) return auditAppointmentCards.value;
  if (isAppointmentsReport.value) return appointmentReportCards.value;
  if (isProfessionalCareReport.value) return professionalCareReportCards.value;
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
  { label: 'Ações distintas', value: count(new Set(filteredAuditEvents.value.map((event) => event.action)).size), icon: '🧾' },
  { label: 'Usuários envolvidos', value: count(new Set(filteredAuditEvents.value.map((event) => event.actorId)).size), icon: '👤' }
]);
const auditAppointmentRows = computed<DataTableRow[]>(() =>
  filteredAuditEvents.value.map((event) => ({
    ...event,
    id: event.eventId
  })) as unknown as DataTableRow[]
);
const appointmentReportCards = computed<ReportCard[]>(() => [
  { label: 'Agendamentos', value: count(appointments.value.length), icon: '📅' },
  {
    label: 'Comparecimentos',
    value: count(appointments.value.filter((appointment) => ['checked_in', 'completed'].includes(appointment.status)).length),
    icon: '✅'
  },
  {
    label: 'Cancelamentos',
    value: count(appointments.value.filter((appointment) => appointment.status === 'cancelled').length),
    icon: '🚫'
  }
]);
const appointmentReportRows = computed<DataTableRow[]>(() =>
  appointments.value.map((appointment) => ({
    ...appointment,
    status: appointmentStatusLabel(appointment.status),
    practitioner: appointment.practitionerStaffId || 'Sem profissional',
    service: appointment.serviceId || 'Sem serviço',
    unit: appointment.unit || 'Sem unidade'
  })) as DataTableRow[]
);
const professionalCareReportRows = computed<DataTableRow[]>(() => professionalCareRows(appointments.value));
const professionalCareReportCards = computed<ReportCard[]>(() => {
  const rows = professionalCareReportRows.value;
  const completedCount = appointments.value.filter((appointment) => appointment.status === 'completed').length;
  return [
    { label: 'Profissionais atendendo', value: count(rows.length), icon: '🩺' },
    { label: 'Atendimentos executados', value: count(completedCount), icon: '✅' },
    { label: 'Agendamentos no período', value: count(appointments.value.length), icon: '📅' }
  ];
});
const registerServicesReportRows = computed<DataTableRow[]>(() =>
  services.value.map((service) => ({
    ...service,
    code: service.code || 'Sem código',
    description: service.description || 'Sem descrição',
    status: service.active ? 'Ativo' : 'Inativo'
  })) as DataTableRow[]
);
const registerServicesReportCards = computed<ReportCard[]>(() => {
  const activeCount = services.value.filter((service) => service.active).length;
  const inactiveCount = services.value.length - activeCount;
  const averagePrice = services.value.length
    ? services.value.reduce((total, service) => total + service.basePrice, 0) / services.value.length
    : 0;
  return [
    { label: 'Serviços cadastrados', value: count(services.value.length), icon: '🛠️' },
    { label: 'Serviços ativos', value: count(activeCount), icon: '✅' },
    { label: 'Preço médio', value: money(averagePrice), icon: '💰' },
    { label: 'Inativos', value: count(inactiveCount), icon: '📋' }
  ];
});
const registerOwnersReportRows = computed<DataTableRow[]>(() =>
  owners.value.map((owner) => ({
    id: owner.id,
    documentId: owner.documentId || 'Sem documento',
    fullName: owner.fullName,
    primaryContact: ownerPrimaryContact(owner),
    city: owner.address?.city || 'Sem cidade',
    financialResponsible: owner.financialResponsible ? 'Sim' : 'Não',
    status: owner.status === 'active' ? 'Ativo' : 'Inativo',
    createdAt: owner.createdAt
  })) as DataTableRow[]
);
const registerOwnersReportCards = computed<ReportCard[]>(() => {
  const activeCount = owners.value.filter((owner) => owner.status === 'active').length;
  const financialResponsibleCount = owners.value.filter((owner) => owner.financialResponsible).length;
  const withContactCount = owners.value.filter((owner) => owner.contacts.length > 0).length;
  return [
    { label: 'Clientes cadastrados', value: count(owners.value.length), icon: '👤' },
    { label: 'Clientes ativos', value: count(activeCount), icon: '✅' },
    { label: 'Responsáveis financeiros', value: count(financialResponsibleCount), icon: '💵' },
    { label: 'Com contato', value: count(withContactCount), icon: '📞' }
  ];
});
const registerPatientsReportRows = computed<DataTableRow[]>(() =>
  patients.value.map((patient) => ({
    id: patient.id,
    code: patient.legacyVetusId || patient.id,
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
const registerSuppliersReportRows = computed<DataTableRow[]>(() =>
  suppliers.value.map((supplier) => ({
    id: supplier.id,
    code: supplier.id,
    name: supplier.name,
    category: supplier.category || 'Sem categoria',
    kind: supplier.kind || 'Sem tipo',
    costCenter: supplier.costCenterName
      ? `${supplier.costCenterName} · ${supplier.costCenterCode}`
      : supplier.costCenterCode || 'Sem centro de custo',
    contact: supplierContactLabel(supplier)
  })) as DataTableRow[]
);
const registerSuppliersReportCards = computed<ReportCard[]>(() => {
  const supplierCount = suppliers.value.filter((supplier) => normalizeText(supplier.category).includes('fornecedor')).length;
  const expenseCount = suppliers.value.filter((supplier) => normalizeText(supplier.category).includes('despesa')).length;
  const withContactCount = suppliers.value.filter((supplier) => supplier.description.trim()).length;
  return [
    { label: 'Registros cadastrados', value: count(suppliers.value.length), icon: '📦' },
    { label: 'Fornecedores', value: count(supplierCount), icon: '🚚' },
    { label: 'Despesas', value: count(expenseCount), icon: '🧾' },
    { label: 'Com contato', value: count(withContactCount), icon: '☎️' }
  ];
});
const deletedSalesCounterSalesReportRows = computed<DataTableRow[]>(() =>
  counterSales.value
    .filter((sale) => sale.status === 'cancelled')
    .map((sale) => ({
      id: sale.id,
      number: sale.number,
      owner: sale.ownerId || 'Sem tutor vinculado',
      openedBy: sale.openedByUserId,
      createdAt: sale.createdAt,
      cancelledAt: sale.updatedAt,
      total: sale.total,
      discountAmount: sale.discountAmount,
      paidAmount: sale.paidAmount,
      balanceDue: sale.balanceDue,
      notes: sale.notes || 'Sem observação'
    })) as DataTableRow[]
);
const deletedSalesCounterSalesReportCards = computed<ReportCard[]>(() => {
  const cancelledSales = counterSales.value.filter((sale) => sale.status === 'cancelled');
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
  inventoryItems.value.map((item) => {
    const lots = inventoryLots.value.filter((lot) => lot.inventoryItemId === item.id);
    return {
      id: item.id,
      sku: item.sku || item.id,
      name: item.name,
      onHandQuantity: item.onHandQuantity,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      unitCostAmount: item.unitCostAmount,
      stockValue: item.onHandQuantity * item.unitCostAmount,
      lotCount: lots.length,
      lotStatus: inventoryLotStatusSummary(lots),
      updatedAt: item.updatedAt
    };
  }) as DataTableRow[]
);
const inventoryStockReportCards = computed<ReportCard[]>(() => {
  const stockValue = inventoryItems.value.reduce(
    (total, item) => total + item.onHandQuantity * item.unitCostAmount,
    0
  );
  const belowReorderCount = inventoryItems.value.filter((item) => item.onHandQuantity <= item.reorderLevel).length;
  const criticalLotCount = inventoryLots.value.filter((lot) =>
    ['expiring', 'expired', 'depleted'].includes(lot.status)
  ).length;
  return [
    { label: 'Itens em estoque', value: count(inventoryItems.value.length), icon: '📦' },
    { label: 'Valor em estoque', value: money(stockValue), icon: '💰' },
    { label: 'Abaixo do mínimo', value: count(belowReorderCount), icon: '⚠️' },
    { label: 'Lotes críticos', value: count(criticalLotCount), icon: '🏷️' }
  ];
});
const inventoryMovementsReportRows = computed<DataTableRow[]>(() => {
  const itemsById = new Map(inventoryItems.value.map((item) => [item.id, item]));
  const consumptionRows = inventoryConsumptions.value.map((consumption) => {
    const item = itemsById.get(consumption.inventoryItemId);
    return {
      id: consumption.id,
      occurredAt: consumption.createdAt,
      movement: 'Saída',
      sku: item?.sku ?? consumption.inventoryItemId,
      name: item?.name ?? consumption.inventoryItemId,
      quantity: consumption.quantity,
      unit: consumption.unit,
      costAmount: consumption.costAmount,
      origin: inventoryConsumptionSourceLabel(consumption.sourceEntityType),
      reference: consumption.sourceEntityId || consumption.encounterId || consumption.patientId,
      user: consumption.recordedByUserId
    };
  });
  const lotRows = inventoryLots.value.map((lot) => {
    const item = itemsById.get(lot.inventoryItemId);
    return {
      id: `lot-${lot.id}`,
      occurredAt: lot.createdAt,
      movement: 'Entrada/lote',
      sku: lot.sku,
      name: lot.itemName,
      quantity: lot.quantity,
      unit: lot.unit,
      costAmount: lot.quantity * (item?.unitCostAmount ?? 0),
      origin: lot.location || 'Lote operacional',
      reference: lot.lotNumber,
      user: lot.supplier || 'Sem fornecedor'
    };
  });

  return [...consumptionRows, ...lotRows]
    .filter((row) => matchesReportPeriod(row.occurredAt))
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()) as DataTableRow[];
});
const inventoryMovementsReportCards = computed<ReportCard[]>(() => {
  const movementRows = inventoryMovementsReportRows.value;
  const inputCount = movementRows.filter((row) => row.movement === 'Entrada/lote').length;
  const outputCount = movementRows.filter((row) => row.movement === 'Saída').length;
  const movedValue = movementRows.reduce((total, row) => total + numberValue(row, 'costAmount'), 0);
  return [
    { label: 'Movimentações registradas', value: count(movementRows.length), icon: '📥' },
    { label: 'Entradas em lotes', value: count(inputCount), icon: '📦' },
    { label: 'Saídas consumidas', value: count(outputCount), icon: '↘' },
    { label: 'Valor movimentado', value: money(movedValue), icon: '💰' }
  ];
});
const inventoryInvoicesReportRows = computed<DataTableRow[]>(() => {
  const itemsById = new Map(inventoryItems.value.map((item) => [item.id, item]));
  const itemIdsWithLots = new Set(inventoryLots.value.map((lot) => lot.inventoryItemId));
  const lotRows = inventoryLots.value.map((lot) => {
    const item = itemsById.get(lot.inventoryItemId);
    const unitCostAmount = item?.unitCostAmount ?? 0;
    return {
      id: lot.id,
      invoiceNumber: inventoryInvoiceNumber(lot.lotNumber || lot.sku),
      supplier: lot.supplier || 'Fornecedor não informado',
      sku: lot.sku,
      name: lot.itemName,
      lotNumber: lot.lotNumber || 'Sem lote',
      createdAt: lot.createdAt,
      expiryDate: lot.expiryDate || '',
      quantity: lot.quantity,
      unit: lot.unit,
      unitCostAmount,
      total: lot.quantity * unitCostAmount,
      status: inventoryInvoiceStatus(lot.status),
      source: lot.location || 'Lote operacional'
    };
  });
  const pendingRows = inventoryItems.value
    .filter((item) => !itemIdsWithLots.has(item.id))
    .map((item) => ({
      id: `pending-${item.id}`,
      invoiceNumber: inventoryInvoiceNumber(item.sku),
      supplier: 'Fornecedor não informado',
      sku: item.sku,
      name: item.name,
      lotNumber: 'A conferir',
      createdAt: item.updatedAt || item.createdAt,
      expiryDate: '',
      quantity: item.onHandQuantity,
      unit: item.unit,
      unitCostAmount: item.unitCostAmount,
      total: item.onHandQuantity * item.unitCostAmount,
      status: 'Pendente',
      source: 'Item sem lote'
    }));

  return [...lotRows, ...pendingRows]
    .filter((row) => matchesReportPeriod(row.createdAt))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) as DataTableRow[];
});
const inventoryInvoicesReportCards = computed<ReportCard[]>(() => {
  const invoiceRows = inventoryInvoicesReportRows.value;
  const suppliers = new Set(
    invoiceRows
      .map((row) => stringValue(row, 'supplier'))
      .filter((supplier): supplier is string => Boolean(supplier && supplier !== 'Fornecedor não informado'))
  );
  const checkedCount = invoiceRows.filter((row) => row.status === 'Conferida').length;
  const attentionCount = invoiceRows.filter((row) => row.status === 'Atenção').length;
  const totalValue = invoiceRows.reduce((total, row) => total + numberValue(row, 'total'), 0);
  return [
    { label: 'Entradas registradas', value: count(invoiceRows.length), icon: '🧾' },
    { label: 'Fornecedores', value: count(suppliers.size), icon: '🚚' },
    { label: 'Lotes conferidos', value: count(checkedCount), icon: '✅' },
    { label: 'Valor em NF', value: money(totalValue), icon: '💰' },
    { label: 'Em atenção', value: count(attentionCount), icon: '⚠️' }
  ];
});
const inventoryProductsReportRows = computed<DataTableRow[]>(() => {
  const lotsByItemId = new Map<string, InventoryLotSummary[]>();
  for (const lot of inventoryLots.value) {
    const current = lotsByItemId.get(lot.inventoryItemId) ?? [];
    current.push(lot);
    lotsByItemId.set(lot.inventoryItemId, current);
  }

  return inventoryItems.value
    .map((item) => {
      const lots = lotsByItemId.get(item.id) ?? [];
      return {
        id: item.id,
        sku: item.sku || item.id,
        name: item.name,
        unit: item.unit,
        onHandQuantity: item.onHandQuantity,
        reorderLevel: item.reorderLevel,
        unitCostAmount: item.unitCostAmount,
        stockValue: item.onHandQuantity * item.unitCostAmount,
        lotCount: lots.length,
        lotStatus: inventoryLotStatusSummary(lots),
        productStatus: inventoryProductStatus(item, lots),
        source: 'Estoque operacional',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    })
    .filter((row) => matchesReportPeriod(row.updatedAt || row.createdAt))
    .sort((left, right) => String(left.name).localeCompare(String(right.name), 'pt-BR')) as DataTableRow[];
});
const inventoryProductsReportCards = computed<ReportCard[]>(() => {
  const productRows = inventoryProductsReportRows.value;
  const stockedCount = productRows.filter((row) => numberValue(row, 'onHandQuantity') > 0).length;
  const belowReorderCount = productRows.filter(
    (row) => numberValue(row, 'onHandQuantity') <= numberValue(row, 'reorderLevel')
  ).length;
  const withLotsCount = productRows.filter((row) => numberValue(row, 'lotCount') > 0).length;
  const stockValue = productRows.reduce((total, row) => total + numberValue(row, 'stockValue'), 0);
  return [
    { label: 'Produtos cadastrados', value: count(productRows.length), icon: '🏷️' },
    { label: 'Com saldo', value: count(stockedCount), icon: '📦' },
    { label: 'Abaixo do mínimo', value: count(belowReorderCount), icon: '⚠️' },
    { label: 'Com lote', value: count(withLotsCount), icon: '🧾' },
    { label: 'Valor em estoque', value: money(stockValue), icon: '💰' }
  ];
});

async function loadReport() {
  loading.value = true;
  error.value = '';
  try {
    if (isAuditAppointments.value) {
      auditEvents.value = await auditService.listEvents({
        entityTypes: APPOINTMENT_AUDIT_ENTITY_TYPES,
        limit: 200
      });
      report.value = null;
    } else if (isAppointmentsReport.value || isProfessionalCareReport.value) {
      appointments.value = await appointmentService.list({
        startAt: filters.value.dateFrom ? `${filters.value.dateFrom}T00:00:00.000Z` : undefined,
        endAt: filters.value.dateTo ? `${filters.value.dateTo}T23:59:59.999Z` : undefined
      });
      report.value = null;
    } else if (isRegisterServicesReport.value) {
      services.value = await servicesService.list();
      report.value = null;
    } else if (isRegisterOwnersReport.value) {
      owners.value = await ownerService.list({ pageSize: 500, status: 'all' });
      report.value = null;
    } else if (isRegisterPatientsReport.value) {
      patients.value = await patientService.list({ pageSize: 500, status: 'all' });
      report.value = null;
    } else if (isRegisterSuppliersReport.value) {
      const response = await expensesCatalogService.list({ pageSize: 500, sort: 'name', order: 'asc' });
      suppliers.value = response.items;
      report.value = null;
    } else if (isDeletedSalesCounterSalesReport.value) {
      counterSales.value = await counterSalesService.list({
        status: 'all',
        dateFrom: filters.value.dateFrom || undefined,
        dateTo: filters.value.dateTo || undefined
      });
      report.value = null;
    } else if (
      isInventoryStockReport.value ||
      isInventoryMovementsReport.value ||
      isInventoryInvoicesReport.value ||
      isInventoryProductsReport.value
    ) {
      const [items, lots, consumptions] = await Promise.all([
        inventoryService.list(),
        inventoryService.listLots(),
        isInventoryMovementsReport.value ? inventoryService.listConsumptions() : Promise.resolve([])
      ]);
      inventoryItems.value = items;
      inventoryLots.value = lots;
      inventoryConsumptions.value = consumptions;
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

function resetFilters() {
  filters.value = { dateFrom: '', dateTo: '', client: '', user: '', action: '', type: '' };
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
    [event.entityId, event.payloadSummary].some((value) => String(value ?? '').toLowerCase().includes(clientNeedle));
  const matchesUser = !userNeedle || event.actorId.toLowerCase().includes(userNeedle);
  const matchesAction = !filters.value.action || event.action === filters.value.action;
  const matchesType = !filters.value.type || event.entityType === filters.value.type;
  return matchesDateFrom && matchesDateTo && matchesClient && matchesUser && matchesAction && matchesType;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function appointmentStatusLabel(status: AppointmentSummary['status']): string {
  const labels: Record<AppointmentSummary['status'], string> = {
    scheduled: 'Agendado',
    checked_in: 'Check-in',
    completed: 'Executado',
    cancelled: 'Cancelado'
  };
  return labels[status];
}

function professionalCareRows(source: AppointmentSummary[]): DataTableRow[] {
  const professionals = new Map<string, {
    id: string;
    professional: string;
    scheduled: number;
    completed: number;
    checkedIn: number;
    cancelled: number;
    services: Set<string>;
  }>();

  for (const appointment of source) {
    const id = appointment.practitionerStaffId || 'unassigned';
    const current = professionals.get(id) ?? {
      id,
      professional: appointment.practitionerStaffId || 'Sem profissional',
      scheduled: 0,
      completed: 0,
      checkedIn: 0,
      cancelled: 0,
      services: new Set<string>()
    };
    current.scheduled += 1;
    if (appointment.status === 'completed') current.completed += 1;
    if (appointment.status === 'checked_in') current.checkedIn += 1;
    if (appointment.status === 'cancelled') current.cancelled += 1;
    if (appointment.serviceId) current.services.add(appointment.serviceId);
    professionals.set(id, current);
  }

  return [...professionals.values()]
    .sort((a, b) => b.scheduled - a.scheduled || a.professional.localeCompare(b.professional))
    .map((row) => ({
      id: row.id,
      professional: row.professional,
      scheduled: count(row.scheduled),
      completed: count(row.completed),
      checkedIn: count(row.checkedIn),
      cancelled: count(row.cancelled),
      services: count(row.services.size)
    })) as DataTableRow[];
}

function receivableSpec(title: string, subtitle: string, mode: 'open' | 'received'): ReportSpec {
  const isOpenReport = mode === 'open';
  return {
    title,
    group: 'Relatórios Financeiros',
    subtitle,
    icon: isOpenReport ? '💵' : '✅',
    primaryPath: '/finance/accounts-receivable',
    primaryAction: isOpenReport ? 'Solicitar Excel' : 'Abrir financeiro',
    primaryDisabled: isOpenReport,
    tableTitle: isOpenReport ? 'Maiores recebíveis em aberto' : 'Indicadores de recebimento',
    emptyTitle: isOpenReport ? 'Sem recebíveis em aberto' : 'Sem recebimento consolidado',
    emptyDescription: 'A movimentação financeira aparece aqui conforme o período selecionado.',
    note: isOpenReport
      ? 'A rota Vetus legacy observada e Sistema/Relatorio/ContasAReceberRelatorio.htm. Esta visão é somente leitura, não baixa títulos, não concilia recebíveis e não exporta relatório real.'
      : undefined,
    columns: isOpenReport
      ? [
          { key: 'patientName', label: 'Paciente' },
          { key: 'ownerName', label: 'Tutor' },
          { key: 'installmentLabel', label: 'Parcela' },
          { key: 'dueAt', label: 'Vencimento' },
          { key: 'amount', label: 'Saldo' }
        ]
      : [
          { key: 'label', label: 'Indicador' },
          { key: 'value', label: 'Total' },
          { key: 'scope', label: 'Origem' }
        ],
    cards: (current) => [
      { label: 'Em aberto', value: money(current?.domains.financial.receivables.totalOutstanding), icon: '💵' },
      { label: 'Vencidos', value: money(current?.domains.financial.receivables.overdueAmount), icon: '⚠️' },
      { label: 'PIX concluídos', value: money(current?.domains.financial.pix.completedAmount), icon: '💸' }
    ],
    rows: (current) => {
      if (isOpenReport) {
        return (current?.domains.financial.receivables.topOpenReceivables ?? []).map((row) => ({
          ...row,
          id: row.receivableId,
          amount: row.amountOutstanding
        })) as DataTableRow[];
      }
      return [
        { id: 'settled', label: 'Faturamentos quitados', value: count(current?.domains.financial.billing.settledCount), scope: 'Faturamento' },
        { id: 'pix', label: 'PIX concluídos', value: count(current?.domains.financial.pix.completedCount), scope: 'PIX' },
        { id: 'reconciled', label: 'PIX conciliados', value: count(current?.domains.financial.pix.reconciledCount), scope: 'Conciliação' }
      ];
    }
  };
}

function receivedAccountsSpec(): ReportSpec {
  return {
    title: 'Contas Recebidas',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de títulos liquidados, recebimentos efetivos e origem do recebimento',
    icon: '✅',
    primaryPath: '/finance/accounts-receivable',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Recebimentos no período',
    emptyTitle: 'Sem conta recebida no período',
    emptyDescription: 'Títulos quitados e recebimentos confirmados aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ContasRecebidasRelatorio.htm. Esta visão é somente leitura, não baixa títulos, não concilia recebimentos e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'receivedAmount', label: 'Recebido' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Recebido confirmado', value: money(current?.domains.financial.pix.completedAmount), icon: '💸' },
      { label: 'Títulos quitados', value: count(current?.domains.financial.billing.settledCount), icon: '✅' },
      { label: 'PIX conciliados', value: count(current?.domains.financial.pix.reconciledCount), icon: '🏦' }
    ],
    rows: (current) => [
      {
        id: 'settled-billing',
        label: 'Faturamentos quitados',
        receivedAmount: 0,
        records: count(current?.domains.financial.billing.settledCount),
        scope: 'Faturamento'
      },
      {
        id: 'pix-completed',
        label: 'PIX concluídos',
        receivedAmount: current?.domains.financial.pix.completedAmount ?? 0,
        records: count(current?.domains.financial.pix.completedCount),
        scope: 'PIX'
      },
      {
        id: 'pix-reconciled',
        label: 'PIX conciliados',
        receivedAmount: current?.domains.financial.pix.completedAmount ?? 0,
        records: count(current?.domains.financial.pix.reconciledCount),
        scope: 'Conciliação'
      }
    ] as DataTableRow[]
  };
}

function accountsPayableReportSpec(): ReportSpec {
  return {
    title: 'Contas a Pagar',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de obrigações, vencimentos e origem de despesas a pagar',
    icon: '💸',
    primaryPath: '/finance/accounts-payable',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Obrigações a pagar',
    emptyTitle: 'Sem obrigação a pagar no período',
    emptyDescription: 'Obrigações por fornecedor aparecem aqui quando existir fonte analítica específica de contas a pagar.',
    note: 'O item Vetus de Relatórios Financeiros > Contas a Pagar foi revalidado no navbar; a estrutura operacional documentada é Financeiro/ContasAPagar.htm, com fornecedor, emissão, vencimento, total, pago, a pagar, origem e status. Esta visão é somente leitura, não baixa títulos, não gera conta avulsa e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'payableAmount', label: 'A Pagar' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: () => [
      { label: 'Fonte de títulos a pagar', value: 'Pendente', icon: '💸' },
      { label: 'Catálogo operacional', value: 'Mapeado', icon: '📋' },
      { label: 'Exportação legacy', value: 'Bloqueada', icon: '✅' }
    ],
    rows: () => [
      {
        id: 'operational-structure',
        label: 'Estrutura operacional mapeada',
        payableAmount: 0,
        records: 'Sem fonte analítica',
        scope: 'Financeiro/ContasAPagar.htm'
      },
      {
        id: 'report-source',
        label: 'Endpoint específico do relatório',
        payableAmount: 0,
        records: 'Pendente',
        scope: 'Relatórios Financeiros'
      },
      {
        id: 'write-guard',
        label: 'Baixa, conta avulsa e exportação',
        payableAmount: 0,
        records: 'Bloqueadas',
        scope: 'Somente leitura'
      }
    ] as DataTableRow[]
  };
}

function paidAccountsReportSpec(): ReportSpec {
  return {
    title: 'Contas Pagas',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de despesas liquidadas, desembolso efetivo e origem do pagamento',
    icon: '✅',
    primaryPath: '/finance/accounts-payable',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Pagamentos no período',
    emptyTitle: 'Sem conta paga no período',
    emptyDescription: 'Pagamentos quitados aparecem aqui quando existir fonte analítica específica de contas pagas.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ContasPagasRelatorio.htm. Esta visão é somente leitura, não baixa títulos, não altera fornecedores e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'paidAmount', label: 'Pago' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: () => [
      { label: 'Fonte de contas pagas', value: 'Pendente', icon: '✅' },
      { label: 'Desembolso realizado', value: 'Sem fonte', icon: '💸' },
      { label: 'Exportação legacy', value: 'Bloqueada', icon: '📄' }
    ],
    rows: () => [
      {
        id: 'paid-subset',
        label: 'Subconjunto quitado de contas a pagar',
        paidAmount: 0,
        records: 'Sem fonte analítica',
        scope: 'Contas Pagas'
      },
      {
        id: 'legacy-route',
        label: 'Rota legacy documentada',
        paidAmount: 0,
        records: 'Pendente',
        scope: 'Sistema/Relatorio/ContasPagasRelatorio.htm'
      },
      {
        id: 'write-guard',
        label: 'Baixa, fornecedor e exportação',
        paidAmount: 0,
        records: 'Bloqueadas',
        scope: 'Somente leitura'
      }
    ] as DataTableRow[]
  };
}

function chequesReportSpec(): ReportSpec {
  return {
    title: 'Cheques',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de cheques recebidos, emitidos, vencimentos e situação operacional',
    icon: '📄',
    primaryPath: '/finance/cheques',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Cheques no período',
    emptyTitle: 'Sem cheque no período',
    emptyDescription: 'Cheques aparecem aqui quando existir fonte analítica específica para o relatório financeiro.',
    note: 'O item Vetus de Relatórios Financeiros > Cheques foi revalidado no navbar; a estrutura operacional documentada é Financeiro/Cheques.htm, com cheques recebidos/emitidos, vencimento, baixa e devolução. Esta visão é somente leitura, não cadastra cheques, não baixa títulos, não registra devolução e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: () => [
      { label: 'Fonte operacional', value: 'Mapeada', icon: '📄' },
      { label: 'Fonte analítica', value: 'Pendente', icon: '🧾' },
      { label: 'Exportação legacy', value: 'Bloqueada', icon: '✅' }
    ],
    rows: () => [
      {
        id: 'operational-structure',
        label: 'Estrutura operacional mapeada',
        amount: 0,
        records: 'Sem fonte analítica',
        scope: 'Financeiro/Cheques.htm'
      },
      {
        id: 'report-source',
        label: 'Endpoint específico do relatório',
        amount: 0,
        records: 'Pendente',
        scope: 'Relatórios Financeiros'
      },
      {
        id: 'write-guard',
        label: 'Cadastro, baixa, devolução e exportação',
        amount: 0,
        records: 'Bloqueados',
        scope: 'Somente leitura'
      }
    ] as DataTableRow[]
  };
}

function advancePaymentsReportSpec(): ReportSpec {
  return {
    title: 'Pagamento Antecipado',
    group: 'Relatórios Financeiros',
    subtitle: 'Relatório financeiro legacy de créditos antecipados, saldo de cliente e compensação futura',
    icon: '⏩',
    primaryPath: '/finance/advance-payments',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Pagamentos antecipados no período',
    emptyTitle: 'Sem pagamento antecipado no período',
    emptyDescription: 'Pagamentos antecipados aparecem aqui quando existir fonte analítica específica para o relatório financeiro.',
    note: 'O item Vetus de Relatórios Financeiros > Pagamento Antecipado foi revalidado no navbar; a estrutura operacional documentada é Financeiro/PagamentoAntecipado.htm, com recebimentos antecipados, saldo de crédito do cliente e compensação futura. Esta visão é somente leitura, não gera pagamento antecipado, não compensa crédito e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: () => [
      { label: 'Fonte operacional', value: 'Mapeada', icon: '⏩' },
      { label: 'Fonte analítica', value: 'Pendente', icon: '🧾' },
      { label: 'Exportação legacy', value: 'Bloqueada', icon: '✅' }
    ],
    rows: () => [
      {
        id: 'operational-structure',
        label: 'Estrutura operacional mapeada',
        amount: 0,
        records: 'Sem fonte analítica',
        scope: 'Financeiro/PagamentoAntecipado.htm'
      },
      {
        id: 'report-source',
        label: 'Endpoint específico do relatório',
        amount: 0,
        records: 'Pendente',
        scope: 'Relatórios Financeiros'
      },
      {
        id: 'write-guard',
        label: 'Geração, compensação e exportação',
        amount: 0,
        records: 'Bloqueadas',
        scope: 'Somente leitura'
      }
    ] as DataTableRow[]
  };
}

function salesCounterSalesReportSpec(): ReportSpec {
  return {
    title: 'Comandas/Vendas',
    group: 'Relatórios de Atendimentos',
    subtitle: 'Relatório legacy de consolidação comercial-operacional de comandas, vendas e fechamento econômico',
    icon: '💸',
    primaryPath: '/counter-sales',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Comandas e vendas no período',
    emptyTitle: 'Sem comanda ou venda no período',
    emptyDescription: 'Comandas e vendas aparecem aqui conforme a consolidação comercial do período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ComandasVendasRelatorio.htm. Esta visão é somente leitura, não abre comanda, não cria venda, não finaliza cobrança e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Comandas/Vendas', value: count(current?.domains.commercial.counterSales.totalSales), icon: '💸' },
      { label: 'Receita bruta', value: money(current?.domains.commercial.counterSales.grossRevenue), icon: '📈' },
      { label: 'Ticket médio', value: money(current?.domains.commercial.counterSales.avgTicket), icon: '🧾' }
    ],
    rows: (current) => [
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
    subtitle: 'Relatório legacy de mix operacional produzido por produtos, serviços, quantidade e receita',
    icon: '🛠️',
    primaryPath: '/sales',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Produtos e serviços produzidos',
    emptyTitle: 'Sem produto ou serviço produzido no período',
    emptyDescription: 'Produtos e serviços produzidos aparecem aqui quando houver venda fechada no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ProdutosEServicosProduzidos.htm. Esta visão é somente leitura, não cria venda, não altera catálogo, não baixa estoque e não exporta relatório real.',
    columns: [
      { key: 'name', label: 'Item' },
      { key: 'kind', label: 'Tipo' },
      { key: 'quantity', label: 'Quantidade' },
      { key: 'revenue', label: 'Receita' }
    ],
    cards: (current) => [
      { label: 'Vendas fechadas', value: count(current?.domains.commercial.counterSales.closedCount), icon: '✅' },
      { label: 'Receita comercial', value: money(current?.executive.commercialRevenue), icon: '📈' },
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
    subtitle: 'Relatório legacy sintético de produtividade operacional, volume realizado e receita produzida',
    icon: '🏭',
    primaryPath: '/sales',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Produção no período',
    emptyTitle: 'Sem produção no período',
    emptyDescription: 'A produção consolidada aparece aqui quando houver comanda ou venda fechada no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ProducaoRelatorio.htm. Esta visão é somente leitura, não abre atendimento, não cria venda, não altera produção e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Produção fechada', value: count(current?.domains.commercial.counterSales.closedCount), icon: '✅' },
      { label: 'Receita produzida', value: money(current?.domains.commercial.counterSales.netRevenue), icon: '📈' },
      { label: 'Ticket médio', value: money(current?.domains.commercial.counterSales.avgTicket), icon: '🧾' }
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
    subtitle: 'Relatório legacy de agendamentos, comparecimentos, cancelamentos e ocupação operacional',
    icon: '📅',
    primaryPath: '/appointments',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Agendamentos no período',
    emptyTitle: 'Sem agendamento no período',
    emptyDescription: 'Agendamentos aparecem aqui quando houver eventos na agenda para o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/AgendaRelatorio.htm. Esta visão é somente leitura, consulta a agenda operacional existente, não cria agendamento, não altera status, não abre atendimento e não exporta relatório real.',
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
    subtitle: 'Relatório legacy de produtividade humana, volume assistencial e distribuição por profissional',
    icon: '🩺',
    primaryPath: '/staff',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Atendimentos por profissional',
    emptyTitle: 'Sem atendimento por profissional no período',
    emptyDescription: 'Atendimentos por profissional aparecem aqui quando houver agenda vinculada a profissional no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/AtendimentoPorProfissional.htm. Esta visão é somente leitura, consulta a agenda operacional existente, não altera profissionais, não abre atendimento, não calcula comissão e não exporta relatório real.',
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
    subtitle: 'Relatório legacy personalizado de NFS-e, serviços prestados e faturamento relacionado',
    icon: '🧾',
    primaryPath: '/fiscal/nfse',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'NF de serviços prestados',
    emptyTitle: 'Sem NF de serviço consolidada',
    emptyDescription: 'Serviços prestados e configurações de NFS-e aparecem aqui conforme as fontes fiscais e comerciais disponíveis.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/RelatorioNFServicosPrestados.htm. Esta visão é somente leitura, cruza indicadores fiscais e comerciais existentes, não emite NFS-e, não consulta prefeitura, não altera faturamento e não exporta relatório real.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'amount', label: 'Valor' },
      { key: 'records', label: 'Registros' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Layouts NFS-e', value: count(current?.domains.fiscal.nfseLayouts), icon: '📄' },
      { label: 'Serviços prestados', value: count(serviceInvoiceMetrics(current).serviceQuantity), icon: '🛠️' },
      { label: 'Faturamento bruto', value: money(current?.domains.financial.billing.grossAmount), icon: '💰' }
    ],
    rows: (current) => {
      const metrics = serviceInvoiceMetrics(current);
      return [
        {
          id: 'nfse-layouts',
          label: 'Configuração NFS-e disponível',
          amount: 0,
          records: count(current?.domains.fiscal.nfseLayouts),
          scope: 'Configurações Fiscais'
        },
        {
          id: 'provided-services',
          label: 'Serviços prestados consolidados',
          amount: metrics.serviceRevenue,
          records: count(metrics.serviceQuantity),
          scope: 'Produtos/Serviços Produzidos'
        },
        {
          id: 'billing-records',
          label: 'Faturamento relacionado',
          amount: current?.domains.financial.billing.grossAmount ?? 0,
          records: count(current?.domains.financial.billing.totalRecords),
          scope: 'Faturamento'
        },
        {
          id: 'write-guard',
          label: 'Emissão, prefeitura e exportação',
          amount: 0,
          records: 'Bloqueadas',
          scope: 'Somente leitura'
        }
      ] as DataTableRow[];
    }
  };
}

function serviceInvoiceMetrics(current: AdministrativeReportsResponse | null): { serviceQuantity: number; serviceRevenue: number } {
  const services = current?.domains.commercial.counterSales.topServices ?? [];
  return {
    serviceQuantity: services.reduce((total, row) => total + row.quantity, 0),
    serviceRevenue: services.reduce((total, row) => total + row.revenue, 0)
  };
}

function registerServicesReportSpec(): ReportSpec {
  return {
    title: 'Serviços',
    group: 'Relatórios de Cadastros',
    subtitle: 'Relatório legacy do cadastro de serviços, preços e situação do catálogo assistencial',
    icon: '🛠️',
    primaryPath: '/services',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Serviços cadastrados',
    emptyTitle: 'Sem serviço cadastrado',
    emptyDescription: 'Serviços aparecem aqui quando houver registros no cadastro operacional de serviços.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ServicosRelatorio.htm. Esta visão é somente leitura, consulta o cadastro operacional existente, não cria serviço, não altera preço, não muda situação e não exporta relatório real.',
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
    subtitle: 'Relatório legacy do cadastro de clientes, contatos, responsabilidade financeira e situação',
    icon: '👤',
    primaryPath: '/owners',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Clientes cadastrados',
    emptyTitle: 'Sem cliente cadastrado',
    emptyDescription: 'Clientes aparecem aqui quando houver registros no cadastro operacional de tutores.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ClientesRelatorio.htm. Esta visão é somente leitura, consulta o cadastro operacional existente, não cria cliente, não altera contato, não muda situação financeira e não exporta relatório real.',
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

function ownerPrimaryContact(owner: OwnerSummary): string {
  const contact = owner.contacts.find((item) => item.primary) ?? owner.contacts[0];
  return contact ? `${contact.label}: ${contact.value}` : 'Sem contato';
}

function supplierContactLabel(supplier: ExpenseCatalogItem): string {
  return supplier.description.trim() || 'Sem Contato - Cadastrado pela NFE';
}

function inventoryLotStatusSummary(lots: InventoryLotSummary[]): string {
  if (!lots.length) return 'Sem lote';
  const expiredCount = lots.filter((lot) => lot.status === 'expired').length;
  const expiringCount = lots.filter((lot) => lot.status === 'expiring').length;
  const depletedCount = lots.filter((lot) => lot.status === 'depleted').length;
  if (expiredCount) return `${expiredCount} vencido(s)`;
  if (expiringCount) return `${expiringCount} a vencer`;
  if (depletedCount) return `${depletedCount} esgotado(s)`;
  return 'Regular';
}

function inventoryConsumptionSourceLabel(source: InventoryConsumptionSummary['sourceEntityType']): string {
  const labels: Record<InventoryConsumptionSummary['sourceEntityType'], string> = {
    encounter: 'Atendimento',
    diagnostic_order: 'Pedido diagnóstico',
    surgery_case: 'Cirurgia',
    inpatient_stay: 'Internação',
    prescription: 'Prescrição',
    other: 'Outros'
  };
  return labels[source];
}

function inventoryInvoiceNumber(reference: string): string {
  return `NF-${reference || 'SEM-REFERENCIA'}`;
}

function inventoryInvoiceStatus(status: InventoryLotSummary['status']): string {
  if (status === 'expired' || status === 'expiring') return 'Atenção';
  if (status === 'depleted') return 'Esgotada';
  return 'Conferida';
}

function inventoryProductStatus(item: InventoryItemSummary, lots: InventoryLotSummary[]): string {
  if (item.onHandQuantity <= item.reorderLevel) return 'Abaixo do mínimo';
  if (lots.some((lot) => lot.status === 'expired' || lot.status === 'expiring')) return 'Lote em atenção';
  if (item.onHandQuantity > 0) return 'Com saldo';
  return 'Sem saldo';
}

function matchesReportPeriod(value: string): boolean {
  const date = new Date(value);
  const fromDate = filters.value.dateFrom ? new Date(`${filters.value.dateFrom}T00:00:00`) : null;
  const toDate = filters.value.dateTo ? new Date(`${filters.value.dateTo}T23:59:59`) : null;
  return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
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
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Animais cadastrados',
    emptyTitle: 'Sem animal cadastrado',
    emptyDescription: 'Animais aparecem aqui quando houver registros no cadastro operacional de pacientes.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/AnimaisRelatorio.htm. Esta visão é somente leitura, consulta o cadastro operacional existente, não cria animal, não altera identificação, não muda situação clínica/cadastral e não exporta relatório real.',
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
    subtitle: 'Relatório legacy do cadastro de fornecedores, despesas, contatos e centros de custo',
    icon: '🚚',
    primaryPath: '/suppliers',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Fornecedores cadastrados',
    emptyTitle: 'Sem fornecedor cadastrado',
    emptyDescription: 'Fornecedores e despesas aparecem aqui quando houver registros no cadastro operacional.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/FornecedoresRelatorio.htm. Esta visão é somente leitura, consulta o cadastro operacional existente, não cria fornecedor, não altera despesa, não muda centro de custo e não exporta relatório real.',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Descrição' },
      { key: 'category', label: 'Categoria' },
      { key: 'kind', label: 'Tipo' },
      { key: 'costCenter', label: 'Centro de custo' },
      { key: 'contact', label: 'Contato' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function deletedSalesCounterSalesReportSpec(): ReportSpec {
  return {
    title: 'Exclusão de Vendas e Comandas',
    group: 'Relatórios de Cadastros',
    subtitle: 'Relatório legacy de vendas e comandas excluídas ou canceladas no período',
    icon: '🧾',
    primaryPath: '/counter-sales',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Vendas e comandas excluídas',
    emptyTitle: 'Sem venda ou comanda excluída',
    emptyDescription: 'Exclusões aparecem aqui quando houver comandas ou vendas canceladas no período.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/ExclusaoVendasComandasRelatorio.htm. Esta visão é somente leitura, consulta comandas canceladas existentes, não cancela venda, não reabre comanda, não altera pagamento e não exporta relatório real.',
    columns: [
      { key: 'number', label: 'Número' },
      { key: 'owner', label: 'Tutor' },
      { key: 'openedBy', label: 'Usuário' },
      { key: 'createdAt', label: 'Abertura' },
      { key: 'cancelledAt', label: 'Cancelamento' },
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
    subtitle: 'Relatório legacy da posição atual de estoque, saldo, custo e situação de lotes',
    icon: '📦',
    primaryPath: '/inventory',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Posição atual de estoque',
    emptyTitle: 'Sem item em estoque',
    emptyDescription: 'Itens aparecem aqui quando houver registros no estoque operacional.',
    note: 'A rota Vetus legacy documentada e Sistema/Relatorio/EstoqueRelatorio.htm. Esta visão é somente leitura, consulta o estoque operacional existente, não lança transação, não transfere saldo, não altera custo e não exporta relatório real.',
    columns: [
      { key: 'sku', label: 'Código' },
      { key: 'name', label: 'Produto' },
      { key: 'onHandQuantity', label: 'Saldo' },
      { key: 'unit', label: 'Unidade' },
      { key: 'reorderLevel', label: 'Mínimo' },
      { key: 'unitCostAmount', label: 'Custo unit.' },
      { key: 'stockValue', label: 'Valor estoque' },
      { key: 'lotCount', label: 'Lotes' },
      { key: 'lotStatus', label: 'Situação lote' },
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
    subtitle: 'Relatório legacy de entradas, saídas e referências operacionais de movimentação',
    icon: '📥',
    primaryPath: '/inventory/movements',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Movimentações de estoque',
    emptyTitle: 'Sem movimentação de estoque',
    emptyDescription: 'Movimentações aparecem aqui quando houver consumos ou lotes registrados no período.',
    note: 'A rota Vetus legacy documentada e Sistema/Relatorio/MovimentacaoEstoqueRelatorio.htm. Esta visão é somente leitura, consulta consumos e lotes operacionais existentes, não lança transação, não transfere saldo, não ajusta lote e não exporta relatório real. Transferências e ajustes ainda dependem de fonte analítica específica.',
    columns: [
      { key: 'occurredAt', label: 'Data' },
      { key: 'movement', label: 'Movimento' },
      { key: 'sku', label: 'Código' },
      { key: 'name', label: 'Produto' },
      { key: 'quantity', label: 'Quantidade' },
      { key: 'unit', label: 'Unidade' },
      { key: 'costAmount', label: 'Valor' },
      { key: 'origin', label: 'Origem' },
      { key: 'reference', label: 'Referência' },
      { key: 'user', label: 'Usuário/Fornecedor' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function inventoryInvoicesReportSpec(): ReportSpec {
  return {
    title: 'Entrada de NF',
    group: 'Relatórios de Estoque',
    subtitle: 'Relatório legacy de entradas documentais, fornecedores, lotes e valores de estoque',
    icon: '🧾',
    primaryPath: '/inventory/invoices',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Entradas de NF',
    emptyTitle: 'Sem entrada de NF',
    emptyDescription: 'Entradas aparecem aqui quando houver lotes ou itens de estoque conferíveis no período.',
    note: 'A rota Vetus legacy documentada e Sistema/Relatorio/EntradaNotaFiscalRelatorio.htm. Esta visão é somente leitura, consulta lotes e itens operacionais existentes, não lança nota fiscal, não altera fornecedor, não altera custo, não baixa estoque e não exporta relatório real. O número de NF é derivado do lote enquanto não existir fonte fiscal analítica específica de entrada documental.',
    columns: [
      { key: 'invoiceNumber', label: 'Nota Fiscal' },
      { key: 'supplier', label: 'Fornecedor' },
      { key: 'sku', label: 'Código' },
      { key: 'name', label: 'Produto' },
      { key: 'lotNumber', label: 'Lote' },
      { key: 'createdAt', label: 'Entrada' },
      { key: 'expiryDate', label: 'Validade' },
      { key: 'quantity', label: 'Quantidade' },
      { key: 'unit', label: 'Unidade' },
      { key: 'unitCostAmount', label: 'Custo unit.' },
      { key: 'total', label: 'Valor' },
      { key: 'status', label: 'Status' },
      { key: 'source', label: 'Origem' }
    ],
    cards: () => [],
    rows: () => []
  };
}

function inventoryProductsReportSpec(): ReportSpec {
  return {
    title: 'Relatório de Produtos',
    group: 'Relatórios de Estoque',
    subtitle: 'Relatório legacy do catálogo de produtos, saldo, custo e vínculos de lote',
    icon: '🏷️',
    primaryPath: '/products',
    primaryAction: 'Solicitar Excel',
    primaryDisabled: true,
    tableTitle: 'Produtos do estoque',
    emptyTitle: 'Sem produto cadastrado',
    emptyDescription: 'Produtos aparecem aqui quando houver registros no catálogo operacional de estoque.',
    note: 'O acervo Vetus confirma o item Relatório de Produtos em Relatórios de Estoque, mas não traz URL legacy funcional explícita para esta trilha. Esta visão é somente leitura, consulta produtos, saldos e lotes operacionais existentes, não cria produto, não altera preço, não ajusta saldo, não baixa estoque e não exporta relatório real.',
    columns: [
      { key: 'sku', label: 'Código' },
      { key: 'name', label: 'Produto' },
      { key: 'unit', label: 'Unidade' },
      { key: 'onHandQuantity', label: 'Saldo' },
      { key: 'reorderLevel', label: 'Mínimo' },
      { key: 'unitCostAmount', label: 'Custo unit.' },
      { key: 'stockValue', label: 'Valor estoque' },
      { key: 'lotCount', label: 'Lotes' },
      { key: 'lotStatus', label: 'Situação lote' },
      { key: 'productStatus', label: 'Situação produto' },
      { key: 'source', label: 'Origem' },
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
    emptyDescription: 'A rota já está materializada e pronta para acoplar métricas específicas do cadastro.',
    note: 'Sem endpoint analítico específico no backend atual. A navegação Vetus foi preservada sem exibir dados simulados.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'value', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Faturamentos', value: count(current?.domains.financial.billing.totalRecords), icon: '🧾' },
      { label: 'Vendas', value: count(current?.domains.commercial.counterSales.totalSales), icon: '💸' },
      { label: 'Orçamentos', value: count(current?.domains.commercial.quotes.issuedCount), icon: '📋' }
    ],
    rows: (current) => [
      { id: 'billing', label: 'Registros de faturamento relacionados', value: count(current?.domains.financial.billing.totalRecords), scope: 'Faturamento' },
      { id: 'sales', label: 'Vendas relacionadas', value: count(current?.domains.commercial.counterSales.totalSales), scope: 'Comercial' }
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
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

onMounted(loadReport);
</script>

<style scoped>
.report-page {
  display: grid;
  gap: 16px;
}

.report-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
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
