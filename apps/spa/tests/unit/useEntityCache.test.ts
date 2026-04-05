import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEntityCache } from '@/composables/useEntityCache';

const mockGetById = vi.fn();

vi.mock('@/services/owner', () => ({
  get ownerService() {
    return { getById: mockGetById };
  }
}));

vi.mock('@/services/patient', () => ({
  get patientService() {
    return { getById: mockGetById };
  }
}));

describe('useEntityCache', () => {
  beforeEach(() => {
    mockGetById.mockReset();
    const { clearCache } = useEntityCache();
    clearCache();
  });

  it('returns fallback for empty id', async () => {
    const { getOwnerName, getPatientName } = useEntityCache();
    expect(await getOwnerName('')).toBe('—');
    expect(await getPatientName('')).toBe('—');
  });

  it('returns fallback name when fetch fails', async () => {
    mockGetById.mockRejectedValue(new Error('Not found'));

    const { getOwnerName } = useEntityCache();
    const result = await getOwnerName('abc123456789');
    expect(result).toBe('Tutor abc12345...');
  });

  it('returns patient name when fetch succeeds', async () => {
    mockGetById.mockResolvedValue({
      id: 'pet123',
      name: 'Rex',
      species: 'canine',
      sex: 'male',
      primaryOwnerId: 'own123',
      status: 'active',
      accountId: 'acc123',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    });

    const { getPatientName } = useEntityCache();
    const result = await getPatientName('pet123');
    expect(result).toBe('Rex');
  });

  it('caches result and returns it on subsequent calls', async () => {
    mockGetById.mockResolvedValue({
      id: 'pet999',
      name: 'Cached',
      species: 'canine',
      sex: 'male',
      primaryOwnerId: 'own999',
      status: 'active',
      accountId: 'acc999',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    });

    const { getPatientName } = useEntityCache();
    const r1 = await getPatientName('pet999');
    const r2 = await getPatientName('pet999');

    expect(r1).toBe('Cached');
    expect(r2).toBe('Cached');
    expect(mockGetById).toHaveBeenCalledTimes(1);
  });

  it('preloads owners into cache', async () => {
    const { preloadOwners, getOwnerName } = useEntityCache();
    preloadOwners([
      { id: 'o1', fullName: 'Alice' },
      { id: 'o2', fullName: 'Bob' }
    ]);

    const result = await getOwnerName('o1');
    expect(result).toBe('Alice');
  });

  it('preloads patients into cache', async () => {
    const { preloadPatients, getPatientName } = useEntityCache();
    preloadPatients([
      { id: 'p1', name: 'Buddy' },
      { id: 'p2', name: 'Luna' }
    ]);

    const result = await getPatientName('p1');
    expect(result).toBe('Buddy');
  });

  it('clears all cached data', async () => {
    const { preloadOwners, getOwnerName, clearCache } = useEntityCache();
    preloadOwners([{ id: 'o3', fullName: 'Charlie' }]);

    clearCache();

    mockGetById.mockResolvedValue({
      id: 'o3',
      fullName: 'Charlie Updated',
      contacts: [],
      financialResponsible: false,
      status: 'active',
      accountId: 'acc',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    });

    const result = await getOwnerName('o3');
    expect(result).toBe('Charlie Updated');
  });
});
