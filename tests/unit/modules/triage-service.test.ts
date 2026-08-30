import { describe, expect, it } from 'vitest';

import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

import { TriageService } from '../../../packages/modules/triage/src/index.js';

function createEncounter(
  overrides: Partial<{
    id: string;
    accountId: string;
    patientId: string;
    status: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';
  }> = {}
) {
  return {
    id: 'enc_triage',
    accountId: 'acc_triage',
    patientId: 'patient_triage',
    status: 'in_triage' as const,
    ...overrides
  };
}

function createEncountersStub(encounter = createEncounter()) {
  return {
    getOrThrow(encounterId: string) {
      if (encounterId !== encounter.id) {
        throw new NotFoundError('Encounter not found', { encounterId });
      }
      return encounter;
    }
  } as never;
}

describe('TriageService coverage guard', () => {
  it('rejects triage creation when payload patient does not match encounter patient', async () => {
    const service = new TriageService(createEncountersStub());

    await expect(
      service.createTriage(
        'user_triage' as never,
        {
          encounterId: 'enc_triage',
          patientId: 'patient_other',
          priority: 'high',
          chiefComplaint: 'Dispneia',
          alerts: ['urgente'],
          destination: 'in_care'
        },
        'acc_triage' as never
      )
    ).rejects.toThrow(ValidationError);
  });

  it('stores version history with actor override and normalized notes', async () => {
    const createdRecords: unknown[] = [];
    const createdVersions: unknown[] = [];
    const repository = {
      async create(record: unknown) {
        createdRecords.push(record);
      },
      async update(record: unknown) {
        createdRecords.push(record);
      },
      async createVersion(version: unknown) {
        createdVersions.push(version);
      },
      async findById() {
        return null;
      },
      async findByEncounterId() {
        return [];
      },
      async findByAccountId() {
        return [];
      },
      async findVersionsByTriageId() {
        return [];
      },
      async findVersionsByAccountId() {
        return [];
      }
    };

    const service = new TriageService(
      createEncountersStub(createEncounter({ status: 'observation' })),
      {
        repository
      }
    );

    const created = await service.createTriage(
      'user_creator' as never,
      {
        encounterId: 'enc_triage',
        patientId: 'patient_triage',
        priority: 'medium',
        chiefComplaint: 'Febre',
        initialNotes: '  observacao inicial  ',
        alerts: ['letargia'],
        destination: 'observation'
      },
      'acc_triage' as never
    );

    const updated = await service.updateTriage(
      created.id,
      {
        chiefComplaint: 'Febre persistente',
        initialNotes: '   ',
        alerts: ['letargia', 'desidratacao'],
        destination: 'in_care'
      },
      'acc_triage' as never,
      'user_supervisor' as never
    );

    expect(createdRecords).toHaveLength(2);
    expect(updated.initialNotes).toBeUndefined();
    expect(service.listVersions(created.id, 'acc_triage' as never)).toHaveLength(1);
    expect(service.listVersions(created.id, 'acc_triage' as never)[0]).toEqual(
      expect.objectContaining({
        changedByUserId: 'user_supervisor',
        changedFields: expect.arrayContaining([
          'chiefComplaint',
          'initialNotes',
          'alerts',
          'destination'
        ])
      })
    );
    expect(createdVersions).toHaveLength(1);
  });

  it('hydrates records and versions for the requested account in descending version order', async () => {
    const service = new TriageService(createEncountersStub(), {
      repository: {
        async create() {},
        async update() {},
        async createVersion() {},
        async findById() {
          return null;
        },
        async findByEncounterId() {
          return [];
        },
        async findByAccountId(accountId) {
          return [
            {
              id: `triage_${accountId}` as never,
              accountId: accountId as never,
              encounterId: 'enc_triage' as never,
              patientId: 'patient_triage' as never,
              priority: 'critical' as const,
              chiefComplaint: 'Choque',
              initialNotes: 'Instavel',
              alerts: ['internacao'],
              destination: 'in_care' as const,
              triagedByUserId: 'user_triage' as never,
              createdAt: '2026-04-18T08:00:00.000Z',
              updatedAt: '2026-04-18T08:00:00.000Z'
            }
          ];
        },
        async findVersionsByTriageId() {
          return [];
        },
        async findVersionsByAccountId(accountId) {
          return [
            {
              id: 'triagev_older' as never,
              triageId: `triage_${accountId}` as never,
              accountId: accountId as never,
              encounterId: 'enc_triage' as never,
              changedFields: ['priority'],
              previousSnapshot: {
                priority: 'medium',
                chiefComplaint: 'Choque',
                initialNotes: 'Instavel',
                alerts: ['internacao'],
                destination: 'in_care',
                updatedAt: '2026-04-18T07:30:00.000Z'
              },
              nextSnapshot: {
                priority: 'high',
                chiefComplaint: 'Choque',
                initialNotes: 'Instavel',
                alerts: ['internacao'],
                destination: 'in_care',
                updatedAt: '2026-04-18T07:40:00.000Z'
              },
              changedByUserId: 'user_triage' as never,
              createdAt: '2026-04-18T07:40:00.000Z'
            },
            {
              id: 'triagev_newer' as never,
              triageId: `triage_${accountId}` as never,
              accountId: accountId as never,
              encounterId: 'enc_triage' as never,
              changedFields: ['priority', 'alerts'],
              previousSnapshot: {
                priority: 'high',
                chiefComplaint: 'Choque',
                initialNotes: 'Instavel',
                alerts: ['internacao'],
                destination: 'in_care',
                updatedAt: '2026-04-18T07:40:00.000Z'
              },
              nextSnapshot: {
                priority: 'critical',
                chiefComplaint: 'Choque',
                initialNotes: 'Instavel',
                alerts: ['internacao', 'UTI'],
                destination: 'in_care',
                updatedAt: '2026-04-18T08:00:00.000Z'
              },
              changedByUserId: 'user_triage' as never,
              createdAt: '2026-04-18T08:00:00.000Z'
            }
          ];
        }
      }
    });

    await service.hydrateFromDatabase('acc_repo' as never);

    const listed = service.list('acc_repo' as never);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('triage_acc_repo');
    expect(
      service
        .listVersions('triage_acc_repo' as never, 'acc_repo' as never)
        .map((version) => version.id)
    ).toEqual(['triagev_newer', 'triagev_older']);
  });
});
