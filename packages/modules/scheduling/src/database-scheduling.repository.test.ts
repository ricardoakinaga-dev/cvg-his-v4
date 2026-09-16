import { beforeEach, expect, test, vi } from 'vitest';

import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import {
  DatabaseSchedulingRepository,
  MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS
} from './repositories/database-scheduling.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn()
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) =>
    fn(pool))
}));

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const pool = { query };

const appointment = {
  id: 'appointment-1' as never,
  accountId: accountId as never,
  patientId: 'patient-1' as never,
  ownerId: 'owner-1' as never,
  scheduledAt: timestamp.toISOString(),
  durationMinutes: 45,
  visitType: 'scheduled' as const,
  reason: 'Consulta',
  practitionerStaffId: 'staff-1' as never,
  serviceId: 'service-1',
  unit: 'Unit',
  specialty: 'Cardio',
  resourceLabel: 'Room 1',
  status: 'scheduled' as const,
  canonicalStatus: 'confirmed' as const,
  clinicalType: 'consultation' as const,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

const appointmentRow = {
  id: appointment.id,
  account_id: accountId,
  patient_id: appointment.patientId,
  owner_id: appointment.ownerId,
  start_at: timestamp,
  end_at: new Date(timestamp.getTime() + 45 * 60_000),
  visit_type: 'scheduled',
  type: 'consultation',
  reason: null,
  notes: 'Legacy note',
  practitioner_staff_id: null,
  service_id: null,
  unit: null,
  specialty: null,
  resource_label: null,
  status: 'in_progress',
  created_at: timestamp,
  updated_at: timestamp
};

const queueEntry = {
  id: 'queue-1' as never,
  accountId: accountId as never,
  patientId: 'patient-1' as never,
  ownerId: 'owner-1' as never,
  appointmentId: appointment.id,
  encounterId: 'encounter-1' as never,
  entryType: 'standard' as const,
  reason: 'Consulta',
  priority: 'medium' as const,
  status: 'waiting' as const,
  checkedInAt: timestamp.toISOString(),
  calledAt: undefined,
  currentSector: undefined,
  currentResponsibleUserId: undefined,
  currentResponsibleStaffId: undefined,
  nextSector: undefined,
  operationalStatus: undefined,
  clinicalStatus: undefined,
  billingStatus: undefined,
  handoffStatus: undefined,
  lastTransferredAt: undefined,
  lastTransferredByUserId: undefined,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

const queueRow = {
  id: queueEntry.id,
  account_id: accountId,
  patient_id: queueEntry.patientId,
  owner_id: queueEntry.ownerId,
  appointment_id: queueEntry.appointmentId,
  encounter_id: queueEntry.encounterId,
  entry_type: null,
  reason: 'Consulta',
  priority: 'medium',
  status: 'waiting',
  checked_in_at: timestamp,
  called_at: null,
  current_sector: null,
  current_responsible_user_id: null,
  current_responsible_staff_id: null,
  next_sector: null,
  operational_status: null,
  clinical_status: null,
  billing_status: null,
  handoff_status: null,
  last_transferred_at: null,
  last_transferred_by_user_id: null,
  created_at: timestamp,
  updated_at: timestamp
};

const transfer = {
  id: 'transfer-1' as never,
  accountId: accountId as never,
  queueEntryId: queueEntry.id,
  encounterId: queueEntry.encounterId,
  fromSector: 'Reception',
  toSector: 'Nursing',
  sentByUserId: 'user-1' as never,
  sentAt: timestamp.toISOString(),
  receivedByUserId: undefined,
  receivedAt: undefined,
  responsibleUserId: undefined,
  responsibleStaffId: undefined,
  nextSector: 'Doctor',
  reason: 'Clinical handoff',
  urgency: 'medium' as const,
  billingRecordId: undefined,
  counterSaleId: undefined,
  status: 'sent' as const,
  createdAt: timestamp.toISOString()
};

const transferRow = {
  id: transfer.id,
  account_id: accountId,
  queue_entry_id: queueEntry.id,
  encounter_id: null,
  from_sector: 'Reception',
  to_sector: 'Nursing',
  sent_by_user_id: 'user-1',
  sent_at: timestamp,
  received_by_user_id: null,
  received_at: timestamp,
  responsible_user_id: null,
  responsible_staff_id: null,
  next_sector: null,
  reason: 'Clinical handoff',
  urgency: 'medium',
  billing_record_id: null,
  counter_sale_id: null,
  status: null,
  created_at: timestamp
};

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  query.mockResolvedValue({ rows: [], rowCount: 1 });
  vi.mocked(withTenantQuery).mockImplementation(async (client, fn) => fn(client as never));
});

