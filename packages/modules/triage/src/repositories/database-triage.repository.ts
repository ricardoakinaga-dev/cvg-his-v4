import { getPool } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  EncounterId,
  PatientId,
  TriageRecordId,
  TriageSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import type { TriageVersionId, TriageVersionSummary } from '../version-types.js';

export interface TriageRepository {
  create(record: TriageSummary): Promise<void>;
  update(record: TriageSummary): Promise<void>;
  createVersion(version: TriageVersionSummary): Promise<void>;
  findById(id: TriageRecordId): Promise<TriageSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly TriageSummary[]>;
  findByAccountId(accountId?: AccountId): Promise<readonly TriageSummary[]>;
  findVersionsByTriageId(triageId: TriageRecordId): Promise<readonly TriageVersionSummary[]>;
  findVersionsByAccountId(accountId?: AccountId): Promise<readonly TriageVersionSummary[]>;
}

export class DatabaseTriageRepository implements TriageRepository {
  async create(record: TriageSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, initial_notes, alerts_json, destination, triaged_by, triaged_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        record.id,
        record.accountId,
        record.encounterId,
        record.patientId,
        record.priority,
        record.chiefComplaint,
        record.initialNotes ?? null,
        JSON.stringify(record.alerts),
        record.destination ?? null,
        record.triagedByUserId,
        new Date(record.createdAt),
        new Date(record.updatedAt)
      ]
    );
  }

  async update(record: TriageSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE triage_records
          SET priority = $2,
              chief_complaint = $3,
              initial_notes = $4,
              alerts_json = $5,
              destination = $6,
              triaged_at = $7
        WHERE id = $1`,
      [
        record.id,
        record.priority,
        record.chiefComplaint,
        record.initialNotes ?? null,
        JSON.stringify(record.alerts),
        record.destination ?? null,
        new Date(record.updatedAt)
      ]
    );
  }

  async createVersion(version: TriageVersionSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO triage_record_versions (id, triage_id, account_id, encounter_id, changed_fields_json, previous_snapshot_json, next_snapshot_json, changed_by_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        version.id,
        version.triageId,
        version.accountId,
        version.encounterId,
        JSON.stringify(version.changedFields),
        JSON.stringify(version.previousSnapshot),
        JSON.stringify(version.nextSnapshot),
        version.changedByUserId,
        new Date(version.createdAt)
      ]
    );
  }

  async findById(id: TriageRecordId): Promise<TriageSummary | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM triage_records WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findByEncounterId(encounterId: EncounterId): Promise<readonly TriageSummary[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM triage_records WHERE encounter_id = $1', [
      encounterId
    ]);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findByAccountId(accountId?: AccountId): Promise<readonly TriageSummary[]> {
    const pool = getPool();
    const result = accountId
      ? await pool.query(
          'SELECT * FROM triage_records WHERE account_id = $1 ORDER BY created_at DESC',
          [accountId]
        )
      : await pool.query('SELECT * FROM triage_records ORDER BY created_at DESC');
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findVersionsByTriageId(triageId: TriageRecordId): Promise<readonly TriageVersionSummary[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM triage_record_versions WHERE triage_id = $1 ORDER BY created_at DESC',
      [triageId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapVersionRow(row));
  }

  async findVersionsByAccountId(accountId?: AccountId): Promise<readonly TriageVersionSummary[]> {
    const pool = getPool();
    const result = accountId
      ? await pool.query(
          'SELECT * FROM triage_record_versions WHERE account_id = $1 ORDER BY created_at DESC',
          [accountId]
        )
      : await pool.query('SELECT * FROM triage_record_versions ORDER BY created_at DESC');
    return result.rows.map((row: Record<string, unknown>) => this.mapVersionRow(row));
  }

  private mapRow(row: Record<string, unknown>): TriageSummary {
    return {
      id: row.id as TriageRecordId,
      accountId: row.account_id as AccountId,
      encounterId: row.encounter_id as EncounterId,
      patientId: row.patient_id as PatientId,
      priority: row.priority as TriageSummary['priority'],
      chiefComplaint: row.chief_complaint as string,
      initialNotes: (row.initial_notes as string) ?? undefined,
      alerts: row.alerts_json ? JSON.parse(row.alerts_json as string) : [],
      destination: (row.destination as TriageSummary['destination']) ?? 'observation',
      triagedByUserId: row.triaged_by as unknown as UserId,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapVersionRow(row: Record<string, unknown>): TriageVersionSummary {
    return {
      id: row.id as TriageVersionId,
      triageId: row.triage_id as TriageRecordId,
      accountId: row.account_id as AccountId,
      encounterId: row.encounter_id as EncounterId,
      changedFields: row.changed_fields_json ? JSON.parse(row.changed_fields_json as string) : [],
      previousSnapshot: JSON.parse(row.previous_snapshot_json as string),
      nextSnapshot: JSON.parse(row.next_snapshot_json as string),
      changedByUserId: row.changed_by_user_id as unknown as UserId,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}
