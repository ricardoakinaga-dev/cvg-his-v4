type DbClient = typeof import('@cvg-his/db').db;
export type DashboardWard = {
    id: string;
    name: string;
    code: string | null;
    totalBeds: number;
    occupiedBeds: number;
};
export type DashboardPatient = {
    stayId: string;
    patientId: string;
    patientName: string | null;
    species: string | null;
    breed: string | null;
    ownerId: string;
    ownerName: string | null;
};
export type DashboardBed = {
    bedId: string;
    bedName: string;
    bedCode: string | null;
    wardId: string;
    status: 'free' | 'occupied';
    patient: DashboardPatient | null;
    admittedAt: string | null;
    chiefComplaint: string | null;
};
export type DashboardStats = {
    totalWards: number;
    totalBeds: number;
    occupiedBeds: number;
    freeBeds: number;
    activeStays: number;
};
export type DashboardResponse = {
    stats: DashboardStats;
    wards: DashboardWard[];
    beds: DashboardBed[];
};
export type DashboardRepo = {
    getDashboard: (accountId: string, wardId?: string) => Promise<DashboardResponse>;
};
export declare function createDashboardRepo(db: DbClient): DashboardRepo;
export {};
//# sourceMappingURL=dashboardRepo.d.ts.map