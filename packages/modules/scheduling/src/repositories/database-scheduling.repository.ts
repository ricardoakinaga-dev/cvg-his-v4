import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { PoolClient } from 'pg';
import type {
  AccountId,
  AppointmentId,
  EncounterId,
  OwnerId,
  PatientId,
  QueueEntryId,
  QueueEntrySummary,
  QueueTransferId,
  QueueTransferSummary,
  SchedulingAppointmentSummary,
  UserId,
  StaffId
} from '@cvg-his-v2/shared-types';

export const MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS = 10_001;

export interface SchedulingAppointmentReportFilters {
  readonly search?: string;
  readonly status?: SchedulingAppointmentSummary['status'];
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly limit?: number;
}

export interface SchedulingRepository {
  createAppointment(appointment: SchedulingAppointmentSummary): Promise<void>;
  updateAppointment(
    appointment: SchedulingAppointmentSummary,
    options?: { readonly requireActiveParticipants?: boolean }
  ): Promise<void>;
  findAppointmentById(id: AppointmentId): Promise<SchedulingAppointmentSummary | null>;
  findAllAppointments(accountId?: AccountId): Promise<readonly SchedulingAppointmentSummary[]>;
  findAppointmentReportRows?(
    accountId: AccountId,
    filters?: SchedulingAppointmentReportFilters
  ): Promise<readonly SchedulingAppointmentSummary[]>;
  createQueueEntry(entry: QueueEntrySummary): Promise<void>;
  persistCheckIn?(
    entry: QueueEntrySummary,
    appointment?: SchedulingAppointmentSummary
  ): Promise<void>;
  updateQueueEntry(entry: QueueEntrySummary): Promise<void>;
  findQueueEntryById(id: QueueEntryId): Promise<QueueEntrySummary | null>;
  findAllQueueEntries(accountId?: AccountId): Promise<readonly QueueEntrySummary[]>;
  createQueueTransfer(transfer: QueueTransferSummary): Promise<void>;
  persistQueueTransfer(entry: QueueEntrySummary, transfer: QueueTransferSummary): Promise<void>;
  persistQueueTransferReceipt(
    entry: QueueEntrySummary,
    transfer: QueueTransferSummary
  ): Promise<void>;
  findQueueTransfersByQueueEntry(
    queueEntryId: QueueEntryId
  ): Promise<readonly QueueTransferSummary[]>;
}

