import { describe, it, expect, beforeEach } from 'vitest';
import { StaffService } from './index.js';
import type { StaffId, UserId } from '@cvg-his-v2/shared-types';

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(() => {
    service = new StaffService([]);
  });

  it('should list staff (with seeds empty)', () => {
    expect(service.list().length).toBe(0);
  });

  it('should throw NotFoundError for missing staff', () => {
    expect(() => service.getOrThrow('missing' as StaffId)).toThrow();
  });

  it('should find by user id', () => {
    const result = service.findByUserId('missing' as UserId);
    expect(result).toBeUndefined();
  });
});
