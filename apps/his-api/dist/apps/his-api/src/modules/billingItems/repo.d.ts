import { billingItems } from '@cvg-his/db';
import type { BillingItemCreateInput, BillingItemUpdateInput, BillingItemStatus } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
export type BillingItemsRepo = {
    listByEncounter(params: {
        accountId: string;
        encounterId: string;
        status?: BillingItemStatus;
    }): Promise<typeof billingItems.$inferSelect[]>;
    findById(params: {
        accountId: string;
        billingItemId: string;
    }): Promise<typeof billingItems.$inferSelect | null>;
    create(params: {
        accountId: string;
        encounterId: string;
        createdByUserId: string;
        input: BillingItemCreateInput;
    }): Promise<typeof billingItems.$inferSelect>;
    updateById(params: {
        accountId: string;
        billingItemId: string;
        patch: BillingItemUpdateInput;
    }): Promise<typeof billingItems.$inferSelect | null>;
    deleteById(params: {
        accountId: string;
        billingItemId: string;
    }): Promise<boolean>;
    confirmAllByEncounter(params: {
        accountId: string;
        encounterId: string;
    }): Promise<number>;
    getTotalByEncounter(params: {
        accountId: string;
        encounterId: string;
    }): Promise<string>;
    countByEncounter(params: {
        accountId: string;
        encounterId: string;
    }): Promise<number>;
};
export declare function createBillingItemsRepo(db: DbClient): BillingItemsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map