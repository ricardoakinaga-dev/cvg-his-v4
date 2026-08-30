import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('../api', () => ({ apiRequest: mocks.apiRequest }));

describe('advancePaymentsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards canonical list filters without inventing owner balances', async () => {
    mocks.apiRequest.mockResolvedValueOnce({ items: [] });
    const { advancePaymentsService } = await import('../advance-payments');

    await advancePaymentsService.list({
      search: 'João',
      status: 'partially_compensated',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31'
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      '/finance/advance-payments?search=Jo%C3%A3o&status=partially_compensated&dateFrom=2026-08-01&dateTo=2026-08-31'
    );
  });

  it('uses POST commands for issuance and append-only compensation', async () => {
    mocks.apiRequest.mockResolvedValue({});
    const { advancePaymentsService } = await import('../advance-payments');

    await advancePaymentsService.create({
      ownerId: 'owner-1',
      amountCents: 18000,
      sourceId: 'receipt-001'
    });
    await advancePaymentsService.compensate('payment/1', {
      amountCents: 5000,
      reference: 'billing-001'
    });

    expect(mocks.apiRequest).toHaveBeenNthCalledWith(1, '/finance/advance-payments', {
      method: 'POST',
      body: JSON.stringify({ ownerId: 'owner-1', amountCents: 18000, sourceId: 'receipt-001' })
    });
    expect(mocks.apiRequest).toHaveBeenNthCalledWith(2, '/finance/advance-payments/payment%2F1/allocations', {
      method: 'POST',
      body: JSON.stringify({ amountCents: 5000, reference: 'billing-001' })
    });
  });
});
