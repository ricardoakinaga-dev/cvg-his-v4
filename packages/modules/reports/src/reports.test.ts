import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { ReportsService } from './index.js';

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
  assert.equal(xlsx.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(xlsx.contentEncoding, 'base64');
  assert.equal(Buffer.from(xlsx.content, 'base64').subarray(0, 2).toString('hex'), '504b');

  const pdf = await service.exportExecution(ACCOUNT, USER, execution.id, 'pdf');
  assert.equal(pdf.contentType, 'application/pdf');
  assert.equal(pdf.contentEncoding, 'base64');
  assert.match(Buffer.from(pdf.content, 'base64').toString('utf8', 0, 8), /%PDF-1\.4/);
  assert.equal(service.getExport(ACCOUNT, xlsx.id).content, xlsx.content);
  assert.throws(() => service.getExport(OTHER_ACCOUNT, xlsx.id), Error);
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
    deliveryProvider: { deliver: async () => { throw 'SMTP indisponivel'; } }
  });
  const rejectingSchedule = await rejectingProvider.createSchedule(ACCOUNT, USER, scheduleInput);
  const rejectingExecution = await rejectingProvider.execute(ACCOUNT, USER, {
    reportId: rejectingSchedule.reportId,
    rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
  });
  const rejectingExport = await rejectingProvider.exportExecution(ACCOUNT, USER, rejectingExecution.id, 'csv');
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
  assert.equal(service.listDueSchedules(ACCOUNT, addUtcDays(schedule.createdAt, 1))[0]?.id, schedule.id);
  assert.equal(service.listDueSchedules(ACCOUNT, addUtcDays(schedule.createdAt, 0)).length, 0);

  await assert.rejects(
    () => service.exportExecution(ACCOUNT, USER, 'missing', 'csv'),
    Error
  );
  await assert.rejects(
    () => service.createSchedule(ACCOUNT, USER, {
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

  const updated = await service.recordScheduleExecution(ACCOUNT, schedule.id, {
    executionId: execution.id,
    ranAt: schedule.nextRunAt
  });

  assert.equal(updated.lastExecutionId, execution.id);
  assert.equal(updated.lastRunAt, schedule.nextRunAt);
  assert.equal(updated.lastError, null);
  assert.equal(updated.nextRunAt, addUtcDays(schedule.nextRunAt, 1));
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
  const retried = await service.retryScheduleDelivery(ACCOUNT, USER, schedule.id, failedDelivery.id);

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
