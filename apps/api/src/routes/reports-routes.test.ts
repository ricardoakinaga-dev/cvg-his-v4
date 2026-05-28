import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { CommissionsService } from '@cvg-his-v2/module-commissions';
import { ReportsService } from '@cvg-his-v2/module-reports';

import { handleReportsRoutes } from './reports-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(): this {
    return this;
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback = typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(method: string, body?: unknown, url?: string): never {
  return {
    method,
    url: url ?? '/reports/catalog',
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-reports-1' as never,
      accountId: 'acc-reports-1' as never,
      username: 'reports',
      email: 'reports@example.com',
      displayName: 'Reports',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-reports-1' as never,
      userId: 'user-reports-1' as never,
      accountId: 'acc-reports-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['billing.read', 'staff.read'],
      capabilities: []
    }
  };
}

function handlers(reports = new ReportsService(), commissions = new CommissionsService(), audit: { write: (event: unknown) => unknown } = { write() {} }) {
  return {
    reports,
    billing: {
      list: () => [
        {
          accountId: 'acc-reports-1',
          subtotalAmount: 300
        }
      ]
    } as never,
    cash: {
      async findOpenRegister() {
        return { id: 'cash-1' };
      },
      async getCurrentBalance() {
        return 150;
      }
    } as never,
    commissions,
    counterSales: {
      async getCommercialDashboard() {
        return {
          netRevenueToday: 450,
          closedToday: 2
        };
      }
    } as never,
    quotes: {
      list: () => [
        { status: 'approved', total: 120 },
        { status: 'draft', total: 80 }
      ]
    } as never,
    audit: audit as never,
    requirePrincipal: () => principal()
  };
}

test('handleReportsRoutes ignores unrelated and legacy administrative hub routes', async () => {
  const response = new MockResponse();
  assert.equal(
    await handleReportsRoutes('/owners', request('GET'), response as never, 'corr', handlers()),
    false
  );
  assert.equal(
    await handleReportsRoutes('/reports/administrative-hubs', request('GET'), response as never, 'corr', handlers()),
    false
  );
});

