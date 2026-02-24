import type { InpatientStayStatus } from './repo.js';
type MaybeDbError = {
    code?: string;
    constraint?: string;
};
export declare function isActiveStay(status: InpatientStayStatus): boolean;
export declare function bedBelongsToWard(bedWardId: string, wardId: string): boolean;
export declare function isActiveBedConflictError(error: unknown): error is MaybeDbError;
export {};
//# sourceMappingURL=rules.d.ts.map