import { describe, expect, it } from 'vitest';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService, type AuditRepository } from '@cvg-his-v2/module-audit';
import { StaffService } from '@cvg-his-v2/module-staff';
import { UsersService } from '@cvg-his-v2/module-users';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';
import { getTenantContext, runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { AuthService } from './index.js';
import { InMemorySessionRepository } from './repositories/in-memory-session.repository.js';

async function createFixture(create: AuditRepository['create']) {
  const audit = new AuditService({
    auditRepository: {
      create,
      list: async () => [],
      findById: async () => null
    }
  });
  const auth = new AuthService({
    secret: 'refresh-audit-regression-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 3600,
    users: new UsersService(),
    staff: new StaffService(),
    accessControl: new AccessControlService(),
    audit,
    sessionRepository: new InMemorySessionRepository()
  });
  const session = await auth.login(
    { username: 'admin', password: 'seed_admin' },
    'refresh-audit-login'
  );
  if (!('refreshToken' in session)) throw new Error('Expected an interactive login');
  await audit.waitForPersistence();
  return { auth, audit, session };
}

describe('refresh audit account context and persistence', () => {
  it.each(['missing', 'foreign'] as const)(
    'awaits persistence under the authenticated account when outer context is %s',
    async (outerContext) => {
      let release!: () => void;
      let started!: () => void;
      const pendingInsert = new Promise<void>((resolve) => {
        release = resolve;
      });
      const insertStarted = new Promise<void>((resolve) => {
        started = resolve;
      });
      const writes: Array<{
        event: AuditEventSummary;
        context: ReturnType<typeof getTenantContext>;
      }> = [];
      const { auth, audit, session } = await createFixture(async (event) => {
        if (event.action !== 'refresh') return;
        writes.push({ event, context: getTenantContext() });
        started();
        await pendingInsert;
      });
      let resolved = false;
      const refresh = () =>
        auth
          .refresh({ refreshToken: session.refreshToken }, 'refresh-audit-correlation')
          .then((result) => {
            resolved = true;
            return result;
          });
      const pending =
        outerContext === 'foreign'
          ? runWithTenantContext(
              {
                tenantId: 'foreign-tenant',
                accountId: 'foreign-account',
                userId: 'foreign-user',
                correlationId: 'foreign-correlation'
              },
              refresh
            )
          : refresh();
      try {
        await insertStarted;
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(writes).toHaveLength(1);
        expect(writes[0]?.context).toMatchObject({
          accountId: session.principal.user.accountId,
          userId: session.principal.user.id,
          correlationId: 'refresh-audit-correlation'
        });
        expect(writes[0]?.event).toMatchObject({
          accountId: session.principal.user.accountId,
          actorId: session.principal.user.id,
          correlationId: 'refresh-audit-correlation',
          action: 'refresh'
        });
        expect(resolved).toBe(false);
      } finally {
        release();
        await pending;
      }
      const refreshed = await pending;
      expect(refreshed.refreshToken).not.toBe(session.refreshToken);
      await expect(
        auth.refresh({ refreshToken: session.refreshToken }, 'refresh-replay')
      ).rejects.toThrow(/rotated/);
      await expect(audit.waitForPersistence()).resolves.toBeUndefined();
    }
  );

  it('attributes an audit rejection to refresh and leaves the next command audit wait clean', async () => {
    const storageError = new Error('refresh audit storage rejected');
    const persisted: AuditEventSummary[] = [];
    const { auth, audit, session } = await createFixture(async (event) => {
      if (event.action === 'refresh') throw storageError;
      persisted.push(event);
    });

    await expect(
      auth.refresh({ refreshToken: session.refreshToken }, 'refresh-rejected').then(() => undefined)
    ).rejects.toBe(storageError);
    await expect(audit.waitForPersistence()).resolves.toBeUndefined();
    expect(audit.list().some((event) => event.action === 'refresh')).toBe(false);

    await runWithTenantContext(
      {
        tenantId: 'command-tenant',
        accountId: session.principal.user.accountId,
        userId: session.principal.user.id,
        correlationId: 'next-command'
      },
      async () => {
        await audit.writeAndWait({
          actorId: session.principal.user.id,
          accountId: session.principal.user.accountId,
          module: 'counter-sales',
          action: 'created',
          entityType: 'counter-sale',
          entityId: 'next-sale',
          correlationId: 'next-command',
          payloadSummary: 'Next command succeeds',
          riskLevel: 'low'
        });
        await audit.waitForPersistence();
      }
    );
    expect(persisted.some((event) => event.correlationId === 'next-command')).toBe(true);
  });
});
