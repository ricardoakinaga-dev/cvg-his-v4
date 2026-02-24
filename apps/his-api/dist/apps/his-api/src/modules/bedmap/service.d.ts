import type { RequestContext } from '../../plugins/requestContext.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type BedMapResult = {
    kind: 'ward_not_found';
} | {
    kind: 'ok';
    map: {
        ward: {
            id: string;
            name: string;
        };
        beds: Array<{
            bed: {
                id: string;
                name: string;
                code: string | null;
            };
            status: 'free' | 'occupied';
            stay: null | {
                id: string;
                patientId: string;
                patientName: string | null;
                species: string | null;
                admittedAt: string;
                reason: string | null;
            };
        }>;
    };
};
export declare function createBedMapService(context: ServiceContext): {
    getByWardId(wardId: string): Promise<BedMapResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map