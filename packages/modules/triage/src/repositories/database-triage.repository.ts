import { getPool } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  EncounterId,
  PatientId,
  TriageRecordId,
  TriageSummary,
  UserId
} from '@cvg-his-v2/shared-types';

export interface TriageRepository {
  create(record: TriageSummary): Promise<void>;
  findById(id: TriageRecordId): Promise<TriageSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly TriageSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly TriageSummary[]>;
}

export class DatabaseTriageRepository implements TriageRepository {
  async create(record: TriageSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, initial_notes, alerts_json, destination, triaged_by, triaged_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [record.id, record.accountId, record.encounterId, record.patientId,
       record.priority, record.chiefComplaint, record.initialNotes ?? null,
       JSON.stringify(record.alerts), record.destination ?? null,
       record.triagedBy, new Date(record.triagedAt), new Date(record.createdAt)]
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
    const result = await pool.query('SELECT * FROM triage_records WHERE encounter_id = $1', [encounterId]);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findByAccountId(accountId: AccountId): Promise<readonly TriageSummary[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM triage_records WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
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
      destination: (row.destination as string) ?? undefined,
      triagedBy: row.triaged_by as UserId,
      triagedAt: new Date(row.triaged_at as string).toISOString(),
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}
