import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { ReportsService, type ReportExportSummary, type ReportRepository } from './index.js';

const ACCOUNT = 'acc-reports-test' as AccountId;
const OTHER_ACCOUNT = 'acc-reports-other' as AccountId;
const USER = 'user-reports-test' as UserId;

test('ReportsService lists catalog and executes report rows with filters', async () => {
  const service = new ReportsService();
  const definitions = service.listDefinitions(ACCOUNT);
  assert.ok(definitions.some((definition) => definition.id === 'administrative-executive'));

  const execution = await service.execute(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    filters: { dateFrom: '2026-05-01', empty: '' },
    rows: [
      { domain: 'financial', metric: 'Recebíveis', value: 120, status: 'attention', ignored: true }
    ]
  });

  assert.equal(execution.rowCount, 1);
  assert.deepEqual(execution.filters, { dateFrom: '2026-05-01' });
  assert.deepEqual(execution.rows[0], {
    domain: 'financial',
    metric: 'Recebíveis',
    value: 120,
    status: 'attention'
  });
  assert.equal(service.listExecutions(ACCOUNT)[0]?.id, execution.id);
  assert.throws(() => service.getExecution(OTHER_ACCOUNT, execution.id), Error);
});

test('ReportsService catalogs the persisted owner and patient registry exports', () => {
  const service = new ReportsService();
  const definitions = service.listDefinitions(ACCOUNT);
  const owners = definitions.find((definition) => definition.id === 'registration-owners');
  const patients = definitions.find((definition) => definition.id === 'registration-patients');

  assert.equal(owners?.requiredPermission, 'owners.read');
  assert.deepEqual(
    owners?.columns.map((column) => column.key),
    [
      'documentId',
      'fullName',
      'primaryContact',
      'city',
      'financialResponsible',
      'status',
      'createdAt'
    ]
  );
  assert.equal(patients?.requiredPermission, 'patients.read');
  assert.deepEqual(
    patients?.columns.map((column) => column.key),
    ['code', 'name', 'species', 'breed', 'sex', 'microchip', 'status', 'createdAt']
  );
});

test('ReportsService catalogs the persisted services registry export', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'registration-services');

  assert.equal(definition?.requiredPermission, 'service.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    ['code', 'name', 'description', 'basePrice', 'status', 'createdAt']
  );
});

