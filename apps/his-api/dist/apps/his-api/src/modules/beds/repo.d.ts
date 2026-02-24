type DbClient = typeof import('@cvg-his/db').db;
export type BedRecord = {
    id: string;
    accountId: string;
    wardId: string;
    name: string;
    code: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};
type CreateBedInput = {
    accountId: string;
    wardId: string;
    name: string;
    code?: string;
    isActive?: boolean;
};
type UpdateBedInput = {
    wardId?: string;
    name?: string;
    code?: string | null;
    isActive?: boolean;
};
type ListBedsInput = {
    accountId: string;
    page: number;
    pageSize: number;
    wardId?: string;
    q?: string;
};
export declare function createBedsRepo(db: DbClient): {
    wardExistsInAccount(accountId: string, wardId: string): Promise<boolean>;
    create(input: CreateBedInput): Promise<BedRecord>;
    findById(accountId: string, bedId: string): Promise<BedRecord | null>;
    updateById(accountId: string, bedId: string, patch: UpdateBedInput): Promise<BedRecord | null>;
    list(input: ListBedsInput): Promise<{
        data: BedRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=repo.d.ts.map