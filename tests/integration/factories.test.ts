import { describe, it, expect } from 'vitest';
import { createOwner } from '../factories/owner-factory.js';
import { createPatient } from '../factories/patient-factory.js';
import { createEncounter } from '../factories/encounter-factory.js';
import { createAppointment } from '../factories/appointment-factory.js';
import { createUser } from '../factories/user-factory.js';
import { createProduct, createStockItem } from '../factories/inventory-factory.js';
import { createHospitalBase, createSecurityBase } from '../fixtures/hospital-fixture.js';
import {
  assertTableHasRows,
  assertPatientSelectable,
  assertEncounterCreated
} from '../helpers/assertions.js';
import { cleanupRegistry } from '../helpers/db-helpers.js';

describe('Factories', () => {
  it('should create a user', async () => {
    const user = await createUser({ fullName: 'Test User' });
    expect(user.id).toBeDefined();
    expect(user.fullName).toBe('Test User');
  });

  it('should create an owner', async () => {
    const owner = await createOwner({ fullName: 'Test Owner' });
    expect(owner.id).toBeDefined();
    expect(owner.fullName).toBe('Test Owner');
  });

  it('should create a patient linked to an owner', async () => {
    const owner = await createOwner();
    const patient = await createPatient({ owner, name: 'Rex' });
    expect(patient.id).toBeDefined();
    expect(patient.name).toBe('Rex');
    expect(patient.ownerId).toBe(owner.id);
  });

  it('should create an encounter linked to patient and owner', async () => {
    const owner = await createOwner();
    const patient = await createPatient({ owner });
    const encounter = await createEncounter({ patient, owner, reason: 'Test' });
    expect(encounter.id).toBeDefined();
    expect(encounter.patientId).toBe(patient.id);
    expect(encounter.ownerId).toBe(owner.id);
  });

  it('should create an appointment', async () => {
    const owner = await createOwner();
    const patient = await createPatient({ owner });
    const appointment = await createAppointment({ patient, owner });
    expect(appointment.id).toBeDefined();
    expect(appointment.patientId).toBe(patient.id);
  });

  it('should create a product and stock item', async () => {
    const product = await createProduct({ name: 'Test Product' });
    expect(product.name).toBe('Test Product');
    const stockItem = await createStockItem({ productId: product.id, quantity: 50 });
    expect(stockItem.productId).toBe(product.id);
    expect(stockItem.quantity).toBe(50);
  });
});

describe('Fixtures', () => {
  it('should create hospital base fixture', async () => {
    const fixture = await createHospitalBase();
    expect(fixture.owner.id).toBeDefined();
    expect(fixture.patient.id).toBeDefined();
    expect(fixture.encounter.id).toBeDefined();
    expect(fixture.appointment.id).toBeDefined();
    expect(fixture.vetUser.id).toBeDefined();
    expect(fixture.adminUser.id).toBeDefined();
    expect(fixture.stockItem.id).toBeDefined();
  });

  it('should create security base fixture', async () => {
    const fixture = await createSecurityBase();
    expect(fixture.adminUser.id).toBeDefined();
    expect(fixture.vetUser.id).toBeDefined();
    expect(fixture.receptionUser.id).toBeDefined();
    expect(fixture.nurseUser.id).toBeDefined();
    expect(fixture.financeUser.id).toBeDefined();
  });
});

describe('Assertions', () => {
  it('should assert patient is selectable', async () => {
    const owner = await createOwner();
    const patient = await createPatient({ owner });
    await assertPatientSelectable(patient.id);
  });

  it('should assert encounter was created', async () => {
    const owner = await createOwner();
    const patient = await createPatient({ owner });
    const encounter = await createEncounter({ patient, owner });
    await assertEncounterCreated(encounter.id);
  });

  it('should assert table has rows', async () => {
    await createOwner();
    await assertTableHasRows('owners', 1);
  });
});
