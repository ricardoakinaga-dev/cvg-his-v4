import type { OwnerRecord } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type CreateOwnerInput = {
    accountId: string;
    unitId?: string | null;
    fullName: string;
    document?: string | null;
    email?: string | null;
    phoneMain?: string | null;
    phoneAlt?: string | null;
    addressJson?: Record<string, unknown> | null;
};
type UpdateOwnerInput = Partial<Omit<CreateOwnerInput, 'accountId'>>;
type ListOwnersInput = {
    accountId: string;
    page: number;
    pageSize: number;
    q?: string;
};
export declare function createOwnersRepo(db: DbClient): {
    create(input: CreateOwnerInput): Promise<OwnerRecord>;
    findById(accountId: string, ownerId: string): Promise<OwnerRecord | null>;
    updateById(accountId: string, ownerId: string, patch: UpdateOwnerInput): Promise<OwnerRecord | null>;
    list(input: ListOwnersInput): Promise<{
        data: OwnerRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=repo.d.ts.map