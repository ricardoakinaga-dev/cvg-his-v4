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

  it('reverses a cash receipt with a caller-owned idempotency key and reason', async () => {
    mockApiRequest.mockResolvedValue({ id: 'reversal-1' });
    const { encounterService } = await import('../encounter');

    await encounterService.reverseCashReceipt(
      'enc-1',
      'receipt-1',
      'Correção autorizada',
      'reversal-request-1'
    );

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/encounters/enc-1/cash-receipts/receipt-1/reverse',
      {
        method: 'POST',
        headers: { 'Idempotency-Key': 'reversal-request-1' },
        body: JSON.stringify({ reason: 'Correção autorizada' })
      }
    );
  });

  it('recovers the latest cash receipt with its durable reversal projection', async () => {
    mockApiRequest.mockResolvedValue({ id: 'receipt-1', reversalId: 'reversal-1' });
    const { encounterService } = await import('../encounter');

    await encounterService.getCashReceiptForEncounter('enc-1', { includeReversed: true });

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/encounters/enc-1/cash-receipts?includeReversed=true'
    );
  });
});
