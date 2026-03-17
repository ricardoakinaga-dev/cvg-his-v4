import type { InpatientStayStatus } from './repo.js';

type MaybeDbError = {
  code?: string;
  constraint?: string;
};

export function isActiveStay(status: InpatientStayStatus): boolean {
  return status === 'active';
}

export function bedBelongsToWard(bedWardId: string, wardId: string): boolean {
  return bedWardId === wardId;
}

export function isActiveBedConflictError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeDbError = error as MaybeDbError;
  return (
    maybeDbError.code === '23505' &&
    maybeDbError.constraint === 'inpatient_stays_active_bed_unique'
  );
}
