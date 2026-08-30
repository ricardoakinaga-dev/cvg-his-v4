import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
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

const INSERT_EXECUTION_SQL = `
  INSERT INTO prescription_executions (
    id, account_id, clinical_entry_id, patient_id, encounter_id, medication_name,
    dosage, route, frequency, scheduled_at, status, administered_by, administered_at,
    notes, version, created_at, updated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`;

const INSERT_EVENT_SQL = `
  INSERT INTO administration_events (
    id, account_id, execution_id, event_type, actor_id, occurred_at,
    notes, vitals_snapshot_json, created_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

const SELECT_CURRENT_PRESCRIPTION_SQL = `
  SELECT
    entry.account_id,
    entry.patient_id,
    entry.encounter_id,
    entry.entry_type,
    entry.title,
    entry.content,
    entry.deleted_at,
    entry.version
  FROM clinical_entries AS entry
  WHERE entry.id = $1
    AND entry.account_id = $2
    AND entry.account_id = app.current_account_id()
  FOR SHARE`;

const SELECT_CURRENT_SIGNATURE_SQL = `
  SELECT signed_at
  FROM prescription_signatures
  WHERE account_id = $1
    AND prescription_id = $2
    AND version = $3
    AND account_id = app.current_account_id()
  FOR SHARE`;

function executionValues(execution: PrescriptionExecutionSummary): unknown[] {
  return [
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
  ];
}

function eventValues(accountId: AccountId, event: AdministrationEventSummary): unknown[] {
  return [
    event.id,
    accountId,
    event.executionId,
    event.eventType,
    event.actorId,
    new Date(event.occurredAt),
    event.notes ?? null,
    event.vitalsSnapshot ?? null,
    new Date(event.createdAt)
  ];
}

function assertEventMatchesExecution(
  execution: PrescriptionExecutionSummary,
  event: AdministrationEventSummary
): void {
  if (event.executionId !== execution.id) {
    throw new ValidationError('Administration event execution does not match execution', {
      executionId: execution.id,
      eventExecutionId: event.executionId
    });
  }
}

interface PrescriptionInstructions {
  readonly dosage?: string;
  readonly route?: string;
  readonly frequency?: string;
}

function parsePrescriptionInstructions(content: string): PrescriptionInstructions {
  const instructions: { dosage?: string; route?: string; frequency?: string } = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Posologia:')) {
      const dosage = trimmed.slice('Posologia:'.length).trim();
      if (dosage) instructions.dosage = dosage;
    } else if (trimmed.startsWith('Via:')) {
      const route = trimmed.slice('Via:'.length).trim();
      if (route) instructions.route = route;
    } else if (trimmed.startsWith('Frequência:')) {
      const frequency = trimmed.slice('Frequência:'.length).trim();
      if (frequency) instructions.frequency = frequency;
    }
  }
  return instructions;
}

async function assertCurrentSignedPrescription(
  client: PoolClient,
  execution: PrescriptionExecutionSummary,
  accountId: AccountId
): Promise<void> {
  const result = await client.query<Record<string, unknown>>(SELECT_CURRENT_PRESCRIPTION_SQL, [
    execution.clinicalEntryId,
    accountId
  ]);
  const row = result.rows[0];
  if (!row || row.entry_type !== 'prescription') {
    throw new NotFoundError('Prescription not found', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }
  if (row.deleted_at) {
    throw new ValidationError('Archived prescriptions cannot be executed', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }
  const signature = await client.query<{ signed_at: string | Date | null }>(
    SELECT_CURRENT_SIGNATURE_SQL,
    [accountId, execution.clinicalEntryId, row.version]
  );
  if (signature.rows.length !== 1 || !signature.rows[0]?.signed_at) {
    throw new ValidationError('Prescription must be signed before execution', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }

  if (String(row.patient_id) !== execution.patientId) {
    throw new ValidationError('Prescription patient does not match execution patient', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }
  if (String(row.encounter_id) !== execution.encounterId) {
    throw new ValidationError('Prescription encounter does not match execution encounter', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }
  if (String(row.title).trim() !== execution.medicationName) {
    throw new ValidationError('Execution medication must match the prescription', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }

  const instructions = parsePrescriptionInstructions(String(row.content));
  if (!instructions.dosage || instructions.dosage !== execution.dosage) {
    throw new ValidationError('Execution dosage must match the prescription', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }
  if ((execution.route ?? undefined) !== instructions.route) {
    throw new ValidationError('Execution route must match the prescription', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }
  if ((execution.frequency ?? undefined) !== instructions.frequency) {
    throw new ValidationError('Execution frequency must match the prescription', {
      clinicalEntryId: execution.clinicalEntryId
    });
  }
}

function assertExecutionAccount(execution: PrescriptionExecutionSummary): AccountId {
  const accountId = requireAccountId() as AccountId;
  if (execution.accountId !== accountId) {
    throw new Error('Prescription execution account does not match tenant context');
  }
  return accountId;
}

export class DatabasePrescriptionExecutionRepository implements PrescriptionExecutionRepository {
  async createWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void> {
    const accountId = assertExecutionAccount(execution);
    assertEventMatchesExecution(execution, event);
    await withTenantQuery(getPool(), async (client) => {
      await assertCurrentSignedPrescription(client, execution, accountId);
      await client.query(INSERT_EXECUTION_SQL, executionValues(execution));
      await client.query(INSERT_EVENT_SQL, eventValues(accountId, event));
    });
  }

  async updateWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary,
    expectedVersion: number
  ): Promise<void> {
    const accountId = assertExecutionAccount(execution);
    assertEventMatchesExecution(execution, event);
    await withTenantQuery(getPool(), async (client) => {
      await assertCurrentSignedPrescription(client, execution, accountId);
      const result = await client.query(
        `UPDATE prescription_executions SET status = $2, administered_by = $3, administered_at = $4, notes = $5, version = $6, updated_at = $7
         WHERE id = $1 AND account_id = $8 AND account_id = app.current_account_id() AND version = $9`,
        [
          execution.id,
          execution.status,
          execution.administeredBy ?? null,
          execution.administeredAt ? new Date(execution.administeredAt) : null,
          execution.notes ?? null,
          execution.version,
          new Date(execution.updatedAt),
          accountId,
          expectedVersion
        ]
      );
      await this.assertUpdateApplied(
        client,
        result.rowCount,
        execution,
        accountId,
        expectedVersion
      );
      await client.query(INSERT_EVENT_SQL, eventValues(accountId, event));
    });
  }

  private async assertUpdateApplied(
    client: PoolClient,
    rowCount: number | null,
    execution: PrescriptionExecutionSummary,
    accountId: AccountId,
    expectedVersion: number
  ): Promise<void> {
    if (rowCount === 1) return;
    const existing = await client.query(
      'SELECT version FROM prescription_executions WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()',
      [execution.id, accountId]
    );
    if (existing.rowCount !== 1) {
      throw new NotFoundError('Prescription execution not found', { executionId: execution.id });
    }
    throw new ConflictError('Prescription execution version mismatch', {
      executionId: execution.id,
      expectedVersion,
      currentVersion: existing.rows[0]?.version
    });
  }

  async findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM prescription_executions WHERE id = $1 AND account_id = $2',
        [id, accountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly PrescriptionExecutionSummary[]> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM prescription_executions WHERE encounter_id = $1 AND account_id = $2 ORDER BY scheduled_at ASC',
        [encounterId, accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM prescription_executions WHERE patient_id = $1 AND account_id = $2 ORDER BY scheduled_at ASC',
        [patientId, accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM prescription_executions WHERE account_id = $1 AND account_id = app.current_account_id() ORDER BY scheduled_at DESC',
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
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO administration_events (id, account_id, execution_id, event_type, actor_id, occurred_at, notes, vitals_snapshot_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          event.id,
          accountId,
          event.executionId,
          event.eventType,
          event.actorId,
          new Date(event.occurredAt),
          event.notes ?? null,
          event.vitalsSnapshot ?? null,
          new Date(event.createdAt)
        ]
      );
    });
  }

  async findById(eventId: AdministrationEventId): Promise<AdministrationEventSummary | null> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM administration_events WHERE id = $1 AND account_id = $2',
        [eventId, accountId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      return this.mapRow(row);
    });
  }

  async deleteById(eventId: AdministrationEventId): Promise<void> {
    const accountId = requireAccountId();
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM administration_events WHERE id = $1 AND account_id = $2', [
        eventId,
        accountId
      ]);
    });
  }

  async findByExecutionId(
    executionId: PrescriptionExecutionId
  ): Promise<readonly AdministrationEventSummary[]> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM administration_events WHERE execution_id = $1 AND account_id = $2 ORDER BY occurred_at ASC',
        [executionId, accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  private mapRow(row: Record<string, unknown>): AdministrationEventSummary {
    return {
      id: row.id as AdministrationEventId,
      executionId: row.execution_id as PrescriptionExecutionId,
      eventType: row.event_type as string,
      actorId: row.actor_id as UserId,
      occurredAt: new Date(row.occurred_at as string).toISOString(),
      notes: (row.notes as string) ?? undefined,
      vitalsSnapshot:
        row.vitals_snapshot_json === null || row.vitals_snapshot_json === undefined
          ? undefined
          : typeof row.vitals_snapshot_json === 'string'
            ? JSON.parse(row.vitals_snapshot_json)
            : row.vitals_snapshot_json,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}
