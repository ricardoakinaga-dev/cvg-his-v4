import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiRequest = vi.fn();

vi.mock('@/services/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

import { counterSalesService } from '@/services/counterSales';

describe('counterSalesService.cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue({ status: 'cancelled' });
  });

  it('sends the required trimmed reason to the existing cancellation endpoint', async () => {
    await counterSalesService.cancel('sale-1', '  Cliente desistiu  ');

    expect(mockApiRequest).toHaveBeenCalledWith('/counter-sales/sale-1/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Cliente desistiu' })
    });
  });

  it('rejects an empty or oversized reason before making the request', async () => {
    await expect(counterSalesService.cancel('sale-1', '   ')).rejects.toThrow(
      'O motivo do cancelamento é obrigatório.'
    );
    await expect(counterSalesService.cancel('sale-1', 'x'.repeat(501))).rejects.toThrow(
      'O motivo do cancelamento deve ter no máximo 500 caracteres.'
    );
    await expect(counterSalesService.cancel('sale-1', 'Cliente\n desistiu')).rejects.toThrow(
      'O motivo do cancelamento não pode conter caracteres de controle.'
    );
    await expect(counterSalesService.cancel('sale-1', 'Cliente desistiu\n')).rejects.toThrow(
      'O motivo do cancelamento não pode conter caracteres de controle.'
    );

    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
