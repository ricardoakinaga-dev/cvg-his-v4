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

describe('Exam Orders Service', () => {
  let mockRepo: any; let mockAudit: any; let svc: ReturnType<typeof createExamOrdersService>;
  beforeEach(() => {
    mockRepo = { create: vi.fn().mockResolvedValue(baseOrder), findById: vi.fn().mockResolvedValue(baseOrder), list: vi.fn().mockResolvedValue({ data: [baseOrder], page: 1, pageSize: 20, total: 1 }), updateById: vi.fn().mockResolvedValue({ ...baseOrder, status: 'completed' }) };
    mockAudit = vi.fn().mockResolvedValue(undefined);
    svc = createExamOrdersService({ db: { $client: { query: vi.fn() } } as any, requestContext: mockCtx }, { repo: mockRepo, appendAudit: mockAudit });
  });

  it('should create exam order', async () => {
    const r = await svc.create({ patientId: 'pat-1', examName: 'Hemograma completo', examCode: 'HEMO' });
    expect(r.id).toBe('order-1');
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'examOrder.create' }));
  });

  it('should list exam orders', async () => {
    const r = await svc.list({ page: 1, pageSize: 20 } as any);
    expect(r.data).toHaveLength(1);
  });

  it('should update exam order status', async () => {
    const r = await svc.update('order-1', { status: 'completed' });
    expect(r?.status).toBe('completed');
  });

  it('should return null when updating non-existent', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);
    const r = await svc.update('nonexistent', { status: 'completed' });
    expect(r).toBeNull();
  });
});

describe('Exam Results Service', () => {
  let mockRepo: any; let mockOrdersRepo: any; let mockAudit: any; let svc: ReturnType<typeof createExamResultsService>;
  beforeEach(() => {
    mockRepo = { create: vi.fn().mockResolvedValue(baseResult), findById: vi.fn().mockResolvedValue(baseResult), list: vi.fn().mockResolvedValue({ data: [baseResult], page: 1, pageSize: 20, total: 1 }), updateById: vi.fn().mockResolvedValue({ ...baseResult, status: 'released' }) };
    mockOrdersRepo = { findById: vi.fn().mockResolvedValue(baseOrder) };
    mockAudit = vi.fn().mockResolvedValue(undefined);
    svc = createExamResultsService({ db: { $client: { query: vi.fn() } } as any, requestContext: mockCtx }, { repo: mockRepo, ordersRepo: mockOrdersRepo, appendAudit: mockAudit });
  });

  it('should create exam result from order', async () => {
    const r = await svc.create({ examOrderId: 'order-1', findings: 'Normal', interpretation: 'OK' });
    expect(r.id).toBe('result-1');
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'examResult.create' }));
  });

  it('should reject if order not found', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce(null);
    await expect(svc.create({ examOrderId: 'bad-id', findings: 'x' })).rejects.toThrow('Exam order not found');
  });

  it('should list exam results', async () => {
    const r = await svc.list({ page: 1, pageSize: 20 } as any);
    expect(r.data).toHaveLength(1);
  });

  it('should update exam result', async () => {
    const r = await svc.update('result-1', { status: 'released', findings: 'Final findings' });
    expect(r?.status).toBe('released');
  });
});
