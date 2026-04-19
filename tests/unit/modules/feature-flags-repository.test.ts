import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, withTenantQueryMock } = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTenantQueryMock = vi.fn(
    async (
      _pool: unknown,
      fn: (client: { query: typeof queryMock }) => Promise<unknown>
    ) => fn({ query: queryMock })
  );
  return { queryMock, withTenantQueryMock };
});

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => ({ mocked: true }))
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: withTenantQueryMock
}));

import { DatabaseFeatureFlagRepository } from '../../../packages/modules/feature-flags/src/index.js';

describe('DatabaseFeatureFlagRepository coverage guard', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTenantQueryMock.mockClear();
  });

  it('maps definitions from database rows and lists account-scoped flags', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: '00000000-0000-0000-0000-0000000000aa' }]
    });
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          key: 'runtime.distributed_state.enabled',
          owner: 'platform',
          description: 'Distribui estado',
          default_value: true,
          scopes: ['environment', 'account'],
          expires_at: '2026-12-01T00:00:00.000Z',
          audit_required: true,
          tags: ['ops', 'runtime'],
          metadata: { rollout: 'pilot' }
        }
      ]
    });
    queryMock.mockResolvedValueOnce({
      rows: [{ id: '00000000-0000-0000-0000-0000000000aa' }]
    });
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          key: 'triage.fast_track.enabled',
          owner: 'clinical',
          description: 'Acelera triagem',
          default_value: false,
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
      'acc_test' as never
    );
    const listed = await repository.listByAccount('acc_test' as never);

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT id')
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
      ['runtime.distributed_state.enabled', '00000000-0000-0000-0000-0000000000aa']
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT id')
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      4,
      'SELECT * FROM feature_flags WHERE account_id = $1 ORDER BY created_at DESC',
      ['00000000-0000-0000-0000-0000000000aa']
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
      .mockResolvedValueOnce({ rows: [{ id: '00000000-0000-0000-0000-0000000000aa' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '00000000-0000-0000-0000-0000000000aa' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'flag_db_id' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

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
      'acc_test' as never
    );

    await repository.upsertOverride('triage.fast_track.enabled', 'acc_test' as never, {
      environment: 'production',
      accountIdOverride: 'acc_test' as never,
      userId: 'user_triage',
      percentage: 25,
      allowedUsers: ['user_triage', 'user_supervisor'],
      enabled: true
    });

    await repository.update({
      key: 'triage.fast_track.enabled',
      owner: 'clinical-ops',
      description: 'Acelera triagem com guardrails',
      defaultValue: false,
      scopes: ['environment', 'account'],
      expiresAt: undefined,
      auditRequired: false,
      tags: ['triage'],
      metadata: { rollout: 'phase-2' }
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT id')
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO feature_flags'),
      [
        '00000000-0000-0000-0000-0000000000aa',
        'triage.fast_track.enabled',
        'clinical',
        'Acelera triagem',
        'true',
        JSON.stringify(['account']),
        new Date('2026-05-01T00:00:00.000Z'),
        'true',
        JSON.stringify(['triage', 'ops']),
        JSON.stringify({ rollout: 'phase-1' })
      ]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT id')
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      4,
      'SELECT id FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
      ['triage.fast_track.enabled', '00000000-0000-0000-0000-0000000000aa']
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('UPDATE feature_flag_overrides'),
      [
        'flag_db_id',
        'production',
        null,
        null,
        '25',
        JSON.stringify(['user_triage', 'user_supervisor', 'user_triage']),
        'true'
      ]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining('INSERT INTO feature_flag_overrides'),
      [
        '00000000-0000-0000-0000-0000000000aa',
        'flag_db_id',
        'production',
        null,
        null,
        '25',
        JSON.stringify(['user_triage', 'user_supervisor', 'user_triage']),
        'true'
      ]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining('SET owner = $2'),
      [
        'triage.fast_track.enabled',
        'clinical-ops',
        'Acelera triagem com guardrails',
        'false',
        JSON.stringify(['environment', 'account']),
        null,
        'false',
        JSON.stringify(['triage']),
        JSON.stringify({ rollout: 'phase-2' })
      ]
    );
  });

  it('maps overrides and gracefully returns null when no DB row exists', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{ id: '00000000-0000-0000-0000-0000000000aa' }]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            environment: 'staging',
            account_id_override: 'acc_test',
            user_id: 'user_triage',
            percentage: 75,
            allowed_users: ['user_triage'],
            enabled: true
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [{ id: '00000000-0000-0000-0000-0000000000aa' }]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            environment: 'production',
            account_id_override: 'acc_test',
            user_id: null,
            percentage: null,
            allowed_users: [],
            enabled: false
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [{ id: '00000000-0000-0000-0000-0000000000aa' }]
      })
      .mockResolvedValueOnce({ rows: [] });

    const repository = new DatabaseFeatureFlagRepository();

    const override = await repository.findOverride(
      'triage.fast_track.enabled',
      'staging',
      'acc_test' as never
    );
    const listed = await repository.listOverrides('triage.fast_track.enabled', 'acc_test' as never);
    const missing = await repository.findByKey('missing.flag', 'acc_test' as never);

    expect(override).toEqual({
      environment: 'staging',
      accountIdOverride: 'acc_test',
      userId: 'user_triage',
      percentage: 75,
      allowedUsers: ['user_triage'],
      enabled: true
    });
    expect(listed[0]).toEqual({
      environment: 'production',
      accountIdOverride: 'acc_test',
      userId: undefined,
      percentage: null,
      allowedUsers: [],
      enabled: false
    });
    expect(missing).toBeNull();
  });
});
