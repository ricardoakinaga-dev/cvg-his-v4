import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAppointmentsService } from './service.js';
import type { AppointmentRecord } from './types.js';

const mockRequestContext = {
  requestId: 'test-req-id',
  actor: {
    accountId: 'test-account-id',
    userId: 'test-user-id',
    roles: ['admin'],
    permissions: ['appointment.read', 'appointment.write']
  }
} as any;

const baseAppointment: AppointmentRecord = {
  id: 'appt-1',
  accountId: 'test-account-id',
  patientId: 'patient-1',
  ownerId: 'owner-1',
  professionalUserId: 'user-1',
  startAt: new Date('2026-03-20T10:00:00Z'),
  endAt: new Date('2026-03-20T10:30:00Z'),
  status: 'scheduled',
  type: 'consultation',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Appointments Service', () => {
  let mockRepo: any;
  let mockAppendAudit: any;
  let service: ReturnType<typeof createAppointmentsService>;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(baseAppointment),
      findById: vi.fn().mockResolvedValue(baseAppointment),
      updateById: vi.fn().mockResolvedValue({ ...baseAppointment, status: 'confirmed' }),
      list: vi.fn().mockResolvedValue({
        data: [baseAppointment],
        page: 1,
        pageSize: 20,
        total: 1
      }),
      cancel: vi.fn().mockResolvedValue({ ...baseAppointment, status: 'cancelled' })
    };
    mockAppendAudit = vi.fn().mockResolvedValue(undefined);

    service = createAppointmentsService(
      { db: {} as any, requestContext: mockRequestContext },
      { repo: mockRepo, appendAudit: mockAppendAudit }
    );
  });

  it('should create an appointment', async () => {
    const result = await service.create({
      patientId: 'patient-1',
      ownerId: 'owner-1',
      professionalUserId: 'user-1',
      startAt: new Date('2026-03-20T10:00:00Z'),
      endAt: new Date('2026-03-20T10:30:00Z')
    });

    expect(result.id).toBe('appt-1');
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockAppendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'appointment.create' })
    );
  });

  it('should reject appointment with endAt before startAt', async () => {
    await expect(
      service.create({
        patientId: 'patient-1',
        ownerId: 'owner-1',
        professionalUserId: 'user-1',
        startAt: new Date('2026-03-20T11:00:00Z'),
        endAt: new Date('2026-03-20T10:00:00Z')
      })
    ).rejects.toThrow('End time must be after start time');
  });

  it('should get appointment by id', async () => {
    const result = await service.getById('appt-1');
    expect(result).toEqual(baseAppointment);
    expect(mockRepo.findById).toHaveBeenCalledWith('test-account-id', 'appt-1');
  });

  it('should list appointments with filters', async () => {
    const result = await service.list({
      page: 1,
      pageSize: 20,
      status: 'scheduled'
    } as any);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'test-account-id',
        status: 'scheduled'
      })
    );
  });

  it('should cancel an appointment', async () => {
    const result = await service.cancel('appt-1');
    expect(result.status).toBe('cancelled');
    expect(mockAppendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'appointment.cancel' })
    );
  });

  it('should not cancel a completed appointment', async () => {
    mockRepo.findById.mockResolvedValueOnce({ ...baseAppointment, status: 'completed' });
    await expect(service.cancel('appt-1')).rejects.toThrow(
      'Cannot cancel a cancelled or completed appointment'
    );
  });

  it('should reject update with invalid time range', async () => {
    await expect(
      service.update('appt-1', {
        endAt: new Date('2026-03-20T09:00:00Z')
      })
    ).rejects.toThrow('End time must be after start time');
  });
});
