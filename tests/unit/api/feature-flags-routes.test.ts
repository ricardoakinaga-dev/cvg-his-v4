import { describe, expect, it, vi } from 'vitest';

import { handleFeatureFlagsRoutes } from '../../../apps/api/src/routes/feature-flags-routes.js';

class MockResponse {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  body = '';

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  end(payload?: string): this {
    this.body = payload ?? '';
    return this;
  }

  json<T>(): T {
    return JSON.parse(this.body) as T;
  }
}

function createHandlers() {
  const flags = [
    {
      key: 'runtime.distributed_state.enabled',
      owner: 'platform',
      description: 'Enable distributed runtime state',
      defaultValue: false,
      scopes: ['environment'] as const,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      auditRequired: true,
      tags: ['ops']
    },
    {
      key: 'notifications.whatsapp.reminders.enabled',
      owner: 'communications',
      description: 'Enable WhatsApp reminders',
      defaultValue: false,
      scopes: ['environment'] as const,
      auditRequired: false,
      tags: ['comms']
    }
  ];

  const overridesByFlag = new Map([
    [
      'runtime.distributed_state.enabled',
      [
        {
          environment: 'staging',
          percentage: 50,
          allowedUsers: ['usr_target'],
          enabled: true
        }
      ]
    ],
    [
      'notifications.whatsapp.reminders.enabled',
      [
        {
          environment: 'production',
          enabled: false,
          allowedUsers: []
        }
      ]
    ]
  ]);

  return {
    featureFlagRepository: {
      create: vi.fn(),
      update: vi.fn(),
      upsertOverride: vi.fn(),
      listByAccount: vi.fn(async () => flags),
      findByKey: vi.fn(async (key: string) => flags.find((flag) => flag.key === key) ?? null),
      listOverrides: vi.fn(async (key: string) => overridesByFlag.get(key) ?? [])
    },
    featureFlagProvider: {
      evaluate: vi.fn(async (definition: { key: string }) => ({
        enabled: definition.key === 'runtime.distributed_state.enabled',
        reason: 'override',
        provider: 'database-repository'
      })),
      invalidateCache: vi.fn()
    },
    audit: {
      write: vi.fn()
    },
    requirePrincipal: vi.fn(() => ({
      user: {
        id: 'usr_admin',
        accountId: 'acc_demo'
      }
    }))
  };
}

function jsonRequest(method: string, url: string, payload: unknown): object {
  return {
    method,
    url,
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(payload));
    }
  };
}

describe('feature-flags routes operational reports', () => {
  it('returns a governance report for all flags', async () => {
    const handlers = createHandlers();
    const response = new MockResponse();

    const handled = await handleFeatureFlagsRoutes(
      '/flags/report',
      { method: 'GET', url: '/flags/report?environment=staging' } as never,
      response as never,
      'corr-1',
      handlers as never
    );

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(200);
    const payload = response.json<{
      environment: string;
      summary: {
        totalFlags: number;
        auditRequiredFlags: number;
        expiringSoonFlags: number;
        enabledForCurrentContext: number;
      };
      items: Array<{
        key: string;
        lifecycleStatus: string;
        rolloutSummary: { percentageRollouts: number[] };
      }>;
    }>();
    expect(payload.environment).toBe('staging');
    expect(payload.summary.totalFlags).toBe(2);
    expect(payload.summary.auditRequiredFlags).toBe(1);
    expect(payload.summary.expiringSoonFlags).toBe(1);
    expect(payload.summary.enabledForCurrentContext).toBe(1);
    expect(payload.items[0]?.rolloutSummary.percentageRollouts).toEqual([50]);
  });

  it('returns a governance report for one flag', async () => {
    const handlers = createHandlers();
    const response = new MockResponse();

    const handled = await handleFeatureFlagsRoutes(
      '/flags/runtime.distributed_state.enabled/report',
      {
        method: 'GET',
        url: '/flags/runtime.distributed_state.enabled/report?environment=staging&userId=usr_target'
      } as never,
      response as never,
      'corr-2',
      handlers as never
    );

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(200);
    const payload = response.json<{
      key: string;
      lifecycleStatus: string;
      currentDecision: { enabled: boolean };
      overrides: Array<{
        environment: string;
        accountIdOverride: string | null;
        userId: string | null;
        percentage: number | null;
        allowedUsers: string[];
        enabled: boolean;
      }>;
    }>();
    expect(payload.key).toBe('runtime.distributed_state.enabled');
    expect(payload.lifecycleStatus).toBe('expiring_soon');
    expect(payload.currentDecision.enabled).toBe(true);
    expect(payload.overrides).toEqual([
      {
        environment: 'staging',
        accountIdOverride: null,
        userId: null,
        percentage: 50,
        allowedUsers: ['usr_target'],
        enabled: true
      }
    ]);
  });

  it('validates feature flag writes before touching persistence', async () => {
    const handlers = createHandlers();
    const response = new MockResponse();

    await expect(
      handleFeatureFlagsRoutes(
        '/flags',
        jsonRequest('POST', '/flags', {
          key: 'runtime.invalid.payload',
          owner: 'platform',
          description: 'Invalid payload',
          defaultValue: 'false'
        }) as never,
        response as never,
        'corr-invalid-flag',
        handlers as never
      )
    ).rejects.toThrow("Field 'defaultValue' must be a boolean");
    expect(handlers.featureFlagRepository.create).not.toHaveBeenCalled();

    await expect(
      handleFeatureFlagsRoutes(
        '/flags/runtime.distributed_state.enabled/overrides',
        jsonRequest('POST', '/flags/runtime.distributed_state.enabled/overrides', {
          enabled: true,
          userId: 'not-a-uuid'
        }) as never,
        response as never,
        'corr-invalid-override',
        handlers as never
      )
    ).rejects.toThrow("Field 'userId' must be a UUID");
    expect(handlers.featureFlagRepository.upsertOverride).not.toHaveBeenCalled();

    await expect(
      handleFeatureFlagsRoutes(
        '/flags/runtime.distributed_state.enabled/overrides',
        jsonRequest('POST', '/flags/runtime.distributed_state.enabled/overrides', {
          enabled: true,
          allowedUsers: ['not-a-uuid']
        }) as never,
        response as never,
        'corr-invalid-allowlist',
        handlers as never
      )
    ).rejects.toThrow("Field 'allowedUsers' must contain only UUIDs");

    await expect(
      handleFeatureFlagsRoutes(
        '/flags/runtime.distributed_state.enabled/overrides',
        jsonRequest('POST', '/flags/runtime.distributed_state.enabled/overrides', {
          enabled: true,
          environment: '   '
        }) as never,
        response as never,
        'corr-invalid-environment',
        handlers as never
      )
    ).rejects.toThrow("Field 'environment' must be a non-empty string");
  });

  it('preserves explicit false values in a valid flag write', async () => {
    const handlers = createHandlers();
    const response = new MockResponse();

    const handled = await handleFeatureFlagsRoutes(
      '/flags',
      jsonRequest('POST', '/flags', {
        key: 'runtime.explicitly.disabled',
        owner: 'platform',
        description: 'Disabled until rollout',
        defaultValue: false,
        enabled: false,
        scopes: ['account'],
        tags: ['rollout']
      }) as never,
      response as never,
      'corr-valid-flag',
      handlers as never
    );

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(201);
    expect(handlers.featureFlagRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ defaultValue: false, enabled: false, scopes: ['account'] }),
      'acc_demo'
    );
  });
});
