import { randomUUID } from 'node:crypto';

import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '../fixtures/cvg-his.fixture';
import {
  DatabaseReportRepository,
  ReportsService
} from '../../apps/api/node_modules/@cvg-his-v2/module-reports/dist/index.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../apps/api/node_modules/@cvg-his-v2/shared-database/dist/index.js';
import type { AccountId, UserId } from '../../apps/api/node_modules/@cvg-his-v2/shared-types/dist/index.js';
import { runWithTenantContext } from '../../apps/api/node_modules/@cvg-his-v2/tenant-context/dist/index.js';

type JsonObject = Record<string, unknown>;

type MarketingAudienceMember = {
  ownerId: string;
  ownerName: string;
  consentPurposes: readonly ['marketing'];
  contacts: readonly [{ type: 'sms'; value: string }];
};

type MarketingDelivery = JsonObject & {
  id: string;
  deliveryKey: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  attemptCount: number;
  provider?: string;
  failureReason?: string;
  nextAttemptAt?: string;
};

type ReportExecution = JsonObject & {
  id: string;
  reportId: string;
  status: 'completed';
  rowCount: number;
  rows: readonly JsonObject[];
};

type ReportExport = JsonObject & {
  id: string;
  executionId: string;
  format: 'csv';
  content: string;
  filename: string;
};

type ReportSchedule = JsonObject & {
  id: string;
  reportId: string;
  format: 'csv';
  recipients: readonly string[];
};

async function expectJson<T extends JsonObject>(
  response: APIResponse,
  operation: string
): Promise<T> {
  const raw = await response.text();
  let payload: unknown = raw;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { raw };
  }

  expect(
    response.ok(),
    `${operation} failed with HTTP ${response.status()}: ${JSON.stringify(payload)}`
  ).toBeTruthy();

  return payload as T;
}

async function expectMarketingConsent(
  apiContext: APIRequestContext,
  ownerId: string,
  expectedStatus: 'granted' | 'revoked'
): Promise<void> {
  const response = await expectJson<{ consent: { ownerId: string; status: string } }>(
    await apiContext.get('/marketing/consent', { params: { ownerId } }),
    `Read marketing consent for owner ${ownerId}`
  );
  expect(response.consent).toMatchObject({ ownerId, status: expectedStatus });
}

async function waitForMarketingRetryWindow(nextAttemptAt: string): Promise<void> {
  const retryAt = Date.parse(nextAttemptAt);
  expect(Number.isFinite(retryAt), 'Marketing failure must expose a valid retry timestamp').toBeTruthy();

  if (retryAt <= Date.now()) return;

  await expect
    .poll(() => Date.now(), {
      timeout: Math.max(10_000, retryAt - Date.now() + 5_000),
      intervals: [25, 50, 100, 250, 500]
    })
    .toBeGreaterThanOrEqual(retryAt);
}

let reportDatabaseInitialized = false;

async function withReportRuntime<T>(
  accountId: string,
  userId: string,
  operation: () => Promise<T> | T
): Promise<T> {
  const databaseUrl =
    process.env.E2E_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test';
  if (!reportDatabaseInitialized) {
    createDatabaseClient(databaseUrl);
    reportDatabaseInitialized = true;
  }

  const typedAccountId = accountId as AccountId;
  const typedUserId = userId as UserId;
  const correlationId = `e2e-reports-${randomUUID()}`;
  return runWithTenantContext(
    {
      tenantId: typedAccountId,
      accountId: typedAccountId,
      correlationId
    },
    () =>
      runInTenantTransactionContext(
        getPool(),
        {
          accountId: typedAccountId,
          actorUserId: typedUserId,
          correlationId
        },
        async () => operation()
      )
  );
}

