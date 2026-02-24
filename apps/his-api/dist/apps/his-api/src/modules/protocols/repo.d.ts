import type { ProtocolCreateDto, ProtocolUpdateDto } from '@cvg-his/domain';
import type { ProtocolRecord, ProtocolStatus } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type CreateProtocolInput = ProtocolCreateDto & {
    accountId: string;
    createdByUserId: string;
};
type UpdateProtocolInput = {
    accountId: string;
    protocolId: string;
    patch: ProtocolUpdateDto;
    updatedByUserId: string;
};
type ListProtocolsInput = {
    accountId: string;
    q?: string;
    status?: ProtocolStatus;
    specialty?: string;
    domain?: string;
    page: number;
    pageSize: number;
};
export type ProtocolsRepo = {
    create: (input: CreateProtocolInput) => Promise<ProtocolRecord>;
    findById: (accountId: string, protocolId: string) => Promise<ProtocolRecord | null>;
    updateById: (input: UpdateProtocolInput) => Promise<ProtocolRecord | null>;
    list: (input: ListProtocolsInput) => Promise<{
        data: ProtocolRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export declare function createProtocolsRepo(db: DbClient): ProtocolsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map