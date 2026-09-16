import { describe, expect, it, vi } from 'vitest';

import { createClinicalOperationalMetricsProvider } from '../../../apps/api/src/clinical-operational-metrics.js';
import {
  InstallationAlreadyProvisionedError,
  isSetupRequired,
  provisionInitialInstallation,
  toAccountSlug
} from '../../../apps/api/src/setup-provisioning.js';
import { LocalSmsGateway, TwilioSmsGatewayAdapter } from '../../../apps/api/src/sms-gateway.js';

describe('clinical operational metrics provider', () => {
  it('aggregates tenant-safe operational states and excludes terminal/future work', async () => {
    const nowMs = Date.parse('2026-09-16T12:00:00.000Z');
    const account = 'account-metrics';
    const sources = {
      users: {
        list: () => [
          { accountId: account },
          { accountId: account },
          { accountId: '  ' },
          { accountId: 'account-other' }
        ]
      },
      inpatient: {
        list: (accountId: string) => accountId === account ? [{ status: 'active' }, { status: 'discharged' }] : []
      },
      encounters: {
        listActive: (accountId: string) => accountId === account ? [{}] : []
      },
      workflowTasks: {
        list: async (accountId: string) => accountId === account
          ? [
              { status: 'pending', dueAt: '2026-09-16T11:00:00.000Z' },
              { status: 'pending', dueAt: '2026-09-16T13:00:00.000Z' },
              { status: 'completed', dueAt: '2026-09-16T10:00:00.000Z' },
              { status: 'cancelled', dueAt: 'invalid' },
              { status: 'dlq', dueAt: 'invalid' }
            ]
          : []
      },
      prescriptionExecutions: {
        list: (accountId: string) => accountId === account
          ? [
              { status: 'pending', scheduledAt: '2026-09-16T11:00:00.000Z' },
              { status: 'pending', scheduledAt: '2026-09-16T13:00:00.000Z' },
              { status: 'pending' },
              { status: 'completed', scheduledAt: '2026-09-16T10:00:00.000Z' },
              { status: 'pending', scheduledAt: 'invalid' }
            ]
          : []
      },
      diagnostics: {
        list: (accountId: string) => accountId === account
          ? [{ status: undefined }, { status: 'delivered' }, { status: 'cancelled' }, { status: 'pending' }]
          : []
      },
      clinicalHandoffs: {
        list: (accountId: string) => accountId === account
          ? [{ handoffStatus: undefined }, { handoffStatus: 'acknowledged_by_reception' }, { handoffStatus: 'sent_to_finance' }, { handoffStatus: 'sent_to_reception' }]
          : []
      }
    };

    const provider = createClinicalOperationalMetricsProvider(sources, () => nowMs);
    await expect(provider()).resolves.toEqual({
      activeInpatients: 2,
      openEncounters: 1,
      pendingWorkflowTasks: 2,
      overdueWorkflowTasks: 1,
      medicationOverdue: 1,
      pendingDiagnostics: 2,
      handoverPending: 2
    });

    const defaultClockProvider = createClinicalOperationalMetricsProvider(sources);
    await expect(defaultClockProvider()).resolves.toMatchObject({
      activeInpatients: 2,
      openEncounters: 1
    });
  });
});

describe('SMS gateways', () => {
  it('returns deterministic local success and failure outcomes', async () => {
    const gateway = new LocalSmsGateway();
    await expect(gateway.send({ to: '5511999999999', text: 'Tudo certo' })).resolves.toMatchObject({
      provider: 'local-sms',
      status: 'sent',
      providerMessageId: expect.stringContaining('local_sms_')
    });
    await expect(gateway.send({ to: '5511000000000', text: 'Mensagem normal' })).resolves.toMatchObject({
      status: 'failed',
      failureReason: 'Simulated local SMS failure'
    });
    await expect(gateway.send({ to: '5511999999999', text: 'please fail' })).resolves.toMatchObject({
      status: 'failed'
    });
  });

  it('handles Twilio success, optional idempotency, HTTP failure and transport errors', async () => {
    const originalFetch = globalThis.fetch;
    try {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ sid: 'SM123' }) })
        .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
        .mockRejectedValueOnce(new Error('network down'))
        .mockRejectedValueOnce('transport failed');
      vi.stubGlobal('fetch', fetchMock);
      const gateway = new TwilioSmsGatewayAdapter({ apiKey: 'key', from: '+5511000000000' });

      await expect(gateway.send({ to: '+5511999999999', text: 'Oi', idempotencyKey: 'sms-key' })).resolves.toMatchObject({
        provider: 'twilio',
        status: 'sent',
        providerMessageId: 'SM123'
      });
      await expect(gateway.send({ to: '+5511999999999', text: 'Oi' })).resolves.toMatchObject({
        status: 'failed',
        failureReason: 'Twilio send failed with status 429'
      });
      await expect(gateway.send({ to: '+5511999999999', text: 'Oi' })).resolves.toMatchObject({
        status: 'failed',
        failureReason: 'network down'
      });
      await expect(gateway.send({ to: '+5511999999999', text: 'Oi' })).resolves.toMatchObject({
        status: 'failed',
        failureReason: 'Twilio send failed before response'
      });
      expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
        headers: expect.objectContaining({ 'Idempotency-Key': 'sms-key' })
      });
      expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
        headers: expect.not.objectContaining({ 'Idempotency-Key': expect.anything() })
      });
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});

