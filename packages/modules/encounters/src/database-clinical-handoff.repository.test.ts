import { beforeEach, expect, test, vi } from 'vitest';

import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import { DatabaseClinicalHandoffRepository } from './repositories/database-clinical-handoff.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn()
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) => fn(pool))
}));

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const pool = { query };

const row = {
  id: 'handoff-1',
  account_id: accountId,
  encounter_id: 'encounter-1',
  queue_entry_id: null,
  appointment_id: null,
  owner_id: 'owner-1',
  patient_id: 'patient-1',
  origin_channel: 'reception',
  from_sector: 'clinic',
  to_sector: 'reception',
  from_responsible_id: 'user-1',
  to_responsible_type: 'sector',
  to_responsible_id: null,
  clinical_summary: 'Summary',
  reception_instructions: 'Instructions',
  priority: 'medium',
  handoff_status: 'sent_to_reception',
  created_by: 'user-1',
  sent_by: 'user-1',
  sent_at: timestamp.toISOString(),
  acknowledged_by: null,
  acknowledged_at: null,
  acknowledge_note: null,
  pending_issues: JSON.stringify([{ type: 'missing-document' }]),
  returned_to_clinic_by: null,
  returned_to_clinic_at: null,
  returned_to_clinic_reason: null,
  returned_to_clinic_responsible_id: null,
  sent_to_finance_by: null,
  sent_to_finance_at: null,
  finance_note: null,
  created_at: timestamp.toISOString(),
  updated_at: timestamp.toISOString()
};

const handoff = {
  id: 'handoff-1' as never,
  accountId: accountId as never,
  encounterId: 'encounter-1' as never,
  ownerId: 'owner-1' as never,
  patientId: 'patient-1' as never,
  originChannel: 'reception' as const,
  fromSector: 'clinic' as const,
  toSector: 'reception' as const,
  fromResponsibleId: 'user-1' as never,
  toResponsibleType: 'sector' as const,
  toResponsibleId: undefined,
  clinicalSummary: 'Summary',
  receptionInstructions: 'Instructions',
  priority: 'medium' as const,
  handoffStatus: 'sent_to_reception' as const,
  createdBy: 'user-1' as never,
  sentBy: 'user-1' as never,
  sentAt: timestamp.toISOString(),
  pendingIssues: [],
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantQuery).mockImplementation(async (client, fn) => fn(client as never));
  query.mockResolvedValue({ rows: [], rowCount: 1 });
});

test('DatabaseClinicalHandoffRepository persists and hydrates optional clinical handoff state', async () => {
  const repository = new DatabaseClinicalHandoffRepository();
  await repository.create(handoff);
  await repository.update({
    ...handoff,
    queueEntryId: 'queue-1' as never,
    appointmentId: 'appointment-1' as never,
    toResponsibleId: 'user-2' as never,
    acknowledgedBy: 'user-2' as never,
    acknowledgedAt: timestamp.toISOString(),
    acknowledgeNote: 'Received',
    returnedToClinicBy: 'user-2' as never,
    returnedToClinicAt: timestamp.toISOString(),
    returnedToClinicReason: 'Need review',
    returnedToClinicResponsibleId: 'user-3' as never,
    sentToFinanceBy: 'user-2' as never,
    sentToFinanceAt: timestamp.toISOString(),
    financeNote: 'Finance notified'
  });
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.update(handoff)).rejects.toBeInstanceOf(NotFoundError);

  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findById('missing' as never)).toBeNull();
  query.mockResolvedValueOnce({ rows: [row] });
  expect(await repository.findById('handoff-1' as never)).toMatchObject({
    id: 'handoff-1',
    pendingIssues: [],
    acknowledgedAt: undefined,
    toResponsibleId: undefined
  });
  query.mockResolvedValueOnce({ rows: [{ ...row, pending_issues: [{ type: 'ready' }], queue_entry_id: 'queue-1', acknowledged_at: timestamp }] });
  expect(await repository.findByEncounterId('encounter-1' as never)).toMatchObject([
    { queueEntryId: 'queue-1', pendingIssues: [{ type: 'ready' }], acknowledgedAt: timestamp.toISOString() }
  ]);
  query.mockResolvedValueOnce({ rows: [row] });
  expect(await repository.findAll(accountId as never)).toHaveLength(1);
});