test('DatabaseSchedulingRepository covers appointment lifecycle, reports and participant guards', async () => {
  const repository = new DatabaseSchedulingRepository();
  await repository.createAppointment(appointment);

  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.createAppointment(appointment)).rejects.toBeInstanceOf(ConflictError);

  await repository.updateAppointment(appointment);
  await repository.updateAppointment(appointment, { requireActiveParticipants: true });
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.updateAppointment(appointment)).rejects.toThrow(/not found/);
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.updateAppointment(appointment, { requireActiveParticipants: true })).rejects.toBeInstanceOf(ConflictError);

  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findAppointmentById('missing' as never)).toBeNull();
  query.mockResolvedValueOnce({ rows: [appointmentRow] });
  expect(await repository.findAppointmentById(appointment.id)).toMatchObject({
    id: appointment.id,
    status: 'checked_in',
    reason: 'Legacy note',
    durationMinutes: 45
  });
  query.mockResolvedValueOnce({ rows: [appointmentRow] });
  expect(await repository.findAllAppointments(accountId as never)).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [
    { ...appointmentRow, visit_type: 'return', status: 'completed', type: 'return', reason: 'Return' },
    { ...appointmentRow, id: 'appointment-2', visit_type: 'unknown', status: 'no_show', type: 'other', start_at: timestamp, end_at: timestamp }
  ] });
  expect(await repository.findAllAppointments()).toHaveLength(2);

  for (const status of ['scheduled', 'checked_in', 'completed', 'cancelled'] as const) {
    query.mockResolvedValueOnce({ rows: [appointmentRow] });
    expect(await repository.findAppointmentReportRows(accountId as never, {
      status,
      search: ' SKU_% ',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      limit: 5
    })).toHaveLength(1);
  }
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findAppointmentReportRows(accountId as never)).toEqual([]);
  await expect(repository.findAppointmentReportRows(accountId as never, { limit: 0 })).rejects.toBeInstanceOf(ValidationError);
  await expect(repository.findAppointmentReportRows(accountId as never, {
    limit: MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS + 1
  })).rejects.toThrow(/between/);
});

test('DatabaseSchedulingRepository covers queue check-in, transfer persistence and mappings', async () => {
  const repository = new DatabaseSchedulingRepository();
  await repository.createQueueEntry(queueEntry);
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.createQueueEntry(queueEntry)).rejects.toBeInstanceOf(ConflictError);

  await repository.persistCheckIn(queueEntry);
  await repository.persistCheckIn(queueEntry, appointment);
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.persistCheckIn(queueEntry, appointment)).rejects.toBeInstanceOf(ConflictError);
  await expect(repository.persistCheckIn({ ...queueEntry, patientId: 'other-patient' as never }, appointment)).rejects.toBeInstanceOf(ConflictError);

  await repository.updateQueueEntry({ ...queueEntry, calledAt: timestamp.toISOString(), currentSector: 'Nursing' });
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findQueueEntryById('missing' as never)).toBeNull();
  query.mockResolvedValueOnce({ rows: [queueRow] });
  expect(await repository.findQueueEntryById(queueEntry.id)).toMatchObject({
    id: queueEntry.id,
    entryType: undefined,
    calledAt: undefined
  });
  query.mockResolvedValueOnce({ rows: [queueRow] });
  expect(await repository.findAllQueueEntries(accountId as never)).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [queueRow] });
  expect(await repository.findAllQueueEntries()).toHaveLength(1);

  await repository.createQueueTransfer(transfer);
  await repository.persistQueueTransfer(queueEntry, transfer);
  await repository.persistQueueTransferReceipt(queueEntry, transfer);
  query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.persistQueueTransferReceipt(queueEntry, transfer)).rejects.toBeInstanceOf(NotFoundError);
  query.mockResolvedValueOnce({ rows: [transferRow] });
  expect(await repository.findQueueTransfersByQueueEntry(queueEntry.id)).toMatchObject([
    { id: transfer.id, status: 'received', receivedAt: timestamp.toISOString() }
  ]);

  const uniqueViolation = Object.assign(new Error('duplicate active queue entry'), {
    code: '23505',
    constraint: 'scheduling_queue_entries_active_appointment_unique'
  });
  query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
  query.mockRejectedValueOnce(uniqueViolation);
  await expect(repository.persistCheckIn(queueEntry, appointment)).rejects.toThrow(/active queue entry/);
  const unrelated = Object.assign(new Error('other failure'), { code: '23505', constraint: 'other' });
  query.mockRejectedValueOnce(unrelated);
  await expect(repository.persistCheckIn(queueEntry)).rejects.toBe(unrelated);
});

