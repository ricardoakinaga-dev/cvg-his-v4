type MaybeDbError = {
  code?: string;
  constraint?: string;
};

export type MedicationOrderStatus = 'active' | 'stopped';

export function isMedicationOrderActive(status: MedicationOrderStatus): boolean {
  return status === 'active';
}

export function isDuplicateMedicationAdministrationError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as MaybeDbError;
  return (
    maybeError.code === '23505' &&
    maybeError.constraint === 'uq_medication_administrations_order_slot'
  );
}

export function isMedicationAdministrationReasonCheckError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as MaybeDbError;
  return (
    maybeError.code === '23514' &&
    maybeError.constraint === 'medication_administrations_reason_required_chk'
  );
}
