import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExamOrdersService, createExamResultsService } from './service.js';
import type { ExamOrderRecord, ExamResultRecord } from './types.js';

const mockCtx = { requestId: 'req-1', actor: { accountId: 'acc-1', userId: 'user-1', roles: ['admin'], permissions: [] } } as any;

const baseOrder: ExamOrderRecord = {
  id: 'order-1', accountId: 'acc-1', patientId: 'pat-1', encounterId: 'enc-1',
  requestedByUserId: 'user-1', category: 'laboratory', examName: 'Hemograma completo',
  examCode: 'HEMO', priority: 'routine', status: 'requested', notes: null,
  requestedAt: new Date(), completedAt: null, createdAt: new Date(), updatedAt: new Date()
};

const baseResult: ExamResultRecord = {
  id: 'result-1', accountId: 'acc-1', patientId: 'pat-1', examOrderId: 'order-1',
  category: 'laboratory', examName: 'Hemograma completo', examCode: 'HEMO',
  requestedAt: new Date(), status: 'draft', findings: 'Valores dentro da normalidade',
  interpretation: 'Sem alterações significativas', resultValues: '{"hemacias":5.2}',
  normalRange: '{"hemacias":"4.5-6.5"}', performedByUserId: null, performedAt: null,
  reviewedByUserId: null, reviewedAt: null, releasedAt: null, notes: null,
  createdAt: new Date(), updatedAt: new Date()
};

// =====================
// Exam Orders
// =====================

describe('Exam Orders Service', () => {
  let mockRepo: any;
  let mockAudit: any;
  let svc: ReturnType<typeof createExamOrdersService>;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(baseOrder),
      findById: vi.fn().mockResolvedValue(baseOrder),
      list: vi.fn().mockResolvedValue({ data: [baseOrder], page: 1, pageSize: 20, total: 1 }),
      updateById: vi.fn().mockResolvedValue({ ...baseOrder, status: 'completed' })
    };
    mockAudit = vi.fn().mockResolvedValue(undefined);
    svc = createExamOrdersService(
      { db: { $client: { query: vi.fn() } } as any, requestContext: mockCtx },
      { repo: mockRepo, appendAudit: mockAudit }
    );
  });

  describe('create', () => {
    it('should create exam order', async () => {
      const r = await svc.create({ patientId: 'pat-1', examName: 'Hemograma completo', examCode: 'HEMO' });
      expect(r.id).toBe('order-1');
      expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'examOrder.create' }));
    });

    it('should create with all optional fields', async () => {
      const r = await svc.create({
        patientId: 'pat-1',
        encounterId: 'enc-1',
        category: 'imaging',
        examName: 'Raio-X Tórax',
        examCode: 'RX-TOR',
        priority: 'urgent',
        notes: 'Suspeita de pneumonia'
      });
      expect(r.id).toBe('order-1');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'imaging',
          priority: 'urgent',
          notes: 'Suspeita de pneumonia'
        })
      );
    });

    it('should default category to laboratory', async () => {
      await svc.create({ patientId: 'pat-1', examName: 'Test' });
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'laboratory' })
      );
    });

    it('should reject when actor context is missing', async () => {
      const svcNoActor = createExamOrdersService(
        { db: {} as any, requestContext: { requestId: 'req', actor: null } as any },
        { repo: mockRepo, appendAudit: mockAudit }
      );
      await expect(
        svcNoActor.create({ patientId: 'pat-1', examName: 'Test' })
      ).rejects.toThrow('Actor context required');
    });
  });

  describe('getById', () => {
    it('should get order by id', async () => {
      const r = await svc.getById('order-1');
      expect(r).toEqual(baseOrder);
      expect(mockRepo.findById).toHaveBeenCalledWith('acc-1', 'order-1');
    });

    it('should return null for non-existent order', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const r = await svc.getById('nonexistent');
      expect(r).toBeNull();
    });
  });

  describe('list', () => {
    it('should list exam orders', async () => {
      const r = await svc.list({ page: 1, pageSize: 20 } as any);
      expect(r.data).toHaveLength(1);
      expect(r.total).toBe(1);
    });

    it('should pass all filter params', async () => {
      await svc.list({
        page: 1, pageSize: 20, q: 'hemograma',
        patientId: 'pat-1', encounterId: 'enc-1',
        status: 'requested', category: 'laboratory',
        dateFrom: new Date('2026-01-01'), dateTo: new Date('2026-12-31')
      } as any);

      expect(mockRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          patientId: 'pat-1',
          encounterId: 'enc-1',
          status: 'requested',
          category: 'laboratory'
        })
      );
    });
  });

  describe('update', () => {
    it('should update exam order status', async () => {
      const r = await svc.update('order-1', { status: 'completed' });
      expect(r?.status).toBe('completed');
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'examOrder.update' })
      );
    });

    it('should return null when updating non-existent', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const r = await svc.update('nonexistent', { status: 'completed' });
      expect(r).toBeNull();
    });

    it('should return null when updateById returns null', async () => {
      mockRepo.updateById.mockResolvedValueOnce(null);
      const r = await svc.update('order-1', { status: 'completed' });
      expect(r).toBeNull();
    });

    it('should update priority and notes', async () => {
      await svc.update('order-1', { priority: 'stat', notes: 'Urgent update' });
      expect(mockRepo.updateById).toHaveBeenCalledWith(
        'acc-1', 'order-1',
        expect.objectContaining({ priority: 'stat', notes: 'Urgent update' })
      );
    });
  });
});

// =====================
// Exam Results
// =====================

describe('Exam Results Service', () => {
  let mockRepo: any;
  let mockOrdersRepo: any;
  let mockAudit: any;
  let svc: ReturnType<typeof createExamResultsService>;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(baseResult),
      findById: vi.fn().mockResolvedValue(baseResult),
      list: vi.fn().mockResolvedValue({ data: [baseResult], page: 1, pageSize: 20, total: 1 }),
      updateById: vi.fn().mockResolvedValue({ ...baseResult, status: 'released' })
    };
    mockOrdersRepo = { findById: vi.fn().mockResolvedValue(baseOrder) };
    mockAudit = vi.fn().mockResolvedValue(undefined);
    svc = createExamResultsService(
      { db: { $client: { query: vi.fn() } } as any, requestContext: mockCtx },
      { repo: mockRepo, ordersRepo: mockOrdersRepo, appendAudit: mockAudit }
    );
  });

  describe('create', () => {
    it('should create exam result from order', async () => {
      const r = await svc.create({
        examOrderId: 'order-1',
        findings: 'Normal',
        interpretation: 'OK'
      });
      expect(r.id).toBe('result-1');
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'examResult.create' })
      );
    });

    it('should reject if order not found', async () => {
      mockOrdersRepo.findById.mockResolvedValueOnce(null);
      await expect(
        svc.create({ examOrderId: 'bad-id', findings: 'x' })
      ).rejects.toThrow('Exam order not found');
    });

    it('should copy order data to result', async () => {
      await svc.create({
        examOrderId: 'order-1',
        findings: 'Test findings'
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          patientId: 'pat-1',
          examOrderId: 'order-1',
          category: 'laboratory',
          examName: 'Hemograma completo',
          examCode: 'HEMO'
        })
      );
    });

    it('should reject when actor context is missing', async () => {
      const svcNoActor = createExamResultsService(
        { db: {} as any, requestContext: { requestId: 'req', actor: null } as any },
        { repo: mockRepo, ordersRepo: mockOrdersRepo, appendAudit: mockAudit }
      );
      await expect(
        svcNoActor.create({ examOrderId: 'order-1', findings: 'x' })
      ).rejects.toThrow('Actor context required');
    });
  });

  describe('getById', () => {
    it('should get result by id', async () => {
      const r = await svc.getById('result-1');
      expect(r).toEqual(baseResult);
    });

    it('should return null for non-existent', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const r = await svc.getById('nonexistent');
      expect(r).toBeNull();
    });
  });

  describe('list', () => {
    it('should list exam results', async () => {
      const r = await svc.list({ page: 1, pageSize: 20 } as any);
      expect(r.data).toHaveLength(1);
    });

    it('should pass filter params', async () => {
      await svc.list({
        page: 1, pageSize: 20,
        patientId: 'pat-1', examOrderId: 'order-1',
        status: 'draft', category: 'laboratory'
      } as any);

      expect(mockRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          patientId: 'pat-1',
          examOrderId: 'order-1',
          status: 'draft',
          category: 'laboratory'
        })
      );
    });
  });

  describe('update', () => {
    it('should update exam result', async () => {
      const r = await svc.update('result-1', { status: 'released', findings: 'Final findings' });
      expect(r?.status).toBe('released');
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'examResult.update' })
      );
    });

    it('should return null for non-existent result', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const r = await svc.update('nonexistent', { status: 'released' });
      expect(r).toBeNull();
    });

    it('should return null when updateById fails', async () => {
      mockRepo.updateById.mockResolvedValueOnce(null);
      const r = await svc.update('result-1', { status: 'released' });
      expect(r).toBeNull();
    });
  });
});