test('handleReportsRoutes exposes catalog, execution, export and schedules', async () => {
  const auditWrites: Array<{ action: string; entityType: string; entityId: string; riskLevel: string }> = [];
  const routeHandlers = handlers(undefined, undefined, {
    write: (event) => {
      auditWrites.push(event as never);
      return event;
    }
  });

  const catalogResponse = new MockResponse();
  await handleReportsRoutes('/reports/catalog', request('GET'), catalogResponse as never, 'corr-1', routeHandlers);
  assert.ok(catalogResponse.bodyJson<{ items: unknown[] }>().items.length >= 2);

  const executeResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', { reportId: 'administrative-executive', filters: { dateFrom: '2026-05-01' } }),
    executeResponse as never,
    'corr-2',
    routeHandlers
  );
  assert.equal(executeResponse.statusCode, 201);
  const execution = executeResponse.bodyJson<{ id: string; rowCount: number }>();
  assert.equal(execution.rowCount, 4);

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-3',
    routeHandlers
  );
  assert.equal(exportResponse.bodyJson<{ format: string; content: string }>().format, 'csv');
  assert.match(exportResponse.bodyJson<{ content: string }>().content, /Domínio,Indicador,Valor,Status/);

  const scheduleResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/schedules',
    request('POST', {
      reportId: 'administrative-executive',
      name: 'Diretoria diaria',
      frequency: 'daily',
      format: 'csv'
    }, '/reports/schedules'),
    scheduleResponse as never,
    'corr-4',
    routeHandlers
  );
  assert.equal(scheduleResponse.statusCode, 201);
  const schedule = scheduleResponse.bodyJson<{ id: string; createdAt: string; nextRunAt: string }>();
  assert.equal(schedule.nextRunAt, addUtcDays(schedule.createdAt, 1));
  await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    recipients: ['diretoria@cvg.local'],
    status: 'sent',
    format: 'csv',
    deliveredAt: schedule.nextRunAt
  });
  const [failedDelivery] = await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    executionId: execution.id,
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    format: 'csv',
    error: 'SMTP indisponivel',
    deliveredAt: schedule.nextRunAt
  });
  await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    executionId: execution.id,
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    format: 'csv',
    error: 'SMTP indisponivel',
    deliveredAt: addUtcDays(schedule.nextRunAt, 1)
  });

  const schedulesResponse = new MockResponse();
  await handleReportsRoutes('/reports/schedules', request('GET'), schedulesResponse as never, 'corr-5', routeHandlers);
  assert.equal(schedulesResponse.bodyJson<{ items: unknown[] }>().items.length, 1);

  const deliveriesResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/deliveries`,
    request('GET', undefined, `/reports/schedules/${schedule.id}/deliveries`),
    deliveriesResponse as never,
    'corr-5a',
    routeHandlers
  );
  const deliveries = deliveriesResponse.bodyJson<{ items: Array<{ recipient: string; status: string }> }>().items;
  assert.ok(deliveries.some((item) => item.recipient === 'diretoria@cvg.local' && item.status === 'sent'));

  const alertsResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/delivery-alerts`,
    request('GET', undefined, `/reports/schedules/${schedule.id}/delivery-alerts`),
    alertsResponse as never,
    'corr-5ab',
    routeHandlers
  );
  const alerts = alertsResponse.bodyJson<{ items: Array<{ recipient: string; failureCount: number; severity: string }> }>().items;
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.recipient, 'financeiro@cvg.local');
  assert.equal(alerts[0]?.failureCount, 2);
  assert.equal(alerts[0]?.severity, 'high');
  assert.ok(auditWrites.some((event) =>
    event.action === 'report_schedule_delivery_alerts_read' &&
    event.entityType === 'report-schedule-delivery-alert' &&
    event.entityId === schedule.id &&
    event.riskLevel === 'high'
  ));

  const retryResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/deliveries/${failedDelivery?.id}/retry`,
    request('POST', undefined, `/reports/schedules/${schedule.id}/deliveries/${failedDelivery?.id}/retry`),
    retryResponse as never,
    'corr-5aa',
    routeHandlers
  );
  const retriedDelivery = retryResponse.bodyJson<{ recipient: string; status: string; executionId: string }>();
  assert.equal(retryResponse.statusCode, 201);
  assert.equal(retriedDelivery.recipient, 'financeiro@cvg.local');
  assert.equal(retriedDelivery.status, 'sent');
  assert.equal(retriedDelivery.executionId, execution.id);

  const pauseResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}`,
    request('PATCH', { isActive: false }, `/reports/schedules/${schedule.id}`),
    pauseResponse as never,
    'corr-5b',
    routeHandlers
  );
  assert.equal(pauseResponse.bodyJson<{ isActive: boolean }>().isActive, false);

  const reactivateResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}`,
    request('PATCH', { isActive: true }, `/reports/schedules/${schedule.id}`),
    reactivateResponse as never,
    'corr-5c',
    routeHandlers
  );
  assert.equal(reactivateResponse.bodyJson<{ isActive: boolean }>().isActive, true);

  const dueResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/schedules/due',
    request('GET', undefined, `/reports/schedules/due?asOf=${encodeURIComponent(addUtcDays(schedule.createdAt, 1))}`),
    dueResponse as never,
    'corr-6',
    routeHandlers
  );
  assert.equal(dueResponse.bodyJson<{ items: unknown[] }>().items.length, 1);
});

test('handleReportsRoutes executes commission calculation report', async () => {
  const reports = new ReportsService();
  const commissions = new CommissionsService();
  await commissions.createRule('acc-reports-1' as never, 'user-reports-1' as never, {
    description: 'Global',
    percentage: 10
  });
  await commissions.calculate('acc-reports-1' as never, 'user-reports-1' as never, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [
      {
        staffId: 'staff-1',
        staffName: 'Dra. Ana',
        itemKind: 'service',
        sourceType: 'manual',
        sourceId: 'line-1',
        sourceDescription: 'Consulta',
        baseAmount: 200,
        occurredAt: '2026-05-10'
      }
    ]
  });

  const response = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', { reportId: 'commission-calculations' }),
    response as never,
    'corr-6',
    handlers(reports, commissions)
  );

  const execution = response.bodyJson<{ rowCount: number; rows: Array<{ totalCommissionAmount: number }> }>();
  assert.equal(execution.rowCount, 1);
  assert.equal(execution.rows[0]?.totalCommissionAmount, 20);
});

function addUtcDays(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
