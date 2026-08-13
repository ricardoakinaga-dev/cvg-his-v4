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
  #pendingPersist: Promise<void> = Promise.resolve();
  #lastPersist: Promise<void> = Promise.resolve();

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

  public listByAccount(accountId: AccountId): readonly EncounterSummary[] {
    return this.listAll().filter((encounter) => encounter.accountId === accountId);
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#encounterRepository) {
      return;
    }

    const persistedEncounters = await this.#encounterRepository.findAll(accountId);

    for (const encounter of persistedEncounters) {
      this.#encounters.set(encounter.id, encounter);

      if (this.#encounterTimelineRepository) {
        const timeline = await this.#encounterTimelineRepository.findByEncounterId(encounter.id);
        this.#timeline.set(encounter.id, [...timeline]);
      }
    }
  }

  public getOrThrow(encounterId: EncounterId): EncounterSummary {
    const encounter = this.#encounters.get(encounterId);
    if (!encounter) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }

    return encounter;
  }

  public getForAccountOrThrow(accountId: AccountId, encounterId: EncounterId): EncounterSummary {
    const encounter = this.getOrThrow(encounterId);
    if (encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
    return encounter;
  }

  public async waitForPersistence(): Promise<void> {
    try {
      await this.#lastPersist;
    } finally {
      this.#pendingPersist = this.#pendingPersist.catch(() => {});
      this.#lastPersist = this.#pendingPersist;
    }
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist.then(async () => {
      try {
        await operation();
      } catch (error) {
        rollback?.();
        throw error;
      }
    });
    this.#lastPersist = pending;
    this.#pendingPersist = pending;
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

    if (this.#encounterRepository && (!isUuid(patientId) || !isUuid(ownerId))) {
      throw new ValidationError(
        'Patient and owner must be persisted with UUID identifiers before opening an encounter',
        {
          patientId,
          ownerId,
          reason: 'non_uuid_identifier'
        }
      );
    }

    const existingActive = this.listActive().find((encounter) => encounter.patientId === patientId);
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

    // Persist to database if repository is available
    if (this.#encounterRepository) {
      this.#enqueuePersist(
        () => this.#encounterRepository!.create(encounter),
        () => {
          if (this.#encounters.get(encounter.id) === encounter) {
            this.#encounters.delete(encounter.id);
          }
          this.#timeline.delete(encounter.id);
        }
      );
    }

    this.appendTimeline(encounter.id, {
      accountId,
      eventType: 'encounter_opened',
      summary: `Encounter opened from ${encounter.origin}`,
      actorUserId
    });

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
      this.#enqueuePersist(
        () => this.#encounterRepository!.update(updated),
        () => {
          this.#encounters.set(encounterId, current);
        }
      );
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
      this.#enqueuePersist(
        () => this.#encounterRepository!.update(updated),
        () => {
          this.#encounters.set(encounterId, current);
        }
      );
    }

    void this.#onEncounterStatusChanged?.(updated, current.status);

    return updated;
  }

  public deleteEncounter(encounterId: EncounterId): void {
    const current = this.getOrThrow(encounterId);
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

  public listTimeline(encounterId: EncounterId): readonly EncounterTimelineEventSummary[] {
    this.getOrThrow(encounterId);
    return [...(this.#timeline.get(encounterId) ?? [])];
  }

  public async listTimelineAsync(
    encounterId: EncounterId
  ): Promise<readonly EncounterTimelineEventSummary[]> {
    const cachedEncounter = this.#encounters.get(encounterId);

    if (!cachedEncounter && this.#encounterRepository) {
      const persistedEncounter = await this.#encounterRepository.findById(encounterId);
      if (!persistedEncounter) {
        throw new NotFoundError('Encounter not found', { encounterId });
      }
      this.#encounters.set(encounterId, persistedEncounter);
    } else if (!cachedEncounter) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }

    const cachedTimeline = this.#timeline.get(encounterId);
    if (cachedTimeline) {
      return [...cachedTimeline];
    }

    if (!this.#encounterTimelineRepository) {
      return [];
    }

    const persistedTimeline =
      await this.#encounterTimelineRepository.findByEncounterId(encounterId);
    this.#timeline.set(encounterId, [...persistedTimeline]);
    return [...persistedTimeline];
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
      this.#enqueuePersist(
        () => this.#encounterTimelineRepository!.create(event),
        () => {
          const events = this.#timeline.get(encounterId) ?? [];
          this.#timeline.set(
            encounterId,
            events.filter((item) => item.id !== event.id)
          );
        }
      );
    }

    return event;
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

    const persisted = await this.#repository.findAll(accountId);
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

  public getOrThrow(handoffId: ClinicalHandoffId): ClinicalHandoffSummary {
    const handoff = this.#handoffs.get(handoffId);
    if (!handoff) {
      throw new NotFoundError('Clinical handoff not found', { handoffId });
    }

    return handoff;
  }

  public async waitForPersistence(): Promise<void> {
    try {
      await this.#lastPersist;
    } finally {
      this.#pendingPersist = this.#pendingPersist.catch(() => {});
      this.#lastPersist = this.#pendingPersist;
    }
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist.then(async () => {
      try {
        await operation();
      } catch (error) {
        rollback?.();
        throw error;
      }
    });
    this.#lastPersist = pending;
    this.#pendingPersist = pending;
  }

  public sendToReception(
    accountId: AccountId,
    actorUserId: UserId,
    payload: SendClinicalHandoffRequest
  ): ClinicalHandoffSummary {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const encounter = this.#encounters.getOrThrow(encounterId);

    if (encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }

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
    this.#encounters.appendTimeline(encounter.id, {
      accountId,
      eventType: 'handoff_sent_to_reception',
      summary: 'Clinical handoff sent to reception',
      actorUserId
    });

    if (this.#repository) {
      this.#enqueuePersist(
        () => this.#repository!.create(handoff),
        () => {
          if (this.#handoffs.get(handoff.id) === handoff) {
            this.#handoffs.delete(handoff.id);
          }
        }
      );
    }

    void this.#onHandoffSent?.(handoff);
    return handoff;
  }

  public acknowledge(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    payload: AcknowledgeClinicalHandoffRequest = {}
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(handoffId);

    if (current.accountId !== accountId) {
      throw new NotFoundError('Clinical handoff not found', { handoffId });
    }

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
    this.#encounters.appendTimeline(updated.encounterId, {
      accountId,
      eventType: 'handoff_acknowledged',
      summary: 'Reception acknowledged clinical handoff',
      actorUserId
    });

    if (this.#repository) {
      this.#enqueuePersist(
        () => this.#repository!.update(updated),
        () => {
          this.#handoffs.set(handoffId, current);
        }
      );
    }

    void this.#onHandoffAcknowledged?.(updated, current.handoffStatus);
    return updated;
  }

  public markPending(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    payload: MarkClinicalHandoffPendingRequest
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(handoffId);
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
    const current = this.getOrThrow(handoffId);
    if (current.accountId !== accountId) {
      throw new NotFoundError('Clinical handoff not found', { handoffId });
    }
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
    const current = this.getOrThrow(handoffId);
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
    return this.#commitHandoffTransition(current, updated, actorUserId, 'handoff_returned_to_clinic');
  }

  public sendToFinance(
    accountId: AccountId,
    actorUserId: UserId,
    handoffId: ClinicalHandoffId,
    payload: SendClinicalHandoffToFinanceRequest = {}
  ): ClinicalHandoffSummary {
    const current = this.getOrThrow(handoffId);
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

  #assertMutableForReceptionAction(
    accountId: AccountId,
    handoff: ClinicalHandoffSummary
  ): void {
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
    this.#encounters.appendTimeline(updated.encounterId, {
      accountId: updated.accountId,
      eventType,
      summary: eventType.replaceAll('_', ' '),
      actorUserId
    });

    if (this.#repository) {
      this.#enqueuePersist(
        () => this.#repository!.update(updated),
        () => {
          this.#handoffs.set(current.id, current);
        }
      );
    }

    void this.#onHandoffAcknowledged?.(updated, current.handoffStatus);
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