test('ReportsService catalogs the persisted supplier and expense registry export', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'registration-suppliers');

  assert.equal(definition?.requiredPermission, 'billing.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
      'code',
      'name',
      'kind',
      'category',
      'costCenterCode',
      'costCenterName',
      'description',
      'createdAt',
      'updatedAt'
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    category: 'string',
    costCenterCode: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the persisted cancelled counter-sale report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'commercial-deleted-sales');

  assert.equal(definition?.requiredPermission, 'counter_sale.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
      'number',
      'status',
      'ownerId',
      'openedByUserId',
      'createdAt',
      'updatedAt',
      'total',
      'discountAmount',
      'paidAmount',
      'balanceDue',
      'notes'
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the persisted appointments report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'scheduling-appointments');

  assert.equal(definition?.requiredPermission, 'scheduling.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
      'appointmentId',
      'scheduledAt',
      'status',
      'reason',
      'patientId',
      'ownerId',
      'practitionerStaffId',
      'serviceId',
      'unit',
      'specialty',
      'resourceLabel',
      'createdAt',
      'updatedAt'
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    status: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the persisted professional care report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'scheduling-professional-care');

  assert.equal(definition?.requiredPermission, 'staff.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    ['professional', 'scheduled', 'completed', 'checkedIn', 'cancelled', 'services']
  );
  assert.deepEqual(definition?.filterSchema, {
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the persisted NFS-e service-invoice report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'fiscal-service-invoices');

  assert.equal(definition?.requiredPermission, 'fiscal.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
      'documentId',
      'serie',
      'numero',
      'competencia',
      'status',
      'customerName',
      'customerDocument',
      'provider',
      'serviceDescriptions',
      'serviceCodes',
      'serviceQuantity',
      'serviceSubtotal',
      'totalIss',
      'totalPis',
      'totalCofins',
      'totalCsll',
      'totalIrrf',
      'totalInss',
      'totalDocument',
      'observations',
      'createdAt',
      'authorizationCode'
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    status: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the persisted inventory-products report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'inventory-products');

  assert.equal(definition?.requiredPermission, 'inventory.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
      'sku',
      'name',
      'unit',
      'onHandQuantity',
      'reorderLevel',
      'unitCostAmount',
      'createdAt',
      'updatedAt'
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the current persisted inventory-stock report', () => {
  const service = new ReportsService();
  const definition = service.listDefinitions(ACCOUNT).find((item) => item.id === 'inventory-stock');

  assert.equal(definition?.requiredPermission, 'inventory.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
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
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the raw persisted inventory movement ledger report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'inventory-movements');

  assert.equal(definition?.requiredPermission, 'inventory.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
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
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the bounded inventory purchase-entry report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'inventory-invoices');

  assert.equal(definition?.requiredPermission, 'inventory.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
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
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    status: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService catalogs the persisted advance-payment report', () => {
  const service = new ReportsService();
  const definition = service
    .listDefinitions(ACCOUNT)
    .find((item) => item.id === 'financial-advance-payments');

  assert.equal(definition?.requiredPermission, 'billing.read');
  assert.deepEqual(
    definition?.columns.map((column) => column.key),
    [
      'paymentId',
      'ownerName',
      'documentId',
      'issuedAt',
      'originalAmount',
      'compensatedAmount',
      'balance',
      'origin',
      'status',
      'notes'
    ]
  );
  assert.deepEqual(definition?.filterSchema, {
    search: 'string',
    status: 'string',
    dateFrom: 'date',
    dateTo: 'date'
  });
});

test('ReportsService exports execution as CSV, JSON, XLSX and PDF', async () => {
  const service = new ReportsService();
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: 'commission-calculations',
    rows: [
      {
        number: 'COM-000001',
        period: '01/05/2026 a 31/05/2026',
        status: 'reviewed',
        totalBaseAmount: 1000,
        totalCommissionAmount: 120,
        lineCount: 3
      }
    ]
  });

  const csv = await service.exportExecution(ACCOUNT, USER, execution.id, 'csv');
  assert.equal(csv.contentType, 'text/csv; charset=utf-8');
  assert.equal(csv.contentEncoding, 'utf8');
  assert.match(csv.content, /Número,Período,Status,Base,Comissão,Linhas/);
  assert.match(csv.content, /COM-000001/);

  const json = await service.exportExecution(ACCOUNT, USER, execution.id, 'json');
  assert.equal(json.contentType, 'application/json; charset=utf-8');
  assert.equal(json.contentEncoding, 'utf8');
  assert.match(json.content, /commission-calculations/);

  const xlsx = await service.exportExecution(ACCOUNT, USER, execution.id, 'xlsx');
  assert.equal(
    xlsx.contentType,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert.equal(xlsx.contentEncoding, 'base64');
  assert.equal(Buffer.from(xlsx.content, 'base64').subarray(0, 2).toString('hex'), '504b');

  const pdf = await service.exportExecution(ACCOUNT, USER, execution.id, 'pdf');
  assert.equal(pdf.contentType, 'application/pdf');
  assert.equal(pdf.contentEncoding, 'base64');
  assert.match(Buffer.from(pdf.content, 'base64').toString('utf8', 0, 8), /%PDF-1\.4/);
  assert.equal(service.getExport(ACCOUNT, xlsx.id).content, xlsx.content);
  assert.throws(() => service.getExport(OTHER_ACCOUNT, xlsx.id), Error);
});

test('ReportsService neutralizes spreadsheet formulas in server-side CSV exports', async () => {
  const service = new ReportsService();
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    rows: [
      {
        domain: 'financial',
        metric: '=HYPERLINK("https://attacker.invalid")',
        value: 10,
        status: 'tracked'
      },
      {
        domain: 'financial',
        metric: '\t =HYPERLINK("https://attacker.invalid")',
        value: 11,
        status: 'tracked'
      }
    ]
  });

  const exported = await service.exportExecution(ACCOUNT, USER, execution.id, 'csv');

  assert.match(exported.content, /'=HYPERLINK\(""https:\/\/attacker\.invalid""\)/);
  assert.match(exported.content, /'\t =HYPERLINK\(""https:\/\/attacker\.invalid""\)/);
  assert.doesNotMatch(exported.content, /\n=HYPERLINK/);
  assert.doesNotMatch(exported.content, /\n\t =HYPERLINK/);
});

