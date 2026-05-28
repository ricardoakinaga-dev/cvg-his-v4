import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { CashService } from '@cvg-his-v2/module-cash';
import type { CommissionsService } from '@cvg-his-v2/module-commissions';
import type { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import type { QuotesService } from '@cvg-his-v2/module-quotes';
import type {
  CreateReportScheduleInput,
  ReportFormat,
  ReportsService
} from '@cvg-his-v2/module-reports';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface ReportsRoutesHandlers {
  reports: ReportsService;
  billing: BillingService;
  cash: CashService;
  commissions: CommissionsService;
  counterSales: CounterSalesService;
  quotes: QuotesService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseExecutionId(pathname: string, suffix = ''): string | null {
  const escapedSuffix = suffix.replace(/\//g, '\\/');
  const match = pathname.match(new RegExp(`^\\/reports\\/executions\\/([^/]+)${escapedSuffix}$`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function parseScheduleId(pathname: string): string | null {
  const match = pathname.match(/^\/reports\/schedules\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function parseScheduleDeliveriesId(pathname: string): string | null {
  const match = pathname.match(/^\/reports\/schedules\/([^/]+)\/deliveries$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function parseScheduleDeliveryAlertsId(pathname: string): string | null {
  const match = pathname.match(/^\/reports\/schedules\/([^/]+)\/delivery-alerts$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function parseScheduleDeliveryRetry(pathname: string): { scheduleId: string; deliveryId: string } | null {
  const match = pathname.match(/^\/reports\/schedules\/([^/]+)\/deliveries\/([^/]+)\/retry$/);
  if (!match?.[1] || !match[2]) return null;
  return {
    scheduleId: decodeURIComponent(match[1]),
    deliveryId: decodeURIComponent(match[2])
  };
}

function parseFormat(value: unknown): ReportFormat {
  if (value === 'json' || value === 'csv') return value;
  throw new ValidationError('format must be json or csv', { value });
}

export async function handleReportsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ReportsRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/reports/')) return false;
  if (pathname === '/reports/administrative-hubs') return false;

  const { reports, audit, requirePrincipal } = handlers;

  if (pathname === '/reports/catalog' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    return json(response, 200, {
      items: reports.listDefinitions(principal.user.accountId)
    });
  }

  if (pathname === '/reports/executions' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    return json(response, 200, {
      items: reports.listExecutions(principal.user.accountId)
    });
  }

  if (pathname === '/reports/executions' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'billing.read');
    const payload = await readJsonBody(request) as {
      reportId: string;
      filters?: Record<string, unknown>;
    };
    const definition = reports.getDefinition(principal.user.accountId, payload.reportId);
    requirePrincipal(request, definition.requiredPermission);
    const execution = await reports.execute(principal.user.accountId, principal.user.id, {
      reportId: definition.id,
      filters: payload.filters,
      rows: await buildReportRows(handlers, principal, definition.id, payload.filters ?? {})
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'reports',
      action: 'execute_report',
      entityType: 'report-execution',
      entityId: execution.id,
      payloadSummary: `Report ${definition.id} executed with ${execution.rowCount} row(s)`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, execution);
  }

  const executionId = parseExecutionId(pathname);
  if (executionId && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    return json(response, 200, reports.getExecution(principal.user.accountId, executionId));
  }

  const exportExecutionId = parseExecutionId(pathname, '/export');
  if (exportExecutionId && request.method === 'POST') {
    const principal = requirePrincipal(request, 'billing.read');
    const payload = await readJsonBody(request) as { format?: ReportFormat };
    const exported = await reports.exportExecution(
      principal.user.accountId,
      principal.user.id,
      exportExecutionId,
      parseFormat(payload.format ?? 'csv')
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'reports',
      action: 'export_report',
      entityType: 'report-export',
      entityId: exported.id,
      payloadSummary: `Report execution ${exported.executionId} exported as ${exported.format}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, exported);
  }

  if (pathname === '/reports/schedules' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    return json(response, 200, {
      items: reports.listSchedules(principal.user.accountId)
    });
  }

  if (pathname === '/reports/schedules/due' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    const asOf = new URL(request.url ?? pathname, 'http://localhost').searchParams.get('asOf') ?? undefined;
    return json(response, 200, {
      items: reports.listDueSchedules(principal.user.accountId, asOf)
    });
  }

  if (pathname === '/reports/schedules' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'billing.read');
    const payload = await readJsonBody(request) as CreateReportScheduleInput;
    const definition = reports.getDefinition(principal.user.accountId, payload.reportId);
    requirePrincipal(request, definition.requiredPermission);
    const schedule = await reports.createSchedule(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'reports',
      action: 'schedule_report',
      entityType: 'report-schedule',
      entityId: schedule.id,
      payloadSummary: `Report ${schedule.reportId} scheduled as ${schedule.frequency}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, schedule);
  }

  const scheduleDeliveriesId = parseScheduleDeliveriesId(pathname);
  if (scheduleDeliveriesId && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    const schedule = reports.listSchedules(principal.user.accountId).find((item) => item.id === scheduleDeliveriesId);
    if (!schedule) {
      throw new NotFoundError('Report schedule not found', { scheduleId: scheduleDeliveriesId });
    }
    return json(response, 200, {
      items: reports.listScheduleDeliveries(principal.user.accountId, scheduleDeliveriesId)
    });
  }

  const scheduleDeliveryAlertsId = parseScheduleDeliveryAlertsId(pathname);
  if (scheduleDeliveryAlertsId && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    const schedule = reports.listSchedules(principal.user.accountId).find((item) => item.id === scheduleDeliveryAlertsId);
    if (!schedule) {
      throw new NotFoundError('Report schedule not found', { scheduleId: scheduleDeliveryAlertsId });
    }
    const alerts = reports.listScheduleDeliveryAlerts(principal.user.accountId, scheduleDeliveryAlertsId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'reports',
      action: 'report_schedule_delivery_alerts_read',
      entityType: 'report-schedule-delivery-alert',
      entityId: schedule.id,
      payloadSummary: `Report schedule delivery alerts inspected for ${schedule.id} alerts=${alerts.length}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, {
      items: alerts
    });
  }

  const retryDelivery = parseScheduleDeliveryRetry(pathname);
  if (retryDelivery && request.method === 'POST') {
    const principal = requirePrincipal(request, 'billing.read');
    const delivery = await reports.retryScheduleDelivery(
      principal.user.accountId,
      principal.user.id,
      retryDelivery.scheduleId,
      retryDelivery.deliveryId
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'reports',
      action: 'retry_report_schedule_delivery',
      entityType: 'report-schedule-delivery',
      entityId: delivery.id,
      payloadSummary: `Report schedule delivery ${retryDelivery.deliveryId} retried for ${delivery.recipient}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, delivery);
  }

  const scheduleId = parseScheduleId(pathname);
  if (scheduleId && request.method === 'PATCH') {
    const principal = requirePrincipal(request, 'billing.read');
    const payload = await readJsonBody(request) as { isActive?: boolean };
    if (typeof payload.isActive !== 'boolean') {
      throw new ValidationError('isActive must be boolean', { value: payload.isActive });
    }
    const schedule = await reports.setScheduleActive(principal.user.accountId, scheduleId, payload.isActive);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'reports',
      action: payload.isActive ? 'reactivate_report_schedule' : 'pause_report_schedule',
      entityType: 'report-schedule',
      entityId: schedule.id,
      payloadSummary: `Report schedule ${schedule.id} ${payload.isActive ? 'reactivated' : 'paused'}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, schedule);
  }

  return false;
}

async function buildReportRows(
  handlers: ReportsRoutesHandlers,
  principal: AuthenticatedPrincipal,
  reportId: string,
  filters: Record<string, unknown>
): Promise<readonly Record<string, unknown>[]> {
  if (reportId === 'commission-calculations') {
    const status = typeof filters.status === 'string' ? filters.status : '';
    return handlers.commissions
      .listCalculations(principal.user.accountId)
      .filter((calculation) => !status || calculation.status === status)
      .map((calculation) => ({
        number: calculation.number,
        period: `${calculation.periodStart}..${calculation.periodEnd}`,
        status: calculation.status,
        totalBaseAmount: calculation.totalBaseAmount,
        totalCommissionAmount: calculation.totalCommissionAmount,
        lineCount: calculation.lines.length
      }));
  }

  if (reportId !== 'administrative-executive') {
    throw new ValidationError('Unsupported report execution source', { reportId });
  }

  const [dashboard, openRegister] = await Promise.all([
    handlers.counterSales.getCommercialDashboard(
      principal.user.accountId as never,
      typeof filters.dateFrom === 'string' ? filters.dateFrom : undefined,
      typeof filters.dateTo === 'string' ? filters.dateTo : undefined
    ),
    handlers.cash.findOpenRegister(principal.user.accountId as never)
  ]);
  const billing = handlers.billing.list().filter((item) => item.accountId === principal.user.accountId);
  const quotes = handlers.quotes.list(principal.user.accountId as never);
  const openBalance = openRegister
    ? await handlers.cash.getCurrentBalance(openRegister.id)
    : 0;
  return [
    {
      domain: 'financial',
      metric: 'Faturamento bruto',
      value: billing.reduce((total, item) => total + item.subtotalAmount, 0),
      status: 'tracked'
    },
    {
      domain: 'commercial',
      metric: 'Receita comercial',
      value: dashboard.netRevenueToday,
      status: dashboard.closedToday > 0 ? 'active' : 'empty'
    },
    {
      domain: 'commercial',
      metric: 'Pipeline de orçamentos',
      value: quotes.filter((quote) => quote.status === 'approved').reduce((total, quote) => total + quote.total, 0),
      status: 'tracked'
    },
    {
      domain: 'cash',
      metric: 'Saldo do caixa aberto',
      value: openBalance,
      status: openRegister ? 'open' : 'closed'
    }
  ];
}
