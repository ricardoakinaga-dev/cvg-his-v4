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
        <template #cell-dueAt="{ row }">
          {{ formatDate(stringValue(row, 'dueAt')) }}
        </template>
        <template #cell-createdAt="{ row }">
          {{ formatDate(stringValue(row, 'createdAt')) }}
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
  | 'produced-items'
  | 'professional-care'
  | 'register-services'
  | 'register-owners'
  | 'register-patients'
  | 'register-suppliers'
  | 'deleted-sales-counter-sales'
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
  'received-accounts': receivableSpec('Contas Recebidas', 'Baixas e pagamentos recebidos no período', 'received'),
  'accounts-payable': payableSpec('Contas a Pagar'),
  'paid-accounts': payableSpec('Contas Pagas'),
  cheques: payableSpec('Cheques'),
  'advance-payments': payableSpec('Pagamento Antecipado'),
  'produced-items': productionSpec('Produtos/Serviços Produzidos', '/sales', 'Abrir vendas'),
  'professional-care': productionSpec('Atendimento por Profissional', '/staff', 'Abrir profissionais'),
  'register-services': registerSpec('Serviços', '/services', 'Abrir serviços'),
  'register-owners': registerSpec('Clientes', '/owners', 'Abrir clientes'),
  'register-patients': registerSpec('Animais', '/patients', 'Abrir animais'),
  'register-suppliers': registerSpec('Fornecedores', '/expenses/suppliers', 'Abrir fornecedores'),
  'deleted-sales-counter-sales': {
    title: 'Exclusão de Vendas e Comandas',
    group: 'Relatórios de Cadastros',
    subtitle: 'Entrada de auditoria para exclusões e cancelamentos comerciais',
    icon: '🧾',
    primaryPath: '/audit',
    primaryAction: 'Abrir auditoria',
    tableTitle: 'Cancelamentos comerciais',
    emptyTitle: 'Sem cancelamento consolidado',
    emptyDescription: 'Cancelamentos aparecem quando houver venda ou comanda cancelada no período.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'value', label: 'Total' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Vendas canceladas', value: count(current?.domains.commercial.counterSales.cancelledCount), icon: '🧾' },
      { label: 'Orçamentos rejeitados', value: count(current?.domains.commercial.quotes.rejectedCount), icon: '🚫' },
      { label: 'Total de vendas', value: count(current?.domains.commercial.counterSales.totalSales), icon: '💸' }
    ],
    rows: (current) => [
      { id: 'cancelled-sales', label: 'Vendas canceladas', value: count(current?.domains.commercial.counterSales.cancelledCount), scope: 'Comandas/Vendas' },
      { id: 'rejected-quotes', label: 'Orçamentos rejeitados', value: count(current?.domains.commercial.quotes.rejectedCount), scope: 'Orçamentos' }
    ]
  },
  'inventory-movements': inventorySpec('Movimentações no Estoque', '/inventory/transactions'),
  'inventory-invoices': inventorySpec('Entrada de NF', '/inventory/invoices'),
  'inventory-products': inventorySpec('Relatório de Produtos', '/products')
};

const spec = computed(() => specs[props.reportKey]);
const isAuditAppointments = computed(() => props.reportKey === 'audit-appointments');
const filteredAuditEvents = computed(() => auditEvents.value.filter((event) => matchesAuditFilters(event)));
const auditActionOptions = computed(() => uniqueSorted(auditEvents.value.map((event) => event.action)));
const auditTypeOptions = computed(() => uniqueSorted(auditEvents.value.map((event) => event.entityType)));
const cards = computed(() => (isAuditAppointments.value ? auditAppointmentCards.value : spec.value.cards(report.value)));
const rows = computed(() => (isAuditAppointments.value ? auditAppointmentRows.value : spec.value.rows(report.value)));
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

