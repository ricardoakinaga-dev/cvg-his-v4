import type { WardCreateDto, WardUpdateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type WardRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
export declare function createWardsService(context: ServiceContext): {
    create(input: WardCreateDto): Promise<WardRecord>;
    update(wardId: string, patch: WardUpdateDto): Promise<WardRecord | null>;
    list(query: {
        page: number;
        pageSize: number;
        q?: string;
    }): Promise<{
        data: WardRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map