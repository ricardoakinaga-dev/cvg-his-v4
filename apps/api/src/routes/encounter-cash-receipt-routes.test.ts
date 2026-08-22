import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import type {
  CreateEncounterCashReceiptInput,
  EncounterCashReceiptRecord
} from '../encounter-cash-receipt-repository.js';
import {
  assertEncounterHasNoCashReceipt,
  handleEncounterCashReceiptRoutes
} from './encounter-cash-receipt-routes.js';

const accountId = '00000000-0000-0000-0000-000000000001';
const encounterId = '00000000-0000-0000-0000-000000000002';
const registerId = '00000000-0000-0000-0000-000000000003';
const actorUserId = '00000000-0000-0000-0000-000000000004';
const receiptId = '00000000-0000-0000-0000-000000000005';

const receipt: EncounterCashReceiptRecord = {
  id: receiptId,
  accountId,
  encounterId,
  billingRecordId: 'bill-1',
  financialAccountId: '00000000-0000-0000-0000-000000000006',
  receivableId: '00000000-0000-0000-0000-000000000007',
  receivablePaymentId: '00000000-0000-0000-0000-000000000008',
  cashRegisterId: registerId,
  cashMovementId: '00000000-0000-0000-0000-000000000009',
  journalEntryId: '00000000-0000-0000-0000-000000000010',
  amount: 125.5,
  currency: 'BRL',
  receivedAt: '2026-08-22T12:00:00.000Z',
  receivedByUserId: actorUserId
};

class MockResponse extends Writable {
  public statusCode = 200;
  readonly headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: () => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void)): this {
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (typeof chunk === 'function') chunk();
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function principal(): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: actorUserId as never,
      accountId: accountId as never,
      username: 'finance',
      email: 'finance@example.com',
      displayName: 'Financeiro',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session-finance' as never,
      userId: actorUserId as never,
      accountId: accountId as never,
      createdAt: now,
      expiresAt: now,
      authTime: now,
      refreshExpiresAt: now,
      active: true
    },
    access: { roleCodes: ['finance'], permissionCodes: ['billing.read', 'billing.manage'], capabilities: [] }
  };
}

function postRequest(includeIdempotencyKey = true, body: unknown = {
  cashRegisterId: registerId,
  expectedAmount: 125.5
}): never {
  return {
    method: 'POST',
    headers: includeIdempotencyKey ? { 'idempotency-key': 'receipt-request-1' } : {},
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function auditHandlers(events: unknown[] = []) {
  return {
    audit: { write: (event: unknown) => events.push(event) } as never,
    correlationId: 'corr-cash-receipt'
  };
}

test('cash receipt POST requires idempotency and creates the receipt through the command', async () => {
  const calls: unknown[] = [];
  const response = new MockResponse();
  const handled = await handleEncounterCashReceiptRoutes(
    `/encounters/${encounterId}/cash-receipts`,
    postRequest(),
    response as never,
    {
      ...auditHandlers(),
      command: {
        async execute(input: CreateEncounterCashReceiptInput) {
          calls.push(input);
          return receipt;
        }
      } as never,
      repository: {} as never,
      requirePrincipal(_request, permissionCode) {
        calls.push(permissionCode);
        return principal();
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.equal(response.headers.get('location'), `/encounters/${encounterId}/cash-receipts/${receiptId}`);
  assert.deepEqual(response.bodyJson(), receipt);
  assert.equal(calls[0], 'billing.manage');
  assert.deepEqual(calls[1], {
    accountId,
    encounterId,
    actorUserId,
    cashRegisterId: registerId,
    expectedAmount: 125.5,
    notes: undefined
  });
});

test('cash receipt POST rejects requests without an idempotency key before execution', async () => {
  let executed = false;
  await assert.rejects(
    () => handleEncounterCashReceiptRoutes(
      `/encounters/${encounterId}/cash-receipts`,
      postRequest(false),
      new MockResponse() as never,
      {
        ...auditHandlers(),
        command: { execute: async () => { executed = true; return receipt; } } as never,
        repository: {} as never,
        requirePrincipal: () => principal()
      }
    ),
    ValidationError
  );
  assert.equal(executed, false);
});

test('cash receipt POST rejects non-object and unknown input fields at the boundary', async () => {
  for (const body of [null, [], { cashRegisterId: registerId, expectedAmount: 125.5, method: 'pix' }]) {
    await assert.rejects(
      () => handleEncounterCashReceiptRoutes(
        `/encounters/${encounterId}/cash-receipts`,
        postRequest(true, body),
        new MockResponse() as never,
        {
          ...auditHandlers(),
          command: { execute: async () => receipt } as never,
          repository: {} as never,
          requirePrincipal: () => principal()
        }
      ),
      ValidationError
    );
  }
});

test('cash receipt GET is tenant scoped and does not reveal a missing receipt', async () => {
  const calls: unknown[] = [];
  await assert.rejects(
    () => handleEncounterCashReceiptRoutes(
      `/encounters/${encounterId}/cash-receipts/${receiptId}`,
      { method: 'GET', headers: {} } as never,
      new MockResponse() as never,
      {
        ...auditHandlers(),
        command: {} as never,
        repository: {
          async findById(...args: [string, string, string]) {
            calls.push(args);
            return null;
          }
        } as never,
        requirePrincipal(_request, permissionCode) {
          calls.push(permissionCode);
          return principal();
        }
      }
    ),
    (error: unknown) => error instanceof AppError
      && error.code === 'CASH_RECEIPT_NOT_FOUND'
      && error.statusCode === 404
  );

  assert.deepEqual(calls, ['billing.read', [accountId, encounterId, receiptId]]);
});

test('cash receipt GET collection recovers the unique receipt by encounter', async () => {
  const response = new MockResponse();
  const auditEvents: unknown[] = [];
  const handled = await handleEncounterCashReceiptRoutes(
    `/encounters/${encounterId}/cash-receipts`,
    { method: 'GET', headers: {} } as never,
    response as never,
    {
      ...auditHandlers(auditEvents),
      command: {} as never,
      repository: {
        async findByEncounter(receiptAccountId: string, receiptEncounterId: string) {
          assert.equal(receiptAccountId, accountId);
          assert.equal(receiptEncounterId, encounterId);
          return receipt;
        }
      } as never,
      requirePrincipal: () => principal()
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(response.bodyJson(), receipt);
  assert.equal(auditEvents.length, 1);
  const auditEvent = auditEvents[0] as {
    readonly action: string;
    readonly entityId: string;
    readonly correlationId: string;
  };
  assert.equal(auditEvent.action, 'cash_receipt_read');
  assert.equal(auditEvent.entityId, receiptId);
  assert.equal(auditEvent.correlationId, 'corr-cash-receipt');
});

test('received encounters require an explicit reversal before reopen or delete operations', async () => {
  await assert.rejects(
    () => assertEncounterHasNoCashReceipt(
      { findByEncounter: async () => receipt } as never,
      accountId,
      encounterId
    ),
    (error: unknown) => error instanceof AppError
      && error.code === 'CASH_RECEIPT_REVERSAL_REQUIRED'
      && error.statusCode === 409
  );
  await assert.doesNotReject(() => assertEncounterHasNoCashReceipt(
    { findByEncounter: async () => null } as never,
    accountId,
    encounterId
  ));
});

test('unrelated routes are ignored', async () => {
  const handled = await handleEncounterCashReceiptRoutes(
    '/encounters',
    { method: 'GET' } as never,
    new MockResponse() as never,
    {
      ...auditHandlers(),
      command: {} as never,
      repository: {} as never,
      requirePrincipal: () => principal()
    }
  );
  assert.equal(handled, false);
});
