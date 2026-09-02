import { randomUUID } from 'node:crypto';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  AcknowledgeClinicalHandoffRequest,
  CloseEncounterRequest,
  CreateEncounterRequest,
  MarkClinicalHandoffPendingRequest,
  ResolveClinicalHandoffPendingRequest,
  ReturnClinicalHandoffToClinicRequest,
  SendClinicalHandoffRequest,
  SendClinicalHandoffToFinanceRequest,
  TransitionEncounterRequest
} from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  ClinicalHandoffId,
  ClinicalHandoffPendingIssueId,
  ClinicalHandoffPriority,
  ClinicalHandoffStatus,
  ClinicalHandoffSummary,
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
  updateForReopen?(encounter: EncounterSummary): Promise<void>;
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

export interface ClinicalHandoffListFilters {
  readonly handoffStatus?: ClinicalHandoffStatus;
  readonly encounterId?: EncounterId;
  readonly ownerId?: OwnerId;
  readonly patientId?: PatientId;
  readonly priority?: ClinicalHandoffPriority;
}

export interface ClinicalHandoffRepository {
  create(handoff: ClinicalHandoffSummary): Promise<void>;
  update(handoff: ClinicalHandoffSummary): Promise<void>;
  findById(id: ClinicalHandoffId): Promise<ClinicalHandoffSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly ClinicalHandoffSummary[]>;
  findAll(accountId: AccountId): Promise<readonly ClinicalHandoffSummary[]>;
}

export interface ClinicalHandoffsServiceOptions {
  readonly repository?: ClinicalHandoffRepository;
  readonly onHandoffSent?: (handoff: ClinicalHandoffSummary) => Promise<void>;
  readonly onHandoffAcknowledged?: (
    handoff: ClinicalHandoffSummary,
    previousStatus: ClinicalHandoffStatus
  ) => Promise<void>;
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export interface EncountersServiceOptions {
  readonly owners: OwnersService;
  readonly patients: PatientsService;
  readonly encounterRepository?: EncounterRepository;
  readonly encounterTimelineRepository?: EncounterTimelineRepository;
  readonly requireUuidIdentifiers?: boolean;
  readonly onEncounterCreated?: (encounter: EncounterSummary) => Promise<void>;
  readonly onEncounterStatusChanged?: (
    encounter: EncounterSummary,
    previousStatus: EncounterSummary['status']
  ) => Promise<void>;
}

export interface EncounterStateSnapshot {
  readonly encounter: EncounterSummary;
  readonly timeline: readonly EncounterTimelineEventSummary[];
}

export class EncountersService {
  readonly #owners: OwnersService;
  readonly #patients: PatientsService;
  readonly #encounters = new Map<EncounterId, EncounterSummary>();
  readonly #timeline = new Map<EncounterId, EncounterTimelineEventSummary[]>();
  readonly #encounterRepository?: EncounterRepository;
  readonly #encounterTimelineRepository?: EncounterTimelineRepository;
  readonly #requireUuidIdentifiers: boolean;
  readonly #onEncounterCreated?: (encounter: EncounterSummary) => Promise<void>;
  readonly #onEncounterStatusChanged?: (
    encounter: EncounterSummary,
    previousStatus: EncounterSummary['status']
  ) => Promise<void>;
  #pendingPersist: Promise<void> = Promise.resolve();
  #lastPersist: Promise<void> = Promise.resolve();
  #pendingCallbacks: Promise<void> = Promise.resolve();
  #lastCallback: Promise<void> = Promise.resolve();

  public constructor(options: EncountersServiceOptions) {
    this.#owners = options.owners;
    this.#patients = options.patients;
    this.#encounterRepository = options.encounterRepository;
    this.#encounterTimelineRepository = options.encounterTimelineRepository;
    this.#requireUuidIdentifiers =
      options.requireUuidIdentifiers ?? options.encounterRepository !== undefined;
    this.#onEncounterCreated = options.onEncounterCreated;
    this.#onEncounterStatusChanged = options.onEncounterStatusChanged;
  }

  public listActive(accountId: AccountId): readonly EncounterSummary[] {
    return Array.from(this.#encounters.values()).filter(
      (encounter) => encounter.accountId === accountId && encounter.status !== 'closed'
    );
  }

  public listAll(accountId: AccountId): readonly EncounterSummary[] {
    return Array.from(this.#encounters.values()).filter(
      (encounter) => encounter.accountId === accountId
    );
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#encounterRepository) {
      return;
    }

    const persistedEncounters = (await this.#encounterRepository.findAll(accountId)).filter(
      (encounter) => encounter.accountId === accountId
    );

    for (const encounter of persistedEncounters) {
      this.#encounters.set(encounter.id, encounter);

      if (this.#encounterTimelineRepository) {
        const timeline = (
          await this.#encounterTimelineRepository.findByEncounterId(encounter.id)
        ).filter((event) => event.accountId === accountId && event.encounterId === encounter.id);
        this.#timeline.set(encounter.id, [...timeline]);
      }
    }
  }

  public getOrThrow(accountId: AccountId, encounterId: EncounterId): EncounterSummary {
    const encounter = this.#encounters.get(encounterId);
    if (!encounter || encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }

    return encounter;
  }

  /**
   * Captures the hot encounter state before a command starts mutating it.
   * Route-level transaction failures use this snapshot to remove speculative
   * cache state immediately, before the database transaction releases its
   * client and a best-effort hydration runs.
   */
  public snapshotState(accountId: AccountId, encounterId: EncounterId): EncounterStateSnapshot {
    return {
      encounter: this.getOrThrow(accountId, encounterId),
      timeline: [...(this.#timeline.get(encounterId) ?? [])].filter(
        (event) => event.accountId === accountId && event.encounterId === encounterId
      )
    };
  }

  public restoreState(accountId: AccountId, snapshot: EncounterStateSnapshot): void {
    if (snapshot.encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId: snapshot.encounter.id });
    }
    this.#encounters.set(snapshot.encounter.id, snapshot.encounter);
    this.#timeline.set(
      snapshot.encounter.id,
      [...snapshot.timeline].filter(
        (event) => event.accountId === accountId && event.encounterId === snapshot.encounter.id
      )
    );
  }

  public async waitForPersistence(): Promise<void> {
    const lastPersist = this.#lastPersist;
    const lastCallback = this.#lastCallback;
    try {
      await Promise.all([lastPersist, lastCallback]);
    } finally {
      if (this.#lastPersist === lastPersist) {
        this.#lastPersist = Promise.resolve();
      }
      if (this.#lastCallback === lastCallback) {
        this.#lastCallback = Promise.resolve();
      }
    }
  }

  #enqueueCallback(callback: () => Promise<void>, after: Promise<void> = Promise.resolve()): void {
    const pending = this.#pendingCallbacks
      .catch(() => undefined)
      .then(async () => {
        await after;
        await callback();
      });
    this.#lastCallback = pending;
    this.#pendingCallbacks = pending.catch(() => undefined);
    void pending.catch(() => undefined);
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): Promise<void> {
    const pending = this.#pendingPersist
      .catch(() => undefined)
      .then(async () => {
        try {
          await operation();
        } catch (error) {
          rollback?.();
          throw error;
        }
      });
    this.#lastPersist = pending;
    this.#pendingPersist = pending.catch(() => undefined);
    void pending.catch(() => undefined);
    return pending;
  }

  #assertActiveParticipants(
    accountId: AccountId,
    patientId: PatientId,
    ownerId: OwnerId
  ): {
    readonly patient: ReturnType<PatientsService['getOrThrow']>;
    readonly owner: ReturnType<OwnersService['getOrThrow']>;
  } {
    const patient = this.#patients.getOrThrow(patientId);
    const owner = this.#owners.getOrThrow(ownerId);
    if (patient.accountId !== accountId || owner.accountId !== accountId) {
      throw new ValidationError('Patient and owner must belong to the current account');
    }
    if (owner.status !== 'active') {
      throw new ConflictError('Cannot open or reopen an encounter for an inactive owner', {
        ownerId
      });
    }
    if (patient.status !== 'active') {
      throw new ConflictError('Cannot open or reopen an encounter for an inactive patient', {
        patientId
      });
    }
    return { patient, owner };
  }

  public openEncounter(
    accountId: AccountId,
    actorUserId: UserId,
    payload: CreateEncounterRequest
  ): EncounterSummary {
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    const { patient, owner } = this.#assertActiveParticipants(accountId, patientId, ownerId);
    if (patient.primaryOwnerId !== ownerId) {
      throw new ValidationError('Owner must be the primary owner of the patient');
    }

    if (this.#requireUuidIdentifiers && (!isUuid(patientId) || !isUuid(ownerId))) {
      throw new ValidationError(
        'Patient and owner must be persisted with UUID identifiers before opening an encounter',
        {
          patientId,
          ownerId,
          reason: 'non_uuid_identifier'
        }
      );
    }

    const existingActive = this.listActive(accountId).find(
      (encounter) => encounter.patientId === patientId
    );
    if (existingActive) {
      throw new ConflictError('Patient already has an active encounter', {
        encounterId: existingActive.id
      });
    }

    const now = nowIso();
    const encounter: EncounterSummary = {
      id: randomUUID() as EncounterId,
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

    const { event: timelineEvent } = this.#appendTimelineToCache(accountId, encounter.id, {
      accountId,
      eventType: 'encounter_opened',
      summary: `Encounter opened from ${encounter.origin}`,
      actorUserId
    });
    const persistence = this.#enqueuePersistEncounterCreation(encounter, timelineEvent);

    if (this.#onEncounterCreated) {
      this.#enqueueCallback(() => this.#onEncounterCreated!(encounter), persistence);
    }

    return encounter;
  }

  /**
   * Database-backed entry point for API workflows. It refreshes both
   * participants before invoking the synchronous domain transition, so a
   * process-local hydration snapshot cannot authorize an inactive owner or
   * patient.
   */
  public async openEncounterAuthoritatively(
    accountId: AccountId,
    actorUserId: UserId,
    payload: CreateEncounterRequest
  ): Promise<EncounterSummary> {
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    await Promise.all([
      this.#patients.getAuthoritativeOrThrow(accountId, patientId),
      this.#owners.getAuthoritativeOrThrow(accountId, ownerId)
    ]);
    return this.openEncounter(accountId, actorUserId, payload);
  }

  public transitionEncounter(
    accountId: AccountId,
    encounterId: EncounterId,
    actorUserId: UserId,
    payload: TransitionEncounterRequest
  ): EncounterSummary {
    const current = this.getOrThrow(accountId, encounterId);
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
    const { event: timelineEvent } = this.#appendTimelineToCache(accountId, encounterId, {
      accountId: updated.accountId,
      eventType: 'status_changed',
      summary: `Encounter status changed from ${current.status} to ${nextStatus}`,
      actorUserId
    });

    const persistence = this.#enqueueEncounterMutation(updated, current, timelineEvent);

    if (this.#onEncounterStatusChanged) {
      this.#enqueueCallback(
        () => this.#onEncounterStatusChanged!(updated, current.status),
        persistence
      );
    }

    return updated;
  }

  public closeEncounter(
    accountId: AccountId,
    encounterId: EncounterId,
    actorUserId: UserId,
    payload: CloseEncounterRequest
  ): EncounterSummary {
    const current = this.getOrThrow(accountId, encounterId);
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
    const { event: timelineEvent } = this.#appendTimelineToCache(accountId, encounterId, {
      accountId: updated.accountId,
      eventType: 'encounter_closed',
      summary: `Encounter closed: ${closeReason}`,
      actorUserId
    });

    const persistence = this.#enqueueEncounterMutation(updated, current, timelineEvent);

    if (this.#onEncounterStatusChanged) {
      this.#enqueueCallback(
        () => this.#onEncounterStatusChanged!(updated, current.status),
        persistence
      );
    }

    return updated;
  }

  public reopenEncounter(
    accountId: AccountId,
    encounterId: EncounterId,
    actorUserId: UserId,
    reason: string
  ): EncounterSummary {
    const current = this.getOrThrow(accountId, encounterId);
    if (current.status !== 'closed') {
      throw new ConflictError('Only a closed encounter can be reopened', { encounterId });
    }
    this.#assertActiveParticipants(current.accountId, current.patientId, current.ownerId);
    const reopenReason = requireNonEmptyString(reason, 'reason');
    const updated: EncounterSummary = {
      ...current,
      status: 'reception',
      closedAt: undefined,
      closeReason: undefined,
      updatedAt: nowIso()
    };
    this.#encounters.set(encounterId, updated);
    const { event: timelineEvent } = this.#appendTimelineToCache(accountId, encounterId, {
      accountId: updated.accountId,
      eventType: 'encounter_reopened',
      summary: `Encounter reopened: ${reopenReason}`,
      actorUserId
    });
    const persistence = this.#enqueueEncounterMutation(
      updated,
      current,
      timelineEvent,
      (repository) => repository.updateForReopen?.(updated) ?? repository.update(updated)
    );
    if (this.#onEncounterStatusChanged) {
      this.#enqueueCallback(
        () => this.#onEncounterStatusChanged!(updated, current.status),
        persistence
      );
    }
    return updated;
  }

  public async reopenEncounterAuthoritatively(
    accountId: AccountId,
    encounterId: EncounterId,
    actorUserId: UserId,
    reason: string
  ): Promise<EncounterSummary> {
    const current = this.getOrThrow(accountId, encounterId);
    await Promise.all([
      this.#patients.getAuthoritativeOrThrow(accountId, current.patientId),
      this.#owners.getAuthoritativeOrThrow(accountId, current.ownerId)
    ]);
    return this.reopenEncounter(accountId, encounterId, actorUserId, reason);
  }

  public deleteEncounter(accountId: AccountId, encounterId: EncounterId): void {
    const current = this.getOrThrow(accountId, encounterId);
    const currentTimeline = this.#timeline.get(encounterId) ?? [];
    this.#encounters.delete(encounterId);
    this.#timeline.delete(encounterId);

    if (this.#encounterRepository) {
      this.#enqueuePersist(
        () => this.#encounterRepository!.delete(encounterId),
        () => {
          this.#encounters.set(encounterId, current);
          this.#timeline.set(encounterId, currentTimeline);
        }
      );
    }
  }

  public listTimeline(
    accountId: AccountId,
    encounterId: EncounterId
  ): readonly EncounterTimelineEventSummary[] {
    this.getOrThrow(accountId, encounterId);
    return [...(this.#timeline.get(encounterId) ?? [])].filter(
      (event) => event.accountId === accountId && event.encounterId === encounterId
    );
  }

  public async listTimelineAsync(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<readonly EncounterTimelineEventSummary[]> {
    const cachedEncounter = this.#encounters.get(encounterId);
    if (cachedEncounter && cachedEncounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }

    if (!cachedEncounter && this.#encounterRepository) {
      const persistedEncounter = await this.#encounterRepository.findById(encounterId);
      if (!persistedEncounter || persistedEncounter.accountId !== accountId) {
        throw new NotFoundError('Encounter not found', { encounterId });
      }
      this.#encounters.set(encounterId, persistedEncounter);
    } else if (!cachedEncounter) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }

    const cachedTimeline = this.#timeline.get(encounterId);
    if (cachedTimeline) {
      return [...cachedTimeline].filter(
        (event) => event.accountId === accountId && event.encounterId === encounterId
      );
    }

    if (!this.#encounterTimelineRepository) {
      return [];
    }

    const persistedTimeline = (
      await this.#encounterTimelineRepository.findByEncounterId(encounterId)
    ).filter((event) => event.accountId === accountId && event.encounterId === encounterId);
    this.#timeline.set(encounterId, [...persistedTimeline]);
    return [...persistedTimeline];
  }

  #appendTimelineToCache(
    accountId: AccountId,
    encounterId: EncounterId,
    input: Omit<EncounterTimelineEventSummary, 'id' | 'encounterId' | 'occurredAt'>
  ): {
    readonly event: EncounterTimelineEventSummary;
    readonly previousTimeline: readonly EncounterTimelineEventSummary[];
  } {
    this.getOrThrow(accountId, encounterId);
    if (input.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
    const previousTimeline = [...(this.#timeline.get(encounterId) ?? [])].filter(
      (event) => event.accountId === accountId && event.encounterId === encounterId
    );
    const event = {
      id: createCorrelationId('evt') as EncounterTimelineEventId,
      encounterId,
      occurredAt: nowIso(),
      ...input
    };
    this.#timeline.set(encounterId, [event, ...previousTimeline]);
    return { event, previousTimeline };
  }

  #enqueuePersistEncounterCreation(
    encounter: EncounterSummary,
    timelineEvent: EncounterTimelineEventSummary
  ): Promise<void> {
    if (!this.#encounterRepository && !this.#encounterTimelineRepository) {
      return Promise.resolve();
    }

    return this.#enqueuePersist(
      async () => {
        let encounterCreated = false;
        try {
          if (this.#encounterRepository) {
            await this.#encounterRepository.create(encounter);
            encounterCreated = true;
          }
          await this.#encounterTimelineRepository?.create(timelineEvent);
        } catch (error) {
          if (encounterCreated) {
            await this.#encounterRepository?.delete(encounter.id).catch(() => undefined);
          }
          throw error;
        }
      },
      () => {
        if (this.#encounters.get(encounter.id) === encounter) {
          this.#encounters.delete(encounter.id);
        }
        this.#timeline.delete(encounter.id);
      }
    );
  }

  #enqueueEncounterMutation(
    updated: EncounterSummary,
    current: EncounterSummary,
    timelineEvent: EncounterTimelineEventSummary,
    persistEncounter: (repository: EncounterRepository) => Promise<void> = (repository) =>
      repository.update(updated)
  ): Promise<void> {
    if (!this.#encounterRepository && !this.#encounterTimelineRepository) {
      return Promise.resolve();
    }

    return this.#enqueuePersist(
      async () => {
        let encounterPersisted = false;
        try {
          if (this.#encounterRepository) {
            await persistEncounter(this.#encounterRepository);
            encounterPersisted = true;
          }
          await this.#encounterTimelineRepository?.create(timelineEvent);
        } catch (error) {
          if (encounterPersisted) {
            await this.#encounterRepository?.update(current).catch(() => undefined);
          }
          throw error;
        }
      },
      () => {
        if (this.#encounters.get(updated.id) === updated) {
          this.#encounters.set(updated.id, current);
        }
        const events = this.#timeline.get(updated.id) ?? [];
        this.#timeline.set(
          updated.id,
          events.filter((event) => event.id !== timelineEvent.id)
        );
      }
    );
  }

  public appendTimelineWithPersistence(
    accountId: AccountId,
    encounterId: EncounterId,
    input: Omit<EncounterTimelineEventSummary, 'id' | 'encounterId' | 'occurredAt'>
  ): {
    readonly event: EncounterTimelineEventSummary;
    readonly persistence: Promise<void>;
  } {
    const { event } = this.#appendTimelineToCache(accountId, encounterId, input);

    const persistence = this.#encounterTimelineRepository
      ? this.#enqueuePersist(
          () => this.#encounterTimelineRepository!.create(event),
          () => {
            const events = this.#timeline.get(encounterId) ?? [];
            this.#timeline.set(
              encounterId,
              events.filter((item) => item.id !== event.id)
            );
          }
        )
      : Promise.resolve();

    return { event, persistence };
  }

  public appendTimeline(
    accountId: AccountId,
    encounterId: EncounterId,
    input: Omit<EncounterTimelineEventSummary, 'id' | 'encounterId' | 'occurredAt'>
  ): EncounterTimelineEventSummary {
    return this.appendTimelineWithPersistence(accountId, encounterId, input).event;
  }
}

export class ClinicalHandoffsService {
  readonly #encounters: EncountersService;
  readonly #repository?: ClinicalHandoffRepository;
  readonly #handoffs = new Map<ClinicalHandoffId, ClinicalHandoffSummary>();
  readonly #onHandoffSent?: (handoff: ClinicalHandoffSummary) => Promise<void>;
  readonly #onHandoffAcknowledged?: (
    handoff: ClinicalHandoffSummary,
    previousStatus: ClinicalHandoffStatus
  ) => Promise<void>;
  #pendingPersist: Promise<void> = Promise.resolve();
  #lastPersist: Promise<void> = Promise.resolve();
  #pendingCallbacks: Promise<void> = Promise.resolve();
  #lastCallback: Promise<void> = Promise.resolve();

  public constructor(encounters: EncountersService, options: ClinicalHandoffsServiceOptions = {}) {
    this.#encounters = encounters;
    this.#repository = options.repository;
    this.#onHandoffSent = options.onHandoffSent;
    this.#onHandoffAcknowledged = options.onHandoffAcknowledged;
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) {
      return;
    }

    const persisted = (await this.#repository.findAll(accountId)).filter(
      (handoff) => handoff.accountId === accountId
    );
    for (const handoff of persisted) {
      this.#handoffs.set(handoff.id, handoff);
    }
  }

  public list(accountId: AccountId, filters: ClinicalHandoffListFilters = {}) {
    return Array.from(this.#handoffs.values())
      .filter((handoff) => handoff.accountId === accountId)
      .filter(
        (handoff) => !filters.handoffStatus || handoff.handoffStatus === filters.handoffStatus
      )
      .filter((handoff) => !filters.encounterId || handoff.encounterId === filters.encounterId)
      .filter((handoff) => !filters.ownerId || handoff.ownerId === filters.ownerId)
      .filter((handoff) => !filters.patientId || handoff.patientId === filters.patientId)
      .filter((handoff) => !filters.priority || handoff.priority === filters.priority)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public getOrThrow(accountId: AccountId, handoffId: ClinicalHandoffId): ClinicalHandoffSummary {
    const handoff = this.#handoffs.get(handoffId);
    if (!handoff || handoff.accountId !== accountId) {
      throw new NotFoundError('Clinical handoff not found', { handoffId });
    }

    return handoff;
  }

  public async waitForPersistence(): Promise<void> {
    const lastPersist = this.#lastPersist;
    const lastCallback = this.#lastCallback;
    try {
      await Promise.all([lastPersist, lastCallback]);
    } finally {
      if (this.#lastPersist === lastPersist) {
        this.#lastPersist = Promise.resolve();
      }
      if (this.#lastCallback === lastCallback) {
        this.#lastCallback = Promise.resolve();
      }
    }
  }

  #enqueueCallback(callback: () => Promise<void>, after: Promise<void> = Promise.resolve()): void {
    const pending = this.#pendingCallbacks
      .catch(() => undefined)
      .then(async () => {
        await after;
        await callback();
      });
    this.#lastCallback = pending;
    this.#pendingCallbacks = pending.catch(() => undefined);
    void pending.catch(() => undefined);
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): Promise<void> {
    const pending = this.#pendingPersist
      .catch(() => undefined)
      .then(async () => {
        try {
          await operation();
        } catch (error) {
          rollback?.();
          throw error;
        }
      });
    this.#lastPersist = pending;
    this.#pendingPersist = pending.catch(() => undefined);
    void pending.catch(() => undefined);
    return pending;
  }

  public sendToReception(
    accountId: AccountId,
    actorUserId: UserId,
    payload: SendClinicalHandoffRequest
  ): ClinicalHandoffSummary {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const encounter = this.#encounters.getOrThrow(accountId, encounterId);

    if (encounter.status === 'closed') {
      throw new ConflictError('Cannot send handoff for a closed encounter', { encounterId });
    }

    const existing = this.list(accountId, { encounterId });
    if (existing.length > 0) {
      throw new ConflictError('Encounter already has a clinical handoff', {
        encounterId,
        handoffId: existing[0].id
      });
    }

    const clinicalSummary = requireNonEmptyString(payload.clinicalSummary, 'clinicalSummary');
    const receptionInstructions = requireNonEmptyString(
      payload.receptionInstructions,
      'receptionInstructions'
    );
    const now = nowIso();
    const handoff: ClinicalHandoffSummary = {
      id: randomUUID() as ClinicalHandoffId,
      accountId,
      encounterId: encounter.id,
      queueEntryId: encounter.queueEntryId,
      appointmentId: encounter.appointmentId,
      ownerId: encounter.ownerId,
      patientId: encounter.patientId,
      originChannel: encounter.origin,
      fromSector: 'clinic',
      toSector: 'reception',
      fromResponsibleId: actorUserId,
      toResponsibleType: payload.toResponsibleType ?? 'sector',
      toResponsibleId: payload.toResponsibleId ?? 'reception',
      clinicalSummary,
      receptionInstructions,
      priority: payload.priority ?? 'medium',
      handoffStatus: 'sent_to_reception',
      createdBy: actorUserId,
      sentBy: actorUserId,
      sentAt: now,
      pendingIssues: [],
      createdAt: now,
      updatedAt: now
    };

    this.#handoffs.set(handoff.id, handoff);
    const { persistence: timelinePersistence } = this.#encounters.appendTimelineWithPersistence(
      accountId,
      encounter.id,
      {
        accountId,
        eventType: 'handoff_sent_to_reception',
        summary: 'Clinical handoff sent to reception',
        actorUserId
      }
    );

    let handoffPersistence = Promise.resolve();
    if (this.#repository) {
      handoffPersistence = this.#enqueuePersist(
        () => this.#repository!.create(handoff),
        () => {
          if (this.#handoffs.get(handoff.id) === handoff) {
            this.#handoffs.delete(handoff.id);
          }
        }
      );
    }

    if (this.#onHandoffSent) {
      this.#enqueueCallback(
        () => this.#onHandoffSent!(handoff),
        Promise.all([handoffPersistence, timelinePersistence]).then(() => undefined)
      );
    }
    return handoff;
  }

  public acknowledge(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    payload: AcknowledgeClinicalHandoffRequest = {}
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(accountId, handoffId);

    if (current.handoffStatus !== 'sent_to_reception') {
      throw new ConflictError('Clinical handoff is not waiting for reception acknowledgement', {
        handoffId,
        status: current.handoffStatus
      });
    }

    const now = nowIso();
    const updated: ClinicalHandoffSummary = {
      ...current,
      handoffStatus: 'acknowledged_by_reception',
      acknowledgedBy: actorUserId,
      acknowledgedAt: now,
      acknowledgeNote: payload.note?.trim() || undefined,
      updatedAt: now
    };

    this.#handoffs.set(handoffId, updated);
    const { persistence: timelinePersistence } = this.#encounters.appendTimelineWithPersistence(
      accountId,
      updated.encounterId,
      {
        accountId,
        eventType: 'handoff_acknowledged',
        summary: 'Reception acknowledged clinical handoff',
        actorUserId
      }
    );

    let handoffPersistence = Promise.resolve();
    if (this.#repository) {
      handoffPersistence = this.#enqueuePersist(
        () => this.#repository!.update(updated),
        () => {
          this.#handoffs.set(handoffId, current);
        }
      );
    }

    if (this.#onHandoffAcknowledged) {
      this.#enqueueCallback(
        () => this.#onHandoffAcknowledged!(updated, current.handoffStatus),
        Promise.all([handoffPersistence, timelinePersistence]).then(() => undefined)
      );
    }
    return updated;
  }

  public markPending(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    payload: MarkClinicalHandoffPendingRequest
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(accountId, handoffId);
    this.#assertMutableForReceptionAction(accountId, current);
    const now = nowIso();
    const issue = {
      id: randomUUID() as ClinicalHandoffPendingIssueId,
      type: requireNonEmptyString(payload.type, 'type'),
      severity: payload.severity ?? 'medium',
      ownerType: payload.ownerType ?? 'person',
      ownerId: requireNonEmptyString(payload.ownerId, 'ownerId'),
      reason: requireNonEmptyString(payload.reason, 'reason'),
      blocksFinance: payload.blocksFinance ?? true,
      status: 'open' as const,
      createdBy: actorUserId,
      createdAt: now
    };
    const updated: ClinicalHandoffSummary = {
      ...current,
      handoffStatus: 'waiting_pending_resolution',
      pendingIssues: [...current.pendingIssues, issue],
      updatedAt: now
    };
    return this.#commitHandoffTransition(current, updated, actorUserId, 'handoff_pending_marked');
  }

  public resolvePending(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    issueId: ClinicalHandoffPendingIssueId,
    payload: ResolveClinicalHandoffPendingRequest
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(accountId, handoffId);
    const now = nowIso();
    let found = false;
    const pendingIssues = current.pendingIssues.map((issue) => {
      if (issue.id !== issueId) return issue;
      found = true;
      if (issue.status === 'resolved') {
        throw new ConflictError('Clinical handoff pending issue is already resolved', {
          handoffId,
          issueId
        });
      }
      return {
        ...issue,
        status: 'resolved' as const,
        resolvedBy: actorUserId,
        resolvedAt: now,
        resolution: requireNonEmptyString(payload.resolution, 'resolution')
      };
    });
    if (!found) {
      throw new NotFoundError('Clinical handoff pending issue not found', { handoffId, issueId });
    }
    const hasOpenIssues = pendingIssues.some((issue) => issue.status === 'open');
    const updated: ClinicalHandoffSummary = {
      ...current,
      handoffStatus: hasOpenIssues ? 'waiting_pending_resolution' : 'acknowledged_by_reception',
      pendingIssues,
      updatedAt: now
    };
    return this.#commitHandoffTransition(current, updated, actorUserId, 'handoff_pending_resolved');
  }

  public returnToClinic(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    payload: ReturnClinicalHandoffToClinicRequest
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(accountId, handoffId);
    this.#assertMutableForReceptionAction(accountId, current);
    const now = nowIso();
    const updated: ClinicalHandoffSummary = {
      ...current,
      handoffStatus: 'returned_to_clinic',
      returnedToClinicBy: actorUserId,
      returnedToClinicAt: now,
      returnedToClinicReason: requireNonEmptyString(payload.reason, 'reason'),
      returnedToClinicResponsibleId: payload.toResponsibleId?.trim() || undefined,
      updatedAt: now
    };
    return this.#commitHandoffTransition(
      current,
      updated,
      actorUserId,
      'handoff_returned_to_clinic'
    );
  }

  public sendToFinance(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    payload: SendClinicalHandoffToFinanceRequest = {}
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(accountId, handoffId);
    this.#assertMutableForReceptionAction(accountId, current);
    const blockingIssues = current.pendingIssues.filter(
      (issue) => issue.status === 'open' && issue.blocksFinance
    );
    if (blockingIssues.length > 0) {
      throw new ConflictError('Clinical handoff has open blocking pending issues', {
        handoffId,
        issueIds: blockingIssues.map((issue) => issue.id)
      });
    }
    const now = nowIso();
    const updated: ClinicalHandoffSummary = {
      ...current,
      handoffStatus: 'sent_to_finance',
      sentToFinanceBy: actorUserId,
      sentToFinanceAt: now,
      financeNote: payload.note?.trim() || undefined,
      updatedAt: now
    };
    return this.#commitHandoffTransition(current, updated, actorUserId, 'handoff_sent_to_finance');
  }

  #assertMutableForReceptionAction(accountId: AccountId, handoff: ClinicalHandoffSummary): void {
    if (handoff.accountId !== accountId) {
      throw new NotFoundError('Clinical handoff not found', { handoffId: handoff.id });
    }
    if (handoff.handoffStatus === 'sent_to_finance') {
      throw new ConflictError('Clinical handoff is already sent to finance', {
        handoffId: handoff.id
      });
    }
  }

  #commitHandoffTransition(
    current: ClinicalHandoffSummary,
    updated: ClinicalHandoffSummary,
    actorUserId: UserId,
    eventType: EncounterTimelineEventSummary['eventType']
  ): ClinicalHandoffSummary {
    this.#handoffs.set(updated.id, updated);
    const { persistence: timelinePersistence } = this.#encounters.appendTimelineWithPersistence(
      updated.accountId,
      updated.encounterId,
      {
        accountId: updated.accountId,
        eventType,
        summary: eventType.replaceAll('_', ' '),
        actorUserId
      }
    );

    let handoffPersistence = Promise.resolve();
    if (this.#repository) {
      handoffPersistence = this.#enqueuePersist(
        () => this.#repository!.update(updated),
        () => {
          this.#handoffs.set(current.id, current);
        }
      );
    }

    if (this.#onHandoffAcknowledged) {
      this.#enqueueCallback(
        () => this.#onHandoffAcknowledged!(updated, current.handoffStatus),
        Promise.all([handoffPersistence, timelinePersistence]).then(() => undefined)
      );
    }
    return updated;
  }
}

export class InMemoryClinicalHandoffRepository implements ClinicalHandoffRepository {
  readonly #handoffs = new Map<ClinicalHandoffId, ClinicalHandoffSummary>();

  public async create(handoff: ClinicalHandoffSummary): Promise<void> {
    this.#handoffs.set(handoff.id, handoff);
  }

  public async update(handoff: ClinicalHandoffSummary): Promise<void> {
    if (!this.#handoffs.has(handoff.id)) {
      throw new NotFoundError('Clinical handoff not found', { handoffId: handoff.id });
    }
    this.#handoffs.set(handoff.id, handoff);
  }

  public async findById(id: ClinicalHandoffId): Promise<ClinicalHandoffSummary | null> {
    return this.#handoffs.get(id) ?? null;
  }

  public async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly ClinicalHandoffSummary[]> {
    return Array.from(this.#handoffs.values()).filter(
      (handoff) => handoff.encounterId === encounterId
    );
  }

  public async findAll(accountId: AccountId): Promise<readonly ClinicalHandoffSummary[]> {
    return Array.from(this.#handoffs.values()).filter((handoff) => handoff.accountId === accountId);
  }
}

export {
  DatabaseEncounterRepository,
  DatabaseEncounterTimelineRepository
} from './repositories/database-encounter.repository.js';
export { DatabaseClinicalHandoffRepository } from './repositories/database-clinical-handoff.repository.js';
