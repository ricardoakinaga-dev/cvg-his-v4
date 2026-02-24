import type { RequestContext } from '../../plugins/requestContext.js';
import { type SettingRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
export declare const ALLOWED_NAMESPACES: readonly ["geral", "clinica", "internacao", "imagem", "laboratorio", "estoque", "financeiro"];
export type SettingNamespace = (typeof ALLOWED_NAMESPACES)[number];
export declare function createSettingsService(context: ServiceContext): {
    listByNamespace(namespace: string): Promise<SettingRecord[]>;
    upsert(namespace: string, key: string, valueJson: unknown): Promise<SettingRecord>;
};
export {};
//# sourceMappingURL=service.d.ts.map