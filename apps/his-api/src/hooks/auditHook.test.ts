import { describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../plugins/requestContext.js';
import { auditFromRequest } from './auditHook.js';

const appendMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock('@cvg-his/audit', () => ({
  append: appendMock
}));

function buildRequest(actor: RequestContext['actor']) {
  return {
    requestContext: {
      requestId: 'req-1',
      actor
    }
  } as unknown as import('fastify').FastifyRequest;
}

describe('auditFromRequest', () => {
  it('forwards accountId on audit append', async () => {
    const request = buildRequest({
      accountId: 'tenant-a',
      userId: 'user-a',
      role: 'admin',
      roles: ['admin'],
      permissions: ['*']
    });

    const audit = auditFromRequest(request);
    await audit.append({
      action: 'owner.update',
      entityType: 'owner',
      entityId: 'owner-1',
      beforeJson: { name: 'old' },
      afterJson: { name: 'new' }
    });

    expect(appendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'tenant-a',
        actorUserId: 'user-a',
        requestId: 'req-1'
      })
    );
  });

  it('rejects append when actor accountId is missing', async () => {
    const request = buildRequest(undefined);
    const audit = auditFromRequest(request);

    await expect(
      audit.append({
        action: 'owner.update',
        entityType: 'owner',
        entityId: 'owner-1'
      })
    ).rejects.toThrow('Missing actor accountId for audit append.');
  });
});