test('ReportsService records delivery failures when the provider is absent or rejects', async () => {
  const scheduleInput = {
    reportId: 'administrative-executive',
    name: 'Executivo com falha de entrega',
    frequency: 'daily' as const,
    format: 'csv' as const,
    recipients: ['financeiro@cvg.local']
  };

  const withoutProvider = new ReportsService();
  const schedule = await withoutProvider.createSchedule(ACCOUNT, USER, scheduleInput);
  const execution = await withoutProvider.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });
  const exported = await withoutProvider.exportExecution(ACCOUNT, USER, execution.id, 'csv');
  const missingProvider = await withoutProvider.deliverExport(
    ACCOUNT,
    schedule.id,
    execution.id,
    exported,
    schedule.recipients
  );
  assert.equal(missingProvider.failures[0]?.error, 'No report delivery provider is configured');
  assert.equal(missingProvider.deliveries[0]?.status, 'failed');

  const rejectingProvider = new ReportsService({
    deliveryProvider: {
      deliver: async () => {
        throw 'SMTP indisponivel';
      }
    }
  });
  const rejectingSchedule = await rejectingProvider.createSchedule(ACCOUNT, USER, scheduleInput);
  const rejectingExecution = await rejectingProvider.execute(ACCOUNT, USER, {
    reportId: rejectingSchedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });
  const rejectingExport = await rejectingProvider.exportExecution(
    ACCOUNT,
    USER,
    rejectingExecution.id,
    'csv'
  );
  const rejected = await rejectingProvider.deliverExport(
    ACCOUNT,
    rejectingSchedule.id,
    rejectingExecution.id,
    rejectingExport,
    rejectingSchedule.recipients
  );
  assert.equal(rejected.failures[0]?.error, 'SMTP indisponivel');
  assert.equal(rejected.deliveries[0]?.status, 'failed');
});

test('ReportsService creates schedules and validates unsupported formats', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo diario',
    frequency: 'daily',
    format: 'csv',
    recipients: [' diretoria@cvg.local ', '']
  });

  assert.equal(schedule.isActive, true);
  assert.deepEqual(schedule.recipients, ['diretoria@cvg.local']);
  assert.equal(schedule.nextRunAt, addUtcDays(schedule.createdAt, 1));
  assert.equal(service.listSchedules(ACCOUNT)[0]?.id, schedule.id);
  assert.equal(
    service.listDueSchedules(ACCOUNT, addUtcDays(schedule.createdAt, 1))[0]?.id,
    schedule.id
  );
  assert.equal(service.listDueSchedules(ACCOUNT, addUtcDays(schedule.createdAt, 0)).length, 0);

  await assert.rejects(() => service.exportExecution(ACCOUNT, USER, 'missing', 'csv'), Error);
  await assert.rejects(
    () =>
      service.createSchedule(ACCOUNT, USER, {
        reportId: 'administrative-executive',
        name: 'Formato invalido',
        frequency: 'daily',
        format: 'xml' as never
      }),
    ValidationError
  );
});

test('ReportsService calculates next run dates for weekly and monthly schedules', async () => {
  const service = new ReportsService();
  const weekly = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo semanal',
    frequency: 'weekly'
  });
  const monthly = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo mensal',
    frequency: 'monthly'
  });

  assert.equal(weekly.nextRunAt, addUtcDays(weekly.createdAt, 7));
  assert.equal(monthly.nextRunAt, addUtcMonths(monthly.createdAt, 1));
});

test('ReportsService records schedule execution and advances next run', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo diario',
    frequency: 'daily'
  });
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });
  const [claim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-test'
  );
  assert.ok(claim);

  const updated = await service.recordScheduleExecution(ACCOUNT, schedule.id, {
    executionId: execution.id,
    ranAt: schedule.nextRunAt,
    claimToken: claim.claimToken
  });

  assert.equal(updated.lastExecutionId, execution.id);
  assert.equal(updated.lastRunAt, schedule.nextRunAt);
  assert.equal(updated.lastError, null);
  assert.equal(updated.nextRunAt, addUtcDays(schedule.nextRunAt, 1));
});

