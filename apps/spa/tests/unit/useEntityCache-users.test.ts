import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEntityCache } from '@/composables/useEntityCache';

vi.mock('@/services/user', () => ({
  userService: {
    getById: vi.fn(),
    list: vi.fn()
  }
}));

describe('useEntityCache - users', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns dash for empty id', async () => {
    const { getUserName } = useEntityCache();
    expect(await getUserName('')).toBe('—');
  });

  it('fetches user name via userService.getById', async () => {
    const { userService } = await import('@/services/user');
    vi.mocked(userService.getById).mockResolvedValue({
      id: 'u1',
      accountId: 'a1',
      username: 'drsmith',
      email: 'smith@vet.com',
      displayName: 'Dr. Smith',
      roleCode: 'vet',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    const { getUserName } = useEntityCache();
    const name = await getUserName('u1');

    expect(name).toBe('Dr. Smith');
    expect(userService.getById).toHaveBeenCalledWith('u1');
  });

  it('caches user name on subsequent calls', async () => {
    const { userService } = await import('@/services/user');
    vi.mocked(userService.getById).mockResolvedValue({
      id: 'u2',
      accountId: 'a1',
      username: 'drjones',
      email: 'jones@vet.com',
      displayName: 'Dr. Jones',
      roleCode: 'vet',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    const { getUserName } = useEntityCache();
    await getUserName('u2');
    await getUserName('u2');

    expect(userService.getById).toHaveBeenCalledTimes(1);
  });

  it('returns fallback on fetch failure', async () => {
    const { userService } = await import('@/services/user');
    vi.mocked(userService.getById).mockRejectedValue(new Error('Not found'));

    const { getUserName } = useEntityCache();
    const name = await getUserName('bad-id');

    expect(name).toBe('User bad-id...');
  });

  it('clears user cache on clearCache', async () => {
    const { userService } = await import('@/services/user');
    vi.mocked(userService.getById).mockResolvedValue({
      id: 'u3',
      accountId: 'a1',
      username: 'drvet',
      email: 'vet@vet.com',
      displayName: 'Dr. Vet',
      roleCode: 'vet',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    const { getUserName, clearCache } = useEntityCache();
    await getUserName('u3');
    clearCache();
    await getUserName('u3');

    expect(userService.getById).toHaveBeenCalledTimes(2);
  });

  it('preloads users from direct list', async () => {
    const { preloadUsers, getUserName } = useEntityCache();

    preloadUsers([
      { id: 'u10', displayName: 'Dr. Preloaded' },
      { id: 'u11', displayName: 'Dr. Cached' }
    ]);

    const name = await getUserName('u10');
    expect(name).toBe('Dr. Preloaded');
  });

  it('preloadUserNames fetches all users and maps by ID', async () => {
    const { userService } = await import('@/services/user');
    vi.mocked(userService.list).mockResolvedValue([
      {
        id: 'u20',
        accountId: 'a1',
        username: 'drbulk',
        email: 'bulk@vet.com',
        displayName: 'Dr. Bulk',
        roleCode: 'vet',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'u21',
        accountId: 'a1',
        username: 'drbulk2',
        email: 'bulk2@vet.com',
        displayName: 'Dr. Bulk2',
        roleCode: 'vet',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]);

    const { preloadUserNames, getUserName } = useEntityCache();
    await preloadUserNames(['u20', 'u21']);

    expect(userService.list).toHaveBeenCalledTimes(1);

    const name20 = await getUserName('u20');
    expect(name20).toBe('Dr. Bulk');

    const name21 = await getUserName('u21');
    expect(name21).toBe('Dr. Bulk2');
  });

  it('preloadUserNames skips already-cached IDs', async () => {
    const { userService } = await import('@/services/user');
    vi.mocked(userService.list).mockResolvedValue([
      {
        id: 'u30',
        accountId: 'a1',
        username: 'drskip',
        email: 'skip@vet.com',
        displayName: 'Dr. Skip',
        roleCode: 'vet',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]);

    const { preloadUsers, preloadUserNames, getUserName } = useEntityCache();
    preloadUsers([{ id: 'u30', displayName: 'Already Cached' }]);

    await preloadUserNames(['u30']);

    expect(userService.list).not.toHaveBeenCalled();
    const name = await getUserName('u30');
    expect(name).toBe('Already Cached');
  });
});
