import { createOwner, type OwnerRecord } from '../factories/owner-factory.js';
import { createPatient, type PatientRecord } from '../factories/patient-factory.js';
import { createEncounter, type EncounterRecord } from '../factories/encounter-factory.js';
import { createAppointment, type AppointmentRecord } from '../factories/appointment-factory.js';
import { createUser, type UserRecord } from '../factories/user-factory.js';
import { createStockItem, type StockItemRecord } from '../factories/inventory-factory.js';

/**
 * Role codes used by the Drizzle seed (packages/db/src/seed.ts).
 * NOTE: These differ from AccessControlService role codes (veterinarian/nurse/reception).
 * This is the dual RBAC gap documented in docs/705.
 * Factories use seed codes for DB-level tests; integration tests against the API
 * must use AccessControlService codes.
 */
export const SEED_ROLES = {
  ADMIN: 'admin',
  VET: 'vet',
  NURSE: 'enfermagem',
  RECEPTION: 'recepcao'
} as const;

export interface HospitalBaseFixture {
  owner: OwnerRecord;
  patient: PatientRecord;
  encounter: EncounterRecord;
  appointment: AppointmentRecord;
  vetUser: UserRecord;
  adminUser: UserRecord;
  receptionUser: UserRecord;
  stockItem: StockItemRecord;
}

export async function createHospitalBase(): Promise<HospitalBaseFixture> {
  const adminUser = await createUser({ fullName: 'Admin Test', roleCodes: [SEED_ROLES.ADMIN] });
  const vetUser = await createUser({ fullName: 'Vet Test', roleCodes: [SEED_ROLES.VET] });
  const receptionUser = await createUser({
    fullName: 'Reception Test',
    roleCodes: [SEED_ROLES.RECEPTION]
  });
  const owner = await createOwner();
  const patient = await createPatient({ owner });
  const encounter = await createEncounter({ patient, owner });
  const appointment = await createAppointment({ patient, owner });
  const stockItem = await createStockItem({ quantity: 100, minQuantity: 10 });

  return { owner, patient, encounter, appointment, vetUser, adminUser, receptionUser, stockItem };
}

export interface SecurityBaseFixture {
  adminUser: UserRecord;
  vetUser: UserRecord;
  receptionUser: UserRecord;
  nurseUser: UserRecord;
  financeUser: UserRecord;
}

export async function createSecurityBase(): Promise<SecurityBaseFixture> {
  const adminUser = await createUser({ fullName: 'Admin', roleCodes: [SEED_ROLES.ADMIN] });
  const vetUser = await createUser({ fullName: 'Vet', roleCodes: [SEED_ROLES.VET] });
  const receptionUser = await createUser({
    fullName: 'Reception',
    roleCodes: [SEED_ROLES.RECEPTION]
  });
  const nurseUser = await createUser({ fullName: 'Nurse', roleCodes: [SEED_ROLES.NURSE] });
  // finance role doesn't exist in seed — create it
  const financeUser = await createUser({ fullName: 'Finance' });

  return { adminUser, vetUser, receptionUser, nurseUser, financeUser };
}
