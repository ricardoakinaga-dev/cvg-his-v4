type DbClient = typeof import('@cvg-his/db').db;
export type WardRecord = {
    id: string;
    accountId: string;
    name: string;
    code: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};
type CreateWardInput = {
    accountId: string;
    name: string;
    code?: string;
    isActive?: boolean;
};
type UpdateWardInput = {
    name?: string;
    code?: string | null;
    isActive?: boolean;
};
type ListWardsInput = {
    accountId: string;
    page: number;
    pageSize: number;
    q?: string;
};
export declare function createWardsRepo(db: DbClient): {
    create(input: CreateWardInput): Promise<WardRecord>;
    findById(accountId: string, wardId: string): Promise<WardRecord | null>;
    updateById(accountId: string, wardId: string, patch: UpdateWardInput): Promise<WardRecord | null>;
    list(input: ListWardsInput): Promise<{
        data: WardRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=repo.d.ts.map