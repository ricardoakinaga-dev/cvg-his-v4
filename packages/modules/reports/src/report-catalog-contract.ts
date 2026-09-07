/**
 * R05-018: the report definition describes the presentation contract; this
 * companion contract records the operational source and acceptance evidence
 * needed to compare the implementation with the Vetus report scope.
 */
export type ReportCatalogImplementationStatus = 'implemented' | 'partial' | 'planned';

export type ReportCatalogDateSemantics =
  | 'utc_civil_day'
  | 'utc_timestamp'
  | 'period_overlap'
  | 'none';

export interface ReportCatalogContract {
  readonly reportId: string;
  readonly vetusFamily: string;
  readonly source: string;
  readonly temporalField: string;
  readonly dateSemantics: ReportCatalogDateSemantics;
  readonly maxRows: number;
  readonly totalDefinition: string;
  readonly expectedSample: string;
  readonly status: ReportCatalogImplementationStatus;
  readonly gap?: string;
}

const MAX_REPORT_ROWS = 10_000;

/**
 * Canonical inventory for the report IDs currently exposed by ReportsService.
 * Keep this list in sync with seedDefinitions and update the status when a
 * source or business reconciliation is actually evidenced.
 */
export const reportCatalogContracts: readonly ReportCatalogContract[] = [
  {
    reportId: 'administrative-executive',
    vetusFamily: 'executive / financial',
    source:
      'apps/api/src/routes/reports-routes.ts#buildAdministrativeExecutiveRows (dashboard and cash sources)',
    temporalField: 'dashboard generatedAt',
    dateSemantics: 'none',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'four fixed KPI rows; currency values are server-derived',
    expectedSample: '4 KPI rows (financial, commercial, fiscal, cash) for a seeded account',
    status: 'partial',
    gap: 'dateFrom/dateTo are catalogued but the executive projection is a current snapshot'
  },
  {
    reportId: 'commission-calculations',
    vetusFamily: 'staff / commissions',
    source:
      'packages/modules/commissions/src/commission-calculations-report.ts (shared persistent API and worker source)',
    temporalField: 'periodStart / periodEnd',
    dateSemantics: 'period_overlap',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition:
      'totalBaseAmount and totalCommissionAmount persisted in commission_calculations',
    expectedSample: '1 calculation with 1 line and a non-zero base/commission',
    status: 'partial',
    gap: 'Persisted API/worker parity has local regression coverage; business sample reconciliation and independent acceptance remain pending'
  },
  {
    reportId: 'scheduling-appointments',
    vetusFamily: 'agenda',
    source:
      'SchedulingService.listPersistedReportRows via apps/api/src/routes/reports-routes.ts#buildReportRows',
    temporalField: 'scheduledAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'one row per persisted appointment',
    expectedSample: '1 scheduled appointment plus 1 boundary appointment at 00:00:00Z',
    status: 'implemented'
  },
  {
    reportId: 'scheduling-professional-care',
    vetusFamily: 'atendimento por profissional',
    source:
      'SchedulingService.listPersistedProfessionalCareReportRows via apps/api/src/routes/reports-routes.ts#buildReportRows',
    temporalField: 'scheduledAt (source aggregation)',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'one aggregate row per professional; counts are source-derived',
    expectedSample: '1 professional with scheduled/completed/checked-in/cancelled counts',
    status: 'partial',
    gap: 'business acceptance must reconcile aggregate counts with Vetus historical output'
  },
  {
    reportId: 'financial-payables',
    vetusFamily: 'financial / paid',
    source: 'DatabaseFinancialPayablesRepository via FinancialPayablesService',
    temporalField: 'dueAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition:
      'totalAmount, paidAmount and outstandingAmount per payable; summary totals are derived',
    expectedSample: '1 open, 1 partial and 1 paid payable with reconciliation status',
    status: 'implemented'
  },
  {
    reportId: 'financial-receivables',
    vetusFamily: 'financial / received',
    source: 'DatabaseFinancialReceivablesReportSource / EncounterFinancialService',
    temporalField: 'settledAt, dueAt or issuedAt according to status filter',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'amountOriginal, amountPaid and amountOutstanding per installment',
    expectedSample: '1 open installment and 1 settled installment with paymentCount',
    status: 'implemented'
  },
  {
    reportId: 'financial-cheques',
    vetusFamily: 'financial / payment methods',
    source: 'CounterSalesService.listChequePayments from persisted counter-sale payments',
    temporalField: 'recordedAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'amount per cheque payment; no inferred settlement lifecycle',
    expectedSample: '1 cheque payment linked to a sale and reference',
    status: 'implemented'
  },
  {
    reportId: 'fiscal-service-invoices',
    vetusFamily: 'personalized / NFS-e',
    source: 'DatabaseFiscalRepository / FiscalService.listNfseDocuments',
    temporalField: 'competencia',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'service subtotal, tax totals and totalDocument from persisted NFS-e',
    expectedSample: '1 document with 1 service, competence and tax totals',
    status: 'partial',
    gap: 'municipal homologation remains external to the local source contract'
  },
  {
    reportId: 'financial-advance-payments',
    vetusFamily: 'financial / advances',
    source: 'DatabaseAdvancePaymentsReportSource over advance_payments and allocations',
    temporalField: 'issuedAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'originalAmount, compensatedAmount and balance from append-only allocations',
    expectedSample: '1 available advance and 1 compensated advance with owner/document',
    status: 'implemented'
  },
  {
    reportId: 'commercial-deleted-sales',
    vetusFamily: 'commercial / cancellation snapshot',
    source: 'DatabaseCounterSalesRepository.listPersisted(status=cancelled)',
    temporalField: 'createdAt (sale opening)',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'snapshot totals from the currently cancelled sale',
    expectedSample: '1 cancelled sale with totals and opening timestamp',
    status: 'implemented'
  },
  {
    reportId: 'commercial-cancellation-history',
    vetusFamily: 'commercial / cancellation audit',
    source: 'DatabaseCounterSalesRepository.listCancellationReportRows over audit_events',
    temporalField: 'cancelledAt (audit event occurred_at)',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'immutable cancellation snapshot totals from audit_events.after_json',
    expectedSample: '1 cancellation with actor, reason, eventId and correlationId',
    status: 'implemented'
  },
  {
    reportId: 'inventory-products',
    vetusFamily: 'inventory / products',
    source: 'InventoryService.listPersistedItems',
    temporalField: 'createdAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition:
      'one current position per product; onHandQuantity and unitCostAmount source-derived',
    expectedSample: '1 product with positive, zero or below-reorder balance',
    status: 'implemented'
  },
  {
    reportId: 'inventory-invoices',
    vetusFamily: 'inventory / purchase entries',
    source: 'ProcurementService.listPersistedPurchaseReportRows',
    temporalField: 'createdAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'purchase and received amounts; invoiceNumber is the informed reference',
    expectedSample: '1 purchase with invoice reference and received amount',
    status: 'implemented'
  },
  {
    reportId: 'inventory-stock',
    vetusFamily: 'inventory / stock position',
    source: 'InventoryService.listPersistedItems',
    temporalField: 'createdAt (position source)',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'stockValue = onHandQuantity × unitCostAmount; reorderStatus is derived',
    expectedSample: '1 product with independently reconciled stockValue',
    status: 'partial',
    gap: 'the current position is not a historical stock-at-date ledger'
  },
  {
    reportId: 'inventory-movements',
    vetusFamily: 'inventory / movements',
    source: 'InventoryService.listPersistedStockMovementReportRows',
    temporalField: 'occurredAt (movement.createdAt)',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition:
      'quantityDelta, balanceBefore, balanceAfter and unitCostAmount from stock ledger',
    expectedSample: '1 inbound and 1 outbound movement with contiguous balances',
    status: 'implemented'
  },
  {
    reportId: 'registration-owners',
    vetusFamily: 'registrations / clients',
    source: 'OwnersService.list (account scoped)',
    temporalField: 'createdAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'one row per owner; contact and responsibility are source-derived',
    expectedSample: '1 owner with primary contact and financial responsibility',
    status: 'implemented'
  },
  {
    reportId: 'registration-patients',
    vetusFamily: 'registrations / animals',
    source: 'PatientsService.list (account scoped)',
    temporalField: 'createdAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'one row per patient/animal from the account registry',
    expectedSample: '1 animal with species, status and optional microchip',
    status: 'implemented'
  },
  {
    reportId: 'registration-services',
    vetusFamily: 'registrations / services',
    source: 'ServicesService.list (database backed)',
    temporalField: 'createdAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'one row per service; basePrice and active status are source-derived',
    expectedSample: '1 active service with code and base price',
    status: 'implemented'
  },
  {
    reportId: 'registration-suppliers',
    vetusFamily: 'registrations / suppliers',
    source: 'FinanceCatalogReportSource over finance_catalog_items',
    temporalField: 'createdAt',
    dateSemantics: 'utc_civil_day',
    maxRows: MAX_REPORT_ROWS,
    totalDefinition: 'one row per supplier/catalog item with category and cost center',
    expectedSample: '1 supplier and 1 expense catalog entry with cost center',
    status: 'partial',
    gap: 'supplier master parity and business reconciliation remain open in R05-026'
  }
];

export const reportCatalogContractById: ReadonlyMap<string, ReportCatalogContract> = new Map(
  reportCatalogContracts.map((contract) => [contract.reportId, contract])
);

export function getReportCatalogContract(reportId: string): ReportCatalogContract | undefined {
  return reportCatalogContractById.get(reportId);
}
