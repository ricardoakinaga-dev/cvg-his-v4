import assert from 'node:assert/strict';
import test from 'node:test';
import type { ServerResponse } from 'node:http';
import { AuditService } from '@cvg-his-v2/module-audit';

import { deferResponseEndUntilCommitted, executeWithAuditFlush } from './transactional-response.js';

function createResponseProbe() {
  const chunks: unknown[] = [];
  const response = {
    end(chunk?: unknown) {
      chunks.push(chunk);
      return response;
    }
  } as unknown as ServerResponse;

  return { response, chunks };
}

test('does not release a successful HTTP response before the transaction commits', async () => {
  const { response, chunks } = createResponseProbe();
  let commit: (() => void) | undefined;
  const commitBarrier = new Promise<void>((resolve) => {
    commit = resolve;
  });

  const operation = deferResponseEndUntilCommitted(response, async () => {
    response.end('created');
    await commitBarrier;
  });

  await Promise.resolve();
  assert.deepEqual(chunks, []);

  commit?.();
  await operation;
  assert.deepEqual(chunks, ['created']);
});

test('discards a deferred success response when the transaction rolls back', async () => {
  const { response, chunks } = createResponseProbe();

  await assert.rejects(
    deferResponseEndUntilCommitted(response, async () => {
      response.end('created');
      throw new Error('commit failed');
    }),
    /commit failed/
  );

  assert.deepEqual(chunks, []);
  response.end('rollback error');
  assert.deepEqual(chunks, ['rollback error']);
});

test('flushes request audit writes after the operation succeeds', async () => {
  let persisted = false;
  const audit = new AuditService({
    auditRepository: {
      async create() {
        persisted = true;
      },
      async list() {
        return [];
      },
      async findById() {
        return null;
      }
    }
  });
  audit.write({
    actorId: 'user-1',
    accountId: 'account-1' as never,
    module: 'inventory',
    action: 'read',
    entityType: 'inventory-item',
    entityId: 'all',
    correlationId: 'corr-success',
    payloadSummary: 'Inventory listed',
    riskLevel: 'medium'
  });

  const result = await executeWithAuditFlush(audit, 'corr-success', async () => 'ok');
  assert.equal(result, 'ok');
  assert.equal(persisted, true);
});

test('preserves both request and audit failures', async () => {
  const audit = new AuditService({
    auditRepository: {
      async create() {
        throw new Error('audit failed');
      },
      async list() {
        return [];
      },
      async findById() {
        return null;
      }
    }
  });
  audit.write({
    actorId: 'user-1',
    accountId: 'account-1' as never,
    module: 'inventory',
    action: 'read',
    entityType: 'inventory-item',
    entityId: 'all',
    correlationId: 'corr-double-failure',
    payloadSummary: 'Inventory listed',
    riskLevel: 'medium'
  });

  await assert.rejects(
    executeWithAuditFlush(audit, 'corr-double-failure', async () => {
      throw new Error('request failed');
    }),
    (error: unknown) =>
      error instanceof AggregateError &&
      error.errors.some((item) => item instanceof Error && item.message === 'request failed') &&
      error.errors.some((item) => item instanceof Error && item.message === 'audit failed')
  );
});
