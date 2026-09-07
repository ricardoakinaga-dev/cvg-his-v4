import { describe, expect, it } from 'vitest';
import { InMemoryCardTransactionRepository } from './card-transaction-repository.js';

describe('ephemeral capture transaction', () => {
  it('fences concurrent dispatch and retains dispatch knowledge after rollback', async () => {
    const repository = new InMemoryCardTransactionRepository();
    await repository.create({ transactionId: 'capture', accountId: 'a', provider: 'local-card',
      amount: 1, currency: 'BRL', description: 'test', installments: 1, status: 'pending',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), billingSettlementStatus: 'not_applicable' });
    await expect(repository.withCaptureLock('a', 'capture', async (claim, beginFinalization) => {
      expect(await claim()).toBe(true);
      expect(await repository.withCaptureLock('a', 'capture', async () => 'duplicate')).toEqual({ acquired: false });
      await beginFinalization();
      await repository.updateStatus({ transactionId: 'capture', status: 'captured' });
      throw new Error('outbox unavailable');
    })).rejects.toThrow('outbox unavailable');
    expect((await repository.findByTransactionId('capture'))?.status).toBe('pending');
    expect(await repository.withCaptureLock('a', 'capture', async claim => claim())).toEqual({ acquired: true, value: false });
  });
});
