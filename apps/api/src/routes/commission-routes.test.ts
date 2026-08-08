import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { CommissionsService } from '@cvg-his-v2/module-commissions';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AccountId, AuthenticatedPrincipal, UserId } from '@cvg-his-v2/shared-types';

import { handleCommissionRoutes } from './commission-routes.js';

const ACCOUNT = 'acc-commission-route' as AccountId;
const USER = 'user-commission-route' as UserId;

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

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(method: string, body?: unknown, url?: string): never {
  return {
    method,
    url: url ?? '/commission-rules',
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: USER,
      accountId: ACCOUNT,
      username: 'commission-user',
      email: 'commission@example.com',
      displayName: 'Commission User',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-commission' as never,
      userId: USER,
      accountId: ACCOUNT,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['staff.read', 'staff.manage'],
      capabilities: []
    }
  };
}

function handlers(commissions = new CommissionsService(), audit?: AuditService) {
  return {
    commissions,
    audit: audit ?? ({ write() {} } as unknown as AuditService),
    requirePrincipal: () => principal()
  };
}

test('handleCommissionRoutes ignores unrelated paths', async () => {
  const res = new MockResponse();
  const handled = await handleCommissionRoutes('/staff', request('GET'), res as never, 'corr', handlers());
  assert.equal(handled, false);
});

test('handleCommissionRoutes exposes rule, calculation, review and payment lifecycle', async () => {
  const commissions = new CommissionsService();
  const routeHandlers = handlers(commissions);

  const createRuleResponse = new MockResponse();
  await handleCommissionRoutes(
    '/commission-rules',
    request('POST', {
      description: 'Veterinarios senior',
      staffId: 'staff-vet',
      itemKind: 'service',
      percentage: 12
    }),
    createRuleResponse as never,
    'corr-rule',
    routeHandlers
  );
  assert.equal(createRuleResponse.statusCode, 201);

  const listRulesResponse = new MockResponse();
  await handleCommissionRoutes(
    '/commission-rules',
    request('GET', undefined, '/commission-rules?active=true'),
    listRulesResponse as never,
    'corr-list',
    routeHandlers
  );
  assert.equal(listRulesResponse.bodyJson<{ items: unknown[] }>().items.length, 1);

  const calculateResponse = new MockResponse();
  await handleCommissionRoutes(
    '/commission-calculations',
    request('POST', {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lines: [
        {
          staffId: 'staff-vet',
          staffName: 'Dra. Ana',
          itemKind: 'service',
          sourceType: 'billing_item',
          sourceId: 'bill-item-1',
          sourceDescription: 'Consulta',
          baseAmount: 200,
          occurredAt: '2026-05-10'
        }
      ]
    }, '/commission-calculations'),
    calculateResponse as never,
    'corr-calc',
    routeHandlers
  );
  assert.equal(calculateResponse.statusCode, 201);
  const calculation = calculateResponse.bodyJson<{ id: string; totalCommissionAmount: number }>();
  assert.equal(calculation.totalCommissionAmount, 24);

  const reviewResponse = new MockResponse();
  await handleCommissionRoutes(
    `/commission-calculations/${calculation.id}/review`,
    request('POST', undefined, `/commission-calculations/${calculation.id}/review`),
    reviewResponse as never,
    'corr-review',
    routeHandlers
  );
  assert.equal(reviewResponse.bodyJson<{ status: string }>().status, 'reviewed');

  const payResponse = new MockResponse();
  await handleCommissionRoutes(
    `/commission-calculations/${calculation.id}/pay`,
    request(
      'POST',
      { paymentMethod: 'cash', paymentReference: 'COM-TEST-CASH' },
      `/commission-calculations/${calculation.id}/pay`
    ),
    payResponse as never,
    'corr-pay',
    routeHandlers
  );
  assert.equal(payResponse.bodyJson<{ status: string }>().status, 'paid');
});
