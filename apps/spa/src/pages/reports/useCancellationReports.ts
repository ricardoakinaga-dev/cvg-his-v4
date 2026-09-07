import { computed, ref } from 'vue';

import type { DataTableRow } from '@/components/DataTable.vue';
import type { ReportExecutionDetail } from '@/services/reports';
import type { ReportCard, ReportSpec } from './reportWorkbenchTypes';

type CancellationReportView = 'history' | 'opening-date';

interface ReportFormatters {
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string | null) => string;
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

interface CancellationHistoryReportRow extends Record<string, unknown> {
  readonly eventId: string;
  readonly counterSaleId: string;
  readonly number: string;
  readonly ownerId: string | null;
  readonly cancelledAt: string;
  readonly cancelledByUserId: string;
  readonly reason: string;
  readonly correlationId: string;
  readonly total: number;
  readonly discountAmount: number;
  readonly paidAmount: number;
  readonly balanceDue: number;
}

/** WEB-REPORTS: validated presentation state for cancellation history and opening-date snapshots. */
export function useCancellationReports(formatters: ReportFormatters) {
  const view = ref<CancellationReportView>('history');
  const historyRows = ref<CancellationHistoryReportRow[]>([]);
  const snapshotRows = ref<DeletedSalesReportRow[]>([]);
  const historySpec = cancellationHistoryReportSpec(formatters);
  const snapshotSpec = deletedSalesCounterSalesReportSpec();
  const spec = computed(() => (view.value === 'history' ? historySpec : snapshotSpec));
  const rows = computed<DataTableRow[]>(() =>
    view.value === 'history'
      ? historyRows.value.map((row) => ({ ...row, id: row.eventId }))
      : snapshotRows.value.map((row) => ({ ...row, id: row.number, status: 'Cancelado' }))
  );
  const cards = computed<ReportCard[]>(() => {
    if (view.value === 'history') {
      return [
        { label: 'Cancelamentos no período', value: String(historyRows.value.length), icon: '🧾' },
        {
          label: 'Valor no cancelamento',
          value: formatters.formatCurrency(
            historyRows.value.reduce((total, row) => total + row.total, 0)
          ),
          icon: '💸'
        },
        {
          label: 'Pago no cancelamento',
          value: formatters.formatCurrency(
            historyRows.value.reduce((total, row) => total + row.paidAmount, 0)
          ),
          icon: '💰'
        },
        {
          label: 'Saldo no cancelamento',
          value: formatters.formatCurrency(
            historyRows.value.reduce((total, row) => total + row.balanceDue, 0)
          ),
          icon: '📋'
        }
      ];
    }

    const cancelledSales = snapshotRows.value;
    const cancelledAmount = cancelledSales.reduce((total, sale) => total + sale.total, 0);
    const discountAmount = cancelledSales.reduce((total, sale) => total + sale.discountAmount, 0);
    const withBalanceCount = cancelledSales.filter((sale) => sale.balanceDue > 0).length;
    return [
      { label: 'Exclusões registradas', value: String(cancelledSales.length), icon: '🧾' },
      { label: 'Valor cancelado', value: formatters.formatCurrency(cancelledAmount), icon: '💸' },
      {
        label: 'Descontos cancelados',
        value: formatters.formatCurrency(discountAmount),
        icon: '🏷️'
      },
      { label: 'Com saldo aberto', value: String(withBalanceCount), icon: '⚠️' }
    ];
  });

  function reset(): void {
    historyRows.value = [];
    snapshotRows.value = [];
  }

  function acceptExecution(
    execution: ReportExecutionDetail,
    executedView: CancellationReportView
  ): void {
    if (executedView === 'history') {
      if (!execution.rows.every(isCancellationHistoryReportRow)) {
        throw new Error('Resposta inválida do histórico de cancelamentos. Tente novamente.');
      }
      historyRows.value = [...execution.rows];
    } else {
      if (!execution.rows.every(isDeletedSalesReportRow)) {
        throw new Error('Resposta inválida do relatório de vendas canceladas');
      }
      snapshotRows.value = [...execution.rows];
    }
  }

  return { view, spec, snapshotSpec, rows, cards, reset, acceptExecution };
}

function isCancellationHistoryReportRow(
  row: Record<string, unknown>
): row is CancellationHistoryReportRow {
  // Executions contain catalog columns only; tenant context is enforced by the server.
  const requiredText = [
    'eventId',
    'counterSaleId',
    'number',
    'cancelledAt',
    'cancelledByUserId',
    'reason',
    'correlationId'
  ];
  const amounts = ['total', 'discountAmount', 'paidAmount', 'balanceDue'];
  return (
    requiredText.every((key) => typeof row[key] === 'string' && row[key].trim().length > 0) &&
    typeof row.cancelledAt === 'string' &&
    Number.isFinite(Date.parse(row.cancelledAt)) &&
    (row.ownerId === null || (typeof row.ownerId === 'string' && row.ownerId.trim().length > 0)) &&
    amounts.every((key) => typeof row[key] === 'number' && Number.isFinite(row[key]))
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

function cancellationHistoryReportSpec({
  formatCurrency,
  formatDateTime
}: ReportFormatters): ReportSpec {
  return {
    title: 'Exclusão de Vendas e Comandas',
    group: 'Relatórios de Cadastros',
    subtitle: 'Histórico de cancelamentos por data, responsável e motivo',
    icon: '🧾',
    primaryPath: '/counter-sales',
    primaryAction: 'Exportar CSV',
    exportable: true,
    serverReportId: 'commercial-cancellation-history',
    tableTitle: 'Cancelamentos no período',
    emptyTitle: 'Nenhum cancelamento encontrado',
    emptyDescription:
      'Ajuste as datas de cancelamento ou limpe os filtros para ampliar a consulta.',
    note: 'Consulte quem cancelou cada venda, quando e por qual motivo. Os valores correspondem ao momento do cancelamento. As datas e os horários são exibidos em UTC.',
    columns: [
      { key: 'number', label: 'Número' },
      {
        key: 'cancelledAt',
        label: 'Cancelamento (UTC)',
        format: (value) => formatDateTime(typeof value === 'string' ? value : null)
      },
      { key: 'cancelledByUserId', label: 'Cancelado por (ID)' },
      { key: 'reason', label: 'Motivo' },
      { key: 'total', label: 'Total' },
      {
        key: 'discountAmount',
        label: 'Desconto',
        format: (value) => formatCurrency(value as number)
      },
      { key: 'paidAmount', label: 'Pago' },
      { key: 'balanceDue', label: 'Saldo', format: (value) => formatCurrency(value as number) }
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