export class DatabaseSchedulingRepository implements SchedulingRepository {
  async createAppointment(appointment: SchedulingAppointmentSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO appointments
           (id, account_id, owner_id, patient_id, start_at, end_at, visit_type, reason,
            practitioner_staff_id, professional_user_id, service_id, unit, specialty,
            resource_label, status,
            type, notes, created_at, updated_at)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9,
                (SELECT staff_record.user_id
                 FROM staff AS staff_record
                 WHERE staff_record.id = $9 AND staff_record.account_id = $2),
                $10, $11, $12, $13, $14, $15, $16, $17, $18
         WHERE $2::uuid = app.current_account_id()
           AND EXISTS (
             SELECT 1 FROM owners owner_record
              WHERE owner_record.id = $3
                AND owner_record.account_id = $2
                AND COALESCE(owner_record.address_json ->> 'status', 'active') = 'active'
           )
           AND EXISTS (
             SELECT 1 FROM patients patient_record
              WHERE patient_record.id = $4
                AND patient_record.account_id = $2
                AND COALESCE(patient_record.alerts_json ->> 'status', 'active') = 'active'
           )
         RETURNING id`,
        [
          appointment.id,
          appointment.accountId,
          appointment.ownerId,
          appointment.patientId,
          new Date(appointment.scheduledAt),
          appointmentEnd(appointment),
          appointment.visitType,
          appointment.reason ?? null,
          appointment.practitionerStaffId ?? null,
          appointment.serviceId ?? null,
          appointment.unit ?? null,
          appointment.specialty ?? null,
          appointment.resourceLabel ?? null,
          appointmentDatabaseStatus(appointment),
          appointmentClinicalType(appointment),
          appointment.reason ?? null,
          new Date(appointment.createdAt),
          new Date(appointment.updatedAt)
        ]
      );
      if (result.rowCount !== 1) {
        throw new ConflictError('Cannot schedule an appointment for an inactive owner or patient', {
          ownerId: appointment.ownerId,
          patientId: appointment.patientId
        });
      }
      return result;
    });
  }

  async updateAppointment(
    appointment: SchedulingAppointmentSummary,
    options: { readonly requireActiveParticipants?: boolean } = {}
  ): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      const participantGuard = options.requireActiveParticipants
        ? `
            AND EXISTS (
              SELECT 1 FROM owners owner_record
               WHERE owner_record.id = appointments.owner_id
                 AND owner_record.account_id = appointments.account_id
                 AND COALESCE(owner_record.address_json ->> 'status', 'active') = 'active'
            )
            AND EXISTS (
              SELECT 1 FROM patients patient_record
               WHERE patient_record.id = appointments.patient_id
                 AND patient_record.account_id = appointments.account_id
                 AND COALESCE(patient_record.alerts_json ->> 'status', 'active') = 'active'
            )`
        : '';
      const result = await client.query(
        `UPDATE appointments
            SET status = $3,
                reason = $4,
                notes = $4,
                start_at = $5,
                end_at = $6,
                visit_type = $7,
                practitioner_staff_id = $8,
                professional_user_id = (
                  SELECT staff_record.user_id
                  FROM staff AS staff_record
                  WHERE staff_record.id = $8
                    AND staff_record.account_id = $2
                ),
                service_id = $9,
                unit = $10,
                specialty = $11,
                resource_label = $12,
                type = $13,
                updated_at = $14
          WHERE id = $1
            AND account_id = $2
            AND account_id = app.current_account_id()
            ${participantGuard}`,
        [
          appointment.id,
          appointment.accountId,
          appointmentDatabaseStatus(appointment),
          appointment.reason ?? null,
          new Date(appointment.scheduledAt),
          appointmentEnd(appointment),
          appointment.visitType,
          appointment.practitionerStaffId ?? null,
          appointment.serviceId ?? null,
          appointment.unit ?? null,
          appointment.specialty ?? null,
          appointment.resourceLabel ?? null,
          appointmentClinicalType(appointment),
          new Date(appointment.updatedAt)
        ]
      );
      if (result.rowCount !== 1) {
        if (options.requireActiveParticipants) {
          throw new ConflictError(
            'Cannot reschedule an appointment for an inactive owner or patient',
            { appointmentId: appointment.id }
          );
        }
        throw new Error(`Appointment not found in current account: ${appointment.id}`);
      }
      return result;
    });
  }

  async findAppointmentById(id: AppointmentId): Promise<SchedulingAppointmentSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM appointments
         WHERE id = $1 AND account_id = app.current_account_id()`,
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapAppointment(result.rows[0]);
    });
  }

  async findAllAppointments(
    accountId?: AccountId
  ): Promise<readonly SchedulingAppointmentSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = accountId
        ? await client.query(
            `SELECT * FROM appointments
             WHERE account_id = $1 AND account_id = app.current_account_id()
             ORDER BY start_at ASC`,
            [accountId]
          )
        : await client.query(
            `SELECT * FROM appointments
             WHERE account_id = app.current_account_id()
             ORDER BY start_at ASC`
          );
      return result.rows.map((r: Record<string, unknown>) => this.mapAppointment(r));
    });
  }

  async findAppointmentReportRows(
    accountId: AccountId,
    filters: SchedulingAppointmentReportFilters = {}
  ): Promise<readonly SchedulingAppointmentSummary[]> {
    const conditions: string[] = [
      'appointment.account_id = $1',
      'appointment.account_id = app.current_account_id()'
    ];
    const params: unknown[] = [accountId];
    const parameter = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.status) {
      conditions.push(
        `appointment.status = ANY(${parameter(databaseStatusesForReport(filters.status))}::appointment_status[])`
      );
    }
    if (filters.search?.trim()) {
      const pattern = `%${escapeIlikePattern(filters.search.trim())}%`;
      const searchParameter = parameter(pattern);
      conditions.push(
        `(appointment.id::text ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          appointment.patient_id::text ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          appointment.owner_id::text ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          appointment.practitioner_staff_id::text ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          appointment.service_id::text ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          COALESCE(appointment.reason, '') ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          COALESCE(appointment.unit, '') ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          COALESCE(appointment.specialty, '') ILIKE ${searchParameter} ESCAPE E'\\\\' OR
          COALESCE(appointment.resource_label, '') ILIKE ${searchParameter} ESCAPE E'\\\\')`
      );
    }
    if (filters.dateFrom) {
      conditions.push(
        `appointment.start_at >= (${parameter(filters.dateFrom)}::date AT TIME ZONE 'UTC')`
      );
    }
    if (filters.dateTo) {
      conditions.push(
        `appointment.start_at < ((${parameter(filters.dateTo)}::date + INTERVAL '1 day') AT TIME ZONE 'UTC')`
      );
    }

    const limit = filters.limit ?? MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS
    ) {
      throw new ValidationError('Appointments report read limit must be between 1 and 10001', {
        limit
      });
    }

    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT appointment.*
           FROM appointments AS appointment
          WHERE ${conditions.join(' AND ')}
          ORDER BY appointment.start_at ASC, appointment.id ASC
          LIMIT ${parameter(limit)}`,
        params
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapAppointment(row));
    });
  }

  async createQueueEntry(entry: QueueEntrySummary): Promise<void> {
    await withTenantQuery(getPool(), (client) => this.insertQueueEntry(client, entry));
  }

  async persistCheckIn(
    entry: QueueEntrySummary,
    appointment?: SchedulingAppointmentSummary
  ): Promise<void> {
    if (
      appointment &&
      (entry.patientId !== appointment.patientId || entry.ownerId !== appointment.ownerId)
    ) {
      throw new ConflictError('Check-in participants must match the appointment participants', {
        appointmentId: appointment.id,
        appointmentPatientId: appointment.patientId,
        appointmentOwnerId: appointment.ownerId
      });
    }

    try {
      await withTenantQuery(getPool(), async (client) => {
        if (appointment) {
          const updatedAppointment = await client.query(
            `UPDATE appointments
                SET status = $3,
                    reason = $4,
                    notes = $4,
                    start_at = $5,
                    end_at = $6,
                    visit_type = $7,
                    practitioner_staff_id = $8,
                    professional_user_id = (
                      SELECT staff_record.user_id
                      FROM staff AS staff_record
                      WHERE staff_record.id = $8
                        AND staff_record.account_id = $2
                    ),
                    service_id = $9,
                    unit = $10,
                    specialty = $11,
                    resource_label = $12,
                    type = $13,
                    updated_at = $14
              WHERE id = $1
                AND account_id = $2
                AND account_id = app.current_account_id()
                AND EXISTS (
                  SELECT 1 FROM owners owner_record
                   WHERE owner_record.id = appointments.owner_id
                     AND owner_record.account_id = appointments.account_id
                     AND COALESCE(owner_record.address_json ->> 'status', 'active') = 'active'
                )
                AND EXISTS (
                  SELECT 1 FROM patients patient_record
                   WHERE patient_record.id = appointments.patient_id
                     AND patient_record.account_id = appointments.account_id
                     AND COALESCE(patient_record.alerts_json ->> 'status', 'active') = 'active'
                )`,
            [
              appointment.id,
              appointment.accountId,
              appointmentDatabaseStatus(appointment),
              appointment.reason ?? null,
              new Date(appointment.scheduledAt),
              appointmentEnd(appointment),
              appointment.visitType,
              appointment.practitionerStaffId ?? null,
              appointment.serviceId ?? null,
              appointment.unit ?? null,
              appointment.specialty ?? null,
              appointment.resourceLabel ?? null,
              appointmentClinicalType(appointment),
              new Date(appointment.updatedAt)
            ]
          );
          if (updatedAppointment.rowCount !== 1) {
            throw new ConflictError('Cannot check in an inactive owner or patient', {
              ownerId: appointment.ownerId,
              patientId: appointment.patientId,
              appointmentId: appointment.id
            });
          }
        }

        await this.insertQueueEntry(client, entry);
      });
    } catch (error) {
      const candidate = error as { readonly code?: unknown; readonly constraint?: unknown };
      if (
        candidate?.code === '23505' &&
        candidate.constraint === 'scheduling_queue_entries_active_appointment_unique'
      ) {
        throw new ConflictError('Appointment already has an active queue entry', {
          appointmentId: appointment?.id ?? entry.appointmentId
        });
      }
      throw error;
    }
  }

  async updateQueueEntry(entry: QueueEntrySummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE scheduling_queue_entries
            SET appointment_id = $2,
                encounter_id = $3,
                entry_type = $4,
                reason = $5,
                priority = $6,
                status = $7,
                checked_in_at = $8,
                called_at = $9,
                current_sector = $10,
                current_responsible_user_id = $11,
                current_responsible_staff_id = $12,
                next_sector = $13,
                operational_status = $14,
                clinical_status = $15,
                billing_status = $16,
                handoff_status = $17,
                last_transferred_at = $18,
                last_transferred_by_user_id = $19,
                updated_at = $20
          WHERE id = $1`,
        [
          entry.id,
          entry.appointmentId ?? null,
          entry.encounterId ?? null,
          entry.entryType ?? 'standard',
          entry.reason,
          entry.priority,
          entry.status,
          new Date(entry.checkedInAt),
          entry.calledAt ? new Date(entry.calledAt) : null,
          entry.currentSector ?? null,
          entry.currentResponsibleUserId ?? null,
          entry.currentResponsibleStaffId ?? null,
          entry.nextSector ?? null,
          entry.operationalStatus ?? null,
          entry.clinicalStatus ?? null,
          entry.billingStatus ?? null,
          entry.handoffStatus ?? null,
          entry.lastTransferredAt ? new Date(entry.lastTransferredAt) : null,
          entry.lastTransferredByUserId ?? null,
          new Date(entry.updatedAt)
        ]
      );
    });
  }

  async findQueueEntryById(id: QueueEntryId): Promise<QueueEntrySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM scheduling_queue_entries WHERE id = $1', [
        id
      ]);
      if (result.rows.length === 0) return null;
      return this.mapQueueEntry(result.rows[0]);
    });
  }

  async findAllQueueEntries(accountId?: AccountId): Promise<readonly QueueEntrySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = accountId
        ? await client.query(
            'SELECT * FROM scheduling_queue_entries WHERE account_id = $1 ORDER BY checked_in_at ASC',
            [accountId]
          )
        : await client.query('SELECT * FROM scheduling_queue_entries ORDER BY checked_in_at ASC');
      return result.rows.map((r: Record<string, unknown>) => this.mapQueueEntry(r));
    });
  }

  async createQueueTransfer(transfer: QueueTransferSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO scheduling_queue_transfers
           (id, account_id, queue_entry_id, encounter_id, from_sector, to_sector,
            sent_by_user_id, sent_at, received_by_user_id, received_at,
            responsible_user_id, responsible_staff_id, next_sector, reason, urgency,
            billing_record_id, counter_sale_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                 $15, $16, $17, $18, $19)`,
        [
          transfer.id,
          transfer.accountId,
          transfer.queueEntryId,
          transfer.encounterId ?? null,
          transfer.fromSector,
          transfer.toSector,
          transfer.sentByUserId,
          new Date(transfer.sentAt),
          transfer.receivedByUserId ?? null,
          transfer.receivedAt ? new Date(transfer.receivedAt) : null,
          transfer.responsibleUserId ?? null,
          transfer.responsibleStaffId ?? null,
          transfer.nextSector ?? null,
          transfer.reason,
          transfer.urgency,
          transfer.billingRecordId ?? null,
          transfer.counterSaleId ?? null,
          transfer.status,
          new Date(transfer.createdAt)
        ]
      );
    });
  }

  async persistQueueTransfer(
    entry: QueueEntrySummary,
    transfer: QueueTransferSummary
  ): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await this.updateQueueEntryWithClient(client, entry);
      await this.insertQueueTransferWithClient(client, transfer);
    });
  }

  async persistQueueTransferReceipt(
    entry: QueueEntrySummary,
    transfer: QueueTransferSummary
  ): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await this.updateQueueEntryWithClient(client, entry);
      const result = await client.query(
        `UPDATE scheduling_queue_transfers
            SET status = 'received',
                received_by_user_id = $3,
                received_at = $4
          WHERE id = $1
            AND queue_entry_id = $2
            AND status = 'sent'`,
        [
          transfer.id,
          transfer.queueEntryId,
          transfer.receivedByUserId,
          transfer.receivedAt ? new Date(transfer.receivedAt) : null
        ]
      );
      if (result.rowCount !== 1) {
        throw new NotFoundError('Pending queue transfer not found', {
          transferId: transfer.id,
          queueEntryId: transfer.queueEntryId
        });
      }
    });
  }

  async findQueueTransfersByQueueEntry(
    queueEntryId: QueueEntryId
  ): Promise<readonly QueueTransferSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM scheduling_queue_transfers WHERE queue_entry_id = $1 ORDER BY sent_at ASC',
        [queueEntryId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapQueueTransfer(row));
    });
  }

  private async insertQueueEntry(client: PoolClient, entry: QueueEntrySummary): Promise<void> {
    const result = await client.query(
      `INSERT INTO scheduling_queue_entries
         (id, account_id, patient_id, owner_id, appointment_id, encounter_id, entry_type,
          reason, priority, status, checked_in_at, called_at, current_sector,
          current_responsible_user_id, current_responsible_staff_id, next_sector,
          operational_status, clinical_status, billing_status, handoff_status,
          last_transferred_at, last_transferred_by_user_id, created_at, updated_at)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        WHERE $2::uuid = app.current_account_id()
          AND EXISTS (
            SELECT 1 FROM owners owner_record
             WHERE owner_record.id::text = $4
               AND owner_record.account_id = $2
               AND COALESCE(owner_record.address_json ->> 'status', 'active') = 'active'
          )
          AND EXISTS (
            SELECT 1 FROM patients patient_record
             WHERE patient_record.id::text = $3
               AND patient_record.account_id = $2
               AND COALESCE(patient_record.alerts_json ->> 'status', 'active') = 'active'
          )`,
      [
        entry.id,
        entry.accountId,
        entry.patientId,
        entry.ownerId,
        entry.appointmentId ?? null,
        entry.encounterId ?? null,
        entry.entryType ?? 'standard',
        entry.reason,
        entry.priority,
        entry.status,
        new Date(entry.checkedInAt),
        entry.calledAt ? new Date(entry.calledAt) : null,
        entry.currentSector ?? null,
        entry.currentResponsibleUserId ?? null,
        entry.currentResponsibleStaffId ?? null,
        entry.nextSector ?? null,
        entry.operationalStatus ?? null,
        entry.clinicalStatus ?? null,
        entry.billingStatus ?? null,
        entry.handoffStatus ?? null,
        entry.lastTransferredAt ? new Date(entry.lastTransferredAt) : null,
        entry.lastTransferredByUserId ?? null,
        new Date(entry.createdAt),
        new Date(entry.updatedAt)
      ]
    );
    if (result.rowCount !== 1) {
      throw new ConflictError('Cannot check in an inactive owner or patient', {
        ownerId: entry.ownerId,
        patientId: entry.patientId
      });
    }
  }

  private mapAppointment(row: Record<string, unknown>): SchedulingAppointmentSummary {
    return {
      id: row.id as AppointmentId,
      accountId: row.account_id as AccountId,
      patientId: row.patient_id as PatientId,
      ownerId: row.owner_id as OwnerId,
      scheduledAt: new Date(row.start_at as string).toISOString(),
      durationMinutes: appointmentDuration(row.start_at, row.end_at),
      visitType: mapVisitType(row.visit_type, row.type),
      reason: String(row.reason ?? row.notes ?? 'Agendamento'),
      practitionerStaffId: (row.practitioner_staff_id as StaffId | null) ?? undefined,
      serviceId: (row.service_id as string | null) ?? undefined,
      unit: (row.unit as string | null) ?? undefined,
      specialty: (row.specialty as string | null) ?? undefined,
      resourceLabel: (row.resource_label as string | null) ?? undefined,
      status: mapAppointmentStatus(row.status),
      canonicalStatus: row.status as SchedulingAppointmentSummary['canonicalStatus'],
      clinicalType: row.type as SchedulingAppointmentSummary['clinicalType'],
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapQueueEntry(row: Record<string, unknown>): QueueEntrySummary {
    return {
      id: row.id as QueueEntryId,
      accountId: row.account_id as AccountId,
      patientId: row.patient_id as PatientId,
      ownerId: row.owner_id as OwnerId,
      appointmentId: (row.appointment_id as AppointmentId) ?? undefined,
      encounterId: (row.encounter_id as EncounterId) ?? undefined,
      entryType: (row.entry_type as QueueEntrySummary['entryType'] | null) ?? undefined,
      reason: row.reason as string,
      priority: row.priority as QueueEntrySummary['priority'],
      status: row.status as QueueEntrySummary['status'],
      checkedInAt: new Date(row.checked_in_at as string).toISOString(),
      calledAt: row.called_at ? new Date(row.called_at as string).toISOString() : undefined,
      currentSector: (row.current_sector as string | null) ?? undefined,
      currentResponsibleUserId: (row.current_responsible_user_id as UserId | null) ?? undefined,
      currentResponsibleStaffId: (row.current_responsible_staff_id as StaffId | null) ?? undefined,
      nextSector: (row.next_sector as string | null) ?? undefined,
      operationalStatus:
        (row.operational_status as QueueEntrySummary['operationalStatus'] | null) ?? undefined,
      clinicalStatus:
        (row.clinical_status as QueueEntrySummary['clinicalStatus'] | null) ?? undefined,
      billingStatus: (row.billing_status as QueueEntrySummary['billingStatus'] | null) ?? undefined,
      handoffStatus: (row.handoff_status as QueueEntrySummary['handoffStatus'] | null) ?? undefined,
      lastTransferredAt: row.last_transferred_at
        ? new Date(row.last_transferred_at as string).toISOString()
        : undefined,
      lastTransferredByUserId: (row.last_transferred_by_user_id as UserId | null) ?? undefined,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapQueueTransfer(row: Record<string, unknown>): QueueTransferSummary {
    return {
      id: row.id as QueueTransferId,
      accountId: row.account_id as AccountId,
      queueEntryId: row.queue_entry_id as QueueEntryId,
      encounterId: (row.encounter_id as EncounterId | null) ?? undefined,
      fromSector: row.from_sector as string,
      toSector: row.to_sector as string,
      sentByUserId: row.sent_by_user_id as UserId,
      sentAt: new Date(row.sent_at as string).toISOString(),
      status:
        (row.status as QueueTransferSummary['status'] | null) ??
        (row.received_at ? 'received' : 'sent'),
      receivedByUserId: (row.received_by_user_id as UserId | null) ?? undefined,
      receivedAt: row.received_at ? new Date(row.received_at as string).toISOString() : undefined,
      responsibleUserId: (row.responsible_user_id as UserId | null) ?? undefined,
      responsibleStaffId: (row.responsible_staff_id as StaffId | null) ?? undefined,
      nextSector: (row.next_sector as string | null) ?? undefined,
      reason: row.reason as string,
      urgency: row.urgency as QueueTransferSummary['urgency'],
      billingRecordId: (row.billing_record_id as string | null) ?? undefined,
      counterSaleId: (row.counter_sale_id as string | null) ?? undefined,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }

  private async updateQueueEntryWithClient(
    client: PoolClient,
    entry: QueueEntrySummary
  ): Promise<void> {
    const result = await client.query(
      `UPDATE scheduling_queue_entries
          SET appointment_id = $2,
              encounter_id = $3,
              entry_type = $4,
              reason = $5,
              priority = $6,
              status = $7,
              checked_in_at = $8,
              called_at = $9,
              current_sector = $10,
              current_responsible_user_id = $11,
              current_responsible_staff_id = $12,
              next_sector = $13,
              operational_status = $14,
              clinical_status = $15,
              billing_status = $16,
              handoff_status = $17,
              last_transferred_at = $18,
              last_transferred_by_user_id = $19,
              updated_at = $20
        WHERE id = $1`,
      [
        entry.id,
        entry.appointmentId ?? null,
        entry.encounterId ?? null,
        entry.entryType ?? 'standard',
        entry.reason,
        entry.priority,
        entry.status,
        new Date(entry.checkedInAt),
        entry.calledAt ? new Date(entry.calledAt) : null,
        entry.currentSector ?? null,
        entry.currentResponsibleUserId ?? null,
        entry.currentResponsibleStaffId ?? null,
        entry.nextSector ?? null,
        entry.operationalStatus ?? null,
        entry.clinicalStatus ?? null,
        entry.billingStatus ?? null,
        entry.handoffStatus ?? null,
        entry.lastTransferredAt ? new Date(entry.lastTransferredAt) : null,
        entry.lastTransferredByUserId ?? null,
        new Date(entry.updatedAt)
      ]
    );
    if (result.rowCount !== 1) {
      throw new NotFoundError('Queue entry not found', { queueEntryId: entry.id });
    }
  }

  private async insertQueueTransferWithClient(
    client: PoolClient,
    transfer: QueueTransferSummary
  ): Promise<void> {
    await client.query(
      `INSERT INTO scheduling_queue_transfers
         (id, account_id, queue_entry_id, encounter_id, from_sector, to_sector,
          sent_by_user_id, sent_at, received_by_user_id, received_at,
          responsible_user_id, responsible_staff_id, next_sector, reason, urgency,
          billing_record_id, counter_sale_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, $17, $18, $19)`,
      [
        transfer.id,
        transfer.accountId,
        transfer.queueEntryId,
        transfer.encounterId ?? null,
        transfer.fromSector,
        transfer.toSector,
        transfer.sentByUserId,
        new Date(transfer.sentAt),
        transfer.receivedByUserId ?? null,
        transfer.receivedAt ? new Date(transfer.receivedAt) : null,
        transfer.responsibleUserId ?? null,
        transfer.responsibleStaffId ?? null,
        transfer.nextSector ?? null,
        transfer.reason,
        transfer.urgency,
        transfer.billingRecordId ?? null,
        transfer.counterSaleId ?? null,
        transfer.status,
        new Date(transfer.createdAt)
      ]
    );
  }
}

function appointmentEnd(appointment: SchedulingAppointmentSummary): Date {
  const startAt = new Date(appointment.scheduledAt);
  const durationMinutes = appointment.durationMinutes ?? 30;
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

function databaseStatusesForReport(
  status: SchedulingAppointmentSummary['status']
): readonly NonNullable<SchedulingAppointmentSummary['canonicalStatus']>[] {
  if (status === 'scheduled') return ['scheduled', 'confirmed'];
  if (status === 'checked_in') return ['checked_in', 'in_progress'];
  if (status === 'completed') return ['completed'];
  return ['cancelled', 'no_show'];
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function appointmentDuration(startAt: unknown, endAt: unknown): number {
  const start = new Date(startAt as string).getTime();
  const end = new Date(endAt as string).getTime();
  return Math.max(1, Math.round((end - start) / 60_000));
}

function appointmentClinicalType(
  appointment: SchedulingAppointmentSummary
): NonNullable<SchedulingAppointmentSummary['clinicalType']> {
  if (appointment.clinicalType) return appointment.clinicalType;
  if (appointment.visitType === 'return') return 'return';
  if (appointment.visitType === 'walk_in') return 'other';
  return 'consultation';
}

function appointmentDatabaseStatus(
  appointment: SchedulingAppointmentSummary
): NonNullable<SchedulingAppointmentSummary['canonicalStatus']> {
  if (
    appointment.canonicalStatus &&
    mapAppointmentStatus(appointment.canonicalStatus) === appointment.status
  ) {
    return appointment.canonicalStatus;
  }
  return appointment.status;
}

function mapVisitType(
  visitType: unknown,
  clinicalType: unknown
): SchedulingAppointmentSummary['visitType'] {
  if (visitType === 'walk_in' || visitType === 'scheduled' || visitType === 'return') {
    return visitType;
  }
  return clinicalType === 'return' ? 'return' : 'scheduled';
}

function mapAppointmentStatus(status: unknown): SchedulingAppointmentSummary['status'] {
  if (status === 'checked_in' || status === 'in_progress') return 'checked_in';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled' || status === 'no_show') return 'cancelled';
  return 'scheduled';
}
