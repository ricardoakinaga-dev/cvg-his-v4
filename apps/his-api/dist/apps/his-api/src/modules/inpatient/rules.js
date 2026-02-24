export function isActiveStay(status) {
    return status === 'active';
}
export function bedBelongsToWard(bedWardId, wardId) {
    return bedWardId === wardId;
}
export function isActiveBedConflictError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeDbError = error;
    return (maybeDbError.code === '23505' &&
        maybeDbError.constraint === 'inpatient_stays_active_bed_unique');
}
//# sourceMappingURL=rules.js.map