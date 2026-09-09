import { describe, expect, it, vi } from 'vitest';
import { userService } from '@/services/user';
import { apiRequest } from '@/services/api';

vi.mock('@/services/api', () => ({
  apiRequest: vi.fn()
}));

describe('userService', () => {
  it('uses a bounded timeout for the users collection read', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [] });

    await expect(userService.list()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith('/users', { timeoutMs: 10_000 });
  });
});
