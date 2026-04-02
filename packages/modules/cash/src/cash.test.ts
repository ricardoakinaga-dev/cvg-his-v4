import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CashService } from './index.js';

function createService() {
  return new CashService();
}

const ACCOUNT_ID = 'acc_test_001' as AccountId;
const USER_ID = 'user_001' as UserId;

test('CashService openRegister creates register with correct fields', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  assert.equal(reg.accountId, ACCOUNT_ID);
  assert.equal(reg.openedByUserId, USER_ID);
  assert.equal(reg.status, 'open');
  assert.equal(reg.openingAmount, 100);
  assert.equal(reg.closingAmount, null);
  assert.ok(reg.id);
});

test('CashService openRegister rejects if already open', async () => {
  const service = createService();
  await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await assert.rejects(
    () => service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 50 }),
    ConflictError
  );
});

test('CashService closeRegister closes with difference', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await service.recordPaymentMovement(reg.id, ACCOUNT_ID, 50, 'ref-1', 'Payment', USER_ID);
  const result = await service.closeRegister(reg.id, USER_ID, { closingAmount: 140 });
  assert.equal(result.register.status, 'closed');
  assert.equal(result.difference, -10);
});

test('CashService recordMovement adds supply', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  const mov = await service.recordMovement(
    reg.id,
    ACCOUNT_ID,
    {
      movementType: 'supply',
      amount: 50
    },
    USER_ID
  );
  assert.equal(mov.movementType, 'supply');
  assert.equal(mov.amount, 50);
  assert.equal(mov.runningBalance, 150);
});

test('CashService recordMovement withdrawal reduces balance', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  const mov = await service.recordMovement(
    reg.id,
    ACCOUNT_ID,
    {
      movementType: 'withdrawal',
      amount: 30
    },
    USER_ID
  );
  assert.equal(mov.movementType, 'withdrawal');
  assert.equal(mov.runningBalance, 70);
});

test('CashService recordMovement rejects withdrawal over balance', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 50 });
  await assert.rejects(
    () =>
      service.recordMovement(
        reg.id,
        ACCOUNT_ID,
        { movementType: 'withdrawal', amount: 100 },
        USER_ID
      ),
    ConflictError
  );
});

test('CashService recordMovement rejects on closed register', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await service.closeRegister(reg.id, USER_ID, { closingAmount: 100 });
  await assert.rejects(
    () =>
      service.recordMovement(reg.id, ACCOUNT_ID, { movementType: 'supply', amount: 10 }, USER_ID),
    ConflictError
  );
});

test('CashService recordPaymentMovement adds to balance', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  const mov = await service.recordPaymentMovement(
    reg.id,
    ACCOUNT_ID,
    75,
    'sale-1',
    'Payment for sale',
    USER_ID
  );
  assert.equal(mov.movementType, 'payment');
  assert.equal(mov.amount, 75);
  assert.equal(mov.runningBalance, 175);
});

test('CashService findOpenRegister returns open register', async () => {
  const service = createService();
  await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  const open = await service.findOpenRegister(ACCOUNT_ID);
  assert.ok(open);
  assert.equal(open?.status, 'open');
});

test('CashService findOpenRegister returns null when closed', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await service.closeRegister(reg.id, USER_ID, { closingAmount: 100 });
  const open = await service.findOpenRegister(ACCOUNT_ID);
  assert.equal(open, null);
});

test('CashService getCurrentBalance returns correct balance', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await service.recordPaymentMovement(reg.id, ACCOUNT_ID, 50, null, null, USER_ID);
  await service.recordMovement(
    reg.id,
    ACCOUNT_ID,
    { movementType: 'withdrawal', amount: 20 },
    USER_ID
  );
  const balance = await service.getCurrentBalance(reg.id);
  assert.equal(balance, 130);
});

test('CashService getMovements returns all movements', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await service.recordPaymentMovement(reg.id, ACCOUNT_ID, 50, null, null, USER_ID);
  await service.recordMovement(reg.id, ACCOUNT_ID, { movementType: 'supply', amount: 25 }, USER_ID);
  const movements = await service.getMovements(reg.id);
  assert.equal(movements.length, 3);
});

test('CashService listRegisters returns registers sorted by date', async () => {
  const service = createService();
  const r1 = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await service.closeRegister(r1.id, USER_ID, { closingAmount: 100 });
  await new Promise((r) => setTimeout(r, 2));
  const r2 = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 200 });
  const regs = service.listRegisters(ACCOUNT_ID);
  assert.equal(regs.length, 2);
  assert.equal(regs[0].openingAmount, 200);
  assert.equal(regs[1].openingAmount, 100);
});

test('CashService persistenceMode is in-memory without repository', () => {
  const service = createService();
  assert.equal(service.persistenceMode, 'in-memory');
});

test('CashService closeRegister rejects if already closed', async () => {
  const service = createService();
  const reg = await service.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100 });
  await service.closeRegister(reg.id, USER_ID, { closingAmount: 100 });
  await assert.rejects(
    () => service.closeRegister(reg.id, USER_ID, { closingAmount: 100 }),
    ConflictError
  );
});
