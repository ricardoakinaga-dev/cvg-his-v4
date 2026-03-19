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

  // =====================
  // CREATE
  // =====================

  describe('create', () => {
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

    it('should reject appointment with endAt equal to startAt', async () => {
      await expect(
        service.create({
          patientId: 'patient-1',
          ownerId: 'owner-1',
          professionalUserId: 'user-1',
          startAt: new Date('2026-03-20T10:00:00Z'),
          endAt: new Date('2026-03-20T10:00:00Z')
        })
      ).rejects.toThrow('End time must be after start time');
    });

    it('should reject when actor context is missing', async () => {
      const serviceNoActor = createAppointmentsService(
        { db: {} as any, requestContext: { requestId: 'test', actor: null } as any },
        { repo: mockRepo, appendAudit: mockAppendAudit }
      );

      await expect(
        serviceNoActor.create({
          patientId: 'patient-1',
          ownerId: 'owner-1',
          professionalUserId: 'user-1',
          startAt: new Date('2026-03-20T10:00:00Z'),
          endAt: new Date('2026-03-20T10:30:00Z')
        })
      ).rejects.toThrow('Actor context is required');
    });

    it('should create appointment with all optional fields', async () => {
      const result = await service.create({
        patientId: 'patient-1',
        ownerId: 'owner-1',
        professionalUserId: 'user-1',
        startAt: new Date('2026-03-20T10:00:00Z'),
        endAt: new Date('2026-03-20T10:30:00Z'),
        type: 'vaccination',
        notes: 'First dose of rabies vaccine'
      });

      expect(result.id).toBe('appt-1');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'vaccination',
          notes: 'First dose of rabies vaccine'
        })
      );
    });
  });

  // =====================
  // GET BY ID
  // =====================

  describe('getById', () => {
    it('should get appointment by id', async () => {
      const result = await service.getById('appt-1');
      expect(result).toEqual(baseAppointment);
      expect(mockRepo.findById).toHaveBeenCalledWith('test-account-id', 'appt-1');
    });

    it('should return null for non-existent appointment', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const result = await service.getById('non-existent');
      expect(result).toBeNull();
    });
  });

  // =====================
  // LIST
  // =====================

  describe('list', () => {
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

    it('should pass date range filters', async () => {
      const dateFrom = new Date('2026-03-01');
      const dateTo = new Date('2026-03-31');

      await service.list({
        page: 1,
        pageSize: 20,
        dateFrom,
        dateTo
      } as any);

      expect(mockRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom,
          dateTo
        })
      );
    });

    it('should pass professional user filter', async () => {
      await service.list({
        page: 1,
        pageSize: 20,
        professionalUserId: 'user-42'
      } as any);

      expect(mockRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          professionalUserId: 'user-42'
        })
      );
    });
  });

  // =====================
  // UPDATE
  // =====================

  describe('update', () => {
    it('should update an appointment', async () => {
      const result = await service.update('appt-1', {
        status: 'confirmed'
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('confirmed');
      expect(mockAppendAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'appointment.update' })
      );
    });

    it('should return null for non-existent appointment', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const result = await service.update('non-existent', { status: 'confirmed' });
      expect(result).toBeNull();
    });

    it('should reject update with invalid time range', async () => {
      await expect(
        service.update('appt-1', {
          endAt: new Date('2026-03-20T09:00:00Z')
        })
      ).rejects.toThrow('End time must be after start time');
    });

    it('should reject update on cancelled appointment', async () => {
      mockRepo.findById.mockResolvedValueOnce({ ...baseAppointment, status: 'cancelled' });
      await expect(
        service.update('appt-1', { status: 'confirmed' })
      ).rejects.toThrow('Cannot update a cancelled or completed appointment');
    });

    it('should reject update on completed appointment', async () => {
      mockRepo.findById.mockResolvedValueOnce({ ...baseAppointment, status: 'completed' });
      await expect(
        service.update('appt-1', { notes: 'test' })
      ).rejects.toThrow('Cannot update a cancelled or completed appointment');
    });

    it('should allow update when endAt changes but still valid', async () => {
      mockRepo.findById.mockResolvedValueOnce({
        ...baseAppointment,
        startAt: new Date('2026-03-20T10:00:00Z'),
        endAt: new Date('2026-03-20T10:30:00Z')
      });

      const result = await service.update('appt-1', {
        endAt: new Date('2026-03-20T11:00:00Z')
      });

      expect(result).not.toBeNull();
    });
  });

  // =====================
  // CANCEL
  // =====================

  describe('cancel', () => {
    it('should cancel an appointment', async () => {
      const result = await service.cancel('appt-1');
      expect(result!.status).toBe('cancelled');
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

    it('should not cancel an already cancelled appointment', async () => {
      mockRepo.findById.mockResolvedValueOnce({ ...baseAppointment, status: 'cancelled' });
      await expect(service.cancel('appt-1')).rejects.toThrow(
        'Cannot cancel a cancelled or completed appointment'
      );
    });

    it('should return null for non-existent appointment', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      const result = await service.cancel('non-existent');
      expect(result).toBeNull();
    });

    it('should allow cancel on in_progress appointment', async () => {
      mockRepo.findById.mockResolvedValueOnce({ ...baseAppointment, status: 'in_progress' });
      const result = await service.cancel('appt-1');
      expect(result!.status).toBe('cancelled');
    });
  });
});
