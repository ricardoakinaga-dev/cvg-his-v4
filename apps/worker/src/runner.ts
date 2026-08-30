import {
  NotificationsService,
  type NotificationRepository
} from '@cvg-his-v2/module-notifications';
import type {
  CounterSaleChequePaymentSummary,
  CounterSaleSummary
} from '@cvg-his-v2/module-counter-sales';
import { EventBusService, TenantUnitOfWorkConsumerGuard } from '@cvg-his-v2/module-event-bus';
import {
  ReportsService,
  type ReportRepository,
  type ReportScheduleSummary
} from '@cvg-his-v2/module-reports';
import {
  MAX_ADVANCE_PAYMENT_REPORT_ROWS,
  MAX_FINANCE_CATALOG_REPORT_ROWS,
  MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS,
  type AdvancePaymentReportStatus,
  type AdvancePaymentsReportFilters,
  type AdvancePaymentsReportSource,
  type FinanceCatalogReportFilters,
  type FinanceCatalogReportRow,
  type FinanceCatalogReportSource,
  type FinancialPayableRecord,
  type FinancialPayableStatus,
  type FinancialReceivablesReportFilters,
  type FinancialReceivablesReportSource,
  type FinancialReceivablesReportStatus
} from '@cvg-his-v2/module-financial';
import type { Logger } from '@cvg-his-v2/shared-logging';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import type { TenantUnitOfWork } from '@cvg-his-v2/shared-database';
import type {
  FiscalNfseDocumentFilters,
  FiscalNfseDocumentSummary
} from '@cvg-his-v2/shared-contracts';
import {
  MAX_SERVICES_REPORT_ROWS,
  type ServicesReportFilters,
  type ServicesReportSource
} from '@cvg-his-v2/module-services';
import {
  MAX_OWNERS_REPORT_ROWS,
  type OwnersReportFilters,
  type OwnersReportRow,
  type OwnersReportSource
} from '@cvg-his-v2/module-owners';
import {
  MAX_PATIENTS_REPORT_ROWS,
  type PatientsReportFilters,
  type PatientsReportRow,
  type PatientsReportSource
} from '@cvg-his-v2/module-patients';
import {
  MAX_COMMISSION_CALCULATIONS_REPORT_ROWS,
  type CommissionCalculationsReportFilters,
  type CommissionCalculationsReportRow,
  type CommissionCalculationsReportSource,
  type CommissionCalculationsReportStatus
} from '@cvg-his-v2/module-commissions';
import {
  MAX_INVENTORY_PRODUCTS_REPORT_ROWS,
  type InventoryProductsReportFilters,
  type InventoryProductsReportRow,
  type InventoryProductsReportSource,
  MAX_INVENTORY_STOCK_REPORT_ROWS,
  type InventoryStockReportFilters,
  type InventoryStockReportRow,
  type InventoryStockReportSource,
  MAX_INVENTORY_MOVEMENTS_REPORT_ROWS,
  type InventoryMovementsReportFilters,
  type InventoryMovementsReportRow,
  type InventoryMovementsReportSource,
  MAX_INVENTORY_INVOICES_REPORT_ROWS,
  type InventoryInvoicesReportFilters,
  type InventoryInvoicesReportRow,
  type InventoryInvoicesReportSource,
  type InventoryPurchaseStatus
} from '@cvg-his-v2/module-inventory';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { WebhooksService, ProcessWebhookDeliveriesResult } from '@cvg-his-v2/module-webhooks';
import { runScheduledReportJob } from './jobs/scheduled-report-job.js';
import { createWorkerReportDeliveryProvider } from './report-delivery-provider.js';

const MAX_SCHEDULED_FISCAL_REPORT_ROWS = 10_000;
const MAX_SCHEDULED_DELETED_SALES_REPORT_ROWS = 10_000;

interface ScheduledDeletedSalesSource {
  readonly persistenceMode: 'database' | 'in-memory';
  listPersisted(
    accountId: AccountId,
    filters?: {
      readonly status?: string;
      readonly search?: string;
      readonly dateFrom?: string;
      readonly dateTo?: string;
      readonly limit?: number;
    }
  ): Promise<readonly CounterSaleSummary[]>;
}

export interface WorkerTickContext {
  readonly service: string;
  readonly environment: string;
  readonly correlationId: string;
  readonly persistenceMode: 'database' | 'in-memory';
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
  readonly accountId?: AccountId;
}

export interface WorkerOptions {
  readonly notificationRepository?: NotificationRepository;
  readonly eventBusRepository?: OutboxRepository;
  readonly reportRepository?: ReportRepository;
  readonly unitOfWork?: TenantUnitOfWork;
  readonly workerId?: string;
  readonly reportDeliveryProvider?: import('@cvg-his-v2/module-reports').ReportDeliveryProvider;
}

export interface AdministrativeExecutiveReportSources {
  readonly cheques?: {
    listChequePayments(
      accountId: AccountId,
      filters?: { readonly dateFrom?: string; readonly dateTo?: string }
    ): Promise<readonly CounterSaleChequePaymentSummary[]>;
  };
  readonly commercial?: {
    getCommercialDashboard(
      accountId: AccountId,
      dateFrom?: string,
      dateTo?: string
    ): Promise<{
      readonly openSales: number;
      readonly closedToday: number;
      readonly grossRevenueToday: number;
      readonly netRevenueToday: number;
      readonly avgTicket: number;
    }>;
  };
  readonly commercialDeletedSales?: ScheduledDeletedSalesSource;
  readonly financial?: {
    getIncomeStatement(
      accountId: AccountId,
      period: { readonly dateFrom?: string; readonly dateTo?: string }
    ): Promise<{
      readonly revenue: {
        readonly realizedRevenue: number;
        readonly outstandingReceivables: number;
        readonly openReceivableCount: number;
      };
      readonly expenses: {
        readonly paidExpenses: number;
        readonly outstandingPayables: number;
        readonly openPayableCount: number;
      };
      readonly result: {
        readonly realizedNetResult: number;
        readonly grossMarginPercent: number | null;
      };
    }>;
  };
  readonly cash?: {
    findOpenRegister(accountId: AccountId): Promise<{ readonly id: string } | null>;
    getCurrentBalance(registerId: string): Promise<number>;
  };
  readonly commissions?: CommissionCalculationsReportSource;
  readonly payables?: {
    listPayables(
      accountId: AccountId,
      filters?: { readonly status?: FinancialPayableStatus }
    ): Promise<readonly FinancialPayableRecord[]>;
  };
  readonly advancePayments?: AdvancePaymentsReportSource;
  readonly receivables?: FinancialReceivablesReportSource;
  readonly services?: ServicesReportSource;
  readonly suppliers?: FinanceCatalogReportSource;
  readonly owners?: OwnersReportSource;
  readonly patients?: PatientsReportSource;
  readonly inventoryProducts?: InventoryProductsReportSource;
  readonly inventoryStock?: InventoryStockReportSource;
  readonly inventoryMovements?: InventoryMovementsReportSource;
  readonly inventoryInvoices?: InventoryInvoicesReportSource;
  readonly fiscal?: {
    listNfseDocuments(
      accountId: AccountId,
      filters?: FiscalNfseDocumentFilters
    ): Promise<readonly FiscalNfseDocumentSummary[]>;
  };
}

export function createWorkerNotifications(options?: WorkerOptions): NotificationsService {
  return new NotificationsService({
    notificationRepository: options?.notificationRepository
  });
}

export function createWorkerEventBus(options?: WorkerOptions): EventBusService {
  return new EventBusService(options?.eventBusRepository, undefined, {
    workerId: options?.workerId,
    consumerGuard: options?.unitOfWork
      ? new TenantUnitOfWorkConsumerGuard(options.unitOfWork)
      : undefined
  });
}

export function createWorkerReports(options?: WorkerOptions): ReportsService {
  return new ReportsService({
    repository: options?.reportRepository,
    deliveryProvider: options?.reportDeliveryProvider ?? createWorkerReportDeliveryProvider()
  });
}

export async function resolveScheduledReportRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources = {}
): Promise<readonly Record<string, unknown>[]> {
  if (schedule.reportId === 'administrative-executive') {
    return [
      ...(await resolveAdministrativeExecutiveSourceRows(schedule, sources)),
      {
        domain: 'reports',
        metric: 'Destinatarios configurados',
        value: schedule.recipients.length,
        status: schedule.recipients.length > 0 ? 'tracked' : 'attention'
      },
      {
        domain: 'reports',
        metric: 'Agendamento ativo',
        value: schedule.isActive ? 1 : 0,
        status: schedule.isActive ? 'active' : 'paused'
      },
      {
        domain: 'reports',
        metric: 'Ultima falha',
        value: schedule.lastError ? 1 : 0,
        status: schedule.lastError ? 'attention' : 'tracked'
      }
    ];
  }

  if (schedule.reportId === 'financial-cheques') {
    if (!sources.cheques) {
      throw new Error('Persisted cheque report source is not configured');
    }

    const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
    const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new Error('dateFrom must be before or equal to dateTo');
    }

    const chequePayments = await sources.cheques.listChequePayments(schedule.accountId, {
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {})
    });

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

  if (schedule.reportId === 'commercial-deleted-sales') {
    return resolveScheduledDeletedSalesRows(schedule, sources);
  }

  if (schedule.reportId === 'financial-payables') {
    return resolveFinancialPayableRows(schedule, sources);
  }

  if (schedule.reportId === 'financial-advance-payments') {
    return resolveFinancialAdvancePaymentRows(schedule, sources);
  }

  if (schedule.reportId === 'financial-receivables') {
    return resolveFinancialReceivableRows(schedule, sources);
  }

  if (schedule.reportId === 'registration-services') {
    return resolveScheduledServicesRows(schedule, sources);
  }

  if (schedule.reportId === 'registration-suppliers') {
    return resolveScheduledSuppliersRows(schedule, sources);
  }

  if (schedule.reportId === 'registration-owners') {
    return resolveScheduledOwnersRows(schedule, sources);
  }

  if (schedule.reportId === 'registration-patients') {
    return resolveScheduledPatientsRows(schedule, sources);
  }

  if (schedule.reportId === 'fiscal-service-invoices') {
    return resolveFiscalServiceInvoiceRows(schedule, sources);
  }

  if (schedule.reportId === 'commission-calculations') {
    return resolveCommissionCalculationRows(schedule, sources);
  }

  if (schedule.reportId === 'inventory-products') {
    return resolveInventoryProductsRows(schedule, sources);
  }

  if (schedule.reportId === 'inventory-stock') {
    return resolveInventoryStockRows(schedule, sources);
  }

  if (schedule.reportId === 'inventory-movements') {
    return resolveInventoryMovementsRows(schedule, sources);
  }

  if (schedule.reportId === 'inventory-invoices') {
    return resolveInventoryInvoicesRows(schedule, sources);
  }

  throw new Error(`Scheduled report source is not configured: ${schedule.reportId}`);
}

async function resolveScheduledDeletedSalesRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  const source = sources.commercialDeletedSales;
  if (!source) {
    throw new Error('Persisted deleted-sales report source is not configured');
  }
  if (source.persistenceMode !== 'database') {
    throw new Error(
      'Scheduled deleted-sales report requires a database-backed counter-sale source'
    );
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const sales = await source.listPersisted(schedule.accountId, {
    status: 'cancelled',
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    limit: MAX_SCHEDULED_DELETED_SALES_REPORT_ROWS + 1
  });
  if (sales.length > MAX_SCHEDULED_DELETED_SALES_REPORT_ROWS) {
    throw new Error(
      `Deleted-sales report source exceeds the maximum exportable page of ${MAX_SCHEDULED_DELETED_SALES_REPORT_ROWS} rows`
    );
  }

  return sales
    .filter((sale) => sale.accountId === schedule.accountId)
    .filter((sale) => sale.status === 'cancelled')
    .filter((sale) => matchesScheduledReportPeriod(sale.createdAt, dateFrom, dateTo))
    .filter((sale) => matchesCounterSaleReportSearch(sale, search))
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
    }));
}

async function resolveFinancialPayableRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.payables) {
    throw new Error('Persisted payable report source is not configured');
  }

  const status = parseScheduledFinancialPayableStatus(schedule.filters.status);
  const search = parseScheduledReportSearch(schedule.filters.search);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const payables = await sources.payables.listPayables(
    schedule.accountId,
    status ? { status } : undefined
  );

  return payables
    .filter((payable) => payable.accountId === schedule.accountId)
    .filter((payable) => !status || payable.status === status)
    .filter(
      (payable) => (!dateFrom || payable.dueAt >= dateFrom) && (!dateTo || payable.dueAt <= dateTo)
    )
    .filter((payable) => !search || financialPayableMatchesSearch(payable, search))
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

async function resolveFinancialAdvancePaymentRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.advancePayments) {
    throw new Error('Persisted advance-payment report source is not configured');
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const status = parseScheduledAdvancePaymentStatus(schedule.filters.status);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: AdvancePaymentsReportFilters = {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const rows = await sources.advancePayments.list(schedule.accountId, filters);
  if (rows.length > MAX_ADVANCE_PAYMENT_REPORT_ROWS) {
    throw new Error(
      `Advance-payment report source exceeds the maximum exportable page of ${MAX_ADVANCE_PAYMENT_REPORT_ROWS} rows`
    );
  }

  return rows.map(
    ({
      paymentId,
      ownerName,
      documentId,
      issuedAt,
      originalAmount,
      compensatedAmount,
      balance,
      origin,
      status: rowStatus,
      notes
    }) => ({
      paymentId,
      ownerName,
      documentId,
      issuedAt,
      originalAmount,
      compensatedAmount,
      balance,
      origin,
      status: rowStatus,
      notes
    })
  );
}

async function resolveFinancialReceivableRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.receivables) {
    throw new Error('Persisted receivable report source is not configured');
  }

  const status = parseScheduledFinancialReceivableStatus(schedule.filters.status);
  const search = parseScheduledReportSearch(schedule.filters.search);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: FinancialReceivablesReportFilters = {
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const rows = await sources.receivables.list(schedule.accountId, filters);
  if (rows.length > MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS) {
    throw new Error(
      `Financial-receivables report source exceeds the maximum exportable page of ${MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS} rows`
    );
  }
  if (rows.some((row) => row.accountId !== schedule.accountId)) {
    throw new Error('Financial-receivables report source returned a foreign account row');
  }

  return rows
    .filter((row) => !status || row.status === status)
    .map((row) => ({
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
}

async function resolveScheduledServicesRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.services) {
    throw new Error('Persisted services report source is not configured');
  }

  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: ServicesReportFilters = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const rows = await sources.services.list(schedule.accountId, filters);
  if (rows.length > MAX_SERVICES_REPORT_ROWS) {
    throw new Error(
      'Services report source exceeds the maximum exportable page of ' +
        MAX_SERVICES_REPORT_ROWS +
        ' rows'
    );
  }
  if (rows.some((row) => row.accountId !== schedule.accountId)) {
    throw new Error('Services report source returned a foreign account row');
  }

  return rows
    .filter((row) => matchesScheduledReportPeriod(row.createdAt, dateFrom, dateTo))
    .map((row) => ({
      code: row.code ?? '',
      name: row.name,
      description: row.description ?? '',
      basePrice: row.basePrice,
      status: row.active ? 'active' : 'inactive',
      createdAt: row.createdAt
    }));
}

async function resolveScheduledSuppliersRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.suppliers) {
    throw new Error('Persisted suppliers report source is not configured');
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const category = parseScheduledReportText(schedule.filters.category, 'category');
  const costCenterCode = parseScheduledReportText(
    schedule.filters.costCenterCode,
    'costCenterCode'
  );
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: FinanceCatalogReportFilters = {
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(costCenterCode ? { costCenterCode } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.suppliers.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Suppliers report source returned malformed rows');
  }
  if (sourceRows.length > MAX_FINANCE_CATALOG_REPORT_ROWS) {
    throw new Error(
      `Suppliers report source exceeds the maximum exportable page of ${MAX_FINANCE_CATALOG_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledSupplierRow(row, schedule.accountId))
    .filter((row) => matchesScheduledReportPeriod(row.createdAt, dateFrom, dateTo))
    .filter((row) => !search || financeCatalogReportMatchesSearch(row, search))
    .filter((row) => !category || row.category.toLowerCase().includes(category))
    .filter(
      (row) =>
        !costCenterCode ||
        row.costCenterCode.toLowerCase().includes(costCenterCode) ||
        row.costCenterName.toLowerCase().includes(costCenterCode)
    )
    .map((row) => ({
      code: row.id,
      name: row.name,
      kind: row.kind,
      category: row.category,
      costCenterCode: row.costCenterCode,
      costCenterName: row.costCenterName,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
}

async function resolveScheduledOwnersRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.owners) {
    throw new Error('Persisted owners report source is not configured');
  }

  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: OwnersReportFilters = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.owners.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Owners report source returned malformed rows');
  }
  if (sourceRows.length > MAX_OWNERS_REPORT_ROWS) {
    throw new Error(
      `Owners report source exceeds the maximum exportable page of ${MAX_OWNERS_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledOwnerRow(row, schedule.accountId))
    .filter((row) => matchesScheduledReportPeriod(row.createdAt, dateFrom, dateTo))
    .map((row) => ({
      documentId: row.documentId ?? '',
      fullName: row.fullName,
      primaryContact: row.primaryContact ?? '',
      city: row.city ?? '',
      financialResponsible: row.financialResponsible ? 'Sim' : 'Não',
      status: row.status,
      createdAt: row.createdAt
    }));
}

function validateScheduledOwnerRow(row: unknown, accountId: AccountId): OwnersReportRow {
  if (!row || typeof row !== 'object') {
    throw new Error('Owners report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Owners report source returned a foreign account row');
  }

  const status = candidate.status;
  if (status !== 'active' && status !== 'inactive') {
    throw new Error('Owners report source returned malformed status');
  }
  if (typeof candidate.financialResponsible !== 'boolean') {
    throw new Error('Owners report source returned malformed financialResponsible');
  }

  return {
    accountId,
    id: readScheduledOwnerText(candidate.id, 'id'),
    documentId: readScheduledOwnerNullableText(candidate.documentId, 'documentId'),
    fullName: readScheduledOwnerText(candidate.fullName, 'fullName'),
    primaryContact: readScheduledOwnerNullableText(candidate.primaryContact, 'primaryContact'),
    city: readScheduledOwnerNullableText(candidate.city, 'city'),
    financialResponsible: candidate.financialResponsible,
    status,
    createdAt: readScheduledOwnerTimestamp(candidate.createdAt, 'createdAt'),
    updatedAt: readScheduledOwnerTimestamp(candidate.updatedAt, 'updatedAt')
  };
}

function readScheduledOwnerText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Owners report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledOwnerNullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error(`Owners report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledOwnerTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new Error(`Owners report source returned malformed ${field}`);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Owners report source returned malformed ${field}`);
  }
  return parsed.toISOString();
}

async function resolveScheduledPatientsRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.patients) {
    throw new Error('Persisted patients report source is not configured');
  }

  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: PatientsReportFilters = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.patients.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Patients report source returned malformed rows');
  }
  if (sourceRows.length > MAX_PATIENTS_REPORT_ROWS) {
    throw new Error(
      `Patients report source exceeds the maximum exportable page of ${MAX_PATIENTS_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledPatientRow(row, schedule.accountId))
    .filter((row) => matchesScheduledReportPeriod(row.createdAt, dateFrom, dateTo))
    .map((row) => ({
      code: row.code,
      name: row.name,
      species: row.species,
      breed: row.breed ?? '',
      sex: row.sex,
      microchip: row.microchip ?? '',
      status: row.status,
      createdAt: row.createdAt
    }));
}

function validateScheduledPatientRow(row: unknown, accountId: AccountId): PatientsReportRow {
  if (!row || typeof row !== 'object') {
    throw new Error('Patients report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Patients report source returned a foreign account row');
  }

  const sex = candidate.sex;
  if (sex !== 'male' && sex !== 'female' && sex !== 'unknown') {
    throw new Error('Patients report source returned malformed sex');
  }
  const status = candidate.status;
  if (status !== 'active' && status !== 'inactive' && status !== 'deceased') {
    throw new Error('Patients report source returned malformed status');
  }

  return {
    accountId,
    id: readScheduledPatientText(candidate.id, 'id'),
    code: readScheduledPatientText(candidate.code, 'code'),
    name: readScheduledPatientText(candidate.name, 'name'),
    species: readScheduledPatientText(candidate.species, 'species'),
    breed: readScheduledPatientNullableText(candidate.breed, 'breed'),
    sex,
    microchip: readScheduledPatientNullableText(candidate.microchip, 'microchip'),
    status,
    createdAt: readScheduledPatientTimestamp(candidate.createdAt, 'createdAt')
  };
}

function readScheduledPatientText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Patients report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledPatientNullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error(`Patients report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledPatientTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new Error(`Patients report source returned malformed ${field}`);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Patients report source returned malformed ${field}`);
  }
  return parsed.toISOString();
}

function validateScheduledSupplierRow(row: unknown, accountId: AccountId): FinanceCatalogReportRow {
  if (!row || typeof row !== 'object') {
    throw new Error('Suppliers report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Suppliers report source returned a foreign account row');
  }

  return {
    accountId,
    id: readScheduledSupplierText(candidate.id, 'id'),
    name: readScheduledSupplierText(candidate.name, 'name'),
    kind: readScheduledSupplierText(candidate.kind, 'kind'),
    category: readScheduledSupplierText(candidate.category, 'category'),
    costCenterCode: readScheduledSupplierText(candidate.costCenterCode, 'costCenterCode'),
    costCenterName: readScheduledSupplierText(candidate.costCenterName, 'costCenterName'),
    description: readScheduledSupplierText(candidate.description, 'description'),
    createdAt: readScheduledSupplierTimestamp(candidate.createdAt, 'createdAt'),
    updatedAt: readScheduledSupplierTimestamp(candidate.updatedAt, 'updatedAt')
  };
}

function readScheduledSupplierText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Suppliers report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledSupplierTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new Error(`Suppliers report source returned malformed ${field}`);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Suppliers report source returned malformed ${field}`);
  }
  return parsed.toISOString();
}

function financeCatalogReportMatchesSearch(row: FinanceCatalogReportRow, search: string): boolean {
  return [row.id, row.name, row.description].some((value) => value.toLowerCase().includes(search));
}

async function resolveFiscalServiceInvoiceRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.fiscal) {
    throw new Error('Persisted fiscal service-invoice report source is not configured');
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const status = parseScheduledFiscalNfseStatus(schedule.filters.status);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const documents = await sources.fiscal.listNfseDocuments(schedule.accountId, {
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(dateFrom ? { competenciaFrom: dateFrom } : {}),
    ...(dateTo ? { competenciaTo: dateTo } : {}),
    limit: MAX_SCHEDULED_FISCAL_REPORT_ROWS + 1
  });
  if (documents.length > MAX_SCHEDULED_FISCAL_REPORT_ROWS) {
    throw new Error(
      `Fiscal service-invoice report source exceeds the maximum exportable page of ${MAX_SCHEDULED_FISCAL_REPORT_ROWS} rows`
    );
  }

  return documents
    .filter((document) => !status || document.status === status)
    .filter((document) => matchesScheduledReportPeriod(document.competencia, dateFrom, dateTo))
    .filter((document) => matchesFiscalServiceInvoiceSearch(document, search))
    .map(mapFiscalServiceInvoiceRow);
}

function financialPayableMatchesSearch(payable: FinancialPayableRecord, search: string): boolean {
  return [
    payable.supplierName,
    payable.description,
    payable.category,
    payable.costCenterName,
    payable.notes ?? ''
  ]
    .join(' ')
    .toLowerCase()
    .includes(search);
}

function matchesCounterSaleReportSearch(
  sale: CounterSaleSummary,
  search: string | undefined
): boolean {
  if (!search) return true;
  return [sale.number, sale.notes ?? ''].some((value) =>
    value.toLocaleLowerCase().includes(search)
  );
}

function parseScheduledFinancialPayableStatus(value: unknown): FinancialPayableStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const statuses: readonly FinancialPayableStatus[] = ['open', 'partial', 'paid', 'cancelled'];
  if (typeof value !== 'string' || !statuses.includes(value as FinancialPayableStatus)) {
    throw new Error('status must be one of open, partial, paid, cancelled');
  }
  return value as FinancialPayableStatus;
}

function parseScheduledCommissionCalculationStatus(
  value: unknown
): CommissionCalculationsReportStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const statuses: readonly CommissionCalculationsReportStatus[] = [
    'draft',
    'reviewed',
    'paid',
    'cancelled'
  ];
  if (
    typeof value !== 'string' ||
    !statuses.includes(value as CommissionCalculationsReportStatus)
  ) {
    throw new Error('status must be one of draft, reviewed, paid, cancelled');
  }
  return value as CommissionCalculationsReportStatus;
}

function parseScheduledFinancialReceivableStatus(
  value: unknown
): FinancialReceivablesReportStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const statuses: readonly FinancialReceivablesReportStatus[] = ['open', 'settled'];
  if (typeof value !== 'string' || !statuses.includes(value as FinancialReceivablesReportStatus)) {
    throw new Error('status must be one of open, settled');
  }
  return value as FinancialReceivablesReportStatus;
}

function parseScheduledAdvancePaymentStatus(
  value: unknown
): AdvancePaymentReportStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const statuses: readonly AdvancePaymentReportStatus[] = [
    'available',
    'partially_compensated',
    'compensated'
  ];
  if (typeof value !== 'string' || !statuses.includes(value as AdvancePaymentReportStatus)) {
    throw new Error('status must be one of available, partially_compensated, compensated');
  }
  return value as AdvancePaymentReportStatus;
}

function parseScheduledFiscalNfseStatus(
  value: unknown
): FiscalNfseDocumentSummary['status'] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const statuses: readonly FiscalNfseDocumentSummary['status'][] = [
    'draft',
    'issued',
    'cancelled',
    'error'
  ];
  if (
    typeof value !== 'string' ||
    !statuses.includes(value as FiscalNfseDocumentSummary['status'])
  ) {
    throw new Error('status must be one of draft, issued, cancelled, error');
  }
  return value as FiscalNfseDocumentSummary['status'];
}

function parseScheduledReportSearch(value: unknown): string | undefined {
  return parseScheduledReportText(value, 'search');
}