test.describe('Fluxo: marketing sandbox e relatórios persistentes', () => {
  test('marketing concede/revoga consentimento, entrega sandbox e repete a mesma entrega', async ({
    apiContext,
    createOwner
  }) => {
    test.setTimeout(120_000);
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const sentOwner = await createOwner(`Tutor Marketing Enviado ${suffix}`);
    const failedOwner = await createOwner(`Tutor Marketing Falho ${suffix}`);
    const revokedOwner = await createOwner(`Tutor Marketing Revogado ${suffix}`);

    const sentMember: MarketingAudienceMember = {
      ownerId: sentOwner.id,
      ownerName: sentOwner.name,
      consentPurposes: ['marketing'],
      contacts: [{ type: 'sms', value: `5511999${suffix.replace(/\D/g, '').slice(-6)}` }]
    };
    const failedMember: MarketingAudienceMember = {
      ownerId: failedOwner.id,
      ownerName: failedOwner.name,
      consentPurposes: ['marketing'],
      contacts: [{ type: 'sms', value: '5511000000000' }]
    };
    const revokedMember: MarketingAudienceMember = {
      ownerId: revokedOwner.id,
      ownerName: revokedOwner.name,
      consentPurposes: ['marketing'],
      contacts: [{ type: 'sms', value: `5511888${suffix.replace(/\D/g, '').slice(-6)}` }]
    };

    for (const ownerId of [sentOwner.id, failedOwner.id, revokedOwner.id]) {
      await expectJson<JsonObject>(
        await apiContext.post('/marketing/consent/opt-in', { data: { ownerId } }),
        `Grant marketing consent for owner ${ownerId}`
      );
    }
    await expectMarketingConsent(apiContext, sentOwner.id, 'granted');
    await expectMarketingConsent(apiContext, failedOwner.id, 'granted');

    await expectJson<JsonObject>(
      await apiContext.post('/marketing/consent/opt-out', { data: { ownerId: revokedOwner.id } }),
      'Revoke marketing consent for the excluded owner'
    );
    await expectMarketingConsent(apiContext, revokedOwner.id, 'revoked');

    const segment = await expectJson<{ id: string }>(
      await apiContext.post('/marketing/segments', {
        data: {
          name: `Segmento E2E ${suffix}`,
          description: 'Segmento persistente para o fluxo de sandbox',
          criteria: { consentPurpose: 'marketing' }
        }
      }),
      'Create marketing segment'
    );
    const template = await expectJson<{ id: string }>(
      await apiContext.post('/marketing/templates', {
        data: {
          name: `Template SMS E2E ${suffix}`,
          channel: 'sms',
          body: 'Olá {{ownerName}}, esta é uma comunicação E2E da CVG-HIS.'
        }
      }),
      'Create marketing SMS template'
    );
    const campaign = await expectJson<{ id: string; status: string }>(
      await apiContext.post('/marketing/campaigns', {
        data: {
          name: `Campanha Sandbox E2E ${suffix}`,
          channel: 'sms',
          segmentId: segment.id,
          templateId: template.id,
          scheduledAt: new Date(Date.now() + 60_000).toISOString(),
          audience: [sentMember, failedMember, revokedMember]
        }
      }),
      'Create marketing campaign'
    );
    expect(campaign.status).toBe('draft');

    const scheduled = await expectJson<{ id: string; status: string; scheduledAt: string }>(
      await apiContext.post(`/marketing/campaigns/${campaign.id}/schedule`),
      'Schedule marketing campaign'
    );
    expect(scheduled).toMatchObject({ id: campaign.id, status: 'scheduled' });

    const scheduledCampaigns = await expectJson<{
      items: Array<{ id: string; status: string; scheduledAt: string }>;
    }>(
      await apiContext.get('/marketing/campaigns', { params: { status: 'scheduled' } }),
      'List scheduled marketing campaigns'
    );
    expect(scheduledCampaigns.items).toContainEqual(expect.objectContaining({
      id: campaign.id,
      status: 'scheduled',
      scheduledAt: scheduled.scheduledAt
    }));

    const dispatched = await expectJson<{
      campaign: { id: string; status: string };
      deliveries: MarketingDelivery[];
      summary: { total: number; sent: number; failed: number; skipped: number };
    }>(
      await apiContext.post(`/marketing/campaigns/${campaign.id}/dispatch`, {
        data: {
          // The duplicate member is intentional: the delivery key must collapse it.
          audience: [sentMember, sentMember, failedMember, revokedMember]
        }
      }),
      'Dispatch scheduled marketing campaign in sandbox mode'
    );
    expect(dispatched.campaign).toMatchObject({ id: campaign.id, status: 'sent' });
    expect(dispatched.summary).toEqual({ total: 2, sent: 1, failed: 1, skipped: 2 });
    expect(dispatched.deliveries).toHaveLength(2);
    expect(new Set(dispatched.deliveries.map((delivery) => delivery.id)).size).toBe(2);
    expect(new Set(dispatched.deliveries.map((delivery) => delivery.deliveryKey)).size).toBe(2);

    const sentDelivery = dispatched.deliveries.find((delivery) => delivery.status === 'sent');
    const failedDelivery = dispatched.deliveries.find((delivery) => delivery.status === 'failed');
    expect(sentDelivery).toMatchObject({ status: 'sent', provider: 'marketing-sandbox', attemptCount: 1 });
    expect(failedDelivery).toMatchObject({
      status: 'failed',
      provider: 'marketing-sandbox',
      attemptCount: 1,
      failureReason: 'Deterministic sandbox failure'
    });
    expect(failedDelivery?.nextAttemptAt).toEqual(expect.any(String));

    const listedAfterDispatch = await expectJson<{ items: MarketingDelivery[] }>(
      await apiContext.get(`/marketing/campaigns/${campaign.id}/deliveries`),
      'Reload marketing campaign deliveries after dispatch'
    );
    const listedFailed = listedAfterDispatch.items.find((delivery) => delivery.id === failedDelivery?.id);
    expect(listedFailed).toMatchObject({
      id: failedDelivery?.id,
      deliveryKey: failedDelivery?.deliveryKey,
      status: 'failed',
      attemptCount: 1
    });

    await waitForMarketingRetryWindow(failedDelivery!.nextAttemptAt!);
    const retried = await expectJson<MarketingDelivery>(
      await apiContext.post(`/marketing/deliveries/${failedDelivery!.id}/retry`),
      'Retry failed marketing delivery in sandbox mode'
    );
    expect(retried).toMatchObject({
      id: failedDelivery!.id,
      deliveryKey: failedDelivery!.deliveryKey,
      status: 'failed',
      provider: 'marketing-sandbox',
      attemptCount: 2,
      failureReason: 'Deterministic sandbox failure'
    });

    const listedAfterRetry = await expectJson<{ items: MarketingDelivery[] }>(
      await apiContext.get(`/marketing/campaigns/${campaign.id}/deliveries`),
      'Reload marketing deliveries after retry'
    );
    const persistedRetry = listedAfterRetry.items.find((delivery) => delivery.id === failedDelivery!.id);
    expect(persistedRetry).toMatchObject({
      id: failedDelivery!.id,
      deliveryKey: failedDelivery!.deliveryKey,
      status: 'failed',
      attemptCount: 2
    });
    expect(listedAfterRetry.items).toHaveLength(2);
    expect(new Set(listedAfterRetry.items.map((delivery) => delivery.id)).size).toBe(2);
  });

  test('relatórios executam/exportam e reprocessam a mesma entrega com o mesmo artefato', async ({
    apiContext
  }) => {
    test.setTimeout(120_000);
    const session = await expectJson<{
      principal: { user: { id: string; accountId: string } };
    }>(await apiContext.get('/auth/session'), 'Read the authenticated report principal');
    const accountId = session.principal.user.accountId;
    const userId = session.principal.user.id;
    expect(accountId).toBeTruthy();
    expect(userId).toBeTruthy();
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

    const catalog = await expectJson<{ items: Array<{ id: string; supportedFormats: string[] }> }>(
      await apiContext.get('/reports/catalog'),
      'List report catalog'
    );
    const administrativeReport = catalog.items.find((item) => item.id === 'administrative-executive');
    expect(administrativeReport?.supportedFormats).toContain('csv');

    const execution = await expectJson<ReportExecution>(
      await apiContext.post('/reports/executions', {
        data: {
          reportId: 'administrative-executive',
          filters: { dateFrom: '2026-08-01', dateTo: '2026-08-31' }
        }
      }),
      'Execute administrative report'
    );
    expect(execution).toMatchObject({
      reportId: 'administrative-executive',
      status: 'completed'
    });
    expect(execution.rowCount).toBe(execution.rows.length);

    const exported = await expectJson<ReportExport>(
      await apiContext.post(`/reports/executions/${execution.id}/export`, {
        data: { format: 'csv' }
      }),
      'Export administrative report as CSV'
    );
    expect(exported).toMatchObject({
      executionId: execution.id,
      format: 'csv'
    });
    expect(exported.content).toContain('Domínio,Indicador,Valor,Status');

    const reloadedExecution = await expectJson<ReportExecution>(
      await apiContext.get(`/reports/executions/${execution.id}`),
      'Reload report execution'
    );
    expect(reloadedExecution).toMatchObject({
      id: execution.id,
      reportId: execution.reportId,
      status: execution.status,
      rowCount: execution.rowCount,
      rows: execution.rows
    });

    const listedExecutions = await expectJson<{ items: Array<JsonObject & { id: string; rowCount: number }> }>(
      await apiContext.get('/reports/executions'),
      'List report executions after reload'
    );
    expect(listedExecutions.items).toContainEqual(expect.objectContaining({
      id: execution.id,
      reportId: execution.reportId,
      rowCount: execution.rowCount,
      status: 'completed'
    }));

    const reloadedExport = await expectJson<ReportExport>(
      await apiContext.get(`/reports/exports/${exported.id}`),
      'Reload exported report artifact'
    );
    expect(reloadedExport).toMatchObject({
      id: exported.id,
      executionId: execution.id,
      format: 'csv',
      filename: exported.filename,
      content: exported.content
    });

    const schedule = await expectJson<ReportSchedule>(
      await apiContext.post('/reports/schedules', {
        data: {
          reportId: 'administrative-executive',
          name: `Agendamento de relatório E2E ${suffix}`,
          frequency: 'daily',
          format: 'csv',
          recipients: [`reports-${suffix}@example.test`]
        }
      }),
      'Create scheduled report with a delivery recipient'
    );
    expect(schedule).toMatchObject({
      reportId: 'administrative-executive',
      format: 'csv',
      recipients: [`reports-${suffix}@example.test`]
    });

    const persistedSchedule = await expectJson<{ items: ReportSchedule[] }>(
      await apiContext.get('/reports/schedules'),
      'List scheduled reports after creation'
    );
    expect(persistedSchedule.items).toContainEqual(expect.objectContaining({
      id: schedule.id,
      reportId: schedule.reportId,
      recipients: schedule.recipients
    }));

    // The HTTP API creates and reads report state; the existing report runtime
    // is used here with a deterministic provider so the E2E can prove both
    // failure and reprocessing without changing the production API wiring.
    let providerShouldFail = true;
    const providerCalls: Array<{ deliveryId: string; idempotencyKey: string; exportId: string }> = [];
    const deliveryProvider = {
      async deliver(input: {
        readonly deliveryId: string;
        readonly idempotencyKey: string;
        readonly exported: { readonly id: string };
      }) {
        providerCalls.push({
          deliveryId: input.deliveryId,
          idempotencyKey: input.idempotencyKey,
          exportId: input.exported.id
        });
        if (providerShouldFail) throw new Error('E2E deterministic report transport failure');
      }
    };
    const repository = new DatabaseReportRepository();
    const reportRuntime = new ReportsService({
      repository,
      deliveryProvider
    });

    await withReportRuntime(accountId, userId, () => reportRuntime.hydrateFromDatabase(accountId as AccountId));
    const hydratedSchedule = reportRuntime.listSchedules(accountId as AccountId)
      .find((item) => item.id === schedule.id);
    const hydratedExport = reportRuntime.getExport(accountId as AccountId, exported.id);
    expect(hydratedSchedule).toMatchObject({ id: schedule.id, recipients: schedule.recipients });
    expect(hydratedExport).toMatchObject({ id: exported.id, executionId: execution.id, content: exported.content });

    const firstAttempt = await withReportRuntime(accountId, userId, () =>
      reportRuntime.deliverExport(
        accountId as AccountId,
        schedule.id,
        execution.id,
        hydratedExport,
        schedule.recipients
      )
    );
    const failedDelivery = firstAttempt.deliveries[0];
    expect(failedDelivery).toMatchObject({
      status: 'failed',
      scheduleId: schedule.id,
      executionId: execution.id,
      exportId: exported.id,
      error: 'E2E deterministic report transport failure'
    });
    expect(providerCalls).toHaveLength(1);

    const reloadedAfterFailure = new ReportsService({
      repository,
      deliveryProvider
    });
    await withReportRuntime(accountId, userId, () =>
      reloadedAfterFailure.hydrateFromDatabase(accountId as AccountId)
    );
    const listedFailedDeliveries = reloadedAfterFailure.listScheduleDeliveries(
      accountId as AccountId,
      schedule.id
    );
    expect(listedFailedDeliveries).toContainEqual(expect.objectContaining({
      id: failedDelivery?.id,
      status: 'failed',
      executionId: execution.id,
      exportId: exported.id,
      error: 'E2E deterministic report transport failure'
    }));

    providerShouldFail = false;
    const retriedDelivery = await withReportRuntime(accountId, userId, () =>
      reloadedAfterFailure.retryScheduleDelivery(
        accountId as AccountId,
        userId as UserId,
        schedule.id,
        failedDelivery!.id
      )
    );
    expect(retriedDelivery).toMatchObject({
      id: failedDelivery!.id,
      status: 'sent',
      scheduleId: schedule.id,
      executionId: execution.id,
      exportId: exported.id
    });
    expect(providerCalls).toHaveLength(2);
    expect(providerCalls[1]).toEqual(providerCalls[0]);

    const reloadedAfterRetry = new ReportsService({
      repository,
      deliveryProvider
    });
    await withReportRuntime(accountId, userId, () =>
      reloadedAfterRetry.hydrateFromDatabase(accountId as AccountId)
    );
    const listedAfterRetry = reloadedAfterRetry.listScheduleDeliveries(
      accountId as AccountId,
      schedule.id
    );
    expect(listedAfterRetry).toHaveLength(1);
    expect(listedAfterRetry[0]).toMatchObject({
      id: failedDelivery!.id,
      status: 'sent',
      executionId: execution.id,
      exportId: exported.id,
      recipient: schedule.recipients[0]
    });

    const exportAfterRetry = await expectJson<ReportExport>(
      await apiContext.get(`/reports/exports/${exported.id}`),
      'Reload report artifact after delivery reprocessing'
    );
    expect(exportAfterRetry).toMatchObject({
      id: exported.id,
      executionId: execution.id,
      content: exported.content,
      filename: exported.filename
    });
  });
});
