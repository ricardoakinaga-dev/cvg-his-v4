import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAvailabilityService, createTypeConfigService } from './service.js';
import type { AvailabilityRecord, TypeConfigRecord } from './types.js';

const mockRequestContext = {
  requestId: 'test-req-id',
  actor: {
    accountId: 'test-account-id',
    userId: 'test-user-id',
    roles: ['admin'],
    permissions: ['appointment.read', 'appointment.write']
  }
} as any;

const baseAvailability: AvailabilityRecord = {
  id: 'avail-1',
  accountId: 'test-account-id',
  professionalUserId: 'user-1',
  dayOfWeek: 1,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationMinutes: 30,
  notes: null
};

const baseTypeConfig: TypeConfigRecord = {
  id: 'type-1',
  accountId: 'test-account-id',
  code: 'consultation',
  name: 'Consulta Veterinária',
  description: 'Consulta clínica geral',
  defaultDurationMinutes: 30,
  color: '#4CAF50',
  active: true
};

describe('Availability Service', () => {
  let mockRepo: any;
  let mockAppendAudit: any;
  let service: ReturnType<typeof createAvailabilityService>;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(baseAvailability),
      findById: vi.fn().mockResolvedValue(baseAvailability),
      list: vi.fn().mockResolvedValue({ data: [baseAvailability], total: 1 }),
      updateById: vi.fn().mockResolvedValue({ ...baseAvailability, slotDurationMinutes: 45 }),
      deleteById: vi.fn().mockResolvedValue(true)
    };
    mockAppendAudit = vi.fn().mockResolvedValue(undefined);

    service = createAvailabilityService(
      { db: {} as any, requestContext: mockRequestContext },
      { repo: mockRepo, appendAudit: mockAppendAudit }
    );
  });

  it('should create availability', async () => {
    const result = await service.create({
      professionalUserId: 'user-1',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '12:00'
    });
    expect(result.id).toBe('avail-1');
    expect(mockAppendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'availability.create' }));
  });

  it('should reject when endTime <= startTime', async () => {
    await expect(
      service.create({ professionalUserId: 'user-1', dayOfWeek: 1, startTime: '12:00', endTime: '08:00' })
    ).rejects.toThrow('End time must be after start time');
  });

  it('should list availability', async () => {
    const result = await service.list({ page: 1, pageSize: 20 } as any);
    expect(result.data).toHaveLength(1);
  });

  it('should delete availability', async () => {
    const result = await service.delete('avail-1');
    expect(result).toBe(true);
    expect(mockAppendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'availability.delete' }));
  });

  it('should return false when deleting non-existent', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);
    const result = await service.delete('non-existent');
    expect(result).toBe(false);
  });
});

describe('TypeConfig Service', () => {
  let mockRepo: any;
  let mockAppendAudit: any;
  let service: ReturnType<typeof createTypeConfigService>;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(baseTypeConfig),
      findById: vi.fn().mockResolvedValue(baseTypeConfig),
      findByCode: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ data: [baseTypeConfig], page: 1, pageSize: 20, total: 1 }),
      updateById: vi.fn().mockResolvedValue({ ...baseTypeConfig, name: 'Updated' }),
      deleteById: vi.fn().mockResolvedValue(true)
    };
    mockAppendAudit = vi.fn().mockResolvedValue(undefined);

    service = createTypeConfigService(
      { db: {} as any, requestContext: mockRequestContext },
      { repo: mockRepo, appendAudit: mockAppendAudit }
    );
  });

  it('should create type config', async () => {
    const result = await service.create({ code: 'consultation', name: 'Consulta Veterinária' });
    expect(result.id).toBe('type-1');
  });

  it('should reject duplicate code', async () => {
    mockRepo.findByCode.mockResolvedValueOnce(baseTypeConfig);
    await expect(service.create({ code: 'consultation', name: 'Test' })).rejects.toThrow(
      'Type config code already exists'
    );
  });

  it('should list type configs', async () => {
    const result = await service.list({ page: 1, pageSize: 20 } as any);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should delete type config', async () => {
    const result = await service.delete('type-1');
    expect(result).toBe(true);
  });
});
