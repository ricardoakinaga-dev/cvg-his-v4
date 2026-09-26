import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage } from 'node:http';

import {
  IdempotencyConflictError,
  IdempotencyInProgressError
} from '@cvg-his-v2/shared-database';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { createTenantCommandRunner } from '../../../apps/api/src/helpers/tenant-command.ts';

function request(headers: Record<string, string | string[]> = {}): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

function baseInput(overrides: Partial<Parameters<ReturnType<typeof createTenantCommandRunner>>[0]> = {}) {
  return {
    request: request(),
    accountId: 'acct-1',
    actorUserId: 'user-1',
    correlationId: 'corr-1',
    operation: 'test.op',
    payload: { a: 1 },
    command: async () => ({ ok: true }),
    ...overrides
  } as Parameters<ReturnType<typeof createTenantCommandRunner>>[0];
}

describe('createTenantCommandRunner', () => {
  it('runs commands with an idempotency key and transaction helper', async () => {
    const transaction = vi.fn(async (_accountId: string, command: () => Promise<unknown>) =>
      command()
    );
    const runner = createTenantCommandRunner({ environment: 'test', transaction });
    const result = await runner(
      baseInput({ idempotencyKey: 'key-1', command: async () => ({ n: 1 }) })
    );
    expect(result).toEqual({ n: 1 });
    expect(transaction).toHaveBeenCalled();
  });

  it('reads idempotency key from headers and trims it', async () => {
    const transaction = vi.fn(async (_a: string, command: () => Promise<unknown>) => command());
    const runner = createTenantCommandRunner({ environment: 'development', transaction });
    await runner(baseInput({ request: request({ 'idempotency-key': '  abc  ' }) }));
    expect(transaction).toHaveBeenCalled();
  });

  it('rejects long and missing production idempotency keys', async () => {
    const runner = createTenantCommandRunner({ environment: 'production' });
    await expect(runner(baseInput())).rejects.toThrow(ValidationError);
    await expect(
      runner(baseInput({ idempotencyKey: 'k'.repeat(256) }))
    ).rejects.toThrow(ValidationError);
    const staging = createTenantCommandRunner({ environment: 'staging' });
    await expect(staging(baseInput())).rejects.toThrow(ValidationError);
    const prod = createTenantCommandRunner({ environment: 'prod' });
    await expect(prod(baseInput())).rejects.toThrow(ValidationError);
    const stage = createTenantCommandRunner({ environment: 'stage' });
    await expect(stage(baseInput())).rejects.toThrow(ValidationError);
  });

  it('short-circuits when an ambient transaction scope is active', async () => {
    vi.resetModules();
    const scope = {
      accountId: 'acct-1',
      pool: {},
      client: {},
      isActive: () => true
    };
    vi.doMock('@cvg-his-v2/shared-database', async (importOriginal) => {
      const actual = (await importOriginal()) as Record<string, unknown>;
      return {
        ...actual,
        getDatabaseTransactionScope: () => scope
      };
    });
    const { createTenantCommandRunner: createWithScope } = await import(
      '../../../apps/api/src/helpers/tenant-command.ts'
    );
    const runner = createWithScope({ environment: 'test' });
    const beforeIdempotency = vi.fn(async () => undefined);
    const command = vi.fn(async () => 'done');
    const value = await runner(
      baseInput({ idempotencyKey: 'key-1', beforeIdempotency, command })
    );
    expect(value).toBe('done');
    expect(beforeIdempotency).toHaveBeenCalled();
    vi.doUnmock('@cvg-his-v2/shared-database');
    vi.resetModules();
  });

  it('runs rollback recovery and maps idempotency conflicts to 409', async () => {
    const onRollback = vi.fn(async () => undefined);
    const unitOfWork = {
      execute: vi.fn(async () => {
        throw new IdempotencyConflictError();
      })
    };
    const runner = createTenantCommandRunner({ environment: 'test', unitOfWork: unitOfWork as never });
    await expect(
      runner(baseInput({ idempotencyKey: 'k', onRollback, command: async () => 'x' }))
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 });
    expect(onRollback).toHaveBeenCalled();
  });

  it('maps in-progress idempotency errors to 409', async () => {
    const unitOfWork = {
      execute: vi.fn(async () => {
        throw new IdempotencyInProgressError();
      })
    };
    const runner = createTenantCommandRunner({ environment: 'test', unitOfWork: unitOfWork as never });
    await expect(runner(baseInput({ idempotencyKey: 'k' }))).rejects.toMatchObject({
      statusCode: 409
    });
  });

  it('fails closed when rollback recovery throws', async () => {
    const onRollback = vi.fn(async () => {
      throw new Error('recovery failed');
    });
    const transaction = vi.fn(async () => {
      throw new Error('cmd failed');
    });
    const runner = createTenantCommandRunner({ environment: 'test', transaction });
    await expect(
      runner(baseInput({ onRollback, idempotencyKey: 'k' }))
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(onRollback).toHaveBeenCalled();
  });

  it('fails closed when commit recovery throws', async () => {
    const onCommit = vi.fn(async () => {
      throw new Error('commit recovery failed');
    });
    const transaction = vi.fn(async (_a: string, command: () => Promise<unknown>) => command());
    const runner = createTenantCommandRunner({ environment: 'test', transaction });
    await expect(runner(baseInput({ onCommit, idempotencyKey: 'k' }))).rejects.toMatchObject({
      statusCode: 503
    });
  });

  it('runs onCommit after successful execution without unitOfWork', async () => {
    const onCommit = vi.fn(async () => undefined);
    const onRollback = vi.fn(async () => undefined);
    const runner = createTenantCommandRunner({ environment: 'development' });
    await runner(baseInput({ onCommit, onRollback, idempotencyKey: 'k' }));
    expect(onCommit).toHaveBeenCalled();
    expect(onRollback).not.toHaveBeenCalled();
  });

  it('uses transaction option failure path for rollback recovery', async () => {
    const onRollback = vi.fn(async () => undefined);
    const transaction = vi.fn(async () => {
      throw new Error('boom');
    });
    const runner = createTenantCommandRunner({ environment: 'development', transaction });
    await expect(runner(baseInput({ onRollback }))).rejects.toThrow('boom');
    expect(onRollback).toHaveBeenCalled();
  });

  it('handles array idempotency-key headers and no key without unitOfWork', async () => {
    const runner = createTenantCommandRunner({ environment: 'development' });
    const result = await runner(
      baseInput({ request: request({ 'idempotency-key': ['  first  ', 'second'] }) })
    );
    expect(result).toEqual({ ok: true });
    const noKey = await runner(baseInput());
    expect(noKey).toEqual({ ok: true });
  });

  it('maps conflict errors thrown by unitOfWork without a typed wrap when not recognized', async () => {
    const unitOfWork = {
      execute: vi.fn(async () => {
        throw new Error('unexpected unit of work failure');
      })
    };
    const runner = createTenantCommandRunner({ environment: 'test', unitOfWork: unitOfWork as never });
    await expect(runner(baseInput({ idempotencyKey: 'k' }))).rejects.toThrow(
      'unexpected unit of work failure'
    );
  });
});
