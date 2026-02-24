import type { RequestContext } from '../../plugins/requestContext.js';
import type { CreateOwnerBody, ListOwnersQuery, UpdateOwnerBody } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
export declare function createOwnersService(context: ServiceContext): {
    create(input: CreateOwnerBody): Promise<import("./types.js").OwnerRecord>;
    getById(ownerId: string): Promise<import("./types.js").OwnerRecord | null>;
    update(ownerId: string, patch: UpdateOwnerBody): Promise<import("./types.js").OwnerRecord | null>;
    list(query: ListOwnersQuery): Promise<{
        data: import("./types.js").OwnerRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map