import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseAdministrationEventRepository,
  DatabasePrescriptionExecutionRepository,
  PrescriptionExecutionsService
} from '../../../packages/modules/prescription-executions/src/index.ts';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '../../../packages/shared/database/src/index.ts';
import { NotFoundError } from '../../../packages/shared/errors/src/index.ts';
import type {
  AccountId,
  AdministrationEventSummary,
  ClinicalEntryId,
  EncounterId,
  PatientId,
  PrescriptionExecutionSummary,
  UserId
} from '../../../packages/shared/types/src/index.ts';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../../setup/env.ts';

const tenantId = randomUUID();
const accountId = randomUUID() as AccountId;
const otherAccountId = randomUUID() as AccountId;
const userId = randomUUID() as UserId;
const otherUserId = randomUUID() as UserId;
const ownerId = randomUUID();
const patientId = randomUUID() as PatientId;
const encounterId = randomUUID() as EncounterId;
const medicalRecordId = `mr-${randomUUID()}`;
const clinicalEntryId = `entry-${randomUUID()}` as ClinicalEntryId;

function inTenant<T>(operation: () => T): T {
  return runWithTenantContext(
    {
      tenantId,
      accountId,
      userId,
      correlationId: `prescription-execution-${randomUUID()}`
    },
    operation
  );
}

function inOtherTenant<T>(operation: () => T): T {
  return runWithTenantContext(
    {
      tenantId,
      accountId: otherAccountId,
      userId: otherUserId,
      correlationId: `prescription-execution-other-${randomUUID()}`
    },
    operation
  );
}

function createDatabaseService(): PrescriptionExecutionsService {
  return new PrescriptionExecutionsService({
    executionRepository: new DatabasePrescriptionExecutionRepository(),
    eventRepository: new DatabaseAdministrationEventRepository()
  });
}

describe('prescription execution PostgreSQL persistence', () => {
  beforeAll(async () => {
    await closeDatabaseClient();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query(
        `INSERT INTO tenants (id, slug, name, status)
         VALUES ($1, $2, 'Prescription execution tenant', 'active')`,
        [tenantId, `prescription-execution-${process.pid}`]
      );
      await admin.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $3, $4, 'Prescription execution account'),
                ($2, $3, $5, 'Other prescription execution account')`,
        [
          accountId,
          otherAccountId,
          tenantId,
          `prescription-account-${process.pid}`,
          `prescription-other-${process.pid}`
        ]
      );
      await admin.query(
        `INSERT INTO users (id, account_id, email, password_hash, full_name)
         VALUES ($1, $3, $4, 'integration-password-hash', 'Prescription User'),
                ($2, $5, $6, 'integration-password-hash', 'Other Prescription User')`,
        [
          userId,
          otherUserId,
          accountId,
          `prescription-${process.pid}@example.test`,
          otherAccountId,
          `prescription-other-${process.pid}@example.test`
        ]
      );
      await admin.query(
        `INSERT INTO owners (id, account_id, full_name)
         VALUES ($1, $2, 'Prescription Owner')`,
        [ownerId, accountId]
      );
      await admin.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES ($1, $2, $3, 'Prescription Patient', 'canine')`,
        [patientId, accountId, ownerId]
      );
      await admin.query(
        `INSERT INTO encounters (
           id, account_id, patient_id, owner_id, opened_by_user_id, reason
         ) VALUES ($1, $2, $3, $4, $5, 'Prescription persistence')`,
        [encounterId, accountId, patientId, ownerId, userId]
      );
      await admin.query(
        `INSERT INTO medical_records (
           id, account_id, encounter_id, patient_id, status, version, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'open', 1, NOW(), NOW())`,
        [medicalRecordId, accountId, encounterId, patientId]
      );
      await admin.query(
        `INSERT INTO clinical_entries (
           id, account_id, medical_record_id, encounter_id, patient_id,
           author_user_id, entry_type, title, content, version, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, 'prescription', 'Dipirona', '25 mg/kg', 1, NOW(), NOW()
         )`,
        [clinicalEntryId, accountId, medicalRecordId, encounterId, patientId, userId]
      );
    } finally {
      await admin.end();
    }
    createDatabaseClient(TEST_DB_URL);
  });

  afterAll(async () => {
    await closeDatabaseClient();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountId, otherAccountId]);
      await admin.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    } finally {
      await admin.end();
    }
  });

  it('survives service restarts and isolates execution plus event history by tenant', async () => {
    const created = await inTenant(() =>
      createDatabaseService().create(accountId, {
        clinicalEntryId,
        patientId,
        encounterId,
        medicationName: 'Dipirona',
        dosage: '25 mg/kg',
        route: 'intravenosa',
        frequency: '8/8h',
        scheduledAt: '2030-01-15T12:00:00.000Z'
      })
    );

    const reloaded = await inTenant(() => createDatabaseService().getById(created.id));
    expect(reloaded).toEqual(created);
    expect(await inTenant(() => createDatabaseService().getEvents(created.id))).toEqual([
      expect.objectContaining({ executionId: created.id, eventType: 'created' })
    ]);

    await inTenant(() =>
      createDatabaseService().execute(created.id, userId, {
        status: 'administered',
        notes: 'Administrada sem intercorrências',
        vitalsSnapshot: { temperatureCelsius: 38.2 }
      })
    );

    const afterRestart = createDatabaseService();
    expect((await inTenant(() => afterRestart.getById(created.id))).status).toBe('administered');
    expect(await inTenant(() => afterRestart.getEvents(created.id))).toEqual([
      expect.objectContaining({ eventType: 'created' }),
      expect.objectContaining({
        eventType: 'administered',
        actorId: userId,
        vitalsSnapshot: { temperatureCelsius: 38.2 }
      })
    ]);

    await expect(inOtherTenant(() => createDatabaseService().getById(created.id))).rejects.toThrow(
      NotFoundError
    );
  });

  it('rolls back the execution when its event cannot be inserted atomically', async () => {
    const repository = new DatabasePrescriptionExecutionRepository();
    const id = `pe-${randomUUID()}`;
    const duplicateEventId = `ae-${randomUUID()}`;
    const now = new Date().toISOString();
    const firstExecution: PrescriptionExecutionSummary = {
      id: id as PrescriptionExecutionSummary['id'],
      accountId,
      clinicalEntryId,
      patientId,
      encounterId,
      medicationName: 'Dipirona',
      dosage: '25 mg/kg',
      scheduledAt: '2030-02-01T12:00:00.000Z',
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    const firstEvent: AdministrationEventSummary = {
      id: duplicateEventId as AdministrationEventSummary['id'],
      executionId: firstExecution.id,
      eventType: 'created',
      actorId: userId,
      occurredAt: now,
      createdAt: now
    };
    await inTenant(() => repository.createWithEvent(firstExecution, firstEvent));

    const rolledBackId = `pe-${randomUUID()}`;
    const rolledBackExecution = {
      ...firstExecution,
      id: rolledBackId as PrescriptionExecutionSummary['id']
    };
    const conflictingEvent = {
      ...firstEvent,
      executionId: rolledBackExecution.id
    };
    await expect(
      inTenant(() => repository.createWithEvent(rolledBackExecution, conflictingEvent))
    ).rejects.toMatchObject({ code: '23505' });
    expect(await inTenant(() => repository.findById(rolledBackExecution.id))).toBeNull();
  });
});
