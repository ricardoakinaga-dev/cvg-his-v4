import { services } from '@cvg-his/db';
import type { ServiceCreateInput, ServiceUpdateInput } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
export type ServicesRepo = {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        q?: string;
        group?: string;
        sector?: string;
        active?: boolean;
    }): Promise<{
        items: typeof services.$inferSelect[];
        total: number;
    }>;
    findById(accountId: string, serviceId: string): Promise<typeof services.$inferSelect | null>;
    findByCode(accountId: string, code: string): Promise<typeof services.$inferSelect | null>;
    create(input: {
        accountId: string;
    } & ServiceCreateInput): Promise<typeof services.$inferSelect>;
    updateById(params: {
        accountId: string;
        serviceId: string;
        patch: ServiceUpdateInput;
    }): Promise<typeof services.$inferSelect | null>;
    deleteById(accountId: string, serviceId: string): Promise<boolean>;
};
export declare function createServicesRepo(db: DbClient): ServicesRepo;
export {};
//# sourceMappingURL=repo.d.ts.map