import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentsService } from './service.js';

const mockCtx = {
  requestId: 'req-1',
  actor: { accountId: 'acc-1', userId: 'user-1', roles: ['admin'], permissions: [] }
} as any;

const basePayment = {
  id: 'pay-1',
  accountId: 'acc-1',
  financialAccountId: 'fa-1',
  amount: 100.00,
  method: 'pix',
  status: 'completed',
  installments: 1,
  installmentNumber: 1,
  reference: 'PIX-001',
  notes: null,
  processedByUserId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Payments Service', () => {
  let mockRepo: any;
  let mockAudit: any;
  let svc: ReturnType<typeof createPaymentsService>;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn().mockResolvedValue(basePayment),
      list: vi.fn().mockResolvedValue({
        data: [basePayment],
        page: 1, pageSize: 20, total: 1
      }),
      create: vi.fn().mockResolvedValue(basePayment),
      updateStatus: vi.fn().mockResolvedValue({ ...basePayment, status: 'refunded' }),
      getSummaryByDateRange: vi.fn().mockResolvedValue({
        data: [{ method: 'pix', count: 5, totalAmount: 500 }],
        totalPayments: 5,
        totalAmount: 500
      })
    };
    mockAudit = vi.fn().mockResolvedValue(undefined);

    svc = createPaymentsService(
      { db: {} as any, requestContext: mockCtx },
      { repo: mockRepo, appendAudit: mockAudit }
    );
  });

  describe('create', () => {
    it('should create a single payment', async () => {
      const result = await svc.create({
        financialAccountId: 'fa-1',
        amount: 100,
        method: 'pix',
        installments: 1,
        reference: 'PIX-001'
      });

      expect((result as any).id).toBe('pay-1');
      expect((result as any).amount).toBe(100);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.create' })
      );
    });

    it('should create installment payments', async () => {
      mockRepo.create
        .mockResolvedValueOnce({ ...basePayment, id: 'pay-1', amount: 33.33, installmentNumber: 1 })
        .mockResolvedValueOnce({ ...basePayment, id: 'pay-2', amount: 33.33, installmentNumber: 2 })
        .mockResolvedValueOnce({ ...basePayment, id: 'pay-3', amount: 33.34, installmentNumber: 3 });

      const result = await svc.create({
        financialAccountId: 'fa-1',
        amount: 100,
        method: 'credit_card',
        installments: 3
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect((result as any[])[2].amount).toBe(33.34); // Last installment gets remainder
    });
  });

  describe('list', () => {
    it('should list payments', async () => {
      const result = await svc.list({ page: 1, pageSize: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by method', async () => {
      await svc.list({ page: 1, pageSize: 20, method: 'pix' });
      expect(mockRepo.list).toHaveBeenCalledWith('acc-1',
        expect.objectContaining({ method: 'pix' })
      );
    });
  });

  describe('refund', () => {
    it('should refund a completed payment', async () => {
      const result = await svc.refund('pay-1');
      expect(result!.status).toBe('refunded');
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.refund' })
      );
    });

    it('should reject refund of non-completed payment', async () => {
      mockRepo.findById.mockResolvedValueOnce({ ...basePayment, status: 'pending' });
      await expect(svc.refund('pay-1')).rejects.toThrow('Only completed payments');
    });

    it('should return null for non-existent payment', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const result = await svc.refund('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should cancel a payment', async () => {
      const result = await svc.cancel('pay-1');
      expect(result!.status).toBe('refunded');
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.cancel' })
      );
    });

    it('should reject cancel of refunded payment', async () => {
      mockRepo.findById.mockResolvedValueOnce({ ...basePayment, status: 'refunded' });
      await expect(svc.cancel('pay-1')).rejects.toThrow('Refunded payments cannot be cancelled');
    });
  });

  describe('getSummary', () => {
    it('should get payment summary by date range', async () => {
      const result = await svc.getSummary(new Date('2026-01-01'), new Date('2026-12-31'));
      expect(result.totalPayments).toBe(5);
      expect(result.totalAmount).toBe(500);
      expect(result.data).toHaveLength(1);
    });
  });
});
