import { describe, expect, it } from 'vitest';

import {
  createReplayGuard,
  extractReportCommandReference,
  idempotencyAuthorizationPermissions,
  isMedicalRecordsMutationPath,
  isReplayGuardExempt,
  REPLAY_AUTHORIZATION_UNMAPPED,
  resolveReportCommandReportId
} from '../../../apps/api/src/helpers/idempotency-authorization.js';

describe('idempotency authorization contract', () => {
  it('requires current clinical permissions before replaying critical commands', () => {
    expect(idempotencyAuthorizationPermissions('/medical-records/entries', 'POST')).toEqual([
      'medical-records.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/triage/triage-1', 'PATCH')).toEqual([
      'triage.manage'
    ]);
    expect(
      idempotencyAuthorizationPermissions('/encounters/encounter-1/exam-orders', 'POST')
    ).toEqual(['diagnostics.manage']);
    expect(idempotencyAuthorizationPermissions('/encounters/encounter-1/payments', 'POST')).toEqual(
      ['billing.manage']
    );
    expect(idempotencyAuthorizationPermissions('/payments/pix/intents', 'POST')).toEqual([
      'payments.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/sectors', 'POST')).toEqual(['inpatient.manage']);
    expect(idempotencyAuthorizationPermissions('/beds/bed-1', 'PATCH')).toEqual([
      'inpatient.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/access-control/teams', 'POST')).toEqual([
      'users.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/workflow-tasks', 'POST')).toEqual([
      'workflow-tasks.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/workflow-tasks/task-1/replay', 'POST')).toEqual([
      'workflow-tasks.replay'
    ]);
    expect(idempotencyAuthorizationPermissions('/workflow-tasks/task-1/complete', 'POST')).toEqual([
      'workflow-tasks.manage'
    ]);
  });

  it('does not add replay authorization to read-only routes and preserves existing mutation scope', () => {
    expect(idempotencyAuthorizationPermissions('/encounters/encounter-1', 'GET')).toBeUndefined();
    expect(idempotencyAuthorizationPermissions('/unmapped-command', 'POST')).toBeUndefined();
    expect(isMedicalRecordsMutationPath('/exam-results/result-1', 'PATCH')).toBe(true);
  });

  it('PROD-005/A02: binds every inventoried mutation family before replay', () => {
    expect(idempotencyAuthorizationPermissions('/inventory/purchases', 'POST')).toEqual([
      'inventory.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/inventory/transfers', 'POST')).toEqual([
      'inventory.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/inventory-manufacturers', 'POST')).toEqual([
      'inventory.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/setores-da-empresa/1', 'PATCH')).toEqual([
      'inventory.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/fiscal/nfse/documents', 'POST')).toEqual([
      'fiscal.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/fiscal/icms/1', 'PATCH')).toEqual([
      'fiscal.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/counter-sales', 'POST')).toEqual([
      'counter_sale.write'
    ]);
    expect(idempotencyAuthorizationPermissions('/packages/p1/activate', 'POST')).toEqual([
      'counter_sale.write'
    ]);
    expect(idempotencyAuthorizationPermissions('/price-tables', 'POST')).toEqual([
      'inventory.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/staff/time-off', 'POST')).toEqual([
      'staff.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/quotes', 'POST')).toEqual(['quote.write']);
    expect(idempotencyAuthorizationPermissions('/users', 'POST')).toEqual(['users.manage']);
    expect(idempotencyAuthorizationPermissions('/marketing/campaigns', 'POST')).toEqual([
      'marketing.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/integrations/email/messages', 'POST')).toEqual([
      'notifications.manage'
    ]);
    expect(
      idempotencyAuthorizationPermissions('/integrations/sms/messages/m1/retry', 'POST')
    ).toEqual(['notifications.manage']);
    expect(idempotencyAuthorizationPermissions('/flags', 'POST')).toEqual(['flags.admin']);
    expect(idempotencyAuthorizationPermissions('/internal/events/e1/reprocess', 'POST')).toEqual([
      'audit.write'
    ]);
    expect(idempotencyAuthorizationPermissions('/lgpd/requests', 'POST')).toEqual([
      'lgpd.requests.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/api-keys', 'POST')).toEqual(['api_keys.manage']);
    expect(idempotencyAuthorizationPermissions('/webhooks/wh-1', 'PATCH')).toEqual([
      'webhooks.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/surgeries', 'POST')).toEqual(['surgery.manage']);
    expect(idempotencyAuthorizationPermissions('/surgeries/s1/status', 'POST')).toEqual([
      'surgery.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/pos-sync/jobs', 'POST')).toEqual([
      'inventory.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/cash-register/open', 'POST')).toEqual([
      'billing.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/finance/advance-payments', 'POST')).toEqual([
      'billing.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/services', 'POST')).toEqual(['service.write']);
    expect(idempotencyAuthorizationPermissions('/breeds/b1', 'DELETE')).toEqual(['service.write']);
    expect(idempotencyAuthorizationPermissions('/products', 'POST')).toEqual(['product.write']);
    expect(idempotencyAuthorizationPermissions('/ml/anomalies/reviews', 'POST')).toEqual([
      'diagnostics.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/availability', 'POST')).toEqual([
      'scheduling.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/owner-patient-links', 'POST')).toEqual([
      'patients.manage'
    ]);
  });

  it('PROD-005/A02: read-like POST endpoints keep read permission on replay', () => {
    expect(idempotencyAuthorizationPermissions('/prescriptions/p1/document', 'POST')).toEqual([
      'prescriptions.read'
    ]);
    expect(idempotencyAuthorizationPermissions('/ml/ocr/fiscal-preview', 'POST')).toEqual([
      'fiscal.read'
    ]);
    expect(
      idempotencyAuthorizationPermissions('/scheduling/recommendations/duration', 'POST')
    ).toEqual(['scheduling.read']);
    expect(idempotencyAuthorizationPermissions('/reports/executions', 'POST')).toEqual([
      'billing.read'
    ]);
  });

  it('extracts report identity from the real tenant-command envelope', () => {
    expect(
      extractReportCommandReference({
        path: '/reports/executions',
        query: {},
        body: { reportId: 'inventory-stock' }
      })
    ).toEqual({ reportId: 'inventory-stock' });

    expect(
      extractReportCommandReference(
        {
          path: '/reports/executions/execution-1/export',
          query: {},
          body: { format: 'csv' }
        },
        '/reports/executions/execution-1/export'
      )
    ).toEqual({ executionId: 'execution-1' });

    expect(extractReportCommandReference({ body: { executionId: 'execution-2' } })).toEqual({
      executionId: 'execution-2'
    });

    expect(
      extractReportCommandReference(
        { path: '/reports/schedules/schedule-1', query: {}, body: { isActive: false } },
        '/reports/schedules/schedule-1'
      )
    ).toEqual({ scheduleId: 'schedule-1' });

    expect(
      extractReportCommandReference(
        {
          path: '/reports/schedules/schedule-1/deliveries/delivery-1/retry',
          query: {},
          body: {}
        },
        '/reports/schedules/schedule-1/deliveries/delivery-1/retry'
      )
    ).toEqual({ scheduleId: 'schedule-1', deliveryId: 'delivery-1' });

    expect(
      resolveReportCommandReportId(
        { scheduleId: 'schedule-1' },
        {
          getExecution: () => ({ reportId: 'execution-report' }),
          listSchedules: () => [{ id: 'schedule-1', reportId: 'scheduled-report' }]
        },
        'account-1' as never
      )
    ).toBe('scheduled-report');
  });

  it('PROD-005/A02: provider-secret webhook stays out of session-permission mapping', () => {
    expect(
      idempotencyAuthorizationPermissions('/webhooks/pix/synthetic/v1', 'POST')
    ).toBeUndefined();
    expect(isReplayGuardExempt('/webhooks/pix/synthetic/v1')).toBe(true);
    expect(isReplayGuardExempt('/inventory/purchases')).toBe(false);
    expect(idempotencyAuthorizationPermissions('/cost-centers-catalog', 'POST')).toEqual([
      'billing.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/finance/catalogs/x', 'PATCH')).toEqual([
      'billing.manage'
    ]);
  });

  it('PROD-005/A02: replay guard re-checks mapped permissions and denies unmapped replays', async () => {
    const checked: string[] = [];
    const keyed: string[] = [];
    const base = {
      operation: 'POST /inventory/purchases',
      pathname: '/inventory/purchases',
      requestPayload: {},
      requirePrincipal: async (permission: string) => {
        checked.push(permission);
      },
      requireApiKey: async (permission: string) => {
        keyed.push(permission);
      }
    };
    await createReplayGuard({ ...base, replayPermissions: ['inventory.manage'] })();
    expect(checked).toEqual(['inventory.manage']);
    expect(keyed).toEqual([]);
    await expect(
      createReplayGuard({ ...base, replayPermissions: undefined })()
    ).rejects.toMatchObject({ code: REPLAY_AUTHORIZATION_UNMAPPED, statusCode: 403 });
    await createReplayGuard({
      ...base,
      pathname: '/integrations/email/messages',
      replayPermissions: ['notifications.manage']
    })();
    expect(keyed).toEqual(['notifications.manage']);
  });

  it('PROD-005/A02: replay guard propagates revocation and resolves report definitions', async () => {
    const revoked = createReplayGuard({
      operation: 'POST /inventory/purchases',
      pathname: '/inventory/purchases',
      replayPermissions: ['inventory.manage'],
      requestPayload: {},
      requirePrincipal: async () => {
        throw new Error('Missing required permission');
      },
      requireApiKey: async () => undefined
    });
    await expect(revoked()).rejects.toThrow('Missing required permission');
    const reportOk = createReplayGuard({
      operation: 'POST /reports/executions',
      pathname: '/reports/executions',
      replayPermissions: ['billing.read'],
      requestPayload: { reportId: 'r1' },
      requirePrincipal: async () => undefined,
      requireApiKey: async () => undefined,
      resolveReportPermission: async () => 'reports.inventory'
    });
    await expect(reportOk()).resolves.toBeUndefined();
    const reportMissing = createReplayGuard({
      operation: 'POST /reports/executions',
      pathname: '/reports/executions',
      replayPermissions: ['billing.read'],
      requestPayload: {},
      requirePrincipal: async () => undefined,
      requireApiKey: async () => undefined,
      resolveReportPermission: async () => undefined
    });
    await expect(reportMissing()).rejects.toMatchObject({
      code: REPLAY_AUTHORIZATION_UNMAPPED,
      statusCode: 403
    });
  });
});
