import { type AppendAuditInput } from '@cvg-his/audit';
import type { EncounterCloseDto, EncounterCreateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type EncounterRecord, type EncountersRepo } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: EncountersRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateEncounterResult = {
    kind: 'patient_not_found';
} | {
    kind: 'created';
    encounter: EncounterRecord;
};
export type CloseEncounterResult = {
    kind: 'encounter_not_found';
} | {
    kind: 'already_closed';
    encounter: EncounterRecord;
} | {
    kind: 'closed';
    encounter: EncounterRecord;
    billingItemCount: number;
    billingTotal: string;
};
export declare function createEncountersService(context: ServiceContext, dependencies?: ServiceDependencies): {
    create(input: EncounterCreateDto): Promise<CreateEncounterResult>;
    getById(encounterId: string): Promise<EncounterRecord | null>;
    list(input: {
        patientId?: string;
        q?: string;
        page: number;
        pageSize: number;
    }): Promise<import("./repo.js").ListEncountersResult>;
    getTimeline(encounterId: string): Promise<import("./repo.js").EncounterTimelineResult | null>;
    close(encounterId: string, input: EncounterCloseDto): Promise<CloseEncounterResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map