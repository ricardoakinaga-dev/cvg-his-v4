import { describe, expect, it } from 'vitest';

import { ConflictError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CounterSalesService } from '../../../packages/modules/counter-sales/src/index.ts';

const ACCOUNT_ID = 'acc_test_001' as AccountId;
const USER_ID = 'user_001' as UserId;

describe('module-counter-sales / close flow', () => {
  it('records cash movements only for cash-like payment methods', async () => {
    const movements: Array<{ method: string; amount: number }> = [];
    const service = new CounterSalesService({
      cashService: {
        async getOpenRegister() {
          return { id: 'reg-1', runningBalance: 100 };
        },
        async recordMovement(_regId, _acct, _type, amount, runningBalance, reference, notes) {
          const method = notes?.split('via ')[1] ?? 'unknown';
          movements.push({ method, amount });
          return {
            id: `mov-${movements.length}`,
            cashRegisterId: 'reg-1',
            movementType: 'payment' as const,
            amount,
            runningBalance,
            reference,
            notes
          };
        }
      }
    });

    const sale = await service.open(ACCOUNT_ID, USER_ID);
    await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'A', unitPrice: 60 });
    await service.addPayment(sale.id, { method: 'cash', amount: 20 });
    await service.addPayment(sale.id, { method: 'pix', amount: 20 });
    await service.addPayment(sale.id, { method: 'credit_card', amount: 20 });

    const result = await service.close(sale.id, USER_ID);

    expect(result.sale.status).toBe('closed');
    expect(result.cashMovements).toHaveLength(2);
    expect(movements).toEqual([
      { method: 'cash', amount: 20 },
      { method: 'pix', amount: 20 }
    ]);
  });

  it('keeps the sale open when inventory consumption fails', async () => {
    const service = new CounterSalesService({
      inventoryService: {
        async consumeForSale() {
          throw new Error('Insufficient stock');
        }
      }
    });

    const sale = await service.open(ACCOUNT_ID, USER_ID);
    await service.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Item X',
      codeSnapshot: 'SKU-001',
      unitPrice: 10,
      quantity: 1
    });
    await service.addPayment(sale.id, { method: 'cash', amount: 10 });

    await expect(service.close(sale.id, USER_ID)).rejects.toThrow(ConflictError);
    expect(service.findById(sale.id)?.status).toBe('open');
  });
});
