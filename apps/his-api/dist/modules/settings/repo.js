import { and, eq } from 'drizzle-orm';
import { settings } from '@cvg-his/db';
export function createSettingsRepo(db) {
    return {
        async findByNamespace(accountId, namespace) {
            return db
                .select()
                .from(settings)
                .where(and(eq(settings.accountId, accountId), eq(settings.namespace, namespace)));
        },
        async findByKey(accountId, namespace, key) {
            const [result] = await db
                .select()
                .from(settings)
                .where(and(eq(settings.accountId, accountId), eq(settings.namespace, namespace), eq(settings.key, key)))
                .limit(1);
            return result ?? null;
        },
        async upsert(accountId, namespace, key, valueJson, updatedBy) {
            const [result] = await db
                .insert(settings)
                .values({
                accountId,
                namespace,
                key,
                valueJson: valueJson,
                updatedBy
            })
                .onConflictDoUpdate({
                target: [settings.accountId, settings.namespace, settings.key],
                set: {
                    valueJson: valueJson,
                    updatedBy,
                    updatedAt: new Date()
                }
            })
                .returning();
            return result;
        }
    };
}
//# sourceMappingURL=repo.js.map