import { append } from '@cvg-his/audit';
import { createSettingsRepo } from './repo.js';
// Allowed namespaces for settings
export const ALLOWED_NAMESPACES = [
    'geral',
    'clinica',
    'internacao',
    'imagem',
    'laboratorio',
    'estoque',
    'financeiro'
];
function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to access settings.');
    }
    return actor;
}
export function createSettingsService(context) {
    const repo = createSettingsRepo(context.db);
    return {
        async listByNamespace(namespace) {
            const actor = ensureActor(context.requestContext);
            return repo.findByNamespace(actor.accountId, namespace);
        },
        async upsert(namespace, key, valueJson) {
            const actor = ensureActor(context.requestContext);
            // Get before value for audit
            const before = await repo.findByKey(actor.accountId, namespace, key);
            const after = await repo.upsert(actor.accountId, namespace, key, valueJson, actor.userId ?? null);
            await append({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'setting',
                entityId: after.id,
                action: 'settings.upsert',
                beforeJson: before,
                afterJson: after,
                requestId: context.requestContext.requestId
            });
            return after;
        }
    };
}
//# sourceMappingURL=service.js.map