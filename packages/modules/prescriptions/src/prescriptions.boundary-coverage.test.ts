import { describe, expect, it } from 'vitest';

import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  InMemoryPrescriptionRepository,
  PrescriptionsService,
  type PrescriptionRepository
} from './index.js';

const ACCOUNT_A = 'acc-prescription-a' as AccountId;
const ACCOUNT_B = 'acc-prescription-b' as AccountId;
const ACTOR_A = 'user-prescription-a' as UserId;
const ACTOR_B = 'user-prescription-b' as UserId;

const DOCUMENT_CONTEXT = {
  clinic: { name: 'CVG Hospital Veterinario' },
  owner: { name: 'Maria Silva' },
  patient: { name: 'Luna' },
  professional: { name: 'Dra. Ana Vet' }
};

function createService(): PrescriptionsService {
  return new PrescriptionsService();
}

function createPrescription(
  service: PrescriptionsService,
  accountId: AccountId,
  actorUserId: UserId,
  medicationName: string
) {
  return service.create(accountId, actorUserId, {
    medicalRecordId: `${accountId}-record`,
    encounterId: `${accountId}-encounter`,
    patientId: `${accountId}-patient`,
    medicationName
  });
}

describe('PrescriptionsService account-aware detail and command boundary', () => {
  it('allows same-account detail operations and rejects an empty account context', () => {
    const service = createService();
    const prescription = createPrescription(service, ACCOUNT_A, ACTOR_A, 'Amoxicilina');

    expect(service.getById(ACCOUNT_A, prescription.id)).toMatchObject({
      id: prescription.id,
      accountId: ACCOUNT_A
    });
    expect(service.renderDocument(ACCOUNT_A, prescription.id, DOCUMENT_CONTEXT)).toMatchObject({
      prescriptionId: prescription.id,
      title: 'Receita Veterinaria'
    });
    expect(service.getRevisions(ACCOUNT_A, prescription.id)).toHaveLength(1);

    expect(() => service.getById(undefined as never, prescription.id)).toThrow(ValidationError);
    expect(() =>
      service.renderDocument(undefined as never, prescription.id, DOCUMENT_CONTEXT)
    ).toThrow(ValidationError);
    expect(() => service.getRevisions(undefined as never, prescription.id)).toThrow(
      ValidationError
    );
  });

  it('rejects foreign detail and command access before changing account B', async () => {
    const repository = new InMemoryPrescriptionRepository();
    const service = new PrescriptionsService({ prescriptionRepository: repository });
    const prescriptionA = createPrescription(service, ACCOUNT_A, ACTOR_A, 'Amoxicilina');
    const prescriptionB = createPrescription(service, ACCOUNT_B, ACTOR_B, 'Prednisona');
    await service.waitForPersistence();

    const beforeB = service.getById(ACCOUNT_B, prescriptionB.id);
    const beforeRevisionsB = service.getRevisions(ACCOUNT_B, prescriptionB.id);
    const beforePersistedB = await repository.findById(prescriptionB.id, ACCOUNT_B);

    expect(() => service.getById(ACCOUNT_A, prescriptionB.id)).toThrow(NotFoundError);
    expect(() => service.renderDocument(ACCOUNT_A, prescriptionB.id, DOCUMENT_CONTEXT)).toThrow(
      NotFoundError
    );
    expect(() => service.getRevisions(ACCOUNT_A, prescriptionB.id)).toThrow(NotFoundError);
    expect(() =>
      service.update(ACCOUNT_A, prescriptionB.id, ACTOR_A, {
        title: 'Alteracao cruzada',
        reason: 'nao autorizado'
      })
    ).toThrow(NotFoundError);
    expect(() =>
      service.archive(ACCOUNT_A, prescriptionB.id, ACTOR_A, { reason: 'nao autorizado' })
    ).toThrow(NotFoundError);
    expect(() => service.sign(ACCOUNT_A, prescriptionB.id, ACTOR_A, beforeB.version)).toThrow(
      NotFoundError
    );

    expect(service.getById(ACCOUNT_B, prescriptionB.id)).toEqual(beforeB);
    expect(service.getRevisions(ACCOUNT_B, prescriptionB.id)).toEqual(beforeRevisionsB);
    await service.waitForPersistence();
    expect(await repository.findById(prescriptionB.id, ACCOUNT_B)).toEqual(beforePersistedB);
    expect(service.getById(ACCOUNT_A, prescriptionA.id)).toMatchObject({ accountId: ACCOUNT_A });
  });

  it('does not publish contaminated foreign rows during account hydration', async () => {
    const sourceRepository = new InMemoryPrescriptionRepository();
    const sourceService = new PrescriptionsService({ prescriptionRepository: sourceRepository });
    const prescriptionA = createPrescription(sourceService, ACCOUNT_A, ACTOR_A, 'Amoxicilina');
    const prescriptionB = createPrescription(sourceService, ACCOUNT_B, ACTOR_B, 'Prednisona');
    await sourceService.waitForPersistence();

    const contaminatedRepository: PrescriptionRepository = {
      create: (prescription, accountId) => sourceRepository.create(prescription, accountId),
      createWithRevision: (prescription, revision, accountId) =>
        sourceRepository.createWithRevision(prescription, revision, accountId),
      update: (prescription, accountId) => sourceRepository.update(prescription, accountId),
      updateWithRevision: (prescription, revision, accountId) =>
        sourceRepository.updateWithRevision(prescription, revision, accountId),
      findById: (id, accountId) => sourceRepository.findById(id, accountId),
      findByEncounterId: (id, accountId) => sourceRepository.findByEncounterId(id, accountId),
      findByPatientId: (id, accountId) => sourceRepository.findByPatientId(id, accountId),
      findByAccountId: async (accountId) => [
        ...(await sourceRepository.findByAccountId(accountId)),
        ...(accountId === ACCOUNT_A ? await sourceRepository.findByAccountId(ACCOUNT_B) : [])
      ],
      findByAccountIdPaginated: (accountId, options) =>
        sourceRepository.findByAccountIdPaginated(accountId, options)
    };
    const hydrated = new PrescriptionsService({ prescriptionRepository: contaminatedRepository });

    await hydrated.hydrateFromDatabase(ACCOUNT_A);

    expect(hydrated.getById(ACCOUNT_A, prescriptionA.id)).toMatchObject({ accountId: ACCOUNT_A });
    expect(() => hydrated.getById(ACCOUNT_A, prescriptionB.id)).toThrow(NotFoundError);
    expect(hydrated.listByAccount(ACCOUNT_A)).toHaveLength(1);
  });
});
