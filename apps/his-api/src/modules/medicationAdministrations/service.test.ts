import { describe, expect, it, vi } from 'vitest';

import { createMedicationAdministrationsService } from './service.js';

describe('medication administrations service', () => {
  it('creates follow-up requirement (alert) when dose is refused', async () => {
    const fakeRepo = {
      create: vi.fn(),
      list: vi.fn(),
      findOrderInAccount: vi.fn(),
      findOrderInfo: vi.fn(),
      findPatientInfo: vi.fn()
    };

    const fakeAlertsRepo = {
      create: vi.fn()
    };

    const mockDb = {
      $client: {
        query: vi.fn()
      }
    };

    fakeRepo.create.mockResolvedValue({
      id: 'admin_1',
      accountId: 'acc1',
      stayId: 'stay_1',
      encounterId: null,
      orderId: 'order_1',
      scheduledFor: new Date('2026-02-20T10:00:00Z'),
      status: 'refused',
      delayedUntil: null,
      effectiveAt: null,
      administeredAt: null,
      reason: 'Paciente recusou',
      administeredByUserId: 'user_1',
      createdAt: new Date()
    });

    fakeRepo.findOrderInAccount.mockResolvedValue({
      id: 'order_1',
      patientId: 'patient_1',
      stayId: 'stay_1',
      encounterId: null,
      status: 'active'
    });

    fakeRepo.findOrderInfo.mockResolvedValue({
      medicationName: 'Aspirin',
      patientName: 'John Doe'
    });

    const requestContext = {
      actor: { accountId: 'acc1', userId: 'user1', roles: ['admin'] },
      requestId: 'req_1'
    };

    vi.doMock('../alerts/repo.js', () => ({
      createAlertsRepo: () => fakeAlertsRepo
    }));

    const { createMedicationAdministrationsService: createService } = await import('./service.js');

    const service = createService(
      { db: mockDb as any, requestContext: requestContext as any },
      { repo: fakeRepo as any, appendAudit: vi.fn() as any }
    );

    const result = await service.record({
      stayId: 'stay_1',
      orderId: 'order_1',
      scheduledFor: '2026-02-20T10:00:00.000Z',
      status: 'refused',
      reason: 'Paciente recusou'
    });

    expect(result.kind).toBe('recorded');
    expect(fakeAlertsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'acc1',
        type: 'dose_refused_needs_review',
        stayId: 'stay_1',
        orderId: 'order_1',
        severity: 'medium',
        message: 'Dose refused: Aspirin for John Doe'
      })
    );
  });
});
