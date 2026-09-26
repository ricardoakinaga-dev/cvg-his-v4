import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mocks.apiRequest(...args)
}));

import { patientService } from '../patient';

describe('patient list service contract', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
  });

  it('serializes list filters and preserves pagination metadata from the API', async () => {
    const response = {
      items: [],
      page: 2,
      pageSize: 1,
      total: 3,
      totalPages: 3
    };
    mocks.apiRequest.mockResolvedValue(response);

    const result = await patientService.listPage({
      search: 'Luna & Kira',
      ownerId: 'owner/1',
      species: 'canine',
      status: 'active',
      page: 2,
      pageSize: 1
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      '/patients?q=Luna+%26+Kira&ownerId=owner%2F1&species=canine&status=active&page=2&pageSize=1'
    );
    expect(result).toEqual(response);
    expect(result.totalPages).toBe(3);
  });

  it('keeps explicitly supplied zero pagination values for server validation', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [] });

    await patientService.listPage({ page: 0, pageSize: 0 });

    expect(mocks.apiRequest).toHaveBeenCalledWith('/patients?page=0&pageSize=0');
  });
});
