import { randomUUID } from 'node:crypto';

import {
  closeDatabaseClient,
  createDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import {
  DatabaseInpatientDailyChargeRepository,
  DatabaseInpatientOccurrenceRepository,
  DatabaseInpatientProgressRepository,
  DatabaseInpatientStayRepository
} from '../../../packages/modules/inpatient/src/repositories/database-inpatient.repository.js';
import type {
  AccountId,
  InpatientDailyChargeSummary,
  InpatientOccurrenceSummary,
  InpatientProgressSummary,
  InpatientStaySummary
} from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

interface InpatientFixture {
  readonly accountId: AccountId;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly stayId: string;
  readonly progressId: string;
  readonly occurrenceId: string;
  readonly dailyChargeId: string;
}

const tenantId = randomUUID();
const fixtureA: InpatientFixture = {
  accountId: randomUUID() as AccountId,
  userId: randomUUID(),
  ownerId: randomUUID(),
  patientId: randomUUID(),
  encounterId: randomUUID(),
  stayId: randomUUID(),
  progressId: randomUUID(),
  occurrenceId: randomUUID(),
  dailyChargeId: randomUUID()
};
const fixtureB: InpatientFixture = {
  accountId: randomUUID() as AccountId,
  userId: randomUUID(),
  ownerId: randomUUID(),
  patientId: randomUUID(),
  encounterId: randomUUID(),
  stayId: randomUUID(),
  progressId: randomUUID(),
  occurrenceId: randomUUID(),
  dailyChargeId: randomUUID()
};
const fixtures = [fixtureA, fixtureB] as const;

let stayRepository: DatabaseInpatientStayRepository;
let progressRepository: DatabaseInpatientProgressRepository;
let occurrenceRepository: DatabaseInpatientOccurrenceRepository;
let dailyChargeRepository: DatabaseInpatientDailyChargeRepository;

const asAccount = <T>(fixture: InpatientFixture, operation: () => Promise<T>): Promise<T> =>
  runWithTenantContext(
    {
      tenantId,
      accountId: fixture.accountId,
      userId: fixture.userId,
      correlationId: `inpatient-stay-tenant-${randomUUID()}`
    },
    operation
  );

const fixtureStay = (fixture: InpatientFixture): InpatientStaySummary => ({
  id: fixture.stayId as never,
  accountId: fixture.accountId,
  encounterId: fixture.encounterId as never,
  patientId: fixture.patientId as never,
  ownerId: fixture.ownerId as never,
  admittedByUserId: fixture.userId as never,
  unit: 'Internacao',
  ward: 'Ala tenant',
  bed: `B-${fixture.accountId.slice(0, 4)}`,
  status: 'admitted',
  admittedAt: '2026-08-30T10:00:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z'
});

const fixtureProgress = (fixture: InpatientFixture): InpatientProgressSummary => ({
  id: fixture.progressId as never,
  accountId: fixture.accountId,
  stayId: fixture.stayId as never,
  encounterId: fixture.encounterId as never,
  note: `Progress ${fixture.accountId}`,
  authoredByUserId: fixture.userId as never,
  createdAt: '2026-08-30T10:01:00.000Z'
});

const fixtureOccurrence = (fixture: InpatientFixture): InpatientOccurrenceSummary => ({
  id: fixture.occurrenceId as never,
  accountId: fixture.accountId,
  stayId: fixture.stayId as never,
  encounterId: fixture.encounterId as never,
  type: 'clinical',
  severity: 'info',
  title: `Occurrence ${fixture.accountId}`,
  description: 'Tenant boundary fixture',
  authoredByUserId: fixture.userId as never,
  createdAt: '2026-08-30T10:02:00.000Z'
});

const fixtureDailyCharge = (fixture: InpatientFixture): InpatientDailyChargeSummary => ({
  id: fixture.dailyChargeId as never,
  accountId: fixture.accountId,
  stayId: fixture.stayId as never,
  encounterId: fixture.encounterId as never,
  patientId: fixture.patientId as never,
  description: `Daily charge ${fixture.accountId}`,
  chargeDate: '2026-08-30',
  quantity: 1,
  unitAmount: 100,
  totalAmount: 100,
  status: 'pending',
  createdByUserId: fixture.userId as never,
  createdAt: '2026-08-30T10:03:00.000Z',
  updatedAt: '2026-08-30T10:03:00.000Z'
});

async function insertFixture(fixture: InpatientFixture): Promise<void> {
  const pool = getTestPool();
  const slug = `inpatient-stay-boundary-${fixture.accountId.replaceAll('-', '')}`;
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, $4, true)`,
    [fixture.accountId, tenantId, slug, `Inpatient stay boundary ${fixture.accountId.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Inpatient boundary operator')`,
    [
      fixture.userId,
      fixture.accountId,
      `inpatient_boundary_${fixture.accountId.replaceAll('-', '')}`,
      `${fixture.accountId}@example.test`
    ]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Inpatient boundary owner')`,
    [fixture.ownerId, fixture.accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Inpatient boundary patient', 'canine')`,
    [fixture.patientId, fixture.accountId, fixture.ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [fixture.encounterId, fixture.accountId, fixture.patientId, fixture.ownerId, fixture.userId]
  );
  await pool.query(
    `INSERT INTO inpatient_stays (
       id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed,
       admitted_by_user_id, admitted_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, 'admitted', 'Internacao', 'Ala tenant', $6, $7, $8, $8)`,
    [
      fixture.stayId,
      fixture.accountId,
      fixture.patientId,
      fixture.ownerId,
      fixture.encounterId,
      `B-${fixture.accountId.slice(0, 4)}`,
      fixture.userId,
      '2026-08-30T10:00:00.000Z'
    ]
  );
  await pool.query(
    `INSERT INTO inpatient_progress (
       id, account_id, stay_id, encounter_id, note, authored_by_user_id, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      fixture.progressId,
      fixture.accountId,
      fixture.stayId,
      fixture.encounterId,
      `Progress ${fixture.accountId}`,
      fixture.userId,
      '2026-08-30T10:01:00.000Z'
    ]
  );
  await pool.query(
    `INSERT INTO inpatient_occurrences (
       id, account_id, stay_id, encounter_id, type, severity, title, description,
       authored_by_user_id, created_at
     ) VALUES ($1, $2, $3, $4, 'clinical', 'info', $5, 'Tenant boundary fixture', $6, $7)`,
    [
      fixture.occurrenceId,
      fixture.accountId,
      fixture.stayId,
      fixture.encounterId,
      `Occurrence ${fixture.accountId}`,
      fixture.userId,
      '2026-08-30T10:02:00.000Z'
    ]
  );
  await pool.query(
    `INSERT INTO inpatient_daily_charges (
       id, account_id, stay_id, encounter_id, patient_id, description, charge_date,
       quantity, unit_amount, total_amount, status, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, '2026-08-30', 1, 100, 100, 'pending', $7, $8, $8)`,
    [
      fixture.dailyChargeId,
      fixture.accountId,
      fixture.stayId,
      fixture.encounterId,
      fixture.patientId,
      `Daily charge ${fixture.accountId}`,
      fixture.userId,
      '2026-08-30T10:03:00.000Z'
    ]
  );
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  const database = getDatabaseClient();
  stayRepository = new DatabaseInpatientStayRepository(database);
  progressRepository = new DatabaseInpatientProgressRepository(database);
  occurrenceRepository = new DatabaseInpatientOccurrenceRepository(database);
  dailyChargeRepository = new DatabaseInpatientDailyChargeRepository(database);
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Inpatient stay boundary tenant', 'active')`,
    [tenantId, `inpatient-stay-boundary-${tenantId.replaceAll('-', '')}`]
  );
  for (const fixture of fixtures) {
    await insertFixture(fixture);
  }
});

afterAll(async () => {
  const pool = getTestPool();
  const accountIds = fixtures.map((fixture) => fixture.accountId);
  await pool.query('DELETE FROM inpatient_daily_charges WHERE account_id = ANY($1::uuid[])', [
    accountIds
  ]);
  await pool.query('DELETE FROM inpatient_occurrences WHERE account_id = ANY($1::uuid[])', [
    accountIds
  ]);
  await pool.query('DELETE FROM inpatient_progress WHERE account_id = ANY($1::uuid[])', [
    accountIds
  ]);
  await pool.query('DELETE FROM inpatient_stays WHERE account_id = ANY($1::uuid[])', [accountIds]);
  await pool.query('DELETE FROM encounters WHERE account_id = ANY($1::uuid[])', [accountIds]);
  await pool.query('DELETE FROM patients WHERE account_id = ANY($1::uuid[])', [accountIds]);
  await pool.query('DELETE FROM owners WHERE account_id = ANY($1::uuid[])', [accountIds]);
  await pool.query('DELETE FROM users WHERE account_id = ANY($1::uuid[])', [accountIds]);
  await pool.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [accountIds]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  await closeDatabaseClient();
});

describe('inpatient stay service tenant boundary on PostgreSQL', () => {
  it('hides a foreign stay and all child records from identifier reads', async () => {
    const foreignReads = await asAccount(fixtureA, async () =>
      Promise.all([
        stayRepository.findById(fixtureB.stayId as never),
        progressRepository.findByStayId(fixtureB.stayId as never),
        occurrenceRepository.findByStayId(fixtureB.stayId as never),
        dailyChargeRepository.findByStayId(fixtureB.stayId as never),
        stayRepository.findByAccountId(fixtureA.accountId)
      ])
    );

    expect(foreignReads[0]).toBeNull();
    expect(foreignReads[1]).toEqual([]);
    expect(foreignReads[2]).toEqual([]);
    expect(foreignReads[3]).toEqual([]);
    expect(foreignReads[4]).toEqual([
      expect.objectContaining({ id: fixtureA.stayId, accountId: fixtureA.accountId })
    ]);

    await expect(
      asAccount(fixtureB, () => stayRepository.findById(fixtureB.stayId as never))
    ).resolves.toMatchObject({ id: fixtureB.stayId, accountId: fixtureB.accountId });
    await expect(
      asAccount(fixtureB, () => progressRepository.findByStayId(fixtureB.stayId as never))
    ).resolves.toEqual([expect.objectContaining({ id: fixtureB.progressId })]);
    await expect(
      asAccount(fixtureB, () => occurrenceRepository.findByStayId(fixtureB.stayId as never))
    ).resolves.toEqual([expect.objectContaining({ id: fixtureB.occurrenceId })]);
    await expect(
      asAccount(fixtureB, () => dailyChargeRepository.findByStayId(fixtureB.stayId as never))
    ).resolves.toEqual([
      expect.objectContaining({ id: fixtureB.dailyChargeId, status: 'pending' })
    ]);
  });

  it('rejects foreign child writes and prevents a cross-account stay update', async () => {
    const foreignProgress = { ...fixtureProgress(fixtureB), accountId: fixtureB.accountId };
    const foreignOccurrence = { ...fixtureOccurrence(fixtureB), accountId: fixtureB.accountId };
    const foreignCharge = { ...fixtureDailyCharge(fixtureB), accountId: fixtureB.accountId };

    await expect(
      asAccount(fixtureA, () => progressRepository.create(foreignProgress))
    ).rejects.toThrow(/account does not match tenant context/);
    await expect(
      asAccount(fixtureA, () => occurrenceRepository.create(foreignOccurrence))
    ).rejects.toThrow(/account does not match tenant context/);
    await expect(
      asAccount(fixtureA, () => dailyChargeRepository.create(foreignCharge))
    ).rejects.toThrow(/account does not match tenant context/);

    await expect(
      asAccount(fixtureA, () =>
        stayRepository.update({
          ...fixtureStay(fixtureB),
          accountId: fixtureA.accountId,
          status: 'discharged',
          dischargeReason: 'cross-account attempt',
          updatedAt: '2026-08-30T10:10:00.000Z'
        })
      )
    ).resolves.toBeUndefined();

    await expect(
      asAccount(fixtureB, () => stayRepository.findById(fixtureB.stayId as never))
    ).resolves.toMatchObject({ status: 'admitted', dischargeReason: undefined });
    await expect(
      asAccount(fixtureB, () => dailyChargeRepository.findByStayId(fixtureB.stayId as never))
    ).resolves.toEqual([expect.objectContaining({ status: 'pending' })]);
  });
});
