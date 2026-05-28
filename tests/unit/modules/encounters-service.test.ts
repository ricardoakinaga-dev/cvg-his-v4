import { describe, expect, it, vi } from 'vitest';

import { OwnersService } from '../../../packages/modules/owners/src/index.js';
import { PatientsService } from '../../../packages/modules/patients/src/index.js';
import { EncountersService } from '../../../packages/modules/encounters/src/index.js';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

function createService(options: ConstructorParameters<typeof EncountersService>[0] = undefined as never) {
  const owners = options?.owners ?? new OwnersService();
  const patients = options?.patients ?? new PatientsService({ owners });
  return new EncountersService({
    owners,
    patients,
    ...options
  });
}

describe('EncountersService coverage guard', () => {
  it('rejects duplicate active encounters for the same patient and validates transitions/closing', () => {
    const encounters = createService();

    const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Consulta inicial'
    });

    expect(() =>
      encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'return',
        origin: 'reception',
        reason: 'Retorno indevido'
      })
    ).toThrow(ConflictError);

    expect(() =>
      encounters.transitionEncounter(encounter.id, 'user_admin' as never, {
        nextStatus: 'observation'
      })
    ).toThrow(ValidationError);

    const moved = encounters.transitionEncounter(encounter.id, 'user_admin' as never, {
      nextStatus: 'in_triage'
    });
    expect(moved.status).toBe('in_triage');

    const closed = encounters.closeEncounter(encounter.id, 'user_admin' as never, {
      closeReason: 'Alta clinica'
    });
    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toBe('Alta clinica');

    expect(() =>
      encounters.closeEncounter(encounter.id, 'user_admin' as never, {
        closeReason: 'Fechar de novo'
      })
    ).toThrow(ConflictError);
  });

  it('hydrates persisted encounters and timelines and caches async timeline reads', async () => {
    const findByEncounterId = vi.fn(async () => [
      {
        id: 'evt_repo_1' as never,
        accountId: 'acc_repo' as never,
        encounterId: 'enc_repo_1' as never,
        occurredAt: '2026-04-18T10:05:00.000Z',
        eventType: 'status_changed',
        summary: 'Paciente encaminhado',
        actorUserId: 'user_repo' as never
      }
    ]);

    const persistedPatientId = '11111111-1111-4111-8111-111111111111';
    const persistedOwnerId = '22222222-2222-4222-8222-222222222222';
    const encounters = createService({
      owners: {
        getOrThrow(ownerId: string) {
          return { id: ownerId, accountId: 'acc_cvg_demo' };
        }
      } as never,
      patients: {
        getOrThrow(patientId: string) {
          return { id: patientId, accountId: 'acc_cvg_demo', primaryOwnerId: persistedOwnerId };
        }
      } as never,
      encounterRepository: {
        async create() {},
        async update() {},
        async findById(id) {
          if (id === ('enc_missing' as never)) return null;
          return {
            id: 'enc_repo_1' as never,
            accountId: 'acc_repo' as never,
            patientId: 'patient_luna' as never,
            ownerId: 'owner_maria_silva' as never,
            appointmentId: undefined,
            queueEntryId: undefined,
            visitType: 'scheduled',
            origin: 'appointment',
            reason: 'Persistido',
            status: 'in_care',
            openedAt: '2026-04-18T10:00:00.000Z',
            createdByUserId: 'user_repo' as never,
            updatedAt: '2026-04-18T10:00:00.000Z'
          };
        },
        async findActiveByPatientId() {
          return null;
        },
        async findAll() {
          return [
            {
              id: 'enc_repo_1' as never,
              accountId: 'acc_repo' as never,
              patientId: 'patient_luna' as never,
              ownerId: 'owner_maria_silva' as never,
              appointmentId: undefined,
              queueEntryId: undefined,
              visitType: 'scheduled',
              origin: 'appointment',
              reason: 'Persistido',
              status: 'in_care',
              openedAt: '2026-04-18T10:00:00.000Z',
              createdByUserId: 'user_repo' as never,
              updatedAt: '2026-04-18T10:00:00.000Z'
            }
          ];
        },
        async findActive() {
          return [];
        },
        async delete() {}
      },
      encounterTimelineRepository: {
        async create() {},
        findByEncounterId
      }
    });

    await encounters.hydrateFromDatabase('acc_repo' as never);

    expect(encounters.listAll()).toHaveLength(1);
    expect(encounters.listTimeline('enc_repo_1' as never)).toHaveLength(1);

    const firstAsync = await encounters.listTimelineAsync('enc_repo_1' as never);
    const secondAsync = await encounters.listTimelineAsync('enc_repo_1' as never);

    expect(firstAsync).toHaveLength(1);
    expect(secondAsync).toHaveLength(1);
    expect(findByEncounterId).toHaveBeenCalledTimes(1);

    await expect(encounters.listTimelineAsync('enc_missing' as never)).rejects.toThrow(NotFoundError);
  });

  it('persists encounter lifecycle and timeline events when repositories are available', async () => {
    const createdEncounters: unknown[] = [];
    const updatedEncounters: unknown[] = [];
    const persistedTimeline: unknown[] = [];
    const onCreated = vi.fn(async () => undefined);
    const onStatusChanged = vi.fn(async () => undefined);
    const persistedPatientId = '11111111-1111-4111-8111-111111111111';
    const persistedOwnerId = '22222222-2222-4222-8222-222222222222';

    const encounters = createService({
      owners: {
        getOrThrow(ownerId: string) {
          return { id: ownerId, accountId: 'acc_cvg_demo' };
        }
      } as never,
      patients: {
        getOrThrow(patientId: string) {
          return { id: patientId, accountId: 'acc_cvg_demo', primaryOwnerId: persistedOwnerId };
        }
      } as never,
      encounterRepository: {
        async create(encounter) {
          createdEncounters.push(encounter);
        },
        async update(encounter) {
          updatedEncounters.push(encounter);
        },
        async findById() {
          return null;
        },
        async findActiveByPatientId() {
          return null;
        },
        async findAll() {
          return [];
        },
        async findActive() {
          return [];
        },
        async delete() {}
      },
      encounterTimelineRepository: {
        async create(event) {
          persistedTimeline.push(event);
        },
        async findByEncounterId() {
          return [];
        }
      },
      onEncounterCreated: onCreated,
      onEncounterStatusChanged: onStatusChanged
    });

    const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
      patientId: persistedPatientId,
      ownerId: persistedOwnerId,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Fluxo com persistencia'
    });

    encounters.appendTimeline(encounter.id, {
      accountId: encounter.accountId,
      eventType: 'note_added',
      summary: 'Observacao clinica',
      actorUserId: 'user_admin' as never
    });

    const transitioned = encounters.transitionEncounter(encounter.id, 'user_admin' as never, {
      nextStatus: 'in_triage'
    });
    encounters.closeEncounter(encounter.id, 'user_admin' as never, {
      closeReason: 'Encerrado'
    });

    await encounters.waitForPersistence();

    expect(createdEncounters).toHaveLength(1);
    expect(updatedEncounters).toHaveLength(2);
    expect(persistedTimeline.length).toBeGreaterThanOrEqual(4);
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: encounter.id }));
    expect(onStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ id: encounter.id, status: 'in_triage' }),
      'reception'
    );
    expect(transitioned.status).toBe('in_triage');
  });
});
