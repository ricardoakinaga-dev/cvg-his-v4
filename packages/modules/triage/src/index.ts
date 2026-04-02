import { EncountersService } from '@cvg-his-v2/module-encounters';
import type { CreateTriageRequest, UpdateTriageRequest } from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  EncounterId,
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
import type { TriageVersionId, TriageVersionSummary } from './version-types.js';

export interface TriageServiceOptions {
  readonly repository?: TriageRepository;
}

const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const ALLOWED_DESTINATIONS = ['in_care', 'observation'] as const;

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

  public async hydrateFromDatabase(accountId?: AccountId): Promise<void> {
    if (!this.#repository) return;
    const records = await this.#repository.findByAccountId(accountId);
    for (const record of records) {
      this.#records.set(record.id, record);
    }
    const versions = await this.#repository.findVersionsByAccountId(accountId);
    for (const version of versions) {
      const existing = this.#versionsByTriageId.get(version.triageId) ?? [];
      existing.push(version);
      this.#versionsByTriageId.set(
        version.triageId,
        existing.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
    }
  }

  public list(encounterId?: EncounterId): readonly TriageSummary[] {
    return Array.from(this.#records.values()).filter(
      (record) => !encounterId || record.encounterId === encounterId
    );
  }

  public getOrThrow(triageId: TriageRecordId): TriageSummary {
    const record = this.#records.get(triageId);
    if (!record) {
      throw new NotFoundError('Triage record not found', { triageId });
    }
    return record;
  }

  public listVersions(triageId: TriageRecordId): readonly TriageVersionSummary[] {
    return this.#versionsByTriageId.get(triageId) ?? [];
  }

  public async createTriage(
    actorUserId: UserId,
    payload: CreateTriageRequest
  ): Promise<TriageSummary> {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const encounter = this.#encounters.getOrThrow(encounterId);
    const existing = this.list(encounterId)[0];
    if (existing) {
      throw new ConflictError('Encounter already has an initial triage', {
        triageId: existing.id
      });
    }

    const now = nowIso();
    const record: TriageSummary = {
      id: createCorrelationId('triage') as TriageRecordId,
      accountId: encounter.accountId,
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

    this.#records.set(record.id, record);
    if (this.#repository) {
      await this.#repository.create(record);
    }
    return record;
  }

  public async updateTriage(
    triageId: TriageRecordId,
    payload: UpdateTriageRequest,
    actorUserId?: UserId
  ): Promise<TriageSummary> {
    const current = this.getOrThrow(triageId);
    const encounter = this.#encounters.getOrThrow(current.encounterId);
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

    this.#records.set(updated.id, updated);
    const versions = this.#versionsByTriageId.get(updated.id) ?? [];
    this.#versionsByTriageId.set(updated.id, [version, ...versions]);
    if (this.#repository) {
      await this.#repository.update(updated);
      await this.#repository.createVersion(version);
    }
    return updated;
  }
}

export {
  DatabaseTriageRepository,
  type TriageRepository
} from './repositories/database-triage.repository.js';
