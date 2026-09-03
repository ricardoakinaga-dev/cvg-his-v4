import type { PoolClient } from 'pg';

import { afterEach, describe, expect, it, vi } from 'vitest';

const connectionMocks = vi.hoisted(() => ({
  closeDbConnection: vi.fn(),
  connect: vi.fn()
}));

vi.mock('./connection.js', () => ({
  closeDbConnection: connectionMocks.closeDbConnection,
  pool: { connect: connectionMocks.connect }
}));

import {
  reconcileRuntimeRoles,
  runRuntimeRoleReconciliation
} from './reconcile-runtime-roles.js';

type QueryCall = {
  readonly text: string;
  readonly values: readonly unknown[];
};

function createClient(options: {
  readonly failOn?: string;
  readonly missingRole?: string;
  readonly omitRoleResult?: boolean;
} = {}) {
  const calls: QueryCall[] = [];
  const query = vi.fn(async (text: string, values: readonly unknown[] = []) => {
    calls.push({ text, values });

    if (options.failOn && text.includes(options.failOn)) {
      throw new Error('simulated reconciliation failure');
    }

    if (text.includes('SELECT EXISTS (SELECT 1 FROM pg_roles')) {
      if (options.omitRoleResult) return { rows: [] };
      return { rows: [{ exists: values[0] !== options.missingRole }] };
    }

    if (text.includes("GRANT USAGE ON SCHEMA app TO cvg_installer")) {
      return { rows: [{ statement: 'SELECT 2' }] };
    }

    if (text.trimStart().startsWith('SELECT format(')) {
      return { rows: [{ statement: 'SELECT 1' }] };
    }

    return { rows: [] };
  });
  const release = vi.fn();

  return {
    calls,
    client: { query, release } as unknown as PoolClient,
    query,
    release
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  connectionMocks.closeDbConnection.mockReset();
  connectionMocks.connect.mockReset();
});

describe('reconcileRuntimeRoles', () => {
  it('reconciles the complete least-privilege contract in one transaction', async () => {
    const fake = createClient();

    await reconcileRuntimeRoles(fake.client, {
      apiRole: 'cvg_api_test',
      workerRole: 'cvg_worker_test'
    });

    expect(fake.calls[0]?.text).toBe('BEGIN');
    expect(fake.calls.at(-1)?.text).toBe('COMMIT');
    expect(fake.calls.some(({ text }) => text === 'ROLLBACK')).toBe(false);
    expect(fake.calls.some(({ text }) => text === 'SELECT 1')).toBe(true);
    expect(fake.calls.some(({ text }) => text === 'SELECT 2')).toBe(true);
    expect(
      fake.calls.some(({ text }) =>
        text.includes('ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT')
      )
    ).toBe(true);
    expect(
      fake.calls.some(({ text, values }) =>
        text.includes('GRANT CONNECT ON DATABASE') &&
        JSON.stringify(values) === JSON.stringify([['cvg_api_test', 'cvg_worker_test']])
      )
    ).toBe(true);
    expect(
      fake.calls.some(({ text }) =>
        text.includes('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
      )
    ).toBe(true);
  });

  it.each([
    ['invalid API role', { apiRole: 'api-role', workerRole: 'worker_role' }, 'valid PostgreSQL'],
    [
      'reserved API role',
      { apiRole: 'cvg_installer', workerRole: 'worker_role' },
      'reserved cvg_installer'
    ],
    [
      'invalid worker role',
      { apiRole: 'api_role', workerRole: 'worker role' },
      'valid PostgreSQL'
    ],
    [
      'reserved worker role',
      { apiRole: 'api_role', workerRole: 'cvg_installer' },
      'reserved cvg_installer'
    ],
    [
      'same role',
      { apiRole: 'same_role', workerRole: 'same_role' },
      'must be different'
    ]
  ])('rejects an %s before opening a transaction', async (_label, input, message) => {
    const fake = createClient();

    await expect(reconcileRuntimeRoles(fake.client, input)).rejects.toThrow(message);

    expect(fake.query).not.toHaveBeenCalled();
  });

  it.each([
    ['a configured role is absent', { missingRole: 'cvg_worker_test' }],
    ['the role lookup returns no row', { omitRoleResult: true }]
  ])('rolls back when %s', async (_label, options) => {
    const fake = createClient(options);

    await expect(
      reconcileRuntimeRoles(fake.client, {
        apiRole: 'cvg_api_test',
        workerRole: 'cvg_worker_test'
      })
    ).rejects.toThrow('Configured PostgreSQL runtime role does not exist');

    expect(fake.calls.at(-1)?.text).toBe('ROLLBACK');
  });

  it('rolls back and preserves an unexpected database error', async () => {
    const fake = createClient({ failOn: 'REVOKE CREATE ON SCHEMA public FROM PUBLIC' });

    await expect(
      reconcileRuntimeRoles(fake.client, {
        apiRole: 'cvg_api_test',
        workerRole: 'cvg_worker_test'
      })
    ).rejects.toThrow('simulated reconciliation failure');

    expect(fake.calls.at(-1)?.text).toBe('ROLLBACK');
    expect(fake.calls.some(({ text }) => text === 'COMMIT')).toBe(false);
  });
});

describe('runRuntimeRoleReconciliation', () => {
  it('uses configured roles and always releases both client and pool', async () => {
    const fake = createClient();
    connectionMocks.connect.mockResolvedValue(fake.client);
    vi.stubEnv('POSTGRES_API_USER', 'configured_api');
    vi.stubEnv('POSTGRES_WORKER_USER', 'configured_worker');
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await runRuntimeRoleReconciliation();

    expect(fake.calls.some(({ values }) => values[0] === 'configured_api')).toBe(true);
    expect(fake.calls.some(({ values }) => values[0] === 'configured_worker')).toBe(true);
    expect(info).toHaveBeenCalledWith('Runtime PostgreSQL roles reconciled successfully.');
    expect(fake.release).toHaveBeenCalledOnce();
    expect(connectionMocks.closeDbConnection).toHaveBeenCalledOnce();
  });

  it('uses safe defaults and closes resources after reconciliation fails', async () => {
    const fake = createClient({ missingRole: 'cvg_api' });
    connectionMocks.connect.mockResolvedValue(fake.client);
    vi.stubEnv('POSTGRES_API_USER', '__unset_for_test__');
    vi.stubEnv('POSTGRES_WORKER_USER', '__unset_for_test__');
    delete process.env.POSTGRES_API_USER;
    delete process.env.POSTGRES_WORKER_USER;

    await expect(runRuntimeRoleReconciliation()).rejects.toThrow(
      'Configured PostgreSQL runtime role does not exist: cvg_api'
    );

    expect(fake.release).toHaveBeenCalledOnce();
    expect(connectionMocks.closeDbConnection).toHaveBeenCalledOnce();
  });
});