function parseScheduledReportText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string with at most 200 characters`);
  }
  const normalized = value.trim().toLowerCase();
  if (Array.from(normalized).length > 200) {
    throw new Error(`${field} must be a string with at most 200 characters`);
  }
  return normalized || undefined;
}

function matchesScheduledReportPeriod(
  value: string,
  dateFrom: string | undefined,
  dateTo: string | undefined
): boolean {
  const reportDate = value.slice(0, 10);
  return (!dateFrom || reportDate >= dateFrom) && (!dateTo || reportDate <= dateTo);
}

function matchesFiscalServiceInvoiceSearch(
  document: FiscalNfseDocumentSummary,
  search: string | undefined
): boolean {
  if (!search) return true;
  return [
    document.customer.name,
    document.customer.document,
    ...document.services.flatMap((service) => [
      service.description,
      service.codigoServico,
      service.cnae
    ])
  ].some((value) => value.toLocaleLowerCase().includes(search));
}

function mapFiscalServiceInvoiceRow(document: FiscalNfseDocumentSummary): Record<string, unknown> {
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
    serviceSubtotal: roundScheduledReportAmount(
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

function roundScheduledReportAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

async function resolveCommissionCalculationRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.commissions) {
    throw new Error('Persisted commission report source is not configured');
  }

  const status = parseScheduledCommissionCalculationStatus(schedule.filters.status);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: CommissionCalculationsReportFilters = {
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.commissions.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Commission report source returned malformed rows');
  }
  if (sourceRows.length > MAX_COMMISSION_CALCULATIONS_REPORT_ROWS) {
    throw new Error(
      `Commission report source exceeds the maximum exportable page of ${MAX_COMMISSION_CALCULATIONS_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledCommissionCalculationRow(row, schedule.accountId))
    .filter(
      (row) => (!dateFrom || row.periodEnd >= dateFrom) && (!dateTo || row.periodStart <= dateTo)
    )
    .map((row) => ({
      number: row.number,
      period: `${row.periodStart}..${row.periodEnd}`,
      status: row.status,
      totalBaseAmount: row.totalBaseAmount,
      totalCommissionAmount: row.totalCommissionAmount,
      lineCount: row.lineCount
    }));
}

function validateScheduledCommissionCalculationRow(
  row: unknown,
  accountId: AccountId
): CommissionCalculationsReportRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Commission report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Commission report source returned a foreign account row');
  }

  const status = candidate.status;
  if (status !== 'draft' && status !== 'reviewed' && status !== 'paid' && status !== 'cancelled') {
    throw new Error('Commission report source returned malformed status');
  }
  const periodStart = readScheduledCommissionDate(candidate.periodStart, 'periodStart');
  const periodEnd = readScheduledCommissionDate(candidate.periodEnd, 'periodEnd');
  if (periodStart > periodEnd) {
    throw new Error('Commission report source returned malformed period');
  }

  return {
    accountId,
    id: readScheduledCommissionText(candidate.id, 'id'),
    number: readScheduledCommissionText(candidate.number, 'number'),
    periodStart,
    periodEnd,
    status,
    totalBaseAmount: readScheduledCommissionAmount(candidate.totalBaseAmount, 'totalBaseAmount'),
    totalCommissionAmount: readScheduledCommissionAmount(
      candidate.totalCommissionAmount,
      'totalCommissionAmount'
    ),
    lineCount: readScheduledCommissionLineCount(candidate.lineCount)
  };
}

function readScheduledCommissionText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Commission report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledCommissionDate(value: unknown, field: string): string {
  const date = parseScheduledReportDate(value, field);
  if (!date) {
    throw new Error(`Commission report source returned malformed ${field}`);
  }
  return date;
}