test('DatabaseSchedulingRepository exercises optional participant fields and legacy mappings', async () => {
  const repository = new DatabaseSchedulingRepository();
  const sparseAppointment = {
    ...appointment,
    reason: undefined,
    durationMinutes: undefined,
    visitType: 'walk_in' as const,
    canonicalStatus: undefined,
    clinicalType: undefined,
    practitionerStaffId: undefined,
    serviceId: undefined,
    unit: undefined,
    specialty: undefined,
    resourceLabel: undefined
  } as never;
  await repository.createAppointment(sparseAppointment);
  await repository.updateAppointment(sparseAppointment);

  query.mockResolvedValueOnce({
    rows: [
      {
        ...appointmentRow,
        visit_type: 'legacy-value',
        type: 'return',
        status: 'legacy-value',
        reason: 'Explicit reason',
        notes: 'Fallback note',
        practitioner_staff_id: 'staff-2',
        service_id: 'service-2',
        unit: 'Unit 2',
        specialty: 'Dermato',
        resource_label: 'Room 2',
        start_at: timestamp,
        end_at: new Date(timestamp.getTime() - 60_000)
      }
    ]
  });
  await expect(repository.findAppointmentById('rich-appointment' as never)).resolves.toMatchObject({
    visitType: 'return',
    clinicalType: 'return',
    durationMinutes: 1,
    practitionerStaffId: 'staff-2',
    serviceId: 'service-2'
  });

  const richQueueEntry = {
    ...queueEntry,
    appointmentId: undefined,
    encounterId: undefined,
    entryType: undefined,
    calledAt: undefined,
    currentSector: undefined,
    currentResponsibleUserId: undefined,
    currentResponsibleStaffId: undefined,
    nextSector: undefined,
    operationalStatus: undefined,
    clinicalStatus: undefined,
    billingStatus: undefined,
    handoffStatus: undefined,
    lastTransferredAt: undefined,
    lastTransferredByUserId: undefined
  };
  await repository.updateQueueEntry(richQueueEntry);
  query.mockResolvedValueOnce({
    rows: [
      {
        ...queueRow,
        appointment_id: 'appointment-2',
        encounter_id: 'encounter-2',
        entry_type: 'urgent',
        called_at: timestamp,
        current_sector: 'Nursing',
        current_responsible_user_id: 'user-2',
        current_responsible_staff_id: 'staff-2',
        next_sector: 'Doctor',
        operational_status: 'active',
        clinical_status: 'waiting',
        billing_status: 'pending',
        handoff_status: 'pending',
        last_transferred_at: timestamp,
        last_transferred_by_user_id: 'user-3'
      }
    ]
  });
  await expect(repository.findQueueEntryById(queueEntry.id)).resolves.toMatchObject({
    appointmentId: 'appointment-2',
    entryType: 'urgent',
    calledAt: timestamp.toISOString(),
    currentSector: 'Nursing',
    lastTransferredByUserId: 'user-3'
  });

  const receivedTransfer = { ...transfer, receivedAt: timestamp.toISOString() };
  await repository.persistQueueTransferReceipt(queueEntry, receivedTransfer);
  query.mockResolvedValueOnce({
    rows: [
      {
        ...transferRow,
        status: 'sent',
        received_at: null,
        encounter_id: 'encounter-2',
        received_by_user_id: 'user-2',
        responsible_user_id: 'user-3',
        responsible_staff_id: 'staff-3',
        next_sector: 'Doctor',
        billing_record_id: 'billing-2',
        counter_sale_id: 'sale-2'
      }
    ]
  });
  await expect(repository.findQueueTransfersByQueueEntry(queueEntry.id)).resolves.toMatchObject([
    {
      status: 'sent',
      receivedAt: undefined,
      encounterId: 'encounter-2',
      responsibleUserId: 'user-3',
      counterSaleId: 'sale-2'
    }
  ]);

  query.mockResolvedValueOnce({ rows: [] });
  await expect(
    repository.findAppointmentReportRows(accountId as never, { search: '   ' })
  ).resolves.toEqual([]);
});
