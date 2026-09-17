import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, withTenantQueryExplicitMock } = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTenantQueryExplicitMock = vi.fn(
    async (
      _pool: unknown,
      _accountId: string,
      fn: (client: { query: typeof queryMock }) => Promise<unknown>
    ) => fn({ query: queryMock })
  );
  return { queryMock, withTenantQueryExplicitMock };
});

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => ({ mocked: true }))
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQueryExplicit: withTenantQueryExplicitMock
}));

const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000aa';
const USER_TRIAGE_ID = '00000000-0000-4000-8000-0000000000ab';
const USER_SUPERVISOR_ID = '00000000-0000-4000-8000-0000000000ac';

import { DatabaseFeatureFlagRepository } from '../../../packages/modules/feature-flags/src/index.js';

describe('DatabaseFeatureFlagRepository coverage guard', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTenantQueryExplicitMock.mockClear();
  });

  it('maps definitions from database rows and lists account-scoped flags', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          key: 'runtime.distributed_state.enabled',
          owner: 'platform',
          description: 'Distribui estado',
          default_value: true,
          enabled: true,
          scopes: ['environment', 'account'],
          expires_at: '2026-12-01T00:00:00.000Z',
          audit_required: true,
          tags: ['ops', 'runtime'],
          metadata: { rollout: 'pilot' }
        }
      ]
    });
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          key: 'triage.fast_track.enabled',
          owner: 'clinical',
          description: 'Acelera triagem',
          default_value: false,
          enabled: false,
          scopes: ['account'],
          expires_at: null,
          audit_required: false,
          tags: ['triage'],
          metadata: null
        }
      ]
    });

    const repository = new DatabaseFeatureFlagRepository();

    const found = await repository.findByKey(
      'runtime.distributed_state.enabled',
      ACCOUNT_ID as never
    );
    const listed = await repository.listByAccount(ACCOUNT_ID as never);

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
      ['runtime.distributed_state.enabled', ACCOUNT_ID]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM feature_flags WHERE account_id = $1 ORDER BY created_at DESC',
      [ACCOUNT_ID]
    );
    expect(found).toEqual(
      expect.objectContaining({
        key: 'runtime.distributed_state.enabled',
        defaultValue: true,
        auditRequired: true,
        tags: ['ops', 'runtime'],
        metadata: { rollout: 'pilot' }
      })
    );
    expect(found?.expiresAt).toBe('2026-12-01T00:00:00.000Z');
    expect(listed[0]).toEqual(
      expect.objectContaining({
        key: 'triage.fast_track.enabled',
        defaultValue: false,
        tags: ['triage']
      })
    );
  });

  it('persists flags and overrides with canonical SQL payloads', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'flag_db_id' }] })
      .mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const repository = new DatabaseFeatureFlagRepository();

    await repository.create(
      {
        key: 'triage.fast_track.enabled',
        owner: 'clinical',
        description: 'Acelera triagem',
        defaultValue: true,
        scopes: ['account'],
        expiresAt: '2026-05-01T00:00:00.000Z',
        auditRequired: true,
        tags: ['triage', 'ops'],
        metadata: { rollout: 'phase-1' }
      },
      ACCOUNT_ID as never
    );

    await repository.upsertOverride('triage.fast_track.enabled', ACCOUNT_ID as never, {
      environment: 'production',
      accountIdOverride: ACCOUNT_ID as never,
      userId: USER_TRIAGE_ID,
      percentage: 25,
      allowedUsers: [USER_TRIAGE_ID, USER_SUPERVISOR_ID],
      enabled: true
    });

    await repository.update(
      {
        key: 'triage.fast_track.enabled',
        owner: 'clinical-ops',
        description: 'Acelera triagem com guardrails',
        defaultValue: false,
        enabled: false,
        scopes: ['environment', 'account'],
        expiresAt: undefined,
        auditRequired: false,
        tags: ['triage'],
        metadata: { rollout: 'phase-2' }
      },
      ACCOUNT_ID as never
    );

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO feature_flags'),
      [
        ACCOUNT_ID,
        'triage.fast_track.enabled',
        'clinical',
        'Acelera triagem',
        'true',
        'true',
        JSON.stringify(['account']),
        new Date('2026-05-01T00:00:00.000Z'),
        'true',
        JSON.stringify(['triage', 'ops']),
        JSON.stringify({ rollout: 'phase-1' })
      ]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      'SELECT id FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
      ['triage.fast_track.enabled', ACCOUNT_ID]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO feature_flag_overrides'),
      [
        ACCOUNT_ID,
        'flag_db_id',
        'production',
        ACCOUNT_ID,
        USER_TRIAGE_ID,
        '25',
        JSON.stringify([USER_TRIAGE_ID, USER_SUPERVISOR_ID]),
        'true'
      ]
    );
    expect(queryMock).toHaveBeenNthCalledWith(4, expect.stringContaining('SET owner = $2'), [
      'triage.fast_track.enabled',
      'clinical-ops',
      'Acelera triagem com guardrails',
      'false',
      'false',
      JSON.stringify(['environment', 'account']),
      null,
      'false',
      JSON.stringify(['triage']),
      JSON.stringify({ rollout: 'phase-2' }),
      ACCOUNT_ID
    ]);
  });

  it('maps overrides and gracefully returns null when no DB row exists', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            environment: 'staging',
            account_id_override: ACCOUNT_ID,
            user_id: USER_TRIAGE_ID,
            percentage: 75,
            allowed_users: [USER_TRIAGE_ID],
            enabled: true
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            environment: 'production',
            account_id_override: ACCOUNT_ID,
            user_id: null,
            percentage: null,
            allowed_users: [],
            enabled: false
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const repository = new DatabaseFeatureFlagRepository();

    const override = await repository.findOverride(
      'triage.fast_track.enabled',
      'staging',
      ACCOUNT_ID as never
    );
    const listed = await repository.listOverrides('triage.fast_track.enabled', ACCOUNT_ID as never);
    const missing = await repository.findByKey('missing.flag', ACCOUNT_ID as never);

    expect(override).toEqual({
      environment: 'staging',
      accountIdOverride: ACCOUNT_ID,
      userId: USER_TRIAGE_ID,
      percentage: 75,
      allowedUsers: [USER_TRIAGE_ID],
      enabled: true
    });
    expect(listed[0]).toEqual({
      environment: 'production',
      accountIdOverride: ACCOUNT_ID,
      userId: undefined,
      percentage: null,
      allowedUsers: [],
      enabled: false
    });
    expect(missing).toBeNull();
  });

  it('covers UUID resolution, optional payloads and repository no-op branches', async () => {
    const repository = new DatabaseFeatureFlagRepository();
    const accountId = '00000000-0000-4000-8000-0000000000aa';
    const definition = {
      key: 'runtime.optional.flag',
      owner: 'platform',
      description: 'Optional branch contract',
      defaultValue: false,
      scopes: ['account'] as const
    };

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(repository.findByKey(definition.key, accountId as never)).resolves.toBeNull();
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(repository.listByAccount(accountId as never)).resolves.toEqual([]);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await repository.create(definition, accountId as never);
    queryMock.mockResolvedValueOnce({ rows: [] });
    await repository.update(definition, accountId as never);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await repository.upsertOverride('missing.flag', accountId as never, { enabled: true });

    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'flag_optional' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'override_optional' }] });
    await repository.upsertOverride('runtime.optional.flag', accountId as never, {
      enabled: false,
      accountIdOverride: accountId as never,
      userId: accountId,
      percentage: undefined,
      allowedUsers: undefined,
      environment: undefined
    });

    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'flag_optional' }] })
      .mockResolvedValueOnce({ rows: [] });
    await repository.upsertOverride('runtime.optional.flag', accountId as never, {
      enabled: true,
      percentage: null,
      allowedUsers: []
    });

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(
      repository.findOverride('runtime.optional.flag', 'production', accountId as never)
    ).resolves.toBeNull();
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          environment: null,
          account_id_override: null,
          user_id: null,
          percentage: null,
          allowed_users: null,
          enabled: true
        }
      ]
    });
    await expect(
      repository.listOverrides('runtime.optional.flag', accountId as never)
    ).resolves.toEqual([
      {
        environment: undefined,
        accountIdOverride: undefined,
        userId: undefined,
        percentage: null,
        allowedUsers: [],
        enabled: true
      }
    ]);

    await expect(repository.findByKey('legacy.flag', 'legacy-account' as never)).rejects.toThrow(
      'require a UUID accountId'
    );

    queryMock.mockResolvedValueOnce({ rows: [{ id: 'flag_optional' }] });
    await expect(
      repository.upsertOverride('runtime.optional.flag', accountId as never, {
        userId: 'not-a-uuid',
        enabled: true
      })
    ).rejects.toThrow('userId must be a UUID');

    queryMock.mockResolvedValueOnce({ rows: [{ id: 'flag_optional' }] });
    await expect(
      repository.upsertOverride('runtime.optional.flag', accountId as never, {
        allowedUsers: ['not-a-uuid'],
        enabled: true
      })
    ).rejects.toThrow('allowedUsers must be an array of UUIDs');

    queryMock.mockResolvedValueOnce({ rows: [{ id: 'flag_optional' }] });
    await expect(
      repository.upsertOverride('runtime.optional.flag', accountId as never, {
        environment: '   ',
        enabled: true
      })
    ).rejects.toThrow('environment must be a non-empty string');
  });
});
