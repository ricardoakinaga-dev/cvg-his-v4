import assert from 'node:assert/strict';
import { expect, test } from 'vitest';

import { AuthenticationError, ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CounterSalesService, type CounterSaleCancellationInput } from './index.js';

const ACCOUNT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as AccountId;
const USER_ID = '11111111-1111-1111-1111-111111111111' as UserId;

function input(
  reason: string,
  accountId: AccountId = ACCOUNT_ID,
  cancelledByUserId: UserId = USER_ID
): CounterSaleCancellationInput {
  return {
    accountId,
    cancelledByUserId,
    reason,
    correlationId: 'counter-sale-cancel-test'
  };
}

test('counter-sale cancellation requires a bounded non-empty reason and records provenance', async () => {
  const service = new CounterSalesService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);

  await assert.rejects(() => service.cancel(sale.id, input('   ')), ValidationError);
  await assert.rejects(() => service.cancel(sale.id, input('Cliente\n desistiu')), ValidationError);
  await assert.rejects(() => service.cancel(sale.id, input('Cliente desistiu\n')), ValidationError);

  const cancelled = await service.cancel(sale.id, input('Cliente desistiu da compra'));
  assert.equal(cancelled.status, 'cancelled');

  const history = await service.listCancellationHistory(ACCOUNT_ID, sale.id);
  assert.equal(history.length, 1);
  assert.equal(history[0]?.cancelledByUserId, USER_ID);
  assert.equal(history[0]?.reason, 'Cliente desistiu da compra');
  assert.equal(history[0]?.correlationId, 'counter-sale-cancel-test');
});

test('counter-sale cancellation is idempotent and returns immutable tenant-scoped history', async () => {
  const service = new CounterSalesService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);

  await service.cancel(sale.id, input('Primeiro motivo'));
  const firstHistory = await service.listCancellationHistory(ACCOUNT_ID, sale.id);
  const firstEvent = firstHistory[0];
  assert.ok(firstEvent);

  const tamperedEvent = { ...firstEvent, reason: 'tampered' };
  const second = await service.cancel(sale.id, input('Segundo motivo'));
  const secondHistory = await service.listCancellationHistory(ACCOUNT_ID, sale.id);

  assert.equal(second.status, 'cancelled');
  assert.equal(secondHistory.length, 1);
  assert.notDeepEqual(secondHistory[0], tamperedEvent);
  assert.equal(secondHistory[0]?.reason, 'Primeiro motivo');
});

test('counter-sale cancellation restores the projection when the durable transaction fails', async () => {
  const service = new CounterSalesService({
    cancelTransaction: async (_input, execute) => {
      await execute();
      throw new Error('audit append failed');
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);

  await assert.rejects(() => service.cancel(sale.id, input('Falha de auditoria')));
  assert.equal(service.getOrThrow(sale.id).status, 'open');
  assert.deepEqual(await service.listCancellationHistory(ACCOUNT_ID, sale.id), []);
});

test('counter-sale cancellation never shares an active promise across accounts', async () => {
  const accountB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as AccountId;
  const userB = '22222222-2222-2222-2222-222222222222' as UserId;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const service = new CounterSalesService({
    cancelTransaction: async (_input, execute) => {
      await gate;
      return execute();
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);

  const first = service.cancel(sale.id, input('Conta A cancela'));
  const crossAccount = service.cancel(sale.id, input('Conta B tenta', accountB, userB));
  release();

  await first;
  await expect(crossAccount).rejects.toBeInstanceOf(AuthenticationError);
});

test('counter-sale cancellation still rejects a closed sale', async () => {
  const service = new CounterSalesService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 10
  });
  await service.addPayment(sale.id, { method: 'cash', amount: 10 });
  await service.close(sale.id, USER_ID);

  await assert.rejects(() => service.cancel(sale.id, input('Tentativa indevida')), ConflictError);
});
