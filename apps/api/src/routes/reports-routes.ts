import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { CashService } from '@cvg-his-v2/module-cash';
import type { CommissionsService } from '@cvg-his-v2/module-commissions';
import type { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import { DatabaseFiscalRepository, FiscalService } from '@cvg-his-v2/module-fiscal';
import type {
  EncounterFinancialService,
  EncounterReceivableStatus,
  FinancialPayableStatus,
  FinancialPayablesService
} from '@cvg-his-v2/module-financial';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import type { QuotesService } from '@cvg-his-v2/module-quotes';
import type {
  InventoryPurchaseReportSourceRow,
  InventoryPurchaseStatus,
  InventoryService,
  InventoryStockMovementReportRow
} from '@cvg-his-v2/module-inventory';
import type { ProcurementService } from '@cvg-his-v2/module-inventory';
import type { ServicesService } from '@cvg-his-v2/module-services';
import type {
  SchedulingProfessionalCareReportRow,
  SchedulingService
} from '@cvg-his-v2/module-scheduling';
import type {
  CreateReportScheduleInput,
  ReportFormat,
  ReportsService
} from '@cvg-his-v2/module-reports';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { FiscalNfseDocumentSummary } from '@cvg-his-v2/shared-contracts';
import type {
  AuthenticatedPrincipal,
  SchedulingAppointmentSummary
} from '@cvg-his-v2/shared-types';
import { getPool } from '@cvg-his-v2/shared-database';

import { appendAudit, appendAuditAndWait } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type {
  AdvancePaymentReportStatus,
  AdvancePaymentsReportSource
} from '../repositories/advance-payments-report-source.js';
import type { FinanceCatalogReportSource } from '../repositories/finance-catalog-report-source.js';

export interface ReportsRoutesHandlers {
  reports: ReportsService;
  billing: BillingService;
  cash: CashService;
  commissions: CommissionsService;
  encounterFinancial: EncounterFinancialService;
  financialPayables: FinancialPayablesService;
  counterSales: CounterSalesService;
  inventory: InventoryService;
  scheduling?: SchedulingService;
  procurement?: ProcurementService;
  quotes: QuotesService;
  owners: OwnersService;
  patients: PatientsService;
  services: ServicesService;
  fiscal: FiscalService;
  financeCatalog?: FinanceCatalogReportSource;
  advancePayments?: AdvancePaymentsReportSource;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

function getScopedFiscalReportService(
  fiscal: FiscalService,
  accountId: AuthenticatedPrincipal['user']['accountId']
): FiscalService {
  try {
    getPool();
    return new FiscalService(new DatabaseFiscalRepository(), accountId as never);
  } catch {
    return fiscal.forAccount(accountId);
  }
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

function parseExportId(pathname: string): string | null {
  const match = pathname.match(/^\/reports\/exports\/([^/]+)$/);
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

function parseScheduleDeliveryRetry(
  pathname: string
): { scheduleId: string; deliveryId: string } | null {
  const match = pathname.match(/^\/reports\/schedules\/([^/]+)\/deliveries\/([^/]+)\/retry$/);
  if (!match?.[1] || !match[2]) return null;
  return {
    scheduleId: decodeURIComponent(match[1]),
    deliveryId: decodeURIComponent(match[2])
  };
}

function parseFormat(value: unknown): ReportFormat {
  if (value === 'json' || value === 'csv' || value === 'xlsx' || value === 'pdf') return value;
  throw new ValidationError('format must be json, csv, xlsx or pdf', { value });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseReportExecutionPayload(payload: unknown): {
  readonly reportId: string;
  readonly filters?: Record<string, unknown>;
} {
  if (!isRecord(payload)) {
    throw new ValidationError('Request body must be an object');
  }
  if (typeof payload.reportId !== 'string' || payload.reportId.trim().length === 0) {
    throw new ValidationError('reportId must be a non-empty string', { value: payload.reportId });
  }
  const reportId = payload.reportId.trim();
  if (reportId.length > 200) {
    throw new ValidationError('reportId must have at most 200 characters', { reportId });
  }

  if (payload.filters === undefined) return { reportId };
  if (!isRecord(payload.filters)) {
    throw new ValidationError('filters must be an object', { value: payload.filters });
  }
  return { reportId, filters: { ...payload.filters } };
}

function parseReportExportPayload(payload: unknown): ReportFormat {
  if (!isRecord(payload)) {
    throw new ValidationError('Request body must be an object');
  }
  return parseFormat(payload.format ?? 'csv');
}

function normalizeInventoryReportFilters(
  filters: Record<string, unknown>
): Record<string, unknown> {
  const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
  const search = parseReportSearch(filters.search);
  return {
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
}

function normalizeInventoryPurchaseReportFilters(
  filters: Record<string, unknown>
): Record<string, unknown> {
  const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
  const search = parseReportSearch(filters.search);
  const status = parseInventoryPurchaseReportStatus(filters.status);
  return {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
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

  const exportId = parseExportId(pathname);
  if (exportId && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    const exported = reports.getExport(principal.user.accountId, exportId);
    const execution = reports.getExecution(principal.user.accountId, exported.executionId);
    const definition = reports.getDefinition(principal.user.accountId, execution.reportId);
    await requirePrincipal(request, definition.requiredPermission);
    return json(response, 200, exported);
  }

  if (pathname === '/reports/catalog' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    return json(response, 200, {
      items: reports.listDefinitions(principal.user.accountId)
    });
  }

  if (pathname === '/reports/executions' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    return json(response, 200, {
      items: reports.listExecutions(principal.user.accountId)
    });
  }

  if (pathname === '/reports/executions' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'billing.read');
    const payload = parseReportExecutionPayload(await readJsonBody(request));
    const definition = reports.getDefinition(principal.user.accountId, payload.reportId);
    await requirePrincipal(request, definition.requiredPermission);
    const filters =
      definition.id === 'inventory-invoices'
        ? normalizeInventoryPurchaseReportFilters(payload.filters ?? {})
        : definition.id === 'inventory-products' ||
            definition.id === 'inventory-stock' ||
            definition.id === 'inventory-movements'
          ? normalizeInventoryReportFilters(payload.filters ?? {})
          : definition.id === 'scheduling-appointments'
            ? normalizeSchedulingAppointmentReportFilters(payload.filters ?? {})
            : definition.id === 'scheduling-professional-care'
              ? normalizeSchedulingProfessionalCareReportFilters(payload.filters ?? {})
              : payload.filters;
    const rows = await buildReportRows(handlers, principal, definition.id, filters ?? {});
    if (
      (definition.id === 'inventory-movements' || definition.id === 'inventory-invoices') &&
      reports.persistenceMode !== 'database'
    ) {
      throw new ValidationError(
        definition.id === 'inventory-invoices'
          ? 'Inventory purchase report requires a database-backed ReportsService'
          : 'Inventory movement report requires a database-backed ReportsService'
      );
    }
    const execution = await reports.execute(principal.user.accountId, principal.user.id, {
      reportId: definition.id,
      filters,
      rows
    });
    await appendAuditAndWait(audit, {
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
    const principal = await requirePrincipal(request, 'billing.read');
    const execution = reports.getExecution(principal.user.accountId, executionId);
    const definition = reports.getDefinition(principal.user.accountId, execution.reportId);
    await requirePrincipal(request, definition.requiredPermission);
    return json(response, 200, execution);
  }

  const exportExecutionId = parseExecutionId(pathname, '/export');
  if (exportExecutionId && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'billing.read');
    const execution = reports.getExecution(principal.user.accountId, exportExecutionId);
    const definition = reports.getDefinition(principal.user.accountId, execution.reportId);
    await requirePrincipal(request, definition.requiredPermission);
    const format = parseReportExportPayload(await readJsonBody(request));
    const exported = await reports.exportExecution(
      principal.user.accountId,
      principal.user.id,
      exportExecutionId,
      format
    );
    await appendAuditAndWait(audit, {
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
    const principal = await requirePrincipal(request, 'billing.read');
    return json(response, 200, {
      items: reports.listSchedules(principal.user.accountId)
    });
  }

  if (pathname === '/reports/schedules/due' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    const asOf =
      new URL(request.url ?? pathname, 'http://localhost').searchParams.get('asOf') ?? undefined;
    return json(response, 200, {
      items: reports.listDueSchedules(principal.user.accountId, asOf)
    });
  }

  if (pathname === '/reports/schedules' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'billing.read');
    const payload = (await readJsonBody(request)) as CreateReportScheduleInput;
    const definition = reports.getDefinition(principal.user.accountId, payload.reportId);
    await requirePrincipal(request, definition.requiredPermission);
    const schedule = await reports.createSchedule(
      principal.user.accountId,
      principal.user.id,
      payload
    );
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
    const principal = await requirePrincipal(request, 'billing.read');
    const schedule = reports
      .listSchedules(principal.user.accountId)
      .find((item) => item.id === scheduleDeliveriesId);
    if (!schedule) {
      throw new NotFoundError('Report schedule not found', { scheduleId: scheduleDeliveriesId });
    }
    return json(response, 200, {
      items: reports.listScheduleDeliveries(principal.user.accountId, scheduleDeliveriesId)
    });
  }

  const scheduleDeliveryAlertsId = parseScheduleDeliveryAlertsId(pathname);
  if (scheduleDeliveryAlertsId && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    const schedule = reports
      .listSchedules(principal.user.accountId)
      .find((item) => item.id === scheduleDeliveryAlertsId);
    if (!schedule) {
      throw new NotFoundError('Report schedule not found', {
        scheduleId: scheduleDeliveryAlertsId
      });
    }
    const alerts = reports.listScheduleDeliveryAlerts(
      principal.user.accountId,
      scheduleDeliveryAlertsId
    );
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
    const principal = await requirePrincipal(request, 'billing.read');
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
    const principal = await requirePrincipal(request, 'billing.read');
    const payload = (await readJsonBody(request)) as { isActive?: boolean };
    if (typeof payload.isActive !== 'boolean') {
      throw new ValidationError('isActive must be boolean', { value: payload.isActive });
    }
    const schedule = await reports.setScheduleActive(
      principal.user.accountId,
      scheduleId,
      payload.isActive
    );
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
  if (reportId === 'financial-cheques') {
    const dateFrom = parseReportDate(filters.dateFrom, 'dateFrom');
    const dateTo = parseReportDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new ValidationError('dateFrom must be before or equal to dateTo', { dateFrom, dateTo });
    }

    const chequePayments = await handlers.counterSales.listChequePayments(
      principal.user.accountId,
      {
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {})
      }
    );
    return chequePayments.map((payment) => ({
      paymentId: payment.id,
      counterSaleId: payment.counterSaleId,
      saleNumber: payment.saleNumber,
      saleStatus: payment.saleStatus,
      reference: payment.reference,
      amount: payment.amount,
      installments: payment.installments,
      recordedAt: payment.createdAt,
      notes: payment.notes
    }));
  }

  if (reportId === 'commercial-deleted-sales') {
    if (handlers.counterSales.persistenceMode !== 'database') {
      throw new ValidationError(
        'Cancelled counter-sale report requires a database-backed counter-sale source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const sales = await handlers.counterSales.listPersisted(principal.user.accountId, {
      status: 'cancelled',
      ...(search ? { search } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {})
    });
    return limitReportRows(
      reportId,
      sales
        .filter((sale) => sale.status === 'cancelled')
        .map((sale) => ({
          number: sale.number,
          status: sale.status,
          ownerId: sale.ownerId,
          openedByUserId: sale.openedByUserId,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          total: sale.total,
          discountAmount: sale.discountAmount,
          paidAmount: sale.paidAmount,
          balanceDue: sale.balanceDue,
          notes: sale.notes
        }))
    );
  }

  if (reportId === 'scheduling-appointments') {
    if (
      !handlers.scheduling ||
      handlers.scheduling.persistenceMode !== 'database' ||
      typeof handlers.scheduling.listPersistedReportRows !== 'function'
    ) {
      throw new ValidationError('Appointments report requires a database-backed scheduling source');
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const status = parseSchedulingAppointmentReportStatus(filters.status);
    const appointments = await handlers.scheduling.listPersistedReportRows(
      principal.user.accountId,
      {
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        limit: MAX_REGISTRY_REPORT_ROWS + 1
      }
    );
    if (!Array.isArray(appointments)) {
      throw new ValidationError('Appointments report source returned an invalid row collection');
    }

    const rows = appointments.map((appointment, index) => {
      if (!isSchedulingAppointmentReportSourceRow(appointment)) {
        throw new ValidationError('Appointments report source returned an invalid row', {
          rowIndex: index
        });
      }
      return appointment;
    });

    return limitReportRows(
      reportId,
      rows
        .filter((appointment) => appointment.accountId === principal.user.accountId)
        .filter((appointment) => !status || appointment.status === status)
        .filter((appointment) => matchesReportPeriod(appointment.scheduledAt, dateFrom, dateTo))
        .filter((appointment) => matchesSchedulingAppointmentSearch(appointment, search))
        .map((appointment) => ({
          appointmentId: appointment.id,
          scheduledAt: appointment.scheduledAt,
          status: appointment.status,
          reason: appointment.reason,
          patientId: appointment.patientId,
          ownerId: appointment.ownerId,
          practitionerStaffId: appointment.practitionerStaffId ?? null,
          serviceId: appointment.serviceId ?? null,
          unit: appointment.unit ?? null,
          specialty: appointment.specialty ?? null,
          resourceLabel: appointment.resourceLabel ?? null,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt
        }))
    );
  }

  if (reportId === 'scheduling-professional-care') {
    if (
      !handlers.scheduling ||
      handlers.scheduling.persistenceMode !== 'database' ||
      typeof handlers.scheduling.listPersistedProfessionalCareReportRows !== 'function'
    ) {
      throw new ValidationError(
        'Professional care report requires a database-backed scheduling source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const professionalCareRows = await handlers.scheduling.listPersistedProfessionalCareReportRows(
      principal.user.accountId,
      {
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {})
      }
    );
    if (!Array.isArray(professionalCareRows)) {
      throw new ValidationError(
        'Professional care report source returned an invalid row collection'
      );
    }

    const rows = professionalCareRows.map((row, index) => {
      if (!isSchedulingProfessionalCareReportRow(row)) {
        throw new ValidationError(
          'Professional care report source returned an invalid professional care row',
          { rowIndex: index }
        );
      }
      return {
        professional: row.professional,
        scheduled: row.scheduled,
        completed: row.completed,
        checkedIn: row.checkedIn,
        cancelled: row.cancelled,
        services: row.services
      };
    });

    return limitReportRows(reportId, rows);
  }

  if (reportId === 'inventory-products') {
    if (handlers.inventory.persistenceMode !== 'database') {
      throw new ValidationError(
        'Inventory product report requires a database-backed inventory source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const items = await handlers.inventory.listPersistedItems(principal.user.accountId, {
      ...(search ? { search } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      limit: MAX_REGISTRY_REPORT_ROWS + 1
    });

    return limitReportRows(
      reportId,
      items
        .filter((item) => item.accountId === principal.user.accountId)
        .filter((item) => matchesReportPeriod(item.createdAt, dateFrom, dateTo))
        .filter((item) => matchesInventoryItemSearch(item, search))
        .map((item) => ({
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          onHandQuantity: item.onHandQuantity,
          reorderLevel: item.reorderLevel,
          unitCostAmount: item.unitCostAmount,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
    );
  }

  if (reportId === 'inventory-invoices') {
    if (
      !handlers.procurement ||
      handlers.procurement.persistenceMode !== 'database' ||
      typeof handlers.procurement.listPersistedPurchaseReportRows !== 'function'
    ) {
      throw new ValidationError(
        'Inventory purchase report requires a database-backed purchase source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const status = parseInventoryPurchaseReportStatus(filters.status);
    const purchases = await handlers.procurement.listPersistedPurchaseReportRows(
      principal.user.accountId,
      {
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        limit: MAX_REGISTRY_REPORT_ROWS + 1
      }
    );

    for (const purchase of purchases) {
      if (!isInventoryPurchaseReportSourceRow(purchase)) {
        throw new ValidationError('Inventory purchase report source returned an invalid row');
      }
    }

    const rows = purchases
      .filter((purchase) => purchase.accountId === principal.user.accountId)
      .filter((purchase) => !status || purchase.status === status)
      .filter((purchase) => matchesReportPeriod(purchase.createdAt, dateFrom, dateTo))
      .filter((purchase) => matchesInventoryPurchaseSearch(purchase, search))
      .map((purchase) => ({
        purchaseId: purchase.purchaseId,
        invoiceNumber: purchase.invoiceNumber,
        supplierName: purchase.supplierName,
        status: purchase.status,
        totalAmount: purchase.totalAmount,
        receivedAmount: purchase.receivedAmount,
        payableId: purchase.payableId,
        createdByUserId: purchase.createdByUserId,
        approvedByUserId: purchase.approvedByUserId,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
        receivedAt: purchase.receivedAt
      }));
    assertInventoryPurchaseReportRows(rows);
    return limitReportRows(reportId, rows);
  }

  if (reportId === 'inventory-stock') {
    if (handlers.inventory.persistenceMode !== 'database') {
      throw new ValidationError(
        'Inventory stock report requires a database-backed inventory source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const items = await handlers.inventory.listPersistedItems(principal.user.accountId, {
      ...(search ? { search } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      limit: MAX_REGISTRY_REPORT_ROWS + 1
    });

    return limitReportRows(
      reportId,
      items
        .filter((item) => item.accountId === principal.user.accountId)
        .filter((item) => matchesReportPeriod(item.createdAt, dateFrom, dateTo))
        .filter((item) => matchesInventoryItemSearch(item, search))
        .map((item) => ({
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          onHandQuantity: item.onHandQuantity,
          reorderLevel: item.reorderLevel,
          unitCostAmount: item.unitCostAmount,
          stockValue: roundReportAmount(item.onHandQuantity * item.unitCostAmount),
          reorderStatus:
            item.onHandQuantity <= item.reorderLevel ? 'below_reorder_level' : 'adequate',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
    );
  }

  if (reportId === 'inventory-movements') {
    if (
      handlers.inventory.persistenceMode !== 'database' ||
      handlers.inventory.stockMovementsPersistenceMode !== 'database'
    ) {
      throw new ValidationError(
        'Inventory movement report requires a database-backed stock movement source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const movements = await handlers.inventory.listPersistedStockMovementReportRows(
      principal.user.accountId,
      {
        ...(search ? { search } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        limit: MAX_REGISTRY_REPORT_ROWS + 1
      }
    );

    for (const movement of movements) {
      if (!isInventoryMovementReportSourceRow(movement)) {
        throw new ValidationError('Inventory movement source returned an invalid row');
      }
    }

    const rows = movements
      .filter((row) => row.movement.accountId === principal.user.accountId)
      .filter((row) => matchesReportPeriod(row.movement.createdAt, dateFrom, dateTo))
      .filter(
        (row) =>
          !search ||
          row.sku.toLowerCase().includes(search.toLowerCase()) ||
          row.name.toLowerCase().includes(search.toLowerCase())
      )
      .map((row) => ({
        movementId: row.movement.id,
        occurredAt: row.movement.createdAt,
        movementType: row.movement.movementType,
        sku: row.sku,
        name: row.name,
        unit: row.unit,
        quantityDelta: row.movement.quantityDelta,
        balanceBefore: row.movement.balanceBefore,
        balanceAfter: row.movement.balanceAfter,
        unitCostAmount: row.movement.unitCostAmount,
        reason: row.movement.reason,
        reference: row.movement.reference ?? '',
        recordedByUserId: row.movement.recordedByUserId
      }));
    assertInventoryMovementReportRows(rows);

    return limitReportRows(reportId, rows);
  }

  if (reportId === 'fiscal-service-invoices') {
    const scopedFiscal = getScopedFiscalReportService(handlers.fiscal, principal.user.accountId);
    if (scopedFiscal.persistenceMode !== 'database') {
      throw new ValidationError(
        'NFS-e service-invoice report requires a database-backed fiscal source'
      );
    }

    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const status = parseFiscalNfseReportStatus(filters.status);
    const documents = await scopedFiscal.listNfseDocuments({
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      ...(dateFrom ? { competenciaFrom: dateFrom } : {}),
      ...(dateTo ? { competenciaTo: dateTo } : {}),
      limit: MAX_REGISTRY_REPORT_ROWS + 1
    });

    return limitReportRows(
      reportId,
      documents
        .filter((document) => !status || document.status === status)
        .filter((document) => matchesReportPeriod(document.competencia, dateFrom, dateTo))
        .filter((document) => matchesFiscalNfseSearch(document, search))
        .map(mapFiscalServiceInvoiceReportRow)
    );
  }

  if (reportId === 'registration-owners') {
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const rows = handlers.owners
      .list()
      .filter(
        (owner) =>
          owner.accountId === principal.user.accountId &&
          matchesReportPeriod(owner.createdAt, dateFrom, dateTo)
      )
      .map((owner) => ({
        documentId: owner.documentId ?? '',
        fullName: owner.fullName,
        primaryContact: primaryOwnerContact(owner),
        city: owner.address?.city ?? '',
        financialResponsible: owner.financialResponsible ? 'Sim' : 'Não',
        status: owner.status,
        createdAt: owner.createdAt
      }));
    return limitReportRows(reportId, rows);
  }

  if (reportId === 'registration-patients') {
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const rows = handlers.patients
      .list()
      .filter(
        (patient) =>
          patient.accountId === principal.user.accountId &&
          matchesReportPeriod(patient.createdAt, dateFrom, dateTo)
      )
      .map((patient) => ({
        code: patient.legacyVetusId ?? patient.id,
        name: patient.name,
        species: patient.species,
        breed: patient.breed ?? '',
        sex: patient.sex,
        microchip: patient.microchip ?? '',
        status: patient.status,
        createdAt: patient.createdAt
      }));
    return limitReportRows(reportId, rows);
  }

  if (reportId === 'registration-services') {
    if (handlers.services.persistenceMode !== 'database') {
      throw new ValidationError(
        'Services registry report requires a database-backed services source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const rows = handlers.services
      .list(principal.user.accountId as never)
      .filter((service) => matchesReportPeriod(service.createdAt, dateFrom, dateTo))
      .map((service) => ({
        code: service.code ?? '',
        name: service.name,
        description: service.description ?? '',
        basePrice: service.basePrice,
        status: service.active ? 'active' : 'inactive',
        createdAt: service.createdAt
      }));
    return limitReportRows(reportId, rows);
  }

  if (reportId === 'registration-suppliers') {
    if (!handlers.financeCatalog) {
      throw new ValidationError(
        'Supplier registration report requires a database-backed finance catalog source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const rows = await listAllFinanceCatalogItems(
      handlers.financeCatalog,
      principal.user.accountId,
      {
        search: parseReportSearch(filters.search),
        category: parseReportSearch(filters.category),
        costCenterCode: parseReportSearch(filters.costCenterCode),
        dateFrom,
        dateTo
      }
    );
    return limitReportRows(
      reportId,
      rows
        .filter((item) => matchesReportPeriod(item.createdAt, dateFrom, dateTo))
        .map((item) => ({
          code: item.id,
          name: item.name,
          kind: item.kind,
          category: item.category,
          costCenterCode: item.costCenterCode,
          costCenterName: item.costCenterName,
          description: item.description,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
    );
  }

  if (reportId === 'financial-advance-payments') {
    if (!handlers.advancePayments) {
      throw new ValidationError(
        'Advance-payment report requires a database-backed advance-payment source'
      );
    }
    const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
    const search = parseReportSearch(filters.search);
    const status = parseAdvancePaymentReportStatus(filters.status);
    const rows = await handlers.advancePayments.list(principal.user.accountId, {
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {})
    });
    return limitReportRows(reportId, rows);
  }

  if (reportId === 'financial-receivables') {
    const status = parseEncounterReceivableStatus(filters.status);
    const search = parseReportSearch(filters.search);
    const dateFrom = parseReportDate(filters.dateFrom, 'dateFrom');
    const dateTo = parseReportDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new ValidationError('dateFrom must be before or equal to dateTo', { dateFrom, dateTo });
    }

    const receivables = await listAllFinancialReceivables(
      handlers.encounterFinancial,
      principal.user.accountId,
      {
        status,
        search
      }
    );
    return receivables
      .filter((receivable) => {
        const reportDate = receivableReportDate(receivable, status);
        return (!dateFrom || reportDate >= dateFrom) && (!dateTo || reportDate <= dateTo);
      })
      .map((receivable) => ({
        patientName: receivable.patientName,
        ownerName: receivable.ownerName,
        patientSpecies: receivable.patientSpecies,
        encounterId: receivable.encounterId,
        installmentNumber: receivable.installmentNumber,
        installmentLabel: receivable.installmentLabel,
        issuedAt: receivable.issuedAt,
        dueAt: receivable.dueAt,
        settledAt: receivable.settledAt,
        amountOriginal: receivable.amountOriginal,
        amountPaid: receivable.amountPaid,
        amountOutstanding: receivable.amountOutstanding,
        status: receivable.status,
        financialStatus: receivable.financialStatus,
        encounterStatus: receivable.encounterStatus,
        paymentCount: receivable.payments.length
      }));
  }

  if (reportId === 'financial-payables') {
    const status = parseFinancialPayableStatus(filters.status);
    const search = parseReportSearch(filters.search);
    const dateFrom = parseReportDate(filters.dateFrom, 'dateFrom');
    const dateTo = parseReportDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new ValidationError('dateFrom must be before or equal to dateTo', { dateFrom, dateTo });
    }

    const payables = await listAllFinancialPayables(
      handlers.financialPayables,
      principal.user.accountId,
      {
        status,
        search
      }
    );
    return payables
      .filter((payable) => {
        const dueAt = payable.dueAt.slice(0, 10);
        return (!dateFrom || dueAt >= dateFrom) && (!dateTo || dueAt <= dateTo);
      })
      .map((payable) => ({
        supplierName: payable.supplierName,
        description: payable.description,
        category: payable.category,
        issuedAt: payable.issuedAt,
        dueAt: payable.dueAt,
        totalAmount: payable.totalAmount,
        paidAmount: payable.paidAmount,
        outstandingAmount: payable.outstandingAmount,
        status: payable.status,
        paymentMethod: payable.paymentMethod,
        reconciliationStatus: payable.reconciliationStatus
      }));
  }

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
  const billing = await handlers.billing.listAuthoritative({
    accountId: principal.user.accountId
  });
  const quotes = handlers.quotes.list(principal.user.accountId as never);
  const openBalance = openRegister ? await handlers.cash.getCurrentBalance(openRegister.id) : 0;
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
      value: quotes
        .filter((quote) => quote.status === 'approved')
        .reduce((total, quote) => total + quote.total, 0),
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

const financialPayableStatuses: readonly FinancialPayableStatus[] = [
  'open',
  'partial',
  'paid',
  'cancelled'
];

const encounterReceivableStatuses: readonly EncounterReceivableStatus[] = ['open', 'settled'];
const fiscalNfseReportStatuses: readonly FiscalNfseDocumentSummary['status'][] = [
  'draft',
  'issued',
  'cancelled',
  'error'
];
const schedulingAppointmentReportStatuses: readonly SchedulingAppointmentSummary['status'][] = [
  'scheduled',
  'checked_in',
  'completed',
  'cancelled'
];

const MAX_REGISTRY_REPORT_ROWS = 10_000;
const inventoryMovementReportTypes: readonly InventoryStockMovementReportRow['movement']['movementType'][] =
  ['adjustment', 'inbound', 'outbound', 'transfer', 'consumption'];
const inventoryMovementReportFields = [
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
] as const;
const inventoryPurchaseReportStatuses: readonly InventoryPurchaseStatus[] = [
  'draft',
  'approved',
  'partially_received',
  'received',
  'cancelled'
];
const inventoryPurchaseReportFields = [
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
] as const;

function isFiniteReportNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInventoryMovementReportSourceRow(
  value: unknown
): value is InventoryStockMovementReportRow {
  if (!isRecord(value) || !isRecord(value.movement)) return false;
  const movement = value.movement;
  return (
    typeof movement.id === 'string' &&
    typeof movement.accountId === 'string' &&
    typeof movement.inventoryItemId === 'string' &&
    typeof movement.movementType === 'string' &&
    inventoryMovementReportTypes.includes(
      movement.movementType as InventoryStockMovementReportRow['movement']['movementType']
    ) &&
    typeof movement.createdAt === 'string' &&
    !Number.isNaN(Date.parse(movement.createdAt)) &&
    isFiniteReportNumber(movement.quantityDelta) &&
    isFiniteReportNumber(movement.balanceBefore) &&
    isFiniteReportNumber(movement.balanceAfter) &&
    isFiniteReportNumber(movement.unitCostAmount) &&
    typeof movement.reason === 'string' &&
    (movement.reference === undefined ||
      movement.reference === null ||
      typeof movement.reference === 'string') &&
    typeof movement.recordedByUserId === 'string' &&
    typeof value.sku === 'string' &&
    typeof value.name === 'string' &&
    typeof value.unit === 'string'
  );
}

function assertInventoryMovementReportRows(
  rows: readonly Record<string, unknown>[]
): asserts rows is readonly Record<string, unknown>[] {
  rows.forEach((row, index) => {
    const keys = Object.keys(row);
    if (
      keys.length !== inventoryMovementReportFields.length ||
      keys.some((key, keyIndex) => key !== inventoryMovementReportFields[keyIndex])
    ) {
      throw new ValidationError('Inventory movement report returned an invalid row shape', {
        rowIndex: index,
        expectedFields: inventoryMovementReportFields,
        actualFields: keys
      });
    }
    if (
      typeof row.movementId !== 'string' ||
      typeof row.occurredAt !== 'string' ||
      Number.isNaN(Date.parse(row.occurredAt)) ||
      typeof row.movementType !== 'string' ||
      !inventoryMovementReportTypes.includes(
        row.movementType as InventoryStockMovementReportRow['movement']['movementType']
      ) ||
      typeof row.sku !== 'string' ||
      typeof row.name !== 'string' ||
      typeof row.unit !== 'string' ||
      !isFiniteReportNumber(row.quantityDelta) ||
      !isFiniteReportNumber(row.balanceBefore) ||
      !isFiniteReportNumber(row.balanceAfter) ||
      !isFiniteReportNumber(row.unitCostAmount) ||
      typeof row.reason !== 'string' ||
      typeof row.reference !== 'string' ||
      typeof row.recordedByUserId !== 'string'
    ) {
      throw new ValidationError('Inventory movement report returned invalid field types', {
        rowIndex: index
      });
    }
  });
}

function isInventoryPurchaseReportSourceRow(
  value: unknown
): value is InventoryPurchaseReportSourceRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.purchaseId === 'string' &&
    value.purchaseId.length > 0 &&
    typeof value.accountId === 'string' &&
    typeof value.invoiceNumber === 'string' &&
    value.invoiceNumber.trim().length > 0 &&
    typeof value.supplierName === 'string' &&
    typeof value.status === 'string' &&
    inventoryPurchaseReportStatuses.includes(value.status as InventoryPurchaseStatus) &&
    isFiniteReportNumber(value.totalAmount) &&
    value.totalAmount >= 0 &&
    isFiniteReportNumber(value.receivedAmount) &&
    value.receivedAmount >= 0 &&
    value.receivedAmount <= value.totalAmount &&
    (value.payableId === null || typeof value.payableId === 'string') &&
    typeof value.createdByUserId === 'string' &&
    (value.approvedByUserId === null || typeof value.approvedByUserId === 'string') &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt)) &&
    (value.receivedAt === null ||
      (typeof value.receivedAt === 'string' && !Number.isNaN(Date.parse(value.receivedAt))))
  );
}

function assertInventoryPurchaseReportRows(
  rows: readonly Record<string, unknown>[]
): asserts rows is readonly Record<string, unknown>[] {
  rows.forEach((row, index) => {
    const keys = Object.keys(row);
    if (
      keys.length !== inventoryPurchaseReportFields.length ||
      keys.some((key, keyIndex) => key !== inventoryPurchaseReportFields[keyIndex])
    ) {
      throw new ValidationError('Inventory purchase report returned an invalid row shape', {
        rowIndex: index,
        expectedFields: inventoryPurchaseReportFields,
        actualFields: keys
      });
    }
    if (
      typeof row.purchaseId !== 'string' ||
      row.purchaseId.length === 0 ||
      typeof row.invoiceNumber !== 'string' ||
      row.invoiceNumber.trim().length === 0 ||
      typeof row.supplierName !== 'string' ||
      typeof row.status !== 'string' ||
      !inventoryPurchaseReportStatuses.includes(row.status as InventoryPurchaseStatus) ||
      !isFiniteReportNumber(row.totalAmount) ||
      row.totalAmount < 0 ||
      !isFiniteReportNumber(row.receivedAmount) ||
      row.receivedAmount < 0 ||
      row.receivedAmount > row.totalAmount ||
      (row.payableId !== null && typeof row.payableId !== 'string') ||
      typeof row.createdByUserId !== 'string' ||
      (row.approvedByUserId !== null && typeof row.approvedByUserId !== 'string') ||
      typeof row.createdAt !== 'string' ||
      Number.isNaN(Date.parse(row.createdAt)) ||
      typeof row.updatedAt !== 'string' ||
      Number.isNaN(Date.parse(row.updatedAt)) ||
      (row.receivedAt !== null &&
        (typeof row.receivedAt !== 'string' || Number.isNaN(Date.parse(row.receivedAt))))
    ) {
      throw new ValidationError('Inventory purchase report returned invalid field types', {
        rowIndex: index
      });
    }
  });
}

function parseReportPeriodFilters(filters: Record<string, unknown>): {
  readonly dateFrom?: string;
  readonly dateTo?: string;
} {
  const dateFrom = parseReportDate(filters.dateFrom, 'dateFrom');
  const dateTo = parseReportDate(filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ValidationError('dateFrom must be before or equal to dateTo', { dateFrom, dateTo });
  }
  return {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
}

function normalizeSchedulingAppointmentReportFilters(
  filters: Record<string, unknown>
): Record<string, unknown> {
  const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
  const search = parseReportSearch(filters.search);
  const status = parseSchedulingAppointmentReportStatus(filters.status);
  return {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
}

function normalizeSchedulingProfessionalCareReportFilters(
  filters: Record<string, unknown>
): Record<string, unknown> {
  const { dateFrom, dateTo } = parseReportPeriodFilters(filters);
  return {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
}

function matchesReportPeriod(
  value: string,
  dateFrom: string | undefined,
  dateTo: string | undefined
): boolean {
  const reportDate = value.slice(0, 10);
  return (!dateFrom || reportDate >= dateFrom) && (!dateTo || reportDate <= dateTo);
}

function primaryOwnerContact(owner: ReturnType<OwnersService['list']>[number]): string {
  const contact = owner.contacts.find((item) => item.primary) ?? owner.contacts[0];
  return contact ? `${contact.label}: ${contact.value}` : '';
}

function limitReportRows(
  reportId: string,
  rows: readonly Record<string, unknown>[]
): readonly Record<string, unknown>[] {
  if (rows.length > MAX_REGISTRY_REPORT_ROWS) {
    throw new ValidationError('Report contains too many rows', {
      reportId,
      maxRows: MAX_REGISTRY_REPORT_ROWS
    });
  }
  return rows;
}

function parseEncounterReceivableStatus(value: unknown): EncounterReceivableStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    encounterReceivableStatuses.includes(value as EncounterReceivableStatus)
  ) {
    return value as EncounterReceivableStatus;
  }
  throw new ValidationError('status must be open or settled', { value });
}

function parseFinancialPayableStatus(value: unknown): FinancialPayableStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    financialPayableStatuses.includes(value as FinancialPayableStatus)
  ) {
    return value as FinancialPayableStatus;
  }
  throw new ValidationError('status must be open, partial, paid or cancelled', { value });
}

function parseReportSearch(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > 200) {
    throw new ValidationError('search must be a string with at most 200 characters', { value });
  }
  return value.trim() || undefined;
}

function parseAdvancePaymentReportStatus(value: unknown): AdvancePaymentReportStatus | undefined {
  if (value === 'available' || value === 'partially_compensated' || value === 'compensated') {
    return value;
  }
  if (value === undefined || value === null || value === '') return undefined;
  throw new ValidationError('status must be available, partially_compensated or compensated', {
    value
  });
}

function parseInventoryPurchaseReportStatus(value: unknown): InventoryPurchaseStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    inventoryPurchaseReportStatuses.includes(value as InventoryPurchaseStatus)
  ) {
    return value as InventoryPurchaseStatus;
  }
  throw new ValidationError(
    'status must be draft, approved, partially_received, received or cancelled',
    { value }
  );
}

function parseFiscalNfseReportStatus(
  value: unknown
): FiscalNfseDocumentSummary['status'] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    fiscalNfseReportStatuses.includes(value as FiscalNfseDocumentSummary['status'])
  ) {
    return value as FiscalNfseDocumentSummary['status'];
  }
  throw new ValidationError('status must be draft, issued, cancelled or error', { value });
}

function parseSchedulingAppointmentReportStatus(
  value: unknown
): SchedulingAppointmentSummary['status'] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    schedulingAppointmentReportStatuses.includes(value as SchedulingAppointmentSummary['status'])
  ) {
    return value as SchedulingAppointmentSummary['status'];
  }
  throw new ValidationError('status must be scheduled, checked_in, completed or cancelled', {
    value
  });
}

function isSchedulingAppointmentReportSourceRow(
  value: unknown
): value is SchedulingAppointmentSummary {
  if (!isRecord(value)) return false;
  const optionalString = (field: string): boolean =>
    value[field] === undefined || value[field] === null || typeof value[field] === 'string';
  const duration = value.durationMinutes;
  return (
    typeof value.id === 'string' &&
    typeof value.accountId === 'string' &&
    typeof value.patientId === 'string' &&
    typeof value.ownerId === 'string' &&
    typeof value.scheduledAt === 'string' &&
    !Number.isNaN(Date.parse(value.scheduledAt)) &&
    (duration === undefined ||
      (typeof duration === 'number' && Number.isFinite(duration) && duration > 0)) &&
    (value.visitType === 'walk_in' ||
      value.visitType === 'scheduled' ||
      value.visitType === 'return') &&
    typeof value.reason === 'string' &&
    schedulingAppointmentReportStatuses.includes(
      value.status as SchedulingAppointmentSummary['status']
    ) &&
    optionalString('practitionerStaffId') &&
    optionalString('serviceId') &&
    optionalString('unit') &&
    optionalString('specialty') &&
    optionalString('resourceLabel') &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isSchedulingProfessionalCareReportRow(
  value: unknown
): value is SchedulingProfessionalCareReportRow {
  if (!isRecord(value)) return false;
  const isCount = (candidate: unknown): candidate is number =>
    Number.isSafeInteger(candidate) && (candidate as number) >= 0;
  return (
    typeof value.professional === 'string' &&
    value.professional.length > 0 &&
    isCount(value.scheduled) &&
    isCount(value.completed) &&
    isCount(value.checkedIn) &&
    isCount(value.cancelled) &&
    isCount(value.services)
  );
}

function matchesSchedulingAppointmentSearch(
  appointment: SchedulingAppointmentSummary,
  search: string | undefined
): boolean {
  if (!search) return true;
  const normalizedSearch = search.toLowerCase();
  return [
    appointment.id,
    appointment.patientId,
    appointment.ownerId,
    appointment.practitionerStaffId,
    appointment.serviceId,
    appointment.reason,
    appointment.unit,
    appointment.specialty,
    appointment.resourceLabel
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalizedSearch));
}

function matchesFiscalNfseSearch(
  document: FiscalNfseDocumentSummary,
  search: string | undefined
): boolean {
  if (!search) return true;
  const normalizedSearch = search.toLocaleLowerCase();
  return [
    document.customer.name,
    document.customer.document,
    ...document.services.flatMap((service) => [
      service.description,
      service.codigoServico,
      service.cnae
    ])
  ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
}

function matchesInventoryItemSearch(
  item: Awaited<ReturnType<InventoryService['listPersistedItems']>>[number],
  search: string | undefined
): boolean {
  if (!search) return true;
  const normalizedSearch = search.toLowerCase();
  return (
    item.sku.toLowerCase().includes(normalizedSearch) ||
    item.name.toLowerCase().includes(normalizedSearch)
  );
}

function matchesInventoryPurchaseSearch(
  purchase: InventoryPurchaseReportSourceRow,
  search: string | undefined
): boolean {
  if (!search) return true;
  const normalizedSearch = search.toLowerCase();
  return (
    purchase.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
    purchase.supplierName.toLowerCase().includes(normalizedSearch)
  );
}

function roundReportAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapFiscalServiceInvoiceReportRow(
  document: FiscalNfseDocumentSummary
): Record<string, unknown> {
  const services = [...document.services];
  return {
    documentId: document.id,
    serie: document.serie,
    numero: document.numero,
    competencia: document.competencia,
    status: document.status,
    customerName: document.customer.name,
    customerDocument: document.customer.document,
    provider: document.provider,
    serviceDescriptions: services.map((service) => service.description).join(' | '),
    serviceCodes: [...new Set(services.map((service) => service.codigoServico))].join(' | '),
    serviceQuantity: services.reduce((total, service) => total + service.quantity, 0),
    serviceSubtotal: roundReportAmount(
      services.reduce((total, service) => total + service.totalValue, 0)
    ),
    totalIss: document.totalIss,
    totalPis: document.totalPis,
    totalCofins: document.totalCofins,
    totalCsll: document.totalCsll,
    totalIrrf: document.totalIrrf ?? 0,
    totalInss: document.totalInss ?? 0,
    totalDocument: document.totalDocument,
    observations: document.observations ?? '',
    createdAt: document.createdAt,
    authorizationCode: document.authorizationCode ?? ''
  };
}

function parseReportDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  return value;
}

function receivableReportDate(
  receivable: Awaited<ReturnType<EncounterFinancialService['listReceivables']>>['data'][number],
  status: EncounterReceivableStatus | undefined
): string {
  const sourceDate =
    status === 'settled'
      ? (receivable.settledAt ?? receivable.issuedAt)
      : status === 'open'
        ? (receivable.dueAt ?? receivable.issuedAt)
        : (receivable.settledAt ?? receivable.dueAt ?? receivable.issuedAt);
  return sourceDate.slice(0, 10);
}

async function listAllFinancialPayables(
  service: FinancialPayablesService,
  accountId: AuthenticatedPrincipal['user']['accountId'],
  filters: {
    readonly status?: FinancialPayableStatus;
    readonly search?: string;
  }
) {
  const pageSize = 100;
  const rows = [] as Array<
    Awaited<ReturnType<FinancialPayablesService['listPayables']>>['data'][number]
  >;
  let page = 1;
  while (true) {
    const result = await service.listPayables(accountId as never, {
      status: filters.status,
      search: filters.search,
      page,
      pageSize
    });
    rows.push(...result.data);
    if (result.data.length === 0 || rows.length >= result.total) break;
    page += 1;
  }
  return rows;
}

async function listAllFinanceCatalogItems(
  source: FinanceCatalogReportSource,
  accountId: AuthenticatedPrincipal['user']['accountId'],
  filters: {
    readonly search?: string;
    readonly category?: string;
    readonly costCenterCode?: string;
    readonly dateFrom?: string;
    readonly dateTo?: string;
  }
) {
  const pageSize = 100;
  const rows = [] as Array<
    Awaited<ReturnType<FinanceCatalogReportSource['list']>>['items'][number]
  >;
  let page = 1;
  while (true) {
    const result = await source.list(accountId, {
      ...filters,
      page,
      pageSize,
      sort: 'name',
      order: 'asc'
    });
    rows.push(...result.items);
    if (rows.length > MAX_REGISTRY_REPORT_ROWS) {
      throw new ValidationError('Report contains too many rows', {
        reportId: 'registration-suppliers',
        maxRows: MAX_REGISTRY_REPORT_ROWS
      });
    }
    if (result.items.length === 0 || rows.length >= result.totalItems) break;
    page += 1;
  }
  return rows;
}

async function listAllFinancialReceivables(
  service: EncounterFinancialService,
  accountId: AuthenticatedPrincipal['user']['accountId'],
  filters: {
    readonly status?: EncounterReceivableStatus;
    readonly search?: string;
  }
) {
  const pageSize = 100;
  const rows = [] as Array<
    Awaited<ReturnType<EncounterFinancialService['listReceivables']>>['data'][number]
  >;
  let page = 1;
  while (true) {
    const result = await service.listReceivables({
      accountId: accountId as never,
      status: filters.status,
      search: filters.search,
      page,
      pageSize
    });
    rows.push(...result.data);
    if (result.data.length === 0 || rows.length >= result.total) break;
    page += 1;
  }
  return rows;
}
