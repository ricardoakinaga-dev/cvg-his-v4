import { describe, it, expect, beforeEach } from 'vitest';
import { UsersService } from './index.js';
import type { UserId } from '@cvg-his-v2/shared-types';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService([]);
  });

  it('should list users (empty with no seeds)', () => {
    expect(service.list().length).toBe(0);
  });

  it('should throw NotFoundError for missing user', () => {
    expect(() => service.getOrThrow('missing' as UserId)).toThrow();
  });

  it('should not find by username when empty', () => {
    expect(service.findByUsername('admin')).toBeUndefined();
  });
});
