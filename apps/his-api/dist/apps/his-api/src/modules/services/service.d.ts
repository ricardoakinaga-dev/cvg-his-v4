import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ServicesRepo } from './repo.js';
import type { ServiceCreateInput, ServiceRecord, ServiceUpdateInput } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: ServicesRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateServiceResult = {
    kind: 'code_conflict';
} | {
    kind: 'created';
    service: ServiceRecord;
};
export type UpdateServiceResult = {
    kind: 'service_not_found';
} | {
    kind: 'code_conflict';
} | {
    kind: 'updated';
    service: ServiceRecord;
};
export type DeleteServiceResult = {
    kind: 'service_not_found';
} | {
    kind: 'deleted';
};
export declare function createServicesService(context: ServiceContext, dependencies?: ServiceDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        q?: string;
        group?: string;
        sector?: string;
        active?: boolean;
    }): Promise<{
        items: ServiceRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(serviceId: string): Promise<ServiceRecord | null>;
    create(input: ServiceCreateInput): Promise<CreateServiceResult>;
    update(serviceId: string, patch: ServiceUpdateInput): Promise<UpdateServiceResult>;
    delete(serviceId: string): Promise<DeleteServiceResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map