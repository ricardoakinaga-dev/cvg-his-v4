import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  DischargeId,
  DischargeSummary,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import type { DischargeRepository } from '../index.js';

function requireAccountId(accountId: AccountId): AccountId {
  return requireNonEmptyString(accountId as string, 'accountId') as AccountId;
}

export class DatabaseDischargeRepository implements DischargeRepository {
  async create(discharge: DischargeSummary): Promise<void> {
    const scopedAccountId = requireAccountId(discharge.accountId);
    await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO discharges (id, account_id, encounter_id, discharge_type, outcome, clinical_summary, continuity_instructions, follow_up_date, follow_up_notes, discharged_by, discharged_at, version, created_at, updated_at)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
         WHERE $2 = app.current_account_id()`,
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
      if (result.rowCount !== 1) {
        throw new NotFoundError('Discharge not found', { dischargeId: discharge.id });
      }
    });
  }

  async update(discharge: DischargeSummary, expectedVersion?: number): Promise<void> {
    const scopedAccountId = requireAccountId(discharge.accountId);
    const previousVersion = expectedVersion ?? discharge.version - 1;
    await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE discharges SET outcome = $2, clinical_summary = $3, continuity_instructions = $4, follow_up_date = $5, follow_up_notes = $6, version = $7, updated_at = $8
         WHERE id = $1 AND account_id = $9 AND account_id = app.current_account_id() AND version = $10`,
        [
          discharge.id,
          discharge.outcome ?? null,
          discharge.clinicalSummary ?? null,
          discharge.continuityInstructions ?? null,
          discharge.followUpDate ? new Date(discharge.followUpDate) : null,
          discharge.followUpNotes ?? null,
          discharge.version,
          new Date(discharge.updatedAt),
          scopedAccountId,
          previousVersion
        ]
      );
      if (result.rowCount !== 1) {
        const existing = await client.query(
          'SELECT version FROM discharges WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()',
          [discharge.id, scopedAccountId]
        );
        if (existing.rowCount !== 1) {
          throw new NotFoundError('Discharge not found', { dischargeId: discharge.id });
        }
        throw new ConflictError('Discharge version mismatch', {
          dischargeId: discharge.id,
          expectedVersion: previousVersion,
          currentVersion: existing.rows[0]?.version
        });
      }
    });
  }

  async findById(accountId: AccountId, id: DischargeId): Promise<DischargeSummary | null> {
    const scopedAccountId = requireAccountId(accountId);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM discharges WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()',
        [id, scopedAccountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByEncounterId(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<DischargeSummary | null> {
    const scopedAccountId = requireAccountId(accountId);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM discharges WHERE encounter_id = $1 AND account_id = $2 AND account_id = app.current_account_id()',
        [encounterId, scopedAccountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByAccountId(accountId: AccountId): Promise<readonly DischargeSummary[]> {
    const scopedAccountId = requireAccountId(accountId);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM discharges WHERE account_id = $1 AND account_id = app.current_account_id() ORDER BY discharged_at DESC',
        [scopedAccountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async delete(accountId: AccountId, id: DischargeId): Promise<void> {
    const scopedAccountId = requireAccountId(accountId);
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        'DELETE FROM discharges WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()',
        [id, scopedAccountId]
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
      version: row.version as number,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
