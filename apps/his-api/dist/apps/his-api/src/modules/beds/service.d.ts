import type { BedCreateDto, BedUpdateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type BedRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type CreateBedResult = {
    kind: 'ward_not_found';
} | {
    kind: 'created';
    bed: BedRecord;
};
type UpdateBedResult = {
    kind: 'bed_not_found';
} | {
    kind: 'ward_not_found';
} | {
    kind: 'updated';
    bed: BedRecord;
};
export declare function createBedsService(context: ServiceContext): {
    create(input: BedCreateDto): Promise<CreateBedResult>;
    update(bedId: string, patch: BedUpdateDto): Promise<UpdateBedResult>;
    list(query: {
        page: number;
        pageSize: number;
        wardId?: string;
        q?: string;
    }): Promise<{
        data: BedRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map