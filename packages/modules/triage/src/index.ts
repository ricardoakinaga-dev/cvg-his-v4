import { EncountersService } from '@cvg-his-v2/module-encounters';
import type { CreateTriageRequest, UpdateTriageRequest } from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  EncounterId,
  PatientId,
  TriageRecordId,
  TriageSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import {
  requireEnum,
  requireNonEmptyString,
  requireStringArray
} from '@cvg-his-v2/shared-validation';

import type { TriageRepository } from './repositories/database-triage.repository.js';
import type {
  TriageVersionId,
  TriageVersionSnapshot,
  TriageVersionSummary
} from './version-types.js';

export interface TriageServiceOptions {
  readonly repository?: TriageRepository;
}

const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const ALLOWED_DESTINATIONS = ['in_care', 'observation'] as const;

function requireAccountId(accountId: AccountId): AccountId {
  return requireNonEmptyString(accountId as string, 'accountId') as AccountId;
}

function cloneTriageSummary(record: TriageSummary): TriageSummary {
  return {
    ...record,
    alerts: [...record.alerts]
  };
}

function cloneTriageSnapshot(snapshot: TriageVersionSnapshot): TriageVersionSnapshot {
  return {
    ...snapshot,
    alerts: [...snapshot.alerts]
  };
}

function cloneTriageVersion(version: TriageVersionSummary): TriageVersionSummary {
  return {
    ...version,
    changedFields: [...version.changedFields],
    previousSnapshot: cloneTriageSnapshot(version.previousSnapshot),
    nextSnapshot: cloneTriageSnapshot(version.nextSnapshot)
  };
}

export class TriageService {
  readonly #encounters: EncountersService;
  readonly #repository?: TriageRepository;
  readonly #records = new Map<TriageRecordId, TriageSummary>();
  readonly #versionsByTriageId = new Map<TriageRecordId, TriageVersionSummary[]>();

  public constructor(encounters: EncountersService, options?: TriageServiceOptions) {
    this.#encounters = encounters;
    this.#repository = options?.repository;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    const scopedAccountId = requireAccountId(accountId);
    if (!this.#repository) return;
    const records = await this.#repository.findByAccountId(scopedAccountId);
    for (const record of records) {
      if (record.accountId === scopedAccountId) {
        this.#records.set(record.id, record);
      }
    }
    const versions = await this.#repository.findVersionsByAccountId(scopedAccountId);
    for (const version of versions) {
      if (version.accountId !== scopedAccountId) continue;
      const existing = this.#versionsByTriageId.get(version.triageId) ?? [];
      if (existing.some((candidate) => candidate.id === version.id)) continue;
      this.#versionsByTriageId.set(
        version.triageId,
        [...existing, version].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
    }
  }

  public list(accountId: AccountId, encounterId?: EncounterId): readonly TriageSummary[] {
    const scopedAccountId = requireAccountId(accountId);
    const scopedEncounterId =
      encounterId === undefined
        ? undefined
        : (requireNonEmptyString(encounterId as string, 'encounterId') as EncounterId);
    return Array.from(this.#records.values())
      .filter(
        (record) =>
          record.accountId === scopedAccountId &&
          (!scopedEncounterId || record.encounterId === scopedEncounterId)
      )
      .map(cloneTriageSummary);
  }

  public getOrThrow(triageId: TriageRecordId, accountId: AccountId): TriageSummary {
    const scopedAccountId = requireAccountId(accountId);
    const record = this.#records.get(triageId);
    if (!record || record.accountId !== scopedAccountId) {
      throw new NotFoundError('Triage record not found', { triageId });
    }
    return cloneTriageSummary(record);
  }

  public listVersions(
    triageId: TriageRecordId,
    accountId: AccountId
  ): readonly TriageVersionSummary[] {
    const scopedAccountId = requireAccountId(accountId);
    this.getOrThrow(triageId, scopedAccountId);
    return (this.#versionsByTriageId.get(triageId) ?? [])
      .filter((version) => version.accountId === scopedAccountId)
      .map(cloneTriageVersion);
  }

  public async createTriage(
    actorUserId: UserId,
    payload: CreateTriageRequest,
    accountId: AccountId
  ): Promise<TriageSummary> {
    const scopedAccountId = requireAccountId(accountId);
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const encounter = this.#encounters.getOrThrow(scopedAccountId, encounterId);
    if (encounter.accountId !== scopedAccountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
    if (encounter.status === 'closed') {
      throw new ConflictError('Closed encounters do not allow triage creation', {
        encounterId
      });
    }
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    if (patientId !== encounter.patientId) {
      throw new ValidationError('Triage patientId must match encounter patientId', {
        encounterId,
        patientId,
        encounterPatientId: encounter.patientId
      });
    }
    const existing = this.list(scopedAccountId, encounterId)[0];
    if (existing) {
      throw new ConflictError('Encounter already has an initial triage', {
        triageId: existing.id
      });
    }

    const now = nowIso();
    const record: TriageSummary = {
      id: createCorrelationId('triage') as TriageRecordId,
      accountId: scopedAccountId,
      encounterId,
      patientId: encounter.patientId,
      priority: requireEnum(payload.priority, 'priority', ALLOWED_PRIORITIES),
      chiefComplaint: requireNonEmptyString(payload.chiefComplaint, 'chiefComplaint'),
      initialNotes: payload.initialNotes?.trim() || undefined,
      alerts: requireStringArray(payload.alerts, 'alerts'),
      destination: requireEnum(payload.destination, 'destination', ALLOWED_DESTINATIONS),
      triagedByUserId: actorUserId,
      createdAt: now,
      updatedAt: now
    };

    if (this.#repository) {
      await this.#repository.create(record);
    }
    this.#records.set(record.id, record);
    return cloneTriageSummary(record);
  }

  public async updateTriage(
    triageId: TriageRecordId,
    payload: UpdateTriageRequest,
    accountId: AccountId,
    actorUserId?: UserId
  ): Promise<TriageSummary> {
    const current = this.getOrThrow(triageId, accountId);
    const encounter = this.#encounters.getOrThrow(accountId, current.encounterId);
    if (encounter.status === 'closed') {
      throw new ConflictError('Closed encounters do not allow triage updates', {
        encounterId: encounter.id,
        triageId
      });
    }

    const nextPriority =
      payload.priority !== undefined
        ? requireEnum(payload.priority, 'priority', ALLOWED_PRIORITIES)
        : current.priority;
    const nextDestination =
      payload.destination !== undefined
        ? requireEnum(payload.destination, 'destination', ALLOWED_DESTINATIONS)
        : current.destination;
    const nextChiefComplaint =
      payload.chiefComplaint !== undefined
        ? requireNonEmptyString(payload.chiefComplaint, 'chiefComplaint')
        : current.chiefComplaint;
    const nextAlerts =
      payload.alerts !== undefined ? requireStringArray(payload.alerts, 'alerts') : current.alerts;
    const nextInitialNotes =
      payload.initialNotes !== undefined
        ? payload.initialNotes?.trim() || undefined
        : current.initialNotes;

    const updated: TriageSummary = {
      ...current,
      priority: nextPriority,
      destination: nextDestination,
      chiefComplaint: nextChiefComplaint,
      alerts: nextAlerts,
      initialNotes: nextInitialNotes,
      updatedAt: nowIso()
    };

    const previousSnapshot = {
      priority: current.priority,
      chiefComplaint: current.chiefComplaint,
      initialNotes: current.initialNotes,
      alerts: current.alerts,
      destination: current.destination,
      updatedAt: current.updatedAt
    };
    const nextSnapshot = {
      priority: updated.priority,
      chiefComplaint: updated.chiefComplaint,
      initialNotes: updated.initialNotes,
      alerts: updated.alerts,
      destination: updated.destination,
      updatedAt: updated.updatedAt
    };
    const changedFields = Object.keys(nextSnapshot).filter((field) => {
      const key = field as keyof typeof nextSnapshot;
      return JSON.stringify(previousSnapshot[key]) !== JSON.stringify(nextSnapshot[key]);
    });
    const version: TriageVersionSummary = {
      id: createCorrelationId('triagev') as TriageVersionId,
      triageId: updated.id,
      accountId: updated.accountId,
      encounterId: updated.encounterId,
      changedFields,
      previousSnapshot,
      nextSnapshot,
      changedByUserId: actorUserId ?? current.triagedByUserId,
      createdAt: updated.updatedAt
    };

    const previousVersions = this.#versionsByTriageId.get(updated.id);
    this.#records.set(updated.id, updated);
    const versions = this.#versionsByTriageId.get(updated.id) ?? [];
    this.#versionsByTriageId.set(updated.id, [version, ...versions]);
    if (this.#repository) {
      try {
        await this.#repository.update(updated);
        await this.#repository.createVersion(version);
      } catch (error) {
        this.#records.set(current.id, current);
        if (previousVersions) {
          this.#versionsByTriageId.set(updated.id, previousVersions);
        } else {
          this.#versionsByTriageId.delete(updated.id);
        }
        throw error;
      }
    }
    return cloneTriageSummary(updated);
  }
}

export {
  DatabaseTriageRepository,
  type TriageRepository
} from './repositories/database-triage.repository.js';
