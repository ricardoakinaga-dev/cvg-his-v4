export function isMedicationOrderActive(status) {
    return status === 'active';
}
export function isDuplicateMedicationAdministrationError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeError = error;
    return (maybeError.code === '23505' &&
        maybeError.constraint === 'uq_medication_administrations_order_slot');
}
export function isMedicationAdministrationReasonCheckError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeError = error;
    return (maybeError.code === '23514' &&
        maybeError.constraint === 'medication_administrations_reason_required_chk');
}
//# sourceMappingURL=rules.js.map