import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import type { ReportSpec } from './reportWorkbenchTypes';
import type { ReportKey } from './reportWorkbenchModels';

export interface ReportSpecDependencies {
  count: (value: number | undefined | null) => string;
  money: (value: number | undefined | null) => string;
  financialPayableColumns: DataTableColumn[];
  financialReceivableColumns: DataTableColumn[];
  chequeReportColumns: DataTableColumn[];
  advancePaymentReportColumns: DataTableColumn[];
  receivableSpec: (title: string, subtitle: string, mode: 'open' | 'received') => ReportSpec;
  accountsPayableReportSpec: () => ReportSpec;
  paidAccountsReportSpec: () => ReportSpec;
  chequesReportSpec: () => ReportSpec;
  advancePaymentsReportSpec: () => ReportSpec;
  salesCounterSalesReportSpec: () => ReportSpec;
  producedItemsReportSpec: () => ReportSpec;
  productionReportSpec: () => ReportSpec;
  appointmentsReportSpec: () => ReportSpec;
  professionalCareReportSpec: () => ReportSpec;
  serviceInvoicesReportSpec: () => ReportSpec;
  registerServicesReportSpec: () => ReportSpec;
  registerOwnersReportSpec: () => ReportSpec;
  registerPatientsReportSpec: () => ReportSpec;
  registerSuppliersReportSpec: () => ReportSpec;
  cancellationSnapshotSpec: ReportSpec;
  inventoryStockReportSpec: () => ReportSpec;
  inventoryMovementsReportSpec: () => ReportSpec;
  inventoryInvoicesReportSpec: () => ReportSpec;
  inventoryProductsReportSpec: () => ReportSpec;
}

export function createReportSpecs({
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
  cancellationSnapshotSpec,
  inventoryStockReportSpec,
  inventoryMovementsReportSpec,
  inventoryInvoicesReportSpec,
  inventoryProductsReportSpec
}: ReportSpecDependencies): Record<ReportKey, ReportSpec> {
  return {
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
      { key: 'occurredAt', label: 'Data (UTC)' },
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
      'Indicadores de entradas, recebíveis e caixa no período consultado.',
    icon: '📈',
    primaryPath: '/finance/cash-flow',
    primaryAction: 'Exportar CSV',
    exportable: true,
    tableTitle: 'Indicadores financeiros',
    emptyTitle: 'Sem fluxo consolidado',
    emptyDescription: 'Entradas, recebíveis e caixa aparecem aqui conforme o período selecionado.',
    note: 'A rota Vetus legacy observada e Sistema/Relatorio/FluxoDeCaixaRelatorio.htm. Exporta CSV dos indicadores carregados; esta visão é somente leitura e não baixa nem concilia fluxo.',
    columns: [
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
          amount: current?.executive.openCashBalance ?? null,
          scope: 'Gaveta'
        }
      ] as DataTableRow[]
  },
  dre: {
    title: 'DRE - Demonstrativo de Resultados', group: 'Relatórios Financeiros',
    subtitle: 'Resultado contábil por período.', icon: '💰',
    primaryPath: '/reports/accounts', primaryAction: 'Relatórios financeiros',
    tableTitle: 'DRE indisponível', emptyTitle: 'DRE indisponível',
    emptyDescription: 'Ainda não há uma fonte contábil consolidada de receitas, despesas e resultado para este relatório.',
    columns: [], cards: () => [], rows: () => []
  },
  packages: {
    title: 'Pacotes', group: 'Relatórios Financeiros',
    subtitle: 'Pacotes cadastrados e saldo dos itens contratados.', icon: '📦',
    primaryPath: '/packages', primaryAction: 'Exportar CSV', exportable: true,
    tableTitle: 'Pacotes cadastrados', emptyTitle: 'Nenhum pacote encontrado',
    emptyDescription: 'Os pacotes cadastrados aparecem nesta consulta.',
    note: 'Saldo operacional dos itens. Esta consulta não representa receita recebida. O período considera a data de início do pacote.',
    columns: [{key:'number',label:'Pacote'}, {key:'packageStatus',label:'Situação'},
      {key:'startsAt',label:'Início'}, {key:'itemCount',label:'Itens'}, {key:'remainingQuantity',label:'Saldo de unidades'}],
    cards: () => [], rows: () => []
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
  'deleted-sales-counter-sales': cancellationSnapshotSpec,
  'inventory-stock': inventoryStockReportSpec(),
  'inventory-movements': inventoryMovementsReportSpec(),
  'inventory-invoices': inventoryInvoicesReportSpec(),
  'inventory-products': inventoryProductsReportSpec()
};
}
