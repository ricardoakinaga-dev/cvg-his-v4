type MaybeDbError = {
    code?: string;
    constraint?: string;
};
export type MedicationOrderStatus = 'active' | 'stopped';
export declare function isMedicationOrderActive(status: MedicationOrderStatus): boolean;
export declare function isDuplicateMedicationAdministrationError(error: unknown): error is MaybeDbError;
export declare function isMedicationAdministrationReasonCheckError(error: unknown): error is MaybeDbError;
export {};
//# sourceMappingURL=rules.d.ts.map