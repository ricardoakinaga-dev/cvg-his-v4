import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CloseEncounterRequest,
  CreateEncounterRequest,
  TransitionEncounterRequest
} from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  EncounterId,
  EncounterSummary,
  EncounterTimelineEventId,
  EncounterTimelineEventSummary,
  OwnerId,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export interface EncounterRepository {
  create(encounter: EncounterSummary): Promise<void>;
  update(encounter: EncounterSummary): Promise<void>;
  findById(id: EncounterId): Promise<EncounterSummary | null>;
  findActiveByPatientId(patientId: PatientId): Promise<EncounterSummary | null>;
  findAll(accountId: AccountId): Promise<readonly EncounterSummary[]>;
  findActive(accountId: AccountId): Promise<readonly EncounterSummary[]>;
  delete(id: EncounterId): Promise<void>;
}

export interface EncounterTimelineRepository {
  create(event: EncounterTimelineEventSummary): Promise<void>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly EncounterTimelineEventSummary[]>;
}

const allowedTransitions: Record<
  EncounterSummary['status'],
  readonly EncounterSummary['status'][]
> = {
  reception: ['in_triage', 'in_care', 'closed'],
  in_triage: ['in_care', 'observation', 'closed'],
  in_care: ['observation', 'closed'],
  observation: ['in_care', 'closed'],
  closed: []
};

export interface EncountersServiceOptions {
  readonly owners: OwnersService;
  readonly patients: PatientsService;
  readonly encounterRepository?: EncounterRepository;
  readonly encounterTimelineRepository?: EncounterTimelineRepository;
  readonly onEncounterCreated?: (encounter: EncounterSummary) => Promise<void>;
  readonly onEncounterStatusChanged?: (
    encounter: EncounterSummary,
    previousStatus: EncounterSummary['status']
  ) => Promise<void>;
}

export class EncountersService {
  readonly #owners: OwnersService;
  readonly #patients: PatientsService;
  readonly #encounters = new Map<EncounterId, EncounterSummary>();
  readonly #timeline = new Map<EncounterId, EncounterTimelineEventSummary[]>();
  readonly #encounterRepository?: EncounterRepository;
  readonly #encounterTimelineRepository?: EncounterTimelineRepository;
  readonly #onEncounterCreated?: (encounter: EncounterSummary) => Promise<void>;
  readonly #onEncounterStatusChanged?: (
    encounter: EncounterSummary,
    previousStatus: EncounterSummary['status']
  ) => Promise<void>;

  public constructor(options: EncountersServiceOptions) {
    this.#owners = options.owners;
    this.#patients = options.patients;
    this.#encounterRepository = options.encounterRepository;
    this.#encounterTimelineRepository = options.encounterTimelineRepository;
    this.#onEncounterCreated = options.onEncounterCreated;
    this.#onEncounterStatusChanged = options.onEncounterStatusChanged;
  }

  public listActive(): readonly EncounterSummary[] {
    return Array.from(this.#encounters.values()).filter(
      (encounter) => encounter.status !== 'closed'
    );
  }

  public listAll(): readonly EncounterSummary[] {
    return Array.from(this.#encounters.values());
  }

  public getOrThrow(encounterId: EncounterId): EncounterSummary {
    const encounter = this.#encounters.get(encounterId);
    if (!encounter) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }

    return encounter;
  }

  public openEncounter(
    accountId: AccountId,
    actorUserId: UserId,
    payload: CreateEncounterRequest
  ): EncounterSummary {
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    this.#patients.getOrThrow(patientId);
    this.#owners.getOrThrow(ownerId);

    const existingActive = this.listActive().find((encounter) => encounter.patientId === patientId);
    if (existingActive) {
      throw new ConflictError('Patient already has an active encounter', {
        encounterId: existingActive.id
      });
    }

    const now = nowIso();
    const encounter: EncounterSummary = {
      id: createCorrelationId('enc') as EncounterId,
      accountId,
      patientId,
      ownerId,
      appointmentId: payload.appointmentId as never,
      queueEntryId: payload.queueEntryId as never,
      visitType: payload.visitType,
      origin: payload.origin,
      reason: requireNonEmptyString(payload.reason, 'reason'),
      status: 'reception',
      openedAt: now,
      createdByUserId: actorUserId,
      updatedAt: now
    };

    this.#encounters.set(encounter.id, encounter);
    this.appendTimeline(encounter.id, {
      accountId,
      eventType: 'encounter_opened',
      summary: `Encounter opened from ${encounter.origin}`,
      actorUserId
    });

    // Persist to database if repository is available
    if (this.#encounterRepository) {
      this.#encounterRepository.create(encounter).catch((err) => {
        console.error('Failed to persist encounter to database:', err);
      });
    }

    void this.#onEncounterCreated?.(encounter);

    return encounter;
  }

  public transitionEncounter(
    encounterId: EncounterId,
    actorUserId: UserId,
    payload: TransitionEncounterRequest
  ): EncounterSummary {
    const current = this.getOrThrow(encounterId);
    const nextStatus = payload.nextStatus;

    if (!allowedTransitions[current.status].includes(nextStatus)) {
      throw new ValidationError('Invalid encounter status transition', {
        from: current.status,
        to: nextStatus
      });
    }

    const updated: EncounterSummary = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso()
    };

    this.#encounters.set(encounterId, updated);
    this.appendTimeline(encounterId, {
      accountId: updated.accountId,
      eventType: 'status_changed',
      summary: `Encounter status changed from ${current.status} to ${nextStatus}`,
      actorUserId
    });

    // Persist to database if repository is available
    if (this.#encounterRepository) {
      this.#encounterRepository.update(updated).catch((err) => {
        console.error('Failed to update encounter in database:', err);
      });
    }

    void this.#onEncounterStatusChanged?.(updated, current.status);

    return updated;
  }

  public closeEncounter(
    encounterId: EncounterId,
    actorUserId: UserId,
    payload: CloseEncounterRequest
  ): EncounterSummary {
    const current = this.getOrThrow(encounterId);
    if (current.status === 'closed') {
      throw new ConflictError('Encounter is already closed', { encounterId });
    }

    const closeReason = requireNonEmptyString(payload.closeReason, 'closeReason');
    const updated: EncounterSummary = {
      ...current,
      status: 'closed',
      closedAt: nowIso(),
      closeReason,
      updatedAt: nowIso()
    };

    this.#encounters.set(encounterId, updated);
    this.appendTimeline(encounterId, {
      accountId: updated.accountId,
      eventType: 'encounter_closed',
      summary: `Encounter closed: ${closeReason}`,
      actorUserId
    });

    // Persist to database if repository is available
    if (this.#encounterRepository) {
      this.#encounterRepository.update(updated).catch((err) => {
        console.error('Failed to close encounter in database:', err);
      });
    }

    void this.#onEncounterStatusChanged?.(updated, current.status);

    return updated;
  }

  public listTimeline(encounterId: EncounterId): readonly EncounterTimelineEventSummary[] {
    this.getOrThrow(encounterId);
    return [...(this.#timeline.get(encounterId) ?? [])];
  }

  public appendTimeline(
    encounterId: EncounterId,
    input: Omit<EncounterTimelineEventSummary, 'id' | 'encounterId' | 'occurredAt'>
  ): EncounterTimelineEventSummary {
    const current = this.#timeline.get(encounterId) ?? [];
    const event: EncounterTimelineEventSummary = {
      id: createCorrelationId('evt') as EncounterTimelineEventId,
      encounterId,
      occurredAt: nowIso(),
      ...input
    };
    current.unshift(event);
    this.#timeline.set(encounterId, current);

    // Persist to database if repository is available
    if (this.#encounterTimelineRepository) {
      this.#encounterTimelineRepository.create(event).catch((err) => {
        console.error('Failed to persist timeline event to database:', err);
      });
    }

    return event;
  }
}

export {
  DatabaseEncounterRepository,
  DatabaseEncounterTimelineRepository
} from './repositories/database-encounter.repository.js';
