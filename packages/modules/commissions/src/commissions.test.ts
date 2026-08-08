import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CommissionsService } from './index.js';

const ACCOUNT = 'acc-commissions-test' as AccountId;
const OTHER_ACCOUNT = 'acc-commissions-other' as AccountId;
const USER = 'user-commissions-test' as UserId;

test('CommissionsService calculates lines using the most specific active rule', async () => {
  const service = new CommissionsService();
  await service.createRule(ACCOUNT, USER, {
    description: 'Global servicos',
    itemKind: 'service',
    percentage: 5
  });
  const staffRule = await service.createRule(ACCOUNT, USER, {
    description: 'Veterinaria senior',
    staffId: 'staff-vet',
    itemKind: 'service',
    percentage: 12
  });

  const calculation = await service.calculate(ACCOUNT, USER, {
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
  });

  assert.equal(calculation.status, 'draft');
  assert.equal(calculation.number, 'COM-000001');
  assert.equal(calculation.totalBaseAmount, 200);
  assert.equal(calculation.totalCommissionAmount, 24);
  assert.equal(calculation.lines[0]?.ruleId, staffRule.id);
  assert.equal(calculation.lines[0]?.percentage, 12);
});

test('CommissionsService filters source lines outside the requested period', async () => {
  const service = new CommissionsService();
  await service.createRule(ACCOUNT, USER, {
    description: 'Produtos',
    itemKind: 'product',
    percentage: 3
  });

  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [
      {
        staffId: 'staff-1',
        staffName: 'Rafael',
        itemKind: 'product',
        sourceType: 'counter_sale_item',
        sourceId: 'sale-item-1',
        sourceDescription: 'Racao',
        baseAmount: 100,
        occurredAt: '2026-05-15'
      },
      {
        staffId: 'staff-1',
        staffName: 'Rafael',
        itemKind: 'product',
        sourceType: 'counter_sale_item',
        sourceId: 'sale-item-2',
        sourceDescription: 'Antipulgas',
        baseAmount: 80,
        occurredAt: '2026-06-01'
      }
    ]
  });

  assert.equal(calculation.lines.length, 1);
  assert.equal(calculation.totalBaseAmount, 100);
  assert.equal(calculation.totalCommissionAmount, 3);
});

test('CommissionsService enforces review and payment lifecycle', async () => {
  const service = new CommissionsService();
  await service.createRule(ACCOUNT, USER, {
    description: 'Global',
    percentage: 10
  });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [
      {
        staffId: 'staff-1',
        staffName: 'Rafael',
        itemKind: 'service',
        sourceType: 'manual',
        sourceId: 'manual-1',
        sourceDescription: 'Procedimento',
        baseAmount: 500,
        occurredAt: '2026-05-20'
      }
    ]
  });

  await assert.rejects(() => service.markPaid(ACCOUNT, calculation.id, USER), ConflictError);

  const reviewed = await service.review(ACCOUNT, calculation.id, USER);
  assert.equal(reviewed.status, 'reviewed');
  assert.ok(reviewed.reviewedAt);

  const paid = await service.markPaid(ACCOUNT, calculation.id, USER);
  assert.equal(paid.status, 'paid');
  assert.ok(paid.paidAt);

  await assert.rejects(() => service.cancel(ACCOUNT, calculation.id, USER), ConflictError);
});

test('CommissionsService settles the linked financial payable before marking the calculation paid', async () => {
  const calls: string[] = [];
  const payableGateway = {
    async createPayable() {
      calls.push('create');
      return { id: 'payable-commission-1' };
    },
    async payPayable(_accountId: AccountId, _userId: UserId, payableId: string, input: { amountPaid: number; paymentMethod?: string | null }) {
      calls.push(`pay:${payableId}:${input.amountPaid}:${input.paymentMethod}`);
    }
  };
  const service = new CommissionsService({ payableGateway });
  await service.createRule(ACCOUNT, USER, { description: 'Global', percentage: 10 });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [{
      staffId: 'staff-1',
      staffName: 'Rafael',
      itemKind: 'service',
      sourceType: 'manual',
      sourceId: 'manual-1',
      sourceDescription: 'Procedimento',
      baseAmount: 500,
      occurredAt: '2026-05-20'
    }]
  });

  await service.review(ACCOUNT, calculation.id, USER);
  const paid = await service.markPaid(ACCOUNT, calculation.id, USER, {
    paymentMethod: 'bank_transfer',
    paymentReference: 'TRF-001'
  });

  assert.equal(paid.status, 'paid');
  assert.equal(paid.payableId, 'payable-commission-1');
  assert.deepEqual(calls, ['create', 'pay:payable-commission-1:50:bank_transfer']);
});

test('CommissionsService executes payable creation, settlement and calculation update in one transaction boundary', async () => {
  const transactionOperations: string[] = [];
  const payableGateway = {
    async createPayable() {
      transactionOperations.push('create-payable');
      return { id: 'payable-commission-transaction' };
    },
    async payPayable() {
      transactionOperations.push('pay-payable');
    }
  };
  const service = new CommissionsService({
    payableGateway,
    transaction: async (_accountId: AccountId, operation: () => Promise<unknown>) => {
      transactionOperations.push('begin');
      const result = await operation();
      transactionOperations.push('commit');
      return result;
    }
  } as never);

  await service.createRule(ACCOUNT, USER, { description: 'Global', percentage: 10 });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [{
      staffId: 'staff-1',
      staffName: 'Rafael',
      itemKind: 'service',
      sourceType: 'manual',
      sourceId: 'manual-transaction',
      sourceDescription: 'Procedimento',
      baseAmount: 500,
      occurredAt: '2026-05-20'
    }]
  });

  await service.review(ACCOUNT, calculation.id, USER);
  transactionOperations.length = 0;
  await service.markPaid(ACCOUNT, calculation.id, USER, { paymentMethod: 'pix' });

  assert.deepEqual(transactionOperations, [
    'begin',
    'create-payable',
    'pay-payable',
    'commit'
  ]);
});

test('CommissionsService restores its in-memory lifecycle when the transaction rolls back', async () => {
  let rollback = false;
  const service = new CommissionsService({
    payableGateway: {
      async createPayable() {
        return { id: 'payable-commission-rollback' };
      },
      async payPayable() {
        return undefined;
      }
    },
    transaction: async (_accountId: AccountId, operation: () => Promise<unknown>) => {
      const result = await operation();
      if (rollback) throw new Error('transaction rolled back');
      return result;
    }
  } as never);

  await service.createRule(ACCOUNT, USER, { description: 'Global', percentage: 10 });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [{
      staffId: 'staff-rollback',
      staffName: 'Rafael',
      itemKind: 'service',
      sourceType: 'manual',
      sourceId: 'manual-rollback',
      sourceDescription: 'Procedimento',
      baseAmount: 500,
      occurredAt: '2026-05-20'
    }]
  });
  await service.review(ACCOUNT, calculation.id, USER);

  rollback = true;
  await assert.rejects(
    () => service.markPaid(ACCOUNT, calculation.id, USER, { paymentMethod: 'pix' }),
    /transaction rolled back/
  );

  const restored = service.detail(ACCOUNT, calculation.id);
  assert.equal(restored.status, 'reviewed');
  assert.equal(restored.payableId, null);
});

test('CommissionsService validates rules, dates and account boundaries', async () => {
  const service = new CommissionsService();
  await assert.rejects(
    () => service.createRule(ACCOUNT, USER, {
      description: 'Sem profissional',
      scope: 'staff',
      percentage: 10
    }),
    ValidationError
  );
  await assert.rejects(
    () => service.calculate(ACCOUNT, USER, {
      periodStart: '2026-06-01',
      periodEnd: '2026-05-01',
      lines: []
    }),
    ValidationError
  );

  await service.createRule(ACCOUNT, USER, {
    description: 'Global',
    percentage: 10
  });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: []
  });

  assert.throws(() => service.detail(OTHER_ACCOUNT, calculation.id), Error);
});
