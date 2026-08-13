import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError } from '@cvg-his-v2/shared-errors';
import { requireAccountId, withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  DischargeId,
  DischargeSummary,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import type { DischargeRepository } from '../index.js';

function assertActiveAccount(accountId: AccountId): void {
  if (accountId !== requireAccountId()) {
    throw new Error('Discharge account does not match the active tenant');
  }
}

export class DatabaseDischargeRepository implements DischargeRepository {
  async create(discharge: DischargeSummary): Promise<void> {
    assertActiveAccount(discharge.accountId);
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO discharges (id, account_id, encounter_id, discharge_type, outcome, clinical_summary, continuity_instructions, follow_up_date, follow_up_notes, discharged_by, discharged_at, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          discharge.id,
          discharge.accountId,
          discharge.encounterId,
          discharge.dischargeType,
          discharge.outcome ?? null,
          discharge.clinicalSummary ?? null,
          discharge.continuityInstructions ?? null,
          discharge.followUpDate ? new Date(discharge.followUpDate) : null,
          discharge.followUpNotes ?? null,
          discharge.dischargedBy,
          new Date(discharge.dischargedAt),
          discharge.version,
          new Date(discharge.createdAt),
          new Date(discharge.updatedAt)
        ]
      );
    });
  }

  async update(discharge: DischargeSummary): Promise<void> {
    assertActiveAccount(discharge.accountId);
    await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE discharges
         SET outcome = $2, clinical_summary = $3, continuity_instructions = $4,
             follow_up_date = $5, follow_up_notes = $6, version = $7, updated_at = $8
         WHERE id = $1
           AND account_id = app.current_account_id()
           AND version = $9`,
        [
          discharge.id,
          discharge.outcome ?? null,
          discharge.clinicalSummary ?? null,
          discharge.continuityInstructions ?? null,
          discharge.followUpDate ? new Date(discharge.followUpDate) : null,
          discharge.followUpNotes ?? null,
          discharge.version,
          new Date(discharge.updatedAt),
          discharge.version - 1
        ]
      );
      if (result.rowCount !== 1) {
        throw new ConflictError('Discharge update conflict or row not found', {
          dischargeId: discharge.id,
          expectedVersion: discharge.version - 1
        });
      }
    });
  }

  async findById(id: DischargeId): Promise<DischargeSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM discharges
         WHERE id = $1 AND account_id = app.current_account_id()`,
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByEncounterId(encounterId: EncounterId): Promise<DischargeSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM discharges
         WHERE encounter_id = $1 AND account_id = app.current_account_id()`,
        [encounterId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByAccountId(accountId: AccountId): Promise<readonly DischargeSummary[]> {
    assertActiveAccount(accountId);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM discharges
         WHERE account_id = $1 AND account_id = app.current_account_id()
         ORDER BY discharged_at DESC`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async delete(id: DischargeId): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        'DELETE FROM discharges WHERE id = $1 AND account_id = app.current_account_id()',
        [id]
      );
    });
  }

  private mapRow(row: Record<string, unknown>): DischargeSummary {
    return {
      id: row.id as DischargeId,
      accountId: row.account_id as AccountId,
      encounterId: row.encounter_id as EncounterId,
      dischargeType: row.discharge_type as DischargeSummary['dischargeType'],
      outcome: (row.outcome as string) ?? undefined,
      clinicalSummary: (row.clinical_summary as string) ?? undefined,
      continuityInstructions: (row.continuity_instructions as string) ?? undefined,
      followUpDate: row.follow_up_date
        ? new Date(row.follow_up_date as string).toISOString()
        : undefined,
      followUpNotes: (row.follow_up_notes as string) ?? undefined,
      dischargedBy: row.discharged_by as UserId,
      dischargedAt: new Date(row.discharged_at as string).toISOString(),
      version: Number(row.version),
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
