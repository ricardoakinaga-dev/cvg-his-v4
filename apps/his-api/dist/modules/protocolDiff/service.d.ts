import type { RequestContext } from '../../plugins/requestContext.js';
import { buildJsonDiff } from './diff.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
export type ProtocolVersionDiffResult = {
    kind: 'from_not_found';
} | {
    kind: 'to_not_found';
} | {
    kind: 'different_protocols';
} | {
    kind: 'ok';
    diff: {
        fromVersion: {
            id: string;
            protocolId: string;
            versionNumber: number;
            status: string;
        };
        toVersion: {
            id: string;
            protocolId: string;
            versionNumber: number;
            status: string;
        };
        changes: ReturnType<typeof buildJsonDiff>;
    };
};
export declare function createProtocolDiffService(context: ServiceContext): {
    getVersionDiff(fromVersionId: string, toVersionId: string): Promise<ProtocolVersionDiffResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map