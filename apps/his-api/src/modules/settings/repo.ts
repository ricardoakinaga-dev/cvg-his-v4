import { and, eq } from 'drizzle-orm';
import { settings } from '@cvg-his/db';

import type { Setting } from '@cvg-his/db';

type DbClient = typeof import('@cvg-his/db').db;

export type SettingRecord = Setting;

export function createSettingsRepo(db: DbClient) {
  return {
    async findByNamespace(accountId: string, namespace: string): Promise<SettingRecord[]> {
      return db
        .select()
        .from(settings)
        .where(and(eq(settings.accountId, accountId), eq(settings.namespace, namespace)));
    },

    async findByKey(accountId: string, namespace: string, key: string): Promise<SettingRecord | null> {
      const [result] = await db
        .select()
        .from(settings)
        .where(and(eq(settings.accountId, accountId), eq(settings.namespace, namespace), eq(settings.key, key)))
        .limit(1);

      return result ?? null;
    },

    async upsert(
      accountId: string,
      namespace: string,
      key: string,
      valueJson: unknown,
      updatedBy: string | null
    ): Promise<SettingRecord> {
      const [result] = await db
        .insert(settings)
        .values({
          accountId,
          namespace,
          key,
          valueJson: valueJson as Record<string, unknown>,
          updatedBy
        })
        .onConflictDoUpdate({
          target: [settings.accountId, settings.namespace, settings.key],
          set: {
            valueJson: valueJson as Record<string, unknown>,
            updatedBy,
            updatedAt: new Date()
          }
        })
        .returning();

      return result;
    }
  };
}