test('ReportsService fences an in-memory scheduled-report takeover', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo com fencing',
    frequency: 'daily'
  });
  const [firstClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-worker-a',
    1
  );
  assert.ok(firstClaim);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const takeoverAsOf = schedule.nextRunAt;
  const [takeoverClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    takeoverAsOf,
    'reports-worker-b',
    60_000
  );
  assert.ok(takeoverClaim);
  assert.notEqual(takeoverClaim.claimToken, firstClaim.claimToken);

  await assert.rejects(
    () =>
      service.recordScheduleExecution(ACCOUNT, schedule.id, {
        claimToken: firstClaim.claimToken,
        ranAt: takeoverAsOf,
        error: 'stale worker'
      }),
    /Report schedule lease was lost/
  );
  assert.equal(service.listSchedules(ACCOUNT)[0]?.lastRunAt, null);

  const current = await service.recordScheduleExecution(ACCOUNT, schedule.id, {
    claimToken: takeoverClaim.claimToken,
    ranAt: takeoverAsOf,
    error: null
  });
  assert.equal(current.lastRunAt, takeoverAsOf);
  assert.equal(current.lastError, null);
});

test('ReportsService fences stale scheduled execution and export persistence', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo artifacts stale',
    frequency: 'daily',
    format: 'csv'
  });
  const baselineExecution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    executionId: 'rep-scheduled-stale-artifact',
    rows: [{ domain: 'reports', metric: 'baseline', value: 1, status: 'old' }]
  });
  const baselineExport = await service.exportExecution(ACCOUNT, USER, baselineExecution.id, 'csv');
  const [staleClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-artifact-worker-a',
    1
  );
  assert.ok(staleClaim);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const [currentClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-artifact-worker-b',
    60_000
  );
  assert.ok(currentClaim);

  await assert.rejects(
    () =>
      service.executeScheduled(
        ACCOUNT,
        USER,
        {
          reportId: schedule.reportId,
          executionId: baselineExecution.id,
          rows: [{ domain: 'reports', metric: 'stale', value: 2, status: 'stale' }]
        },
        { scheduleId: schedule.id, claimToken: staleClaim!.claimToken }
      ),
    /Report schedule lease was lost/
  );
  assert.deepEqual(
    service.getExecution(ACCOUNT, baselineExecution.id).rows,
    baselineExecution.rows
  );

  await assert.rejects(
    () =>
      service.exportScheduled(ACCOUNT, USER, baselineExecution.id, 'csv', {
        scheduleId: schedule.id,
        claimToken: staleClaim!.claimToken
      }),
    /Report schedule lease was lost/
  );
  assert.equal(service.getExport(ACCOUNT, baselineExport.id).exportedAt, baselineExport.exportedAt);
});

test('ReportsService refreshes deterministic scheduled execution and export artifacts after takeover', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo artifacts refresh',
    frequency: 'daily',
    format: 'csv'
  });
  const executionId = 'rep-scheduled-refresh-artifact';
  const baselineExecution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    executionId,
    rows: [{ domain: 'reports', metric: 'baseline', value: 1, status: 'old' }]
  });
  const baselineExport = await service.exportExecution(ACCOUNT, USER, executionId, 'csv');
  const [staleClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-refresh-worker-a',
    1
  );
  assert.ok(staleClaim);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const [currentClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-refresh-worker-b',
    60_000
  );
  assert.ok(currentClaim);

  const refreshedExecution = await service.executeScheduled(
    ACCOUNT,
    USER,
    {
      reportId: schedule.reportId,
      executionId,
      rows: [{ domain: 'reports', metric: 'fresh', value: 99, status: 'current' }]
    },
    { scheduleId: schedule.id, claimToken: currentClaim!.claimToken }
  );
  const refreshedExport = await service.exportScheduled(ACCOUNT, USER, executionId, 'csv', {
    scheduleId: schedule.id,
    claimToken: currentClaim!.claimToken
  });

  assert.equal(refreshedExecution.id, baselineExecution.id);
  assert.deepEqual(refreshedExecution.rows, [
    { domain: 'reports', metric: 'fresh', value: 99, status: 'current' }
  ]);
  assert.equal(refreshedExport.id, baselineExport.id);
  assert.notEqual(refreshedExport.content, baselineExport.content);
  assert.match(refreshedExport.content, /fresh/);
});

test('ReportsService fails closed when scheduled artifact persistence is not fenced', async () => {
  let schedule: Awaited<ReturnType<ReportsService['createSchedule']>> | undefined;
  const repository = {
    saveExecution: async () => {},
    saveExport: async () => {},
    saveSchedule: async () => {},
    saveDelivery: async () => {},
    findExecutions: async () => [],
    findExports: async () => [],
    findSchedules: async () => [],
    findDeliveries: async () => [],
    claimDueSchedulesWithLease: async () =>
      schedule
        ? [
            {
              schedule,
              claimToken: 'claim-token-without-fence',
              claimUntil: new Date(Date.now() + 60_000).toISOString(),
              claimWorkerId: 'reports-worker-without-fence'
            }
          ]
        : [],
    saveClaimedSchedule: async () => true
  } satisfies Omit<
    ReportRepository,
    'saveExecutionForScheduleClaim' | 'saveExportForScheduleClaim'
  >;
  const service = new ReportsService({ repository });
  schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo sem fence de artifact',
    frequency: 'daily'
  });
  const [claim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-worker'
  );
  assert.ok(claim);

  await assert.rejects(
    () =>
      service.executeScheduled(
        ACCOUNT,
        USER,
        { reportId: schedule!.reportId, executionId: 'rep-without-fence', rows: [] },
        { scheduleId: schedule!.id, claimToken: claim!.claimToken }
      ),
    /requires a fenced repository implementation/
  );
  assert.equal(service.listExecutions(ACCOUNT).length, 0);
});

test('ReportsService keeps summary-only legacy schedule claim adapters compatible', async () => {
  let persistedSchedule: Awaited<ReturnType<ReportsService['createSchedule']>> | undefined;
  const repository: ReportRepository = {
    saveExecution: async () => {},
    saveExport: async () => {},
    saveSchedule: async () => {},
    saveDelivery: async () => {},
    findExecutions: async () => [],
    findExports: async () => [],
    findSchedules: async () => [],
    findDeliveries: async () => [],
    claimDueSchedules: async () => (persistedSchedule ? [persistedSchedule] : [])
  };
  const service = new ReportsService({ repository });
  persistedSchedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo adapter legado',
    frequency: 'daily'
  });

  const claimed = await service.claimDueSchedules(
    ACCOUNT,
    persistedSchedule.nextRunAt,
    'legacy-worker'
  );

  assert.deepEqual(claimed, [persistedSchedule]);
  assert.deepEqual(service.listSchedules(ACCOUNT), [persistedSchedule]);
  await assert.rejects(
    () =>
      service.claimDueSchedulesWithLease(ACCOUNT, persistedSchedule!.nextRunAt, 'legacy-worker'),
    /claims require a fenced repository implementation/
  );
});

test('ReportsService fences scheduled delivery history by the active schedule claim', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo delivery fenced',
    frequency: 'daily',
    recipients: ['fenced@example.test']
  });
  const [firstClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-delivery-worker-a',
    1
  );
  assert.ok(firstClaim);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const [currentClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-delivery-worker-b',
    60_000
  );
  assert.ok(currentClaim);

  await assert.rejects(
    () =>
      service.recordScheduleDeliveries(ACCOUNT, schedule.id, {
        recipients: schedule.recipients,
        status: 'failed',
        format: 'csv',
        deliveredAt: schedule.nextRunAt,
        error: 'stale worker',
        scheduleClaimToken: firstClaim!.claimToken
      } as never),
    /Report schedule lease was lost/
  );
  assert.equal(service.listScheduleDeliveries(ACCOUNT, schedule.id).length, 0);

  const currentDeliveries = await service.recordScheduleDeliveries(ACCOUNT, schedule.id, {
    recipients: schedule.recipients,
    status: 'failed',
    format: 'csv',
    deliveredAt: schedule.nextRunAt,
    error: 'current worker',
    scheduleClaimToken: currentClaim!.claimToken
  } as never);
  assert.equal(currentDeliveries.length, 1);
  assert.equal(currentDeliveries[0]?.error, 'current worker');
});

test('ReportsService fences scheduled export delivery by the active schedule claim', async () => {
  let providerCalls = 0;
  const service = new ReportsService({
    deliveryProvider: {
      deliver: async () => {
        providerCalls += 1;
      }
    }
  });
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo export delivery fenced',
    frequency: 'daily',
    format: 'csv',
    recipients: ['fenced-export@example.test']
  });
  const [firstClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-export-worker-a',
    1
  );
  assert.ok(firstClaim);
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    rows: [{ domain: 'reports', metric: 'fenced', value: 1, status: 'tracked' }]
  });
  const exported = await service.exportExecution(ACCOUNT, USER, execution.id, 'csv');

  await new Promise((resolve) => setTimeout(resolve, 5));
  const [currentClaim] = await service.claimDueSchedulesWithLease(
    ACCOUNT,
    schedule.nextRunAt,
    'reports-export-worker-b',
    60_000
  );
  assert.ok(currentClaim);

  const deliverWithScheduleClaim = service.deliverExport.bind(service) as unknown as (
    accountId: typeof ACCOUNT,
    scheduleId: string,
    executionId: string,
    exported: ReportExportSummary,
    recipients: readonly string[],
    deliveredAt: string | undefined,
    existingDeliveryId: string | undefined,
    claimToken: string | undefined,
    scheduleClaimToken: string
  ) => Promise<unknown>;

  await assert.rejects(
    () =>
      deliverWithScheduleClaim(
        ACCOUNT,
        schedule.id,
        execution.id,
        exported,
        schedule.recipients,
        undefined,
        undefined,
        undefined,
        firstClaim!.claimToken
      ),
    /Report schedule lease was lost/
  );
  assert.equal(providerCalls, 0);
  assert.equal(service.listScheduleDeliveries(ACCOUNT, schedule.id).length, 0);

  const currentDelivery = await deliverWithScheduleClaim(
    ACCOUNT,
    schedule.id,
    execution.id,
    exported,
    schedule.recipients,
    undefined,
    undefined,
    undefined,
    currentClaim!.claimToken
  );
  assert.equal(
    (currentDelivery as { deliveries: readonly { status: string }[] }).deliveries[0]?.status,
    'sent'
  );
  assert.equal(providerCalls, 1);
});

test('ReportsService records delivery history per schedule recipient', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo com entregas',
    frequency: 'daily',
    recipients: ['diretoria@cvg.local', 'financeiro@cvg.local']
  });
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });

  const deliveries = await service.recordScheduleDeliveries(ACCOUNT, schedule.id, {
    executionId: execution.id,
    format: 'csv',
    recipients: schedule.recipients,
    status: 'sent',
    deliveredAt: schedule.nextRunAt
  });

  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0]?.scheduleId, schedule.id);
  assert.equal(deliveries[0]?.executionId, execution.id);
  assert.equal(deliveries[0]?.status, 'sent');
  assert.equal(deliveries[0]?.recipient, 'diretoria@cvg.local');
  assert.equal(deliveries[0]?.deliveredAt, schedule.nextRunAt);
  assert.equal(service.listScheduleDeliveries(ACCOUNT, schedule.id).length, 2);
  assert.equal(service.listScheduleDeliveries(OTHER_ACCOUNT, schedule.id).length, 0);
});

test('ReportsService retries failed schedule deliveries with an existing execution', async () => {
  const service = new ReportsService({
    deliveryProvider: { deliver: async () => {} }
  });
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo com retry',
    frequency: 'daily',
    recipients: ['financeiro@cvg.local']
  });
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });
  const [failedDelivery] = await service.recordScheduleDeliveries(ACCOUNT, schedule.id, {
    executionId: execution.id,
    format: 'csv',
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    error: 'SMTP indisponivel'
  });

  assert.ok(failedDelivery);
  const retried = await service.retryScheduleDelivery(
    ACCOUNT,
    USER,
    schedule.id,
    failedDelivery.id
  );

  assert.equal(retried.scheduleId, schedule.id);
  assert.equal(retried.executionId, execution.id);
  assert.equal(retried.recipient, 'financeiro@cvg.local');
  assert.equal(retried.status, 'sent');
  assert.equal(retried.error, null);
  assert.ok(retried.exportId);
  assert.equal(service.listScheduleDeliveries(ACCOUNT, schedule.id).length, 1);
});

test('ReportsService retries the same failed delivery idempotently and reuses its artifact', async () => {
  let shouldFail = true;
  let providerCalls = 0;
  const savedExports: string[] = [];
  const service = new ReportsService({
    repository: {
      saveExecution: async () => {},
      saveExport: async (exported) => {
        savedExports.push(exported.id);
      },
      saveSchedule: async () => {},
      saveDelivery: async () => {},
      findExecutions: async () => [],
      findExports: async () => [],
      findSchedules: async () => [],
      findDeliveries: async () => []
    },
    deliveryProvider: {
      deliver: async () => {
        providerCalls += 1;
        if (shouldFail) throw new Error('transport unavailable');
      }
    }
  });
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo com retry idempotente',
    frequency: 'daily',
    format: 'csv',
    recipients: ['financeiro@cvg.local']
  });
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });
  const exported = await service.exportExecution(ACCOUNT, USER, execution.id, 'csv');
  const firstAttempt = await service.deliverExport(
    ACCOUNT,
    schedule.id,
    execution.id,
    exported,
    schedule.recipients
  );
  const failedDelivery = firstAttempt.deliveries[0];

  assert.ok(failedDelivery);
  assert.equal(failedDelivery.status, 'failed');
  assert.equal(savedExports.length, 1);
  assert.equal(providerCalls, 1);

  shouldFail = false;
  const [retried, duplicateRetry] = await Promise.all([
    service.retryScheduleDelivery(ACCOUNT, USER, schedule.id, failedDelivery.id),
    service.retryScheduleDelivery(ACCOUNT, USER, schedule.id, failedDelivery.id)
  ]);

  assert.equal(retried.id, failedDelivery.id);
  assert.equal(retried.status, 'sent');
  assert.equal(retried.exportId, exported.id);
  assert.equal(duplicateRetry.id, failedDelivery.id);
  assert.equal(providerCalls, 2);
  assert.equal(savedExports.length, 1);
  assert.equal(service.listScheduleDeliveries(ACCOUNT, schedule.id).length, 1);

  await assert.rejects(
    () => service.retryScheduleDelivery(ACCOUNT, USER, schedule.id, failedDelivery.id),
    /Only failed report deliveries can be retried/
  );
  assert.equal(providerCalls, 2);
});

test('ReportsService summarizes recurring delivery failure alerts per recipient', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo com alertas',
    frequency: 'daily',
    recipients: ['financeiro@cvg.local', 'operacoes@cvg.local']
  });
  const execution = await service.execute(ACCOUNT, USER, {
    reportId: schedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });

  await service.recordScheduleDeliveries(ACCOUNT, schedule.id, {
    executionId: execution.id,
    format: 'csv',
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    error: 'SMTP indisponivel',
    deliveredAt: '2026-05-27T10:00:00.000Z'
  });
  await service.recordScheduleDeliveries(ACCOUNT, schedule.id, {
    executionId: execution.id,
    format: 'csv',
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    error: 'SMTP indisponivel',
    deliveredAt: '2026-05-28T10:00:00.000Z'
  });
  await service.recordScheduleDeliveries(ACCOUNT, schedule.id, {
    executionId: execution.id,
    format: 'csv',
    recipients: ['operacoes@cvg.local'],
    status: 'failed',
    error: 'Caixa postal cheia',
    deliveredAt: '2026-05-28T11:00:00.000Z'
  });

  const alerts = service.listScheduleDeliveryAlerts(ACCOUNT, schedule.id);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.scheduleId, schedule.id);
  assert.equal(alerts[0]?.reportId, schedule.reportId);
  assert.equal(alerts[0]?.recipient, 'financeiro@cvg.local');
  assert.equal(alerts[0]?.failureCount, 2);
  assert.equal(alerts[0]?.lastFailureAt, '2026-05-28T10:00:00.000Z');
  assert.equal(alerts[0]?.lastError, 'SMTP indisponivel');
  assert.equal(alerts[0]?.severity, 'high');
  assert.equal(service.listScheduleDeliveryAlerts(OTHER_ACCOUNT, schedule.id).length, 0);
});

test('ReportsService pauses and reactivates schedules', async () => {
  const service = new ReportsService();
  const schedule = await service.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Executivo pausavel',
    frequency: 'daily'
  });

  const paused = await service.setScheduleActive(ACCOUNT, schedule.id, false);
  assert.equal(paused.isActive, false);
  assert.equal(service.listDueSchedules(ACCOUNT, paused.nextRunAt).length, 0);

  const active = await service.setScheduleActive(ACCOUNT, schedule.id, true);
  assert.equal(active.isActive, true);
  assert.equal(service.listDueSchedules(ACCOUNT, active.nextRunAt)[0]?.id, schedule.id);
});

function addUtcDays(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function addUtcMonths(value: string, months: number): string {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}
