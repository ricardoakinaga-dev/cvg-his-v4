import type { ReportDefinition } from './index.js';

/** Owner: REPORTS. The two cancellation views retain independent date contracts. */
export function cancellationReportDefinitions(createdAt: string): readonly ReportDefinition[] {
  return [
    {
      id: 'commercial-deleted-sales',
      accountId: null,
      title: 'Exclusão de Vendas e Comandas',
      description:
        'Snapshot de comandas atualmente canceladas, filtrado pela data de abertura (createdAt), com valores e identificadores operacionais.',
      category: 'commercial',
      requiredPermission: 'counter_sale.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { search: 'string', dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'number', label: 'Número', type: 'string' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'ownerId', label: 'Tutor (ID)', type: 'string' },
        { key: 'openedByUserId', label: 'Usuário de abertura (ID)', type: 'string' },
        { key: 'createdAt', label: 'Abertura', type: 'datetime' },
        { key: 'updatedAt', label: 'Última atualização', type: 'datetime' },
        { key: 'total', label: 'Total', type: 'currency' },
        { key: 'discountAmount', label: 'Desconto', type: 'currency' },
        { key: 'paidAmount', label: 'Pago', type: 'currency' },
        { key: 'balanceDue', label: 'Saldo', type: 'currency' },
        { key: 'notes', label: 'Observação', type: 'string' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'commercial-cancellation-history',
      accountId: null,
      title: 'Histórico de cancelamentos de vendas e comandas',
      description:
        'Cancelamentos registrados no período, com responsável, motivo e valores no momento do cancelamento. O período considera a data do cancelamento em UTC.',
      category: 'commercial',
      requiredPermission: 'counter_sale.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { search: 'string', dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'number', label: 'Número', type: 'string' },
        { key: 'cancelledAt', label: 'Cancelado em (UTC)', type: 'datetime' },
        { key: 'cancelledByUserId', label: 'Responsável (ID)', type: 'string' },
        { key: 'reason', label: 'Motivo', type: 'string' },
        { key: 'total', label: 'Total no cancelamento', type: 'currency' },
        { key: 'discountAmount', label: 'Desconto', type: 'currency' },
        { key: 'paidAmount', label: 'Pago', type: 'currency' },
        { key: 'balanceDue', label: 'Saldo', type: 'currency' },
        { key: 'ownerId', label: 'Tutor (ID)', type: 'string' },
        { key: 'counterSaleId', label: 'Venda ou comanda (ID)', type: 'string' },
        { key: 'eventId', label: 'Evento (ID)', type: 'string' },
        { key: 'correlationId', label: 'Referência de auditoria', type: 'string' }
      ],
      createdAt,
      updatedAt: createdAt
    }
  ];
}
