import { describe, expect, it } from 'vitest';

import { DatabaseSessionRepository } from './repositories/database-session.repository.js';

function createSession() {
  return {
    sessionId: 'session-1' as never,
    userId: 'user-1' as never,
    accountId: 'account-1' as never,
    createdAt: '2026-08-11T10:00:00.000Z',
    authTime: '2026-08-11T10:00:00.000Z',
    expiresAt: '2026-08-11T10:15:00.000Z',
    refreshExpiresAt: '2026-08-18T10:00:00.000Z',
    active: true,
    roleCodes: ['admin'],
    refreshNonce: 'nonce-1'
  } as const;
}

describe('DatabaseSessionRepository', () => {
  it('persists the complete session identity and timestamps', async () => {
    let inserted: Record<string, unknown> | undefined;
    const db = {
      insert: () => ({
        values: async (value: Record<string, unknown>) => {
          inserted = value;
        }
      })
    };

    await new DatabaseSessionRepository(db as never, {
      tenantExecutor: async (_accountId, operation) => operation()
    }).create(createSession());

    expect(inserted).toMatchObject({
      id: 'session-1',
      accountId: 'account-1',
      userId: 'user-1',
      refreshTokenHash: 'nonce-1'
    });
    expect(inserted?.expiresAt).toEqual(new Date('2026-08-11T10:15:00.000Z'));
    expect(inserted?.refreshExpiresAt).toEqual(new Date('2026-08-18T10:00:00.000Z'));
  });

  it('preserves the refresh TTL independently after a repository reload', async () => {
    let persistedRow: Record<string, unknown> | undefined;
    const db = {
      insert: () => ({
        values: async (value: Record<string, unknown>) => {
          persistedRow = { ...value };
        }
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => (persistedRow ? [persistedRow] : [])
          })
        })
      })
    };
    const options = {
      tenantExecutor: async <T>(_accountId: string | undefined, operation: () => Promise<T>) =>
        operation()
    };

    await new DatabaseSessionRepository(db as never, options).create(createSession());
    const reloaded = await new DatabaseSessionRepository(db as never, options).findById(
      'session-1' as never
    );

    expect(reloaded?.expiresAt).toBe('2026-08-11T10:15:00.000Z');
    expect(reloaded?.refreshExpiresAt).toBe('2026-08-18T10:00:00.000Z');
    expect(reloaded?.refreshExpiresAt).not.toBe(reloaded?.expiresAt);
  });

  it('hydrates a persisted row and supports update/delete operations', async () => {
    const row = {
      id: 'session-1',
      userId: 'user-1',
      accountId: 'account-1',
      refreshTokenHash: 'nonce-2',
      expiresAt: new Date('2026-08-11T10:15:00.000Z'),
      refreshExpiresAt: new Date('2026-08-18T10:00:00.000Z'),
      createdAt: new Date('2026-08-11T10:00:00.000Z')
    };
    let updated: Record<string, unknown> | undefined;
    let deleted = false;
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [row]
          })
        })
      }),
      update: () => ({
        set: (value: Record<string, unknown>) => ({
          where: async () => {
            updated = value;
          }
        })
      }),
      delete: () => ({
        where: async () => {
          deleted = true;
        }
      })
    };

    const repository = new DatabaseSessionRepository(db as never, {
      tenantExecutor: async (_accountId, operation) => operation()
    });
    const hydrated = await repository.findById('session-1' as never);
    await repository.update({
      sessionId: 'session-1' as never,
      refreshNonce: 'nonce-3',
      expiresAt: '2026-08-11T10:20:00.000Z',
      refreshExpiresAt: '2026-08-18T10:05:00.000Z'
    });
    await repository.delete('session-1' as never);

    expect(hydrated).toMatchObject({
      sessionId: 'session-1',
      userId: 'user-1',
      accountId: 'account-1',
      refreshNonce: 'nonce-2',
      expiresAt: '2026-08-11T10:15:00.000Z',
      refreshExpiresAt: '2026-08-18T10:00:00.000Z',
      active: true
    });
    expect(updated).toMatchObject({
      refreshTokenHash: 'nonce-3',
      expiresAt: new Date('2026-08-11T10:20:00.000Z'),
      refreshExpiresAt: new Date('2026-08-18T10:05:00.000Z')
    });
    expect(deleted).toBe(true);
  });
});
