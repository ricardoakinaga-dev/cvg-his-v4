import type { Setting } from '@cvg-his/db';
type DbClient = typeof import('@cvg-his/db').db;
export type SettingRecord = Setting;
export declare function createSettingsRepo(db: DbClient): {
    findByNamespace(accountId: string, namespace: string): Promise<SettingRecord[]>;
    findByKey(accountId: string, namespace: string, key: string): Promise<SettingRecord | null>;
    upsert(accountId: string, namespace: string, key: string, valueJson: unknown, updatedBy: string | null): Promise<SettingRecord>;
};
export {};
//# sourceMappingURL=repo.d.ts.map