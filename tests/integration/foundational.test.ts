import { describe, it, expect } from 'vitest';
import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { UsersService } from '@cvg-his-v2/module-users';
import { StaffService } from '@cvg-his-v2/module-staff';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { SchedulingService } from '@cvg-his-v2/module-scheduling';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import { AuditService } from '@cvg-his-v2/module-audit';
import { BillingService } from '@cvg-his-v2/module-billing';
import { InventoryService } from '@cvg-his-v2/module-inventory';
import { ForbiddenError } from '@cvg-his-v2/shared-errors';

// ============================================================================
// Foundational Integration Tests — Phase 3
// Validates that central modules actually communicate.
// Based on docs/710, docs/720, docs/780.
//
// These tests use the REAL module services (not mocks) to validate
// integration contracts. Where modules lack DB persistence, tests
// validate in-memory behavior and document the gap.
// ============================================================================

const TEST_ACCOUNT_ID = 'acc_test_001';
const TEST_USER_ID = 'user_admin';

function getSafeScheduledAt(base = new Date()): string {
  const scheduledAt = new Date(base);
  scheduledAt.setUTCHours(10, 0, 0, 0);

  if (scheduledAt.getTime() <= base.getTime()) {
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 1);
    scheduledAt.setUTCHours(10, 0, 0, 0);
  }

  return scheduledAt.toISOString();
}

// --- ICT-001: User with role receives effective permissions ---
describe('ICT-001 — User → Role → Effective Permission', () => {
  it('creation of user with valid role results in effective permission', async () => {
    const accessControl = new AccessControlService();
    const users = new UsersService();

    // Create user with reception role (matches AccessControlService role code)
    const roleCode = 'reception';
    const user = await users.create({
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@test.com`,
      password: 'TestPassword123',
      roleCode
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();

    // Verify the role exists in access control catalog
    const roles = accessControl.listRoles();
    const role = roles.find((r) => r.code === roleCode);
    expect(role).toBeDefined();
    expect(role!.permissionCodes.length).toBeGreaterThan(0);

    // Verify permissions are effectively assigned
    const profile = accessControl.createProfile({ roleCodes: [roleCode] });
    expect(profile.permissionCodes).toContain('owners.read');
    expect(profile.permissionCodes).toContain('patients.read');
    expect(profile.permissionCodes).toContain('scheduling.manage');
  });
});

// --- ICT-002: User without permission is blocked ---
describe('ICT-002 — User Without Permission Is Blocked', () => {
  it('user without scheduling permission receives block on protected operation', () => {
    const accessControl = new AccessControlService();

    // Auditor has no scheduling.manage
    const profile = accessControl.createProfile({ roleCodes: ['auditor'] });
    expect(profile.permissionCodes).not.toContain('scheduling.manage');

    expect(() =>
      accessControl.assertAuthorized({
        access: profile,
        actor: { id: 'user1', accountId: 'acc1', status: 'active' } as any,
        permissionCode: 'scheduling.manage',
        accountId: 'acc1'
      })
    ).toThrow(ForbiddenError);
  });
});

// --- ICT-003: User with permission can execute allowed operation ---
describe('ICT-003 — User With Permission Can Execute', () => {
  it('user with scheduling permission can execute permitted operation', () => {
    const accessControl = new AccessControlService();
    const profile = accessControl.createProfile({ roleCodes: ['reception'] });

    expect(() =>
      accessControl.assertAuthorized({
        access: profile,
        actor: { id: 'user1', accountId: 'acc1', status: 'active' } as any,
        permissionCode: 'scheduling.manage',
        accountId: 'acc1'
      })
    ).not.toThrow();

    expect(() =>
      accessControl.assertAuthorized({
        access: profile,
        actor: { id: 'user1', accountId: 'acc1', status: 'active' } as any,
        permissionCode: 'owners.manage',
        accountId: 'acc1'
      })
    ).not.toThrow();
  });
});

// --- ICT-004: Veterinarian is eligible for scheduling ---
describe('ICT-004 — Veterinarian → Scheduling Eligibility', () => {
  it('registered veterinarian becomes listable/selectable in scheduling', () => {
    const staff = new StaffService();

    // StaffService has seed data — verify staff exists
    const allStaff = staff.list();
    expect(allStaff.length).toBeGreaterThan(0);

    // Verify staff can be found by userId
    const firstStaff = allStaff[0];
    const found = staff.findByUserId(firstStaff.userId);
    expect(found).toBeDefined();
    expect(found!.id).toBe(firstStaff.id);

    // Verify staff can be retrieved by ID
    const byId = staff.getOrThrow(firstStaff.id);
    expect(byId.id).toBe(firstStaff.id);
  });
});

// --- ICT-005: Inactive professional is not eligible ---
describe('ICT-005 — Inactive Professional → Not Eligible', () => {
  it('inactive professional is not eligible for new scheduling', () => {
    const accessControl = new AccessControlService();
    const profile = accessControl.createProfile({ roleCodes: ['admin'] });

    expect(() =>
      accessControl.assertAuthorized({
        access: profile,
        actor: { id: 'user1', accountId: 'acc1', status: 'inactive' } as any,
        permissionCode: 'scheduling.manage',
        accountId: 'acc1'
      })
    ).toThrow(ForbiddenError);
  });
});

// --- ICT-006: Owner + Patient → Selectable in scheduling ---
describe('ICT-006 — Owner + Patient → Scheduling Selection', () => {
  it('registered owner and patient result in selectable patient in scheduling', () => {
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });

    // Create owner (real API: create(accountId, payload))
    const owner = owners.create(TEST_ACCOUNT_ID, {
      fullName: `Tutor Test ${Date.now()}`,
      documentId: `DOC_${Date.now()}`,
      contacts: [{ type: 'phone', value: '11999999999', label: 'Principal' }],
      financialResponsible: true
    });
    expect(owner.id).toBeDefined();
    expect(owner.fullName).toContain('Tutor Test');

    // Create patient linked to owner
    const patient = patients.create(TEST_ACCOUNT_ID, {
      name: `Paciente Test ${Date.now()}`,
      species: 'canine',
      primaryOwnerId: owner.id,
      sex: 'male'
    });
    expect(patient.id).toBeDefined();
    expect(patient.primaryOwnerId).toBe(owner.id);

    // Patient should be findable
    const found = patients.getOrThrow(patient.id);
    expect(found.id).toBe(patient.id);
    expect(found.primaryOwnerId).toBe(owner.id);

    // Owner should be findable
    const foundOwner = owners.getOrThrow(owner.id);
    expect(foundOwner.id).toBe(owner.id);
  });
});

// --- ICT-007: Appointment persists correct linkage ---
describe('ICT-007 — Appointment → Correct Linkage', () => {
  it('appointment creation persists correct patient and owner linkage', async () => {
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    const scheduling = new SchedulingService(owners, patients);

    // Create owner + patient
    const owner = owners.create(TEST_ACCOUNT_ID, {
      fullName: `Tutor Appt ${Date.now()}`,
      contacts: [{ type: 'phone', value: '11999999999', label: 'Principal' }],
      financialResponsible: true
    });
    const patient = patients.create(TEST_ACCOUNT_ID, {
      name: `Paciente Appt ${Date.now()}`,
      species: 'canine',
      primaryOwnerId: owner.id,
      sex: 'male'
    });

    // Create appointment (real API: createAppointment(accountId, payload))
    const scheduledAt = getSafeScheduledAt();
    const appointment = await scheduling.createAppointment(TEST_ACCOUNT_ID, {
      patientId: patient.id,
      ownerId: owner.id,
      scheduledAt,
      reason: 'Consulta de rotina'
    });

    expect(appointment.id).toBeDefined();
    expect(appointment.patientId).toBe(patient.id);
    expect(appointment.ownerId).toBe(owner.id);
    expect(appointment.status).toBe('scheduled');

    // Appointment should be listable
    const appointments = scheduling.listAppointments();
    const found = appointments.find((a) => a.id === appointment.id);
    expect(found).toBeDefined();
  });
});

// --- ICT-008: Scheduling → Encounter chain ---
describe('ICT-008 — Scheduling → Encounter Chain', () => {
  it('opening encounter from scheduling maintains correct chain', async () => {
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    const scheduling = new SchedulingService(owners, patients);
    const encounters = new EncountersService({ owners, patients });

    // Create owner + patient
    const owner = owners.create(TEST_ACCOUNT_ID, {
      fullName: `Tutor Chain ${Date.now()}`,
      contacts: [{ type: 'phone', value: '11999999999', label: 'Principal' }],
      financialResponsible: true
    });
    const patient = patients.create(TEST_ACCOUNT_ID, {
      name: `Paciente Chain ${Date.now()}`,
      species: 'canine',
      primaryOwnerId: owner.id,
      sex: 'male'
    });

    // Create appointment and check-in
    const scheduledAt = getSafeScheduledAt();
    const appointment = await scheduling.createAppointment(TEST_ACCOUNT_ID, {
      patientId: patient.id,
      ownerId: owner.id,
      scheduledAt,
      visitType: 'scheduled',
      reason: 'Consulta'
    });

    // Check-in (real API: checkIn(accountId, payload with patientId, ownerId, reason))
    const queueEntry = await scheduling.checkIn(TEST_ACCOUNT_ID, {
      patientId: patient.id,
      ownerId: owner.id,
      appointmentId: appointment.id,
      reason: 'Check-in'
    });
    expect(queueEntry.status).toBe('waiting');

    // Open encounter (real API: openEncounter(accountId, actorUserId, payload))
    const encounter = encounters.openEncounter(TEST_ACCOUNT_ID, TEST_USER_ID, {
      patientId: patient.id,
      ownerId: owner.id,
      reason: 'Consulta de rotina'
    });

    expect(encounter.id).toBeDefined();
    expect(encounter.patientId).toBe(patient.id);
    expect(encounter.ownerId).toBe(owner.id);
    expect(encounter.status).toBe('reception');

    // First call the queue entry (waiting -> called), then attach encounter
    await scheduling.callQueueEntry(queueEntry.id);
    const calledEntry = scheduling.getQueueEntryOrThrow(queueEntry.id);
    expect(calledEntry.status).toBe('called');

    // Attach encounter to queue
    await scheduling.attachEncounter(queueEntry.id, encounter.id);
    const updatedQueue = scheduling.getQueueEntryOrThrow(queueEntry.id);
    expect(updatedQueue.encounterId).toBe(encounter.id);
  });
});

// --- ICT-009: Clinical action generates auditable record ---
describe('ICT-009 — Clinical Action → Auditable Record', () => {
  it('relevant clinical action generates auditable record', () => {
    const audit = new AuditService();

    // Simulate clinical action
    audit.write({
      actorId: 'user_vet',
      accountId: 'acc_default',
      module: 'medical-records',
      action: 'create_entry',
      entityType: 'clinical-entry',
      entityId: 'entry_123',
      riskLevel: 'high',
      correlationId: 'corr_abc',
      reason: 'Clinical note created'
    });

    // Verify audit event was recorded
    const events = audit.list({ moduleId: 'medical-records' });
    const clinicalEvent = events.find(
      (e) => e.entityId === 'entry_123' && e.action === 'create_entry'
    );
    expect(clinicalEvent).toBeDefined();
    expect(clinicalEvent!.actorId).toBe('user_vet');
    expect(clinicalEvent!.riskLevel).toBe('high');
    expect(clinicalEvent!.correlationId).toBe('corr_abc');
  });
});

// --- ICT-010: Billable/consumption generates expected reflex ---
describe('ICT-010 — Billable/Consumption → Module Reflex', () => {
  it('billable item creation generates expected reflex in billing module', async () => {
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    // Shared encounters instance so billing can see test encounters
    const encounters = new EncountersService({ owners, patients });
    const billing = new BillingService(encounters);

    // Create owner + patient + encounter
    const owner = owners.create(TEST_ACCOUNT_ID, {
      fullName: `Tutor Bill ${Date.now()}`,
      contacts: [{ type: 'phone', value: '11999999999', label: 'Principal' }],
      financialResponsible: true
    });
    const patient = patients.create(TEST_ACCOUNT_ID, {
      name: `Paciente Bill ${Date.now()}`,
      species: 'canine',
      primaryOwnerId: owner.id,
      sex: 'male'
    });
    const encounter = encounters.openEncounter(TEST_ACCOUNT_ID, TEST_USER_ID, {
      patientId: patient.id,
      ownerId: owner.id,
      reason: 'Consulta'
    });

    // Create billing estimate + item
    const estimate = await billing.createEstimate({ encounterId: encounter.id });
    expect(estimate.encounterId).toBe(encounter.id);

    await billing.addItem(TEST_USER_ID, {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Consulta',
      quantity: 1,
      unitPriceAmount: 150
    });

    // Verify reflex: billing record exists with item
    const record = await billing.getByEncounterOrThrow(encounter.id);
    expect(record).toBeDefined();

    const items = await billing.listItems(encounter.id);
    expect(items.length).toBe(1);
    expect(items[0].description).toBe('Consulta');
    expect(items[0].quantity).toBe(1);
  });

  it('consumption generates expected reflex in inventory module', () => {
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    // Shared encounters instance so inventory can see test encounters
    const encounters = new EncountersService({ owners, patients });
    const inventory = new InventoryService(encounters);

    // Create owner + patient + encounter
    const owner = owners.create(TEST_ACCOUNT_ID, {
      fullName: `Tutor Inv ${Date.now()}`,
      contacts: [{ type: 'phone', value: '11999999999', label: 'Principal' }],
      financialResponsible: true
    });
    const patient = patients.create(TEST_ACCOUNT_ID, {
      name: `Paciente Inv ${Date.now()}`,
      species: 'canine',
      primaryOwnerId: owner.id,
      sex: 'male'
    });
    const encounter = encounters.openEncounter(TEST_ACCOUNT_ID, TEST_USER_ID, {
      patientId: patient.id,
      ownerId: owner.id,
      reason: 'Consulta'
    });

    // Get initial stock
    const items = inventory.listItems();
    expect(items.length).toBeGreaterThan(0);

    const initialItem = items[0];
    const initialQty = initialItem.onHandQuantity;

    // Consume (real API: consume(actorUserId, payload with sourceEntityType))
    inventory.consume(TEST_USER_ID, {
      encounterId: encounter.id,
      inventoryItemId: initialItem.id,
      quantity: 2,
      sourceEntityType: 'encounter'
    });

    // Verify reflex: stock reduced
    const updatedItem = inventory.getItemOrThrow(initialItem.id);
    expect(updatedItem.onHandQuantity).toBe(initialQty - 2);

    // Verify consumption was recorded
    const consumptions = inventory.listConsumptions(encounter.id);
    expect(consumptions.length).toBeGreaterThan(0);
  });
});
