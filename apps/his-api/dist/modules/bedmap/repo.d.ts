type DbClient = typeof import('@cvg-his/db').db;
export type BedMapWard = {
    id: string;
    name: string;
};
type BedMapQueryRow = {
    bedId: string;
    bedName: string;
    bedCode: string | null;
    stayId: string | null;
    patientId: string | null;
    patientName: string | null;
    species: string | null;
    admittedAt: Date | null;
    reason: string | null;
};
export declare function createBedMapRepo(db: DbClient): {
    findWard(accountId: string, wardId: string): Promise<BedMapWard | null>;
    listBedMapRows(accountId: string, wardId: string): Promise<BedMapQueryRow[]>;
};
export {};
//# sourceMappingURL=repo.d.ts.map