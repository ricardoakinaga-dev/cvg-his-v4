import assert from 'node:assert/strict';

import { test } from 'vitest';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  CommissionsService,
  type CommissionPayableGateway,
  type CommissionRepository
} from './index.js';

const ACCOUNT = 'acc-commission-payment' as AccountId;
const USER = 'user-commission-payment' as UserId;

test('markPaid creates and pays one payable when the same calculation is paid concurrently', async () => {
  let createCalls = 0;
  let payCalls = 0;
  let createStarted!: () => void;
  const createStartedPromise = new Promise<void>((resolve) => {
    createStarted = resolve;
  });

  const gateway: CommissionPayableGateway = {
    async createPayable() {
      createCalls += 1;
      createStarted();
      await new Promise<void>((resolve) => setImmediate(resolve));
      return { id: `payable-${createCalls}` };
    },
    async payPayable() {
      payCalls += 1;
      return undefined;
    }
  };

  const service = new CommissionsService({ payableGateway: gateway });
  await service.createRule(ACCOUNT, USER, {
    description: 'Comissão concorrente',
    percentage: 10
  });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [{
      staffId: 'staff-1',
      staffName: 'Profissional',
      itemKind: 'service',
      sourceType: 'manual',
      sourceId: 'source-1',
      sourceDescription: 'Serviço',
      baseAmount: 100,
      occurredAt: '2026-05-10'
    }]
  });
  await service.review(ACCOUNT, calculation.id, USER);

  const firstPayment = service.markPaid(ACCOUNT, calculation.id, USER, { paymentMethod: 'pix' });
  await createStartedPromise;
  const secondPayment = service.markPaid(ACCOUNT, calculation.id, USER, { paymentMethod: 'pix' });
  const [first, second] = await Promise.all([firstPayment, secondPayment]);

  assert.equal(createCalls, 1);
  assert.equal(payCalls, 1);
  assert.equal(first.status, 'paid');
  assert.equal(second.status, 'paid');
  assert.equal(first.payableId, second.payableId);
});

test('markPaid resolves a raced payable after a unique violation inside a savepoint', async () => {
  let sourceLookupCount = 0;
  let savepointCalls = 0;
  let payCalls = 0;
  const repository = {
    async saveRule() {},
    async saveCalculation() {},
    async updateCalculation() {},
    async findRules() { return []; },
    async findCalculations() { return []; },
    async findLines() { return []; },
    async saveLine() {},
    async findPayableBySourceExpense() {
      sourceLookupCount += 1;
      return sourceLookupCount === 1
        ? null
        : { id: 'payable-raced', accountId: ACCOUNT, status: 'open' as const };
    },
    async withPayableCreateSavepoint(_accountId: AccountId, operation: () => Promise<unknown>) {
      savepointCalls += 1;
      return operation();
    }
  } as CommissionRepository;
  const uniqueViolation = Object.assign(new Error('duplicate source expense'), { code: '23505' });
  const gateway: CommissionPayableGateway = {
    async createPayable() {
      throw uniqueViolation;
    },
    async payPayable() {
      payCalls += 1;
    }
  };
  const service = new CommissionsService({
    repository,
    payableGateway: gateway,
    requireAuthoritativeSources: false
  });

  await service.createRule(ACCOUNT, USER, { description: 'Comissão em corrida', percentage: 10 });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [{
      staffId: 'staff-1',
      staffName: 'Profissional',
      itemKind: 'service',
      sourceType: 'manual',
      sourceId: 'source-raced',
      sourceDescription: 'Serviço',
      baseAmount: 100,
      occurredAt: '2026-05-10'
    }]
  });
  await service.review(ACCOUNT, calculation.id, USER);

  const paid = await service.markPaid(ACCOUNT, calculation.id, USER, { paymentMethod: 'pix' });

  assert.equal(savepointCalls, 1);
  assert.equal(sourceLookupCount, 2);
  assert.equal(payCalls, 1);
  assert.equal(paid.status, 'paid');
  assert.equal(paid.payableId, 'payable-raced');
});