function readScheduledCommissionAmount(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Commission report source returned malformed ${field}`);
  }
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw new Error(`Commission report source returned malformed ${field}`);
  }
  return cents / 100;
}

function readScheduledCommissionLineCount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Commission report source returned malformed lineCount');
  }
  return value as number;
}

async function resolveInventoryProductsRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.inventoryProducts) {
    throw new Error('Persisted inventory-products report source is not configured');
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: InventoryProductsReportFilters = {
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.inventoryProducts.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Inventory-products report source returned malformed rows');
  }
  if (sourceRows.length > MAX_INVENTORY_PRODUCTS_REPORT_ROWS) {
    throw new Error(
      `Inventory-products report source exceeds the maximum exportable page of ${MAX_INVENTORY_PRODUCTS_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledInventoryProductsRow(row, schedule.accountId))
    .filter((row) => matchesScheduledReportPeriod(row.createdAt, dateFrom, dateTo))
    .filter((row) => inventoryProductsMatchesSearch(row, search))
    .map((row) => ({
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      onHandQuantity: row.onHandQuantity,
      reorderLevel: row.reorderLevel,
      unitCostAmount: row.unitCostAmount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
}

function validateScheduledInventoryProductsRow(
  row: unknown,
  accountId: AccountId
): InventoryProductsReportRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Inventory-products report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Inventory-products report source returned a foreign account row');
  }

  return {
    accountId,
    id: readScheduledInventoryProductsText(candidate.id, 'id'),
    sku: readScheduledInventoryProductsText(candidate.sku, 'sku'),
    name: readScheduledInventoryProductsText(candidate.name, 'name'),
    unit: readScheduledInventoryProductsText(candidate.unit, 'unit'),
    onHandQuantity: readScheduledInventoryProductsNumber(
      candidate.onHandQuantity,
      'onHandQuantity'
    ),
    reorderLevel: readScheduledInventoryProductsNumber(candidate.reorderLevel, 'reorderLevel'),
    unitCostAmount: readScheduledInventoryProductsNumber(
      candidate.unitCostAmount,
      'unitCostAmount'
    ),
    createdAt: readScheduledInventoryProductsTimestamp(candidate.createdAt, 'createdAt'),
    updatedAt: readScheduledInventoryProductsTimestamp(candidate.updatedAt, 'updatedAt')
  };
}

function readScheduledInventoryProductsText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Inventory-products report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledInventoryProductsNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Inventory-products report source returned malformed ${field}`);
  }
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw new Error(`Inventory-products report source returned malformed ${field}`);
  }
  return cents / 100;
}

function readScheduledInventoryProductsTimestamp(value: unknown, field: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Inventory-products report source returned malformed ${field}`);
    }
    return value.toISOString();
  }
  if (typeof value !== 'string') {
    throw new Error(`Inventory-products report source returned malformed ${field}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`Inventory-products report source returned malformed ${field}`);
  }
  return value;
}

function inventoryProductsMatchesSearch(
  row: InventoryProductsReportRow,
  search: string | undefined
): boolean {
  if (!search) return true;
  return row.sku.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
}

async function resolveInventoryStockRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.inventoryStock) {
    throw new Error('Persisted inventory-stock report source is not configured');
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: InventoryStockReportFilters = {
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.inventoryStock.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Inventory-stock report source returned malformed rows');
  }
  if (sourceRows.length > MAX_INVENTORY_STOCK_REPORT_ROWS) {
    throw new Error(
      `Inventory-stock report source exceeds the maximum exportable page of ${MAX_INVENTORY_STOCK_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledInventoryStockRow(row, schedule.accountId))
    .filter((row) => matchesScheduledReportPeriod(row.createdAt, dateFrom, dateTo))
    .filter((row) => inventoryStockMatchesSearch(row, search))
    .map((row) => ({
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      onHandQuantity: row.onHandQuantity,
      reorderLevel: row.reorderLevel,
      unitCostAmount: row.unitCostAmount,
      stockValue: row.stockValue,
      reorderStatus: row.reorderStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
}

function validateScheduledInventoryStockRow(
  row: unknown,
  accountId: AccountId
): InventoryStockReportRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Inventory-stock report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Inventory-stock report source returned a foreign account row');
  }

  const onHandQuantity = readScheduledInventoryStockNumber(
    candidate.onHandQuantity,
    'onHandQuantity'
  );
  const reorderLevel = readScheduledInventoryStockNumber(candidate.reorderLevel, 'reorderLevel');
  const unitCostAmount = readScheduledInventoryStockNumber(
    candidate.unitCostAmount,
    'unitCostAmount'
  );
  const stockValue = readScheduledInventoryStockNumber(candidate.stockValue, 'stockValue');
  const expectedStockValueCents = Math.round(onHandQuantity * unitCostAmount * 100);
  if (
    !Number.isSafeInteger(expectedStockValueCents) ||
    stockValue !== expectedStockValueCents / 100
  ) {
    throw new Error('Inventory-stock report source returned malformed stockValue');
  }
  const expectedReorderStatus = onHandQuantity <= reorderLevel ? 'below_reorder_level' : 'adequate';
  if (candidate.reorderStatus !== expectedReorderStatus) {
    throw new Error('Inventory-stock report source returned malformed reorderStatus');
  }

  return {
    accountId,
    id: readScheduledInventoryStockText(candidate.id, 'id'),
    sku: readScheduledInventoryStockText(candidate.sku, 'sku'),
    name: readScheduledInventoryStockText(candidate.name, 'name'),
    unit: readScheduledInventoryStockText(candidate.unit, 'unit'),
    onHandQuantity,
    reorderLevel,
    unitCostAmount,
    stockValue,
    reorderStatus: expectedReorderStatus,
    createdAt: readScheduledInventoryStockTimestamp(candidate.createdAt, 'createdAt'),
    updatedAt: readScheduledInventoryStockTimestamp(candidate.updatedAt, 'updatedAt')
  };
}

function readScheduledInventoryStockText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Inventory-stock report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledInventoryStockNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Inventory-stock report source returned malformed ${field}`);
  }
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw new Error(`Inventory-stock report source returned malformed ${field}`);
  }
  return cents / 100;
}

function readScheduledInventoryStockTimestamp(value: unknown, field: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Inventory-stock report source returned malformed ${field}`);
    }
    return value.toISOString();
  }
  if (typeof value !== 'string') {
    throw new Error(`Inventory-stock report source returned malformed ${field}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`Inventory-stock report source returned malformed ${field}`);
  }
  return value;
}

function inventoryStockMatchesSearch(
  row: InventoryStockReportRow,
  search: string | undefined
): boolean {
  if (!search) return true;
  return row.sku.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
}

async function resolveInventoryMovementsRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.inventoryMovements) {
    throw new Error('Persisted inventory-movements report source is not configured');
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: InventoryMovementsReportFilters = {
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.inventoryMovements.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Inventory-movements report source returned malformed rows');
  }
  if (sourceRows.length > MAX_INVENTORY_MOVEMENTS_REPORT_ROWS) {
    throw new Error(
      `Inventory-movements report source exceeds the maximum exportable page of ${MAX_INVENTORY_MOVEMENTS_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledInventoryMovementsRow(row, schedule.accountId))
    .filter((row) => matchesScheduledReportPeriod(row.occurredAt, dateFrom, dateTo))
    .filter((row) => inventoryMovementsMatchesSearch(row, search))
    .map((row) => ({
      movementId: row.movementId,
      occurredAt: row.occurredAt,
      movementType: row.movementType,
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      quantityDelta: row.quantityDelta,
      balanceBefore: row.balanceBefore,
      balanceAfter: row.balanceAfter,
      unitCostAmount: row.unitCostAmount,
      reason: row.reason,
      reference: row.reference,
      recordedByUserId: row.recordedByUserId
    }));
}

function validateScheduledInventoryMovementsRow(
  row: unknown,
  accountId: AccountId
): InventoryMovementsReportRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Inventory-movements report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Inventory-movements report source returned a foreign account row');
  }

  const movementType = candidate.movementType;
  if (
    movementType !== 'adjustment' &&
    movementType !== 'inbound' &&
    movementType !== 'outbound' &&
    movementType !== 'transfer' &&
    movementType !== 'consumption'
  ) {
    throw new Error('Inventory-movements report source returned malformed movementType');
  }

  return {
    accountId,
    movementId: readScheduledInventoryMovementsText(candidate.movementId, 'movementId'),
    occurredAt: readScheduledInventoryMovementsTimestamp(candidate.occurredAt, 'occurredAt'),
    movementType,
    sku: readScheduledInventoryMovementsText(candidate.sku, 'sku'),
    name: readScheduledInventoryMovementsText(candidate.name, 'name'),
    unit: readScheduledInventoryMovementsText(candidate.unit, 'unit'),
    quantityDelta: readScheduledInventoryMovementsNumber(
      candidate.quantityDelta,
      'quantityDelta',
      true
    ),
    balanceBefore: readScheduledInventoryMovementsNumber(candidate.balanceBefore, 'balanceBefore'),
    balanceAfter: readScheduledInventoryMovementsNumber(candidate.balanceAfter, 'balanceAfter'),
    unitCostAmount: readScheduledInventoryMovementsNumber(
      candidate.unitCostAmount,
      'unitCostAmount'
    ),
    reason: readScheduledInventoryMovementsText(candidate.reason, 'reason'),
    reference: readScheduledInventoryMovementsReference(candidate.reference),
    recordedByUserId: readScheduledInventoryMovementsText(
      candidate.recordedByUserId,
      'recordedByUserId'
    ) as UserId
  };
}

function readScheduledInventoryMovementsText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Inventory-movements report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledInventoryMovementsReference(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new Error('Inventory-movements report source returned malformed reference');
  }
  return value;
}

function readScheduledInventoryMovementsNumber(
  value: unknown,
  field: string,
  allowNegative = false
): number {
  if (typeof value !== 'number') {
    throw new Error(`Inventory-movements report source returned malformed ${field}`);
  }
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    (!allowNegative && value < 0) ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw new Error(`Inventory-movements report source returned malformed ${field}`);
  }
  return cents / 100;
}

