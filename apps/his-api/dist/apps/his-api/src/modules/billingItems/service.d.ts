import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type BillingItemsRepo } from './repo.js';
import type { BillingItemCreateInput, BillingItemRecord, BillingItemStatus, BillingItemUpdateInput, BillingItemWithService } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: BillingItemsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateBillingItemResult = {
    kind: 'encounter_not_found';
} | {
    kind: 'encounter_closed';
} | {
    kind: 'created';
    billingItem: BillingItemRecord;
};
export type UpdateBillingItemResult = {
    kind: 'billing_item_not_found';
} | {
    kind: 'already_confirmed';
} | {
    kind: 'updated';
    billingItem: BillingItemRecord;
};
export type DeleteBillingItemResult = {
    kind: 'billing_item_not_found';
} | {
    kind: 'already_confirmed';
} | {
    kind: 'deleted';
};
export type CloseEncounterWithBillingResult = {
    kind: 'encounter_not_found';
} | {
    kind: 'already_closed';
    encounter: {
        id: string;
        status: string;
    };
} | {
    kind: 'closed';
    encounter: {
        id: string;
        status: string;
        closedAt: Date | null;
        closedByUserId: string | null;
    };
    billingItems: BillingItemWithService[];
    billingTotal: string;
};
export declare function createBillingItemsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    listByEncounter(encounterId: string, status?: BillingItemStatus): Promise<{
        items: BillingItemWithService[];
        total: string;
        itemCount: number;
    }>;
    create(encounterId: string, input: BillingItemCreateInput): Promise<CreateBillingItemResult>;
    update(billingItemId: string, patch: BillingItemUpdateInput): Promise<UpdateBillingItemResult>;
    delete(billingItemId: string): Promise<DeleteBillingItemResult>;
    confirmAll(encounterId: string): Promise<number>;
};
export {};
//# sourceMappingURL=service.d.ts.map