import { describe, expect, it } from 'vitest';

import { EncountersService } from '../../../packages/modules/encounters/src/index.js';
import { OwnersService } from '../../../packages/modules/owners/src/index.js';
import { InMemoryOwnerRepository } from '../../../packages/modules/owners/src/repositories/in-memory-owner.repository.js';
import { PatientsService } from '../../../packages/modules/patients/src/index.js';
import {
  InMemoryOwnerPatientLinkRepository,
  InMemoryPatientRepository
} from '../../../packages/modules/patients/src/repositories/in-memory-patient.repository.js';
import { InMemoryCacheSyncHub } from '../../../packages/shared/database/src/cache-sync-bus.js';
import { NotFoundError } from '../../../packages/shared/errors/src/index.js';
import type { AccountId, OwnerId, PatientId } from '../../../packages/shared/types/src/index.js';

const ACCOUNT = 'acc_replica_test' as AccountId;
const OTHER_ACCOUNT = 'acc_other' as AccountId;

/**
 * Two "replicas" = two independent service graphs (separate per-process
 * caches) sharing the same durable repositories and one cache-sync hub, which
 * is exactly the topology of two API pods behind one PostgreSQL.
 */
function createReplicas() {
  const hub = new InMemoryCacheSyncHub();
  const ownerRepository = new InMemoryOwnerRepository();
  const patientRepository = new InMemoryPatientRepository();
  const linkRepository = new InMemoryOwnerPatientLinkRepository();
  const replica = (name: string) => {
    const cacheSync = hub.createBus(name);
    const owners = new OwnersService({ ownerRepository, seedOwners: [], cacheSync });
    const patients = new PatientsService({
      owners,
      patientRepository,
      ownerPatientLinkRepository: linkRepository,
      seedPatients: [],
      seedLinks: [],
      cacheSync
    });
    const encounters = new EncountersService({ owners, patients, requireUuidIdentifiers: false, cacheSync });
    cacheSync.subscribe('owner', (event) => owners.applyCacheSyncEvent(event));
    cacheSync.subscribe('patient', (event) => patients.applyCacheSyncEvent(event));
    cacheSync.subscribe('encounter', (event) => encounters.applyCacheSyncEvent(event));
    return { owners, patients, encounters, cacheSync };
  };
  return { hub, a: replica('replica-a'), b: replica('replica-b') };
}

describe('cross-replica cache consistency (R2-ARC-02 / R2-ARC-03)', () => {
  it('serves on replica B an owner created on replica A through account-scoped read-through', async () => {
    const { a, b } = createReplicas();
    const owner = a.owners.create(ACCOUNT, { fullName: 'Maria Replica', contacts: [{ label: 'phone', value: '11999999999', type: 'phone', primary: true }], financialResponsible: true });
    await a.owners.waitForPersistence();

    expect(() => b.owners.getOrThrow(OTHER_ACCOUNT, owner.id)).toThrow(NotFoundError);
    await expect(b.owners.fetchOrThrow(OTHER_ACCOUNT, owner.id)).rejects.toBeInstanceOf(NotFoundError);
    const fromB = await b.owners.fetchOrThrow(ACCOUNT, owner.id);
    expect(fromB.fullName).toBe('Maria Replica');
    // Once read through, the sync cache read is scoped and warm on B as well.
    expect(b.owners.getOrThrow(ACCOUNT, owner.id).id).toBe(owner.id);
  });

  it('propagates an owner update and inactivation from A to B via the sync bus', async () => {
    const { a, b, hub } = createReplicas();
    const owner = a.owners.create(ACCOUNT, { fullName: 'Before', contacts: [{ label: 'phone', value: '11999999999', type: 'phone', primary: true }], financialResponsible: true });
    await a.owners.waitForPersistence();
    expect(b.owners.getOrThrow(ACCOUNT, owner.id).fullName).toBe('Before');

    a.owners.update(ACCOUNT, owner.id, { fullName: 'After' });
    await a.owners.waitForPersistence();
    expect(b.owners.getOrThrow(ACCOUNT, owner.id).fullName).toBe('After');

    a.owners.update(ACCOUNT, owner.id, { status: 'inactive' });
    await a.owners.waitForPersistence();
    expect(b.owners.getOrThrow(ACCOUNT, owner.id).status).toBe('inactive');
    expect(hub.events.filter((event) => event.entity === 'owner')).toHaveLength(3);
    expect(hub.events.every((event) => event.origin === 'replica-a')).toBe(true);
  });

  it('makes a patient created on A visible in B lists and refreshes its owner links', async () => {
    const { a, b } = createReplicas();
    const owner = a.owners.create(ACCOUNT, { fullName: 'Tutor', contacts: [{ label: 'phone', value: '11999999999', type: 'phone', primary: true }], financialResponsible: true });
    await a.owners.waitForPersistence();
    const patient = a.patients.create(ACCOUNT, {
      name: 'Luna',
      species: 'canine',
      sex: 'female',
      primaryOwnerId: owner.id
    });
    await a.patients.waitForPersistence();

    expect(b.patients.list().some((item) => item.id === patient.id)).toBe(true);
    expect(b.patients.listLinks({ patientId: patient.id })).toHaveLength(1);
    expect(b.patients.getOrThrow(ACCOUNT, patient.id).name).toBe('Luna');

    a.patients.update(ACCOUNT, patient.id, { name: 'Luna Renamed' });
    await a.patients.waitForPersistence();
    expect(b.patients.getOrThrow(ACCOUNT, patient.id).name).toBe('Luna Renamed');
  });

  it('never applies an event from another account onto a cached row', async () => {
    const { a, b } = createReplicas();
    const owner = a.owners.create(ACCOUNT, { fullName: 'Scoped', contacts: [{ label: 'phone', value: '11999999999', type: 'phone', primary: true }], financialResponsible: true });
    await a.owners.waitForPersistence();
    await b.owners.applyCacheSyncEvent({
      entity: 'owner',
      accountId: OTHER_ACCOUNT,
      id: owner.id,
      op: 'delete',
      origin: 'replica-x',
      emittedAt: new Date().toISOString()
    });
    expect(b.owners.getOrThrow(ACCOUNT, owner.id).fullName).toBe('Scoped');
  });

  it('keeps cache-only peek available for validations but never as a scoped read', () => {
    const { a } = createReplicas();
    const owner = a.owners.create(ACCOUNT, { fullName: 'Peek', contacts: [{ label: 'phone', value: '11999999999', type: 'phone', primary: true }], financialResponsible: true });
    expect(a.owners.peek(owner.id)?.accountId).toBe(ACCOUNT);
    expect(() => a.owners.getOrThrow(OTHER_ACCOUNT, owner.id)).toThrow(NotFoundError);
    expect(() => a.patients.getOrThrow(OTHER_ACCOUNT, 'ghost' as PatientId)).toThrow(NotFoundError);
    expect(() => a.owners.getOrThrow(ACCOUNT, 'ghost' as OwnerId)).toThrow(NotFoundError);
  });
});
