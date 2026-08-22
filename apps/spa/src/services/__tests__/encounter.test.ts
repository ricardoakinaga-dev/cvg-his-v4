import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiRequest = vi.fn();

vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

describe('encounterService financial mutations', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('closes the financial account without the disabled paidAmount field', async () => {
    mockApiRequest.mockResolvedValue({ encounterId: 'enc-1' });
    const { encounterService } = await import('../encounter');

    await encounterService.closeFinancial('enc-1', { notes: 'Parcela única' });

    expect(mockApiRequest).toHaveBeenCalledWith('/encounters/enc-1/financial-close', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Parcela única' })
    });
  });

  it('creates a cash receipt with a caller-owned idempotency key', async () => {
    mockApiRequest.mockResolvedValue({ id: 'receipt-1' });
    const { encounterService } = await import('../encounter');

    await encounterService.createCashReceipt(
      'enc-1',
      { cashRegisterId: 'register-1', expectedAmount: 125.5, notes: 'Dinheiro' },
      'receipt-request-1'
    );

    expect(mockApiRequest).toHaveBeenCalledWith('/encounters/enc-1/cash-receipts', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'receipt-request-1' },
      body: JSON.stringify({
        cashRegisterId: 'register-1',
        expectedAmount: 125.5,
        notes: 'Dinheiro'
      })
    });
  });
});
