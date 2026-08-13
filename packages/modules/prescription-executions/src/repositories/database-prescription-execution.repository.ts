import { getPool } from '@cvg-his-v2/shared-database';
import { requireAccountId, withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { PoolClient } from 'pg';
import type {
  AccountId,
  AdministrationEventId,
  AdministrationEventSummary,
  ClinicalEntryId,
  EncounterId,
  PatientId,
  PrescriptionExecutionId,
  PrescriptionExecutionSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import type { AdministrationEventRepository, PrescriptionExecutionRepository } from '../index.js';

function assertActiveAccount(accountId: AccountId): void {
  if (accountId !== requireAccountId()) {
    throw new Error('Prescription execution account does not match the active tenant');
  }
}

async function insertExecution(
  client: PoolClient,
  execution: PrescriptionExecutionSummary
): Promise<void> {
  await client.query(
    `INSERT INTO prescription_executions (id, account_id, clinical_entry_id, patient_id, encounter_id, medication_name, dosage, route, frequency, scheduled_at, status, administered_by, administered_at, notes, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      execution.id,
      execution.accountId,
      execution.clinicalEntryId,
      execution.patientId,
      execution.encounterId,
      execution.medicationName,
      execution.dosage,
      execution.route ?? null,
      execution.frequency ?? null,
      new Date(execution.scheduledAt),
      execution.status,
      execution.administeredBy ?? null,
      execution.administeredAt ? new Date(execution.administeredAt) : null,
      execution.notes ?? null,
      execution.version,
      new Date(execution.createdAt),
      new Date(execution.updatedAt)
    ]
  );
}

async function updateExecution(
  client: PoolClient,
  execution: PrescriptionExecutionSummary
): Promise<void> {
  const result = await client.query(
    `UPDATE prescription_executions
     SET status = $2, administered_by = $3, administered_at = $4, notes = $5,
         version = $6, updated_at = $7
     WHERE id = $1
       AND account_id = app.current_account_id()
       AND version = $8`,
    [
      execution.id,
      execution.status,
      execution.administeredBy ?? null,
      execution.administeredAt ? new Date(execution.administeredAt) : null,
      execution.notes ?? null,
      execution.version,
      new Date(execution.updatedAt),
      execution.version - 1
    ]
  );
  if (result.rowCount !== 1) {
    throw new Error('Prescription execution update conflict or row not found');
  }
}

async function insertEvent(client: PoolClient, event: AdministrationEventSummary): Promise<void> {
  await client.query(
    `INSERT INTO administration_events (id, execution_id, event_type, actor_id, occurred_at, notes, vitals_snapshot_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      event.id,
      event.executionId,
      event.eventType,
      event.actorId,
      new Date(event.occurredAt),
      event.notes ?? null,
      event.vitalsSnapshot ? JSON.stringify(event.vitalsSnapshot) : null,
      new Date(event.createdAt)
    ]
  );
}

export class DatabasePrescriptionExecutionRepository implements PrescriptionExecutionRepository {
  async create(execution: PrescriptionExecutionSummary): Promise<void> {
    assertActiveAccount(execution.accountId);
    return withTenantQuery(getPool(), async (client) => {
      await insertExecution(client, execution);
    });
  }

  async update(execution: PrescriptionExecutionSummary): Promise<void> {
    assertActiveAccount(execution.accountId);
    return withTenantQuery(getPool(), async (client) => {
      await updateExecution(client, execution);
    });
  }

  async createWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void> {
    assertActiveAccount(execution.accountId);
    return withTenantQuery(getPool(), async (client) => {
      await insertExecution(client, execution);
      await insertEvent(client, event);
    });
  }

  async updateWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void> {
    assertActiveAccount(execution.accountId);
    return withTenantQuery(getPool(), async (client) => {
      await updateExecution(client, execution);
      await insertEvent(client, event);
    });
  }

  async findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM prescription_executions
         WHERE id = $1 AND account_id = app.current_account_id()`,
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly PrescriptionExecutionSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM prescription_executions
         WHERE encounter_id = $1 AND account_id = app.current_account_id()
         ORDER BY scheduled_at ASC`,
        [encounterId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM prescription_executions
         WHERE patient_id = $1 AND account_id = app.current_account_id()
         ORDER BY scheduled_at ASC`,
        [patientId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]> {
    assertActiveAccount(accountId);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM prescription_executions
         WHERE account_id = $1 AND account_id = app.current_account_id()
         ORDER BY scheduled_at DESC`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  private mapRow(row: Record<string, unknown>): PrescriptionExecutionSummary {
    return {
      id: row.id as PrescriptionExecutionId,
      accountId: row.account_id as AccountId,
      clinicalEntryId: row.clinical_entry_id as ClinicalEntryId,
      patientId: row.patient_id as PatientId,
      encounterId: row.encounter_id as EncounterId,
      medicationName: row.medication_name as string,
      dosage: row.dosage as string,
      route: (row.route as string) ?? undefined,
      frequency: (row.frequency as string) ?? undefined,
      scheduledAt: new Date(row.scheduled_at as string).toISOString(),
      status: row.status as PrescriptionExecutionSummary['status'],
      administeredBy: row.administered_by ? (row.administered_by as unknown as UserId) : undefined,
      administeredAt: row.administered_at
        ? new Date(row.administered_at as string).toISOString()
        : undefined,
      notes: (row.notes as string) ?? undefined,
      version: row.version as number,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}

export class DatabaseAdministrationEventRepository implements AdministrationEventRepository {
  async create(event: AdministrationEventSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await insertEvent(client, event);
    });
  }

  async findByExecutionId(
    executionId: PrescriptionExecutionId
  ): Promise<readonly AdministrationEventSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM administration_events
         WHERE execution_id = $1 AND account_id = app.current_account_id()
         ORDER BY occurred_at ASC`,
        [executionId]
      );
      return result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as AdministrationEventId,
        executionId: row.execution_id as PrescriptionExecutionId,
        eventType: row.event_type as string,
        actorId: row.actor_id as UserId,
        occurredAt: new Date(row.occurred_at as string).toISOString(),
        notes: (row.notes as string) ?? undefined,
        vitalsSnapshot:
          typeof row.vitals_snapshot_json === 'string'
            ? JSON.parse(row.vitals_snapshot_json)
            : (row.vitals_snapshot_json as AdministrationEventSummary['vitalsSnapshot']),
        createdAt: new Date(row.created_at as string).toISOString()
      }));
    });
  }
}
