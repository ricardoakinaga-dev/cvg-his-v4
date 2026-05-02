import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  AppointmentId,
  ClinicalHandoffId,
  ClinicalHandoffSummary,
  EncounterId,
  OwnerId,
  PatientId,
  QueueEntryId,
  UserId
} from '@cvg-his-v2/shared-types';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import type { ClinicalHandoffRepository } from '../index.js';

export class DatabaseClinicalHandoffRepository implements ClinicalHandoffRepository {
  public async create(handoff: ClinicalHandoffSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO clinical_handoffs (
           id, account_id, encounter_id, queue_entry_id, appointment_id,
           owner_id, patient_id, origin_channel, from_sector, to_sector,
           from_responsible_id, to_responsible_type, to_responsible_id,
           clinical_summary, reception_instructions, priority, handoff_status,
           created_by, sent_by, sent_at, acknowledged_by, acknowledged_at,
           acknowledge_note, created_at, updated_at
         )
         VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10,
           $11, $12, $13,
           $14, $15, $16, $17,
           $18, $19, $20, $21, $22,
           $23, $24, $25
         )`,
        [
          handoff.id,
          handoff.accountId,
          handoff.encounterId,
          handoff.queueEntryId ?? null,
          handoff.appointmentId ?? null,
          handoff.ownerId,
          handoff.patientId,
          handoff.originChannel,
          handoff.fromSector,
          handoff.toSector,
          handoff.fromResponsibleId,
          handoff.toResponsibleType,
          handoff.toResponsibleId ?? null,
          handoff.clinicalSummary,
          handoff.receptionInstructions,
          handoff.priority,
          handoff.handoffStatus,
          handoff.createdBy,
          handoff.sentBy,
          new Date(handoff.sentAt),
          handoff.acknowledgedBy ?? null,
          handoff.acknowledgedAt ? new Date(handoff.acknowledgedAt) : null,
          handoff.acknowledgeNote ?? null,
          new Date(handoff.createdAt),
          new Date(handoff.updatedAt)
        ]
      );
    });
  }

  public async update(handoff: ClinicalHandoffSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE clinical_handoffs
         SET queue_entry_id = $3,
             appointment_id = $4,
             owner_id = $5,
             patient_id = $6,
             origin_channel = $7,
             from_sector = $8,
             to_sector = $9,
             from_responsible_id = $10,
             to_responsible_type = $11,
             to_responsible_id = $12,
             clinical_summary = $13,
             reception_instructions = $14,
             priority = $15,
             handoff_status = $16,
             acknowledged_by = $17,
             acknowledged_at = $18,
             acknowledge_note = $19,
             updated_at = $20
         WHERE id = $1 AND account_id = $2`,
        [
          handoff.id,
          handoff.accountId,
          handoff.queueEntryId ?? null,
          handoff.appointmentId ?? null,
          handoff.ownerId,
          handoff.patientId,
          handoff.originChannel,
          handoff.fromSector,
          handoff.toSector,
          handoff.fromResponsibleId,
          handoff.toResponsibleType,
          handoff.toResponsibleId ?? null,
          handoff.clinicalSummary,
          handoff.receptionInstructions,
          handoff.priority,
          handoff.handoffStatus,
          handoff.acknowledgedBy ?? null,
          handoff.acknowledgedAt ? new Date(handoff.acknowledgedAt) : null,
          handoff.acknowledgeNote ?? null,
          new Date(handoff.updatedAt)
        ]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Clinical handoff not found', { handoffId: handoff.id });
      }
    });
  }

  public async findById(id: ClinicalHandoffId): Promise<ClinicalHandoffSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM clinical_handoffs WHERE id = $1 LIMIT 1', [
        id
      ]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  public async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly ClinicalHandoffSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT *
         FROM clinical_handoffs
         WHERE encounter_id = $1
         ORDER BY updated_at DESC`,
        [encounterId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  public async findAll(accountId: AccountId): Promise<readonly ClinicalHandoffSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT *
         FROM clinical_handoffs
         WHERE account_id = $1
         ORDER BY updated_at DESC`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  private mapRow(row: Record<string, unknown>): ClinicalHandoffSummary {
    return {
      id: row.id as ClinicalHandoffId,
      accountId: row.account_id as AccountId,
      encounterId: row.encounter_id as EncounterId,
      queueEntryId: (row.queue_entry_id as QueueEntryId | null) ?? undefined,
      appointmentId: (row.appointment_id as AppointmentId | null) ?? undefined,
      ownerId: row.owner_id as OwnerId,
      patientId: row.patient_id as PatientId,
      originChannel: row.origin_channel as ClinicalHandoffSummary['originChannel'],
      fromSector: row.from_sector as ClinicalHandoffSummary['fromSector'],
      toSector: row.to_sector as ClinicalHandoffSummary['toSector'],
      fromResponsibleId: row.from_responsible_id as UserId,
      toResponsibleType: row.to_responsible_type as ClinicalHandoffSummary['toResponsibleType'],
      toResponsibleId: (row.to_responsible_id as string | null) ?? undefined,
      clinicalSummary: row.clinical_summary as string,
      receptionInstructions: row.reception_instructions as string,
      priority: row.priority as ClinicalHandoffSummary['priority'],
      handoffStatus: row.handoff_status as ClinicalHandoffSummary['handoffStatus'],
      createdBy: row.created_by as UserId,
      sentBy: row.sent_by as UserId,
      sentAt: new Date(row.sent_at as string).toISOString(),
      acknowledgedBy: (row.acknowledged_by as UserId | null) ?? undefined,
      acknowledgedAt: row.acknowledged_at
        ? new Date(row.acknowledged_at as string).toISOString()
        : undefined,
      acknowledgeNote: (row.acknowledge_note as string | null) ?? undefined,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