function provisioningPool(queryResults: readonly unknown[]) {
  const client = {
    query: vi.fn(),
    release: vi.fn()
  };
  for (const result of queryResults) {
    client.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(undefined);
  }
  const pool = { connect: vi.fn().mockResolvedValue(client) };
  return { pool, client };
}

const provisioningInput = {
  clinicName: 'Clínica São José / Centro',
  adminUsername: 'admin-cvg',
  adminEmail: 'admin@example.com',
  adminPassword: 'Strong-password-123!',
  correlationId: 'corr-installation-1'
};

describe('initial installation provisioning', () => {
  it('normalizes clinic slugs and falls back for names without latin characters', () => {
    expect(toAccountSlug('Clínica São José / Centro')).toBe('clinica-sao-jose-centro');
    expect(toAccountSlug('!!!')).toBe('default');
    expect(toAccountSlug('中文')).toBe('default');
    expect(toAccountSlug(`${'a'.repeat(100)} trailing`)).toHaveLength(64);
  });

  it('checks installation state through the capability role and releases connections', async () => {
    const success = provisioningPool([{ rows: [{ setup_required: true }] }]);
    await expect(isSetupRequired(success.pool as never)).resolves.toBe(true);
    expect(success.client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(success.client.query).toHaveBeenCalledWith('SET LOCAL ROLE cvg_installer');
    expect(success.client.query).toHaveBeenCalledWith('COMMIT');
    expect(success.client.release).toHaveBeenCalledOnce();

    const notRequired = provisioningPool([{ rows: [{ setup_required: false }] }]);
    await expect(isSetupRequired(notRequired.pool as never)).resolves.toBe(false);
    const empty = provisioningPool([{ rows: [] }]);
    await expect(isSetupRequired(empty.pool as never)).resolves.toBe(false);
  });

  it('provisions with explicit and fallback admin names and translates singleton conflicts', async () => {
    const first = provisioningPool([{ rows: [{ account_id: 'account-1', user_id: 'user-1', clinic_slug: 'clinica' }] }]);
    await expect(provisionInitialInstallation(first.pool as never, {
      ...provisioningInput,
      adminFullName: '  Admin Principal  '
    })).resolves.toEqual({ accountId: 'account-1', userId: 'user-1', clinicSlug: 'clinica' });
    const firstCall = first.client.query.mock.calls.find((call: unknown[]) => String(call[0]).includes('provision_initial_installation'));
    expect(firstCall?.[1]?.[8]).toBe('Admin Principal');

    const fallback = provisioningPool([{ rows: [{ account_id: 'account-2', user_id: 'user-2', clinic_slug: 'default' }] }]);
    await expect(provisionInitialInstallation(fallback.pool as never, provisioningInput)).resolves.toMatchObject({
      accountId: 'account-2'
    });
    const fallbackCall = fallback.client.query.mock.calls.find((call: unknown[]) => String(call[0]).includes('provision_initial_installation'));
    expect(fallbackCall?.[1]?.[8]).toBe(provisioningInput.adminUsername);

    const singleton = provisioningPool([{ rows: [] }]);
    singleton.client.query.mockReset()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ code: 'CVG01' })
      .mockResolvedValueOnce(undefined);
    await expect(provisionInitialInstallation(singleton.pool as never, provisioningInput)).rejects.toBeInstanceOf(
      InstallationAlreadyProvisionedError
    );

    const unknown = provisioningPool([{ rows: [] }]);
    unknown.client.query.mockReset()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce('unknown failure')
      .mockResolvedValueOnce(undefined);
    await expect(provisionInitialInstallation(unknown.pool as never, provisioningInput)).rejects.toBe('unknown failure');
  });

  it('fails closed when provisioning returns no row and tolerates rollback failure', async () => {
    const noResult = provisioningPool([{ rows: [] }]);
    await expect(provisionInitialInstallation(noResult.pool as never, provisioningInput)).rejects.toThrow(
      'Installation capability returned no result'
    );

    const rollbackFailure = provisioningPool([{ rows: [] }]);
    rollbackFailure.client.query.mockReset()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('primary failure'))
      .mockRejectedValueOnce(new Error('rollback failure'));
    await expect(provisionInitialInstallation(rollbackFailure.pool as never, provisioningInput)).rejects.toThrow(
      'primary failure'
    );
  });
});
