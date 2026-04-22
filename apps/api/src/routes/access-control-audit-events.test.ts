import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { handleAccessControlRoutes } from './access-control-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback = typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  bodyJson<T>() {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'audit',
      email: 'audit@example.com',
      displayName: 'Auditoria',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['audit'],
      permissionCodes: ['audit.read'],
      capabilities: []
    }
  };
}

test('access-control audit route filters audit events by finance domain query params', async () => {
  const response = new MockResponse();
  const auditEvents = [
    {
      actorId: 'user-1',
      accountId: 'acc-1',
      module: 'billing',
      action: 'update_expense_catalog_item',
      entityType: 'expense-catalog',
      entityId: 'DES-101',
      correlationId: 'corr-fin-1',
      riskLevel: 'medium',
      payloadSummary: 'Expense catalog item updated',
      occurredAt: '2026-04-22T12:10:00.000Z'
    },
    {
      actorId: 'user-2',
      accountId: 'acc-1',
      module: 'billing',
      action: 'create_cost_center_catalog_item',
      entityType: 'cost-center-catalog',
      entityId: 'ADM-FIN',
      correlationId: 'corr-fin-2',
      riskLevel: 'medium',
      payloadSummary: 'Cost center catalog item created',
      occurredAt: '2026-04-22T12:00:00.000Z'
    },
    {
      actorId: 'user-3',
      accountId: 'acc-1',
      module: 'integrations',
      action: 'webhook.updated',
      entityType: 'webhook',
      entityId: 'wh-1',
      correlationId: 'corr-ext-1',
      riskLevel: 'high',
      payloadSummary: 'Webhook sensível alterado',
      occurredAt: '2026-04-22T11:50:00.000Z'
    }
  ];

  const handled = await handleAccessControlRoutes(
    '/audit/events',
    {
      method: 'GET',
      url: '/audit/events?module=billing&entityType=cost-center-catalog&correlationId=corr-fin-2&q=ADM-FIN&limit=10'
    } as never,
    response as never,
    'corr-audit-1',
    {
      accessControl: {} as never,
      users: {} as never,
      audit: {
        list: () => auditEvents,
        write: () => undefined
      } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson<{ items: Array<{ entityId: string; module: string }> }>(), {
    items: [
      {
        actorId: 'user-2',
        accountId: 'acc-1',
        module: 'billing',
        action: 'create_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: 'ADM-FIN',
        correlationId: 'corr-fin-2',
        riskLevel: 'medium',
        payloadSummary: 'Cost center catalog item created',
        occurredAt: '2026-04-22T12:00:00.000Z'
      }
    ]
  });
});
