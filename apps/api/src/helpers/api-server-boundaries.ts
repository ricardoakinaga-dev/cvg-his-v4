import type { IncomingMessage } from 'node:http';

import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import type { FieldSpec } from './common.js';

export function readHeader(request: IncomingMessage, headerName: string): string | undefined {
  const value = request.headers[headerName];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Preserve the server's field-level validation contract while keeping it out
 * of the composition module.
 */
export function validateRequestBody(
  body: Record<string, unknown>,
  fields: Record<string, FieldSpec>,
  correlationId: string
): void {
  for (const [key, spec] of Object.entries(fields)) {
    const value = body[key];

    if (spec.required && (value === undefined || value === null)) {
      throw new ValidationError(`Field '${key}' is required`, { correlationId, field: key });
    }

    if (value === undefined || value === null) continue;

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== spec.type) {
      throw new ValidationError(
        `Field '${key}' must be of type '${spec.type}', got '${actualType}'`,
        { correlationId, field: key }
      );
    }

    if (spec.type === 'string' && typeof value === 'string') {
      if (spec.minLength !== undefined && value.length < spec.minLength) {
        throw new ValidationError(
          `Field '${key}' must have at least ${spec.minLength} characters`,
          { correlationId, field: key }
        );
      }
      if (spec.maxLength !== undefined && value.length > spec.maxLength) {
        throw new ValidationError(`Field '${key}' must have at most ${spec.maxLength} characters`, {
          correlationId,
          field: key
        });
      }
      if (spec.enum && !spec.enum.includes(value)) {
        throw new ValidationError(`Field '${key}' must be one of: ${spec.enum.join(', ')}`, {
          correlationId,
          field: key
        });
      }
    }
  }
}

export function createEncounterAccountGuard(
  encounters: Pick<EncountersService, 'getOrThrow'>
): (encounterId: string, accountId: string) => ReturnType<EncountersService['getOrThrow']> {
  return (encounterId, accountId) =>
    encounters.getOrThrow(accountId as never, encounterId as never);
}

/**
 * R2-ARC-02: account-scoped read-through guard for HTTP reads. A cache miss
 * consults the repository, so an encounter opened on another replica is
 * served instead of answering 404.
 */
export function createEncounterReadThroughGuard(
  encounters: Pick<EncountersService, 'fetchOrThrow'>
): (encounterId: string, accountId: string) => ReturnType<EncountersService['fetchOrThrow']> {
  return (encounterId, accountId) =>
    encounters.fetchOrThrow(accountId as never, encounterId as never);
}

type EncounterQueueSyncStatus =
  | 'reception'
  | 'in_triage'
  | 'in_care'
  | 'observation'
  | 'closed';

export function createEncounterQueueSynchronizer(
  encounters: Pick<EncountersService, 'getOrThrow'>,
  scheduling: Pick<SchedulingService, 'completeQueueEntry' | 'transitionQueueForEncounter'>
): (
  accountId: string,
  encounterId: string,
  status: EncounterQueueSyncStatus
) => Promise<void> {
  return async (accountId, encounterId, status) => {
    const encounter = encounters.getOrThrow(accountId as never, encounterId as never);
    if (!encounter.queueEntryId) {
      return;
    }

    if (status === 'closed') {
      await scheduling.completeQueueEntry(encounter.queueEntryId);
      return;
    }

    if (status === 'reception') {
      return;
    }

    const queueStatus =
      status === 'in_triage' ? 'in_triage' : status === 'in_care' ? 'in_care' : 'observation';
    await scheduling.transitionQueueForEncounter(encounter.queueEntryId, queueStatus);
  };
}
