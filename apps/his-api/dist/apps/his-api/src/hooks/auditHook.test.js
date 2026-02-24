import { describe, expect, it, vi } from 'vitest';
import { auditFromRequest } from './auditHook.js';
const appendMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock('@cvg-his/audit', () => ({
    append: appendMock
}));
function buildRequest(actor) {
    return {
        requestContext: {
            requestId: 'req-1',
            actor
        }
    };
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
        expect(appendMock).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 'tenant-a',
            actorUserId: 'user-a',
            requestId: 'req-1'
        }));
    });
    it('rejects append when actor accountId is missing', async () => {
        const request = buildRequest(undefined);
        const audit = auditFromRequest(request);
        await expect(audit.append({
            action: 'owner.update',
            entityType: 'owner',
            entityId: 'owner-1'
        })).rejects.toThrow('Missing actor accountId for audit append.');
    });
});
//# sourceMappingURL=auditHook.test.js.map