function readScheduledInventoryMovementsTimestamp(value: unknown, field: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Inventory-movements report source returned malformed ${field}`);
    }
    return value.toISOString();
  }
  if (typeof value !== 'string') {
    throw new Error(`Inventory-movements report source returned malformed ${field}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`Inventory-movements report source returned malformed ${field}`);
  }
  return value;
}

function inventoryMovementsMatchesSearch(
  row: InventoryMovementsReportRow,
  search: string | undefined
): boolean {
  if (!search) return true;
  return row.sku.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
}

async function resolveInventoryInvoicesRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  if (!sources.inventoryInvoices) {
    throw new Error('Persisted inventory-invoices report source is not configured');
  }

  const search = parseScheduledReportSearch(schedule.filters.search);
  const status = parseScheduledInventoryInvoiceStatus(schedule.filters.status);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }

  const filters: InventoryInvoicesReportFilters = {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
  const sourceRows = await sources.inventoryInvoices.list(schedule.accountId, filters);
  if (!Array.isArray(sourceRows)) {
    throw new Error('Inventory-invoices report source returned malformed rows');
  }
  if (sourceRows.length > MAX_INVENTORY_INVOICES_REPORT_ROWS) {
    throw new Error(
      `Inventory-invoices report source exceeds the maximum exportable page of ${MAX_INVENTORY_INVOICES_REPORT_ROWS} rows`
    );
  }

  return sourceRows
    .map((row) => validateScheduledInventoryInvoicesRow(row, schedule.accountId))
    .filter((row) => row.status === status || status === undefined)
    .filter((row) => matchesScheduledReportPeriod(row.createdAt, dateFrom, dateTo))
    .filter((row) => inventoryInvoicesMatchesSearch(row, search))
    .map((row) => ({
      purchaseId: row.purchaseId,
      invoiceNumber: row.invoiceNumber,
      supplierName: row.supplierName,
      status: row.status,
      totalAmount: row.totalAmount,
      receivedAmount: row.receivedAmount,
      payableId: row.payableId,
      createdByUserId: row.createdByUserId,
      approvedByUserId: row.approvedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      receivedAt: row.receivedAt
    }));
}

function parseScheduledInventoryInvoiceStatus(value: unknown): InventoryPurchaseStatus | undefined {
  const normalized = parseScheduledReportText(value, 'status');
  if (normalized === undefined) return undefined;
  if (
    normalized !== 'draft' &&
    normalized !== 'approved' &&
    normalized !== 'partially_received' &&
    normalized !== 'received' &&
    normalized !== 'cancelled'
  ) {
    throw new Error('status must be draft, approved, partially_received, received or cancelled');
  }
  return normalized;
}

function validateScheduledInventoryInvoicesRow(
  row: unknown,
  accountId: AccountId
): InventoryInvoicesReportRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Inventory-invoices report source returned malformed rows');
  }
  const candidate = row as Record<string, unknown>;
  if (candidate.accountId !== accountId) {
    throw new Error('Inventory-invoices report source returned a foreign account row');
  }

  const totalAmount = readScheduledInventoryInvoicesNumber(candidate.totalAmount, 'totalAmount');
  const receivedAmount = readScheduledInventoryInvoicesNumber(
    candidate.receivedAmount,
    'receivedAmount'
  );
  if (receivedAmount > totalAmount) {
    throw new Error('Inventory-invoices report source returned malformed receivedAmount');
  }

  return {
    accountId,
    purchaseId: readScheduledInventoryInvoicesText(candidate.purchaseId, 'purchaseId'),
    invoiceNumber: readScheduledInventoryInvoicesText(candidate.invoiceNumber, 'invoiceNumber'),
    supplierName: readScheduledInventoryInvoicesText(candidate.supplierName, 'supplierName'),
    status: parseScheduledInventoryInvoiceRowStatus(candidate.status),
    totalAmount,
    receivedAmount,
    payableId: readScheduledInventoryInvoicesNullableText(candidate.payableId, 'payableId'),
    createdByUserId: readScheduledInventoryInvoicesText(
      candidate.createdByUserId,
      'createdByUserId'
    ) as UserId,
    approvedByUserId: readScheduledInventoryInvoicesNullableText(
      candidate.approvedByUserId,
      'approvedByUserId'
    ) as UserId | null,
    createdAt: readScheduledInventoryInvoicesTimestamp(candidate.createdAt, 'createdAt'),
    updatedAt: readScheduledInventoryInvoicesTimestamp(candidate.updatedAt, 'updatedAt'),
    receivedAt:
      candidate.receivedAt === null
        ? null
        : readScheduledInventoryInvoicesTimestamp(candidate.receivedAt, 'receivedAt')
  };
}

function parseScheduledInventoryInvoiceRowStatus(value: unknown): InventoryPurchaseStatus {
  if (
    value !== 'draft' &&
    value !== 'approved' &&
    value !== 'partially_received' &&
    value !== 'received' &&
    value !== 'cancelled'
  ) {
    throw new Error('Inventory-invoices report source returned malformed status');
  }
  return value;
}

function readScheduledInventoryInvoicesText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Inventory-invoices report source returned malformed ${field}`);
  }
  return value;
}

function readScheduledInventoryInvoicesNullableText(value: unknown, field: string): string | null {
  if (value === null) return null;
  return readScheduledInventoryInvoicesText(value, field);
}

function readScheduledInventoryInvoicesNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Inventory-invoices report source returned malformed ${field}`);
  }
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw new Error(`Inventory-invoices report source returned malformed ${field}`);
  }
  return cents / 100;
}

function readScheduledInventoryInvoicesTimestamp(value: unknown, field: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Inventory-invoices report source returned malformed ${field}`);
    }
    return value.toISOString();
  }
  if (typeof value !== 'string') {
    throw new Error(`Inventory-invoices report source returned malformed ${field}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`Inventory-invoices report source returned malformed ${field}`);
  }
  return value;
}

function inventoryInvoicesMatchesSearch(
  row: InventoryInvoicesReportRow,
  search: string | undefined
): boolean {
  if (!search) return true;
  return (
    row.invoiceNumber.toLowerCase().includes(search) ||
    row.supplierName.toLowerCase().includes(search)
  );
}

async function resolveAdministrativeExecutiveSourceRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const period = reportPeriodFromSchedule(schedule);

  if (sources.commercial) {
    try {
      const commercial = await sources.commercial.getCommercialDashboard(
        schedule.accountId,
        period.dateFrom,
        period.dateTo
      );
      rows.push(
        {
          domain: 'commercial',
          metric: 'Receita liquida comercial',
          value: commercial.netRevenueToday,
          status: commercial.netRevenueToday > 0 ? 'tracked' : 'attention'
        },
        {
          domain: 'commercial',
          metric: 'Comandas fechadas',
          value: commercial.closedToday,
          status: commercial.closedToday > 0 ? 'tracked' : 'attention'
        },
        {
          domain: 'commercial',
          metric: 'Comandas abertas',
          value: commercial.openSales,
          status: commercial.openSales > 0 ? 'attention' : 'tracked'
        },
        {
          domain: 'commercial',
          metric: 'Ticket medio',
          value: commercial.avgTicket,
          status: commercial.avgTicket > 0 ? 'tracked' : 'attention'
        }
      );
    } catch (error) {
      rows.push(sourceUnavailableRow('commercial', error));
    }
  }

  if (sources.financial) {
    try {
      const financial = await sources.financial.getIncomeStatement(schedule.accountId, period);
      rows.push(
        {
          domain: 'financial',
          metric: 'Resultado liquido realizado',
          value: financial.result.realizedNetResult,
          status: financial.result.realizedNetResult >= 0 ? 'tracked' : 'attention'
        },
        {
          domain: 'financial',
          metric: 'Recebiveis em aberto',
          value: financial.revenue.outstandingReceivables,
          status: financial.revenue.outstandingReceivables > 0 ? 'attention' : 'tracked'
        },
        {
          domain: 'financial',
          metric: 'Pagaveis em aberto',
          value: financial.expenses.outstandingPayables,
          status: financial.expenses.outstandingPayables > 0 ? 'attention' : 'tracked'
        },
        {
          domain: 'financial',
          metric: 'Margem bruta percentual',
          value: financial.result.grossMarginPercent ?? 0,
          status: financial.result.grossMarginPercent !== null ? 'tracked' : 'attention'
        }
      );
    } catch (error) {
      rows.push(sourceUnavailableRow('financial', error));
    }
  }

  if (sources.cash) {
    try {
      const openRegister = await sources.cash.findOpenRegister(schedule.accountId);
      if (openRegister) {
        rows.push({
          domain: 'cash',
          metric: 'Saldo do caixa aberto',
          value: await sources.cash.getCurrentBalance(openRegister.id),
          status: 'tracked'
        });
      } else {
        rows.push({
          domain: 'cash',
          metric: 'Caixa aberto',
          value: 0,
          status: 'attention'
        });
      }
    } catch (error) {
      rows.push(sourceUnavailableRow('cash', error));
    }
  }

  return rows;
}

function reportPeriodFromSchedule(schedule: ReportScheduleSummary): {
  readonly dateFrom?: string;
  readonly dateTo?: string;
} {
  return {
    dateFrom: typeof schedule.filters.dateFrom === 'string' ? schedule.filters.dateFrom : undefined,
    dateTo: typeof schedule.filters.dateTo === 'string' ? schedule.filters.dateTo : undefined
  };
}

function parseScheduledReportDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be an ISO calendar date`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    year < 1 ||
    year > 9999 ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${field} must be an ISO calendar date`);
  }

  return value;
}

function sourceUnavailableRow(domain: string, error: unknown): Record<string, unknown> {
  return {
    domain,
    metric: 'Fonte indisponivel',
    value: 0,
    status: 'attention',
    detail: error instanceof Error ? error.message : String(error)
  };
}

const defaultNotifications = createWorkerNotifications();
const defaultEventBus = createWorkerEventBus();
const defaultReports = createWorkerReports();

export async function runWorkerTick(
  logger: Logger,
  context: WorkerTickContext,
  notifications: NotificationsService = defaultNotifications
) {
  const processed = await notifications.processPendingFromRepository(
    { limit: 25 },
    context.accountId
  );

  logger.info('worker notification tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    processedNotifications: processed.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy,
    databaseDetail: context.databaseDetail
  });
}

export async function runEventBusTick(
  logger: Logger,
  context: WorkerTickContext,
  eventBus: EventBusService = defaultEventBus
) {
  const processed = await eventBus.processPending(25);

  logger.info('worker event bus tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    processedEvents: processed.length,
    processedEventIds: processed.map((event) => event.id).slice(0, 10),
    processedCorrelationIds: Array.from(
      new Set(processed.map((event) => event.correlationId))
    ).slice(0, 10),
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });
}

export async function runWebhookDeliveriesTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId },
  webhooks: WebhooksService,
  workerId: string,
  limit = 25
): Promise<ProcessWebhookDeliveriesResult> {
  const result = await webhooks.processPendingDeliveries(context.accountId, {
    workerId,
    limit
  });

  logger.info('worker webhook delivery tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    workerId,
    ...result,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy,
    databaseDetail: context.databaseDetail
  });

  return result;
}

export async function runScheduledReportsTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId; readonly runAsUserId: UserId },
  reports: ReportsService = defaultReports,
  reportSources: AdministrativeExecutiveReportSources = {},
  audit?: Pick<AuditService, 'writeAndWait'>
) {
  const result = await runScheduledReportJob(reports, {
    accountId: context.accountId,
    runAsUserId: context.runAsUserId,
    correlationId: context.correlationId,
    environment: context.environment,
    logger,
    audit,
    resolveRows: (schedule) => resolveScheduledReportRows(schedule, reportSources)
  });

  logger.info('worker scheduled report tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    dueSchedules: result.dueSchedules,
    executedSchedules: result.executedSchedules,
    exportedSchedules: result.exportedSchedules,
    failures: result.failures.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });

  return result;
}

export interface FailedReportDeliveryRetryFailure {
  readonly deliveryId: string;
  readonly scheduleId: string;
  readonly error: string;
}

export async function runFailedReportDeliveriesTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId; readonly runAsUserId: UserId },
  reports: ReportsService,
  limit = 25
): Promise<{
  readonly attempted: number;
  readonly retried: number;
  readonly failures: readonly FailedReportDeliveryRetryFailure[];
}> {
  const retryLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 25;
  const claimedDeliveries = await reports.claimFailedScheduleDeliveries(
    context.accountId,
    context.correlationId,
    undefined,
    retryLimit
  );
  const failures: FailedReportDeliveryRetryFailure[] = [];
  let retried = 0;

  for (const claim of claimedDeliveries) {
    try {
      await reports.retryScheduleDelivery(
        context.accountId,
        context.runAsUserId,
        claim.delivery.scheduleId,
        claim.delivery.id,
        claim.claimToken
      );
      retried += 1;
    } catch (error) {
      failures.push({
        deliveryId: claim.delivery.id,
        scheduleId: claim.delivery.scheduleId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  logger.info('worker failed report delivery retry complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    attempted: claimedDeliveries.length,
    retried,
    failures: failures.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });

  return {
    attempted: claimedDeliveries.length,
    retried,
    failures
  };
}