function payableSpec(title: string): ReportSpec {
  return {
    title,
    group: 'Relatórios Financeiros',
    subtitle: 'Superfície de relatório financeiro conectada aos filtros e ao hub executivo existente',
    icon: title === 'Cheques' ? '📄' : '💸',
    primaryPath: '/finance/accounts-payable',
    primaryAction: 'Abrir financeiro',
    tableTitle: 'Indicadores financeiros disponíveis',
    emptyTitle: 'Sem dados específicos conectados',
    emptyDescription: 'Este relatório está pronto para receber o endpoint específico sem usar dados simulados.',
    note: 'O backend atual ainda não expõe fonte específica para esta visão Vetus. A rota foi materializada sem placeholder e sem inventar dados.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'value', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Recebíveis abertos', value: money(current?.executive.outstandingReceivables), icon: '💵' },
      { label: 'Saldo do caixa', value: money(current?.executive.openCashBalance), icon: '🏦' },
      { label: 'PIX atenção', value: count(current?.executive.pixAttentionCount), icon: '⚠️' }
    ],
    rows: (current) => [
      { id: 'cash', label: 'Saldo do caixa aberto', value: money(current?.executive.openCashBalance), scope: 'Caixa' },
      { id: 'receivables', label: 'Recebíveis em aberto', value: money(current?.executive.outstandingReceivables), scope: 'Financeiro' }
    ]
  };
}

function productionSpec(title: string, primaryPath: string, primaryAction: string): ReportSpec {
  return {
    title,
    group: 'Relatórios de Atendimentos',
    subtitle: 'Produção operacional consolidada a partir de comandas e vendas fechadas',
    icon: '🛠️',
    primaryPath,
    primaryAction,
    tableTitle: 'Itens produzidos',
    emptyTitle: 'Sem produção no período',
    emptyDescription: 'Produtos e serviços aparecem aqui quando houver venda fechada no período.',
    columns: [
      { key: 'name', label: 'Item' },
      { key: 'kind', label: 'Tipo' },
      { key: 'quantity', label: 'Quantidade' },
      { key: 'revenue', label: 'Receita' }
    ],
    cards: (current) => [
      { label: 'Vendas fechadas', value: count(current?.domains.commercial.counterSales.closedCount), icon: '✅' },
      { label: 'Receita comercial', value: money(current?.executive.commercialRevenue), icon: '📈' },
      { label: 'Ticket médio', value: money(current?.domains.commercial.counterSales.avgTicket), icon: '🧾' }
    ],
    rows: (current) => {
      const dashboard = current?.domains.commercial.counterSales;
      if (!dashboard) return [];
      return [
        ...dashboard.topServices.map((row) => ({ ...row, id: `service-${row.name}`, kind: 'Serviço' })),
        ...dashboard.topProducts.map((row) => ({ ...row, id: `product-${row.name}`, kind: 'Produto' }))
      ] as DataTableRow[];
    }
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

function inventorySpec(title: string, primaryPath: string): ReportSpec {
  return {
    title,
    group: 'Relatórios de Estoque',
    subtitle: `Relatório operacional de ${title.toLowerCase()}`,
    icon: '📦',
    primaryPath,
    primaryAction: 'Abrir estoque',
    tableTitle: 'Indicadores de estoque disponíveis',
    emptyTitle: 'Sem movimentação consolidada',
    emptyDescription: 'A rota está pronta para receber a fonte específica de estoque sem usar mock.',
    note: 'O hub administrativo atual não expõe métricas detalhadas de estoque. A visão mantém filtros, navegação e estado vazio explícito.',
    columns: [
      { key: 'label', label: 'Indicador' },
      { key: 'value', label: 'Valor' },
      { key: 'scope', label: 'Origem' }
    ],
    cards: (current) => [
      { label: 'Cobertura fiscal', value: `${current?.executive.fiscalCoverageScore ?? 0}/100`, icon: '📋' },
      { label: 'CFOPs', value: count(current?.domains.fiscal.cfopCount), icon: '🧾' },
      { label: 'NCMs', value: count(current?.domains.fiscal.ncmEntries), icon: '🏷️' }
    ],
    rows: (current) => [
      { id: 'cfop', label: 'CFOPs cadastrados', value: count(current?.domains.fiscal.cfopCount), scope: 'Fiscal/Estoque' },
      { id: 'ncm', label: 'NCMs cadastrados', value: count(current?.domains.fiscal.ncmEntries), scope: 'Fiscal/Produtos' },
      { id: 'taxes', label: 'Tabelas fiscais ativas', value: count(current?.domains.fiscal.activeTaxes), scope: 'Configuração fiscal' }
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
