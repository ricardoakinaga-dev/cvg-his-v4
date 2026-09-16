import { beforeEach, expect, test, vi } from 'vitest';

import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import { DatabaseTriageRepository } from './repositories/database-triage.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn()
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) =>
    fn(pool))
}));

const query = vi.fn();
const pool = { query };
const timestamp = new Date('2026-09-16T12:00:00.000Z');

const triageRow = {
  id: 'triage-1',
  account_id: 'account-1',
  encounter_id: 'encounter-1',
  patient_id: 'patient-1',
  priority: 'high',
  chief_complaint: 'Dor aguda',
  initial_notes: null,
  alerts_json: null,
  destination: null,
  triaged_by: 'user-1',
  created_at: timestamp.toISOString(),
  triaged_at: timestamp.toISOString()
};

const versionRow = {
  id: 'version-1',
  triage_id: 'triage-1',
  account_id: 'account-1',
  encounter_id: 'encounter-1',
  changed_fields_json: null,
  previous_snapshot_json: JSON.stringify({ priority: 'medium' }),
  next_snapshot_json: JSON.stringify({ priority: 'high' }),
  changed_by_user_id: 'user-1',
  created_at: timestamp.toISOString()
};

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantQuery).mockImplementation(async (client, fn) => fn(client as never));
});

test('DatabaseTriageRepository persists records and history with tenant-scoped queries', async () => {
  const repository = new DatabaseTriageRepository();
  const record = {
    id: 'triage-1' as never,
    accountId: 'account-1' as never,
    encounterId: 'encounter-1' as never,
    patientId: 'patient-1' as never,
    priority: 'high' as const,
    chiefComplaint: 'Dor aguda',
    initialNotes: undefined,
    alerts: [],
    destination: 'observation' as const,
    triagedByUserId: 'user-1' as never,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  };
  const version = {
    id: 'version-1' as never,
    triageId: record.id,
    accountId: record.accountId,
    encounterId: record.encounterId,
    changedFields: ['priority'],
    previousSnapshot: {
      priority: 'medium' as const,
      chiefComplaint: 'Dor aguda',
      alerts: [],
      destination: 'observation' as const,
      updatedAt: timestamp.toISOString()
    },
    nextSnapshot: {
      priority: 'high' as const,
      chiefComplaint: 'Dor aguda',
      alerts: [],
      destination: 'observation' as const,
      updatedAt: timestamp.toISOString()
    },
    changedByUserId: 'user-1' as never,
    createdAt: timestamp.toISOString()
  };

  await repository.create(record);
  await repository.update(record);
  await repository.createVersion(version);

  query.mockResolvedValueOnce({ rows: [triageRow] });
  expect(await repository.findById(record.id, record.accountId)).toEqual({
    ...record,
    initialNotes: undefined,
    alerts: [],
    destination: 'observation'
  });

  query.mockResolvedValueOnce({
    rows: [{ ...triageRow, initial_notes: 'Paciente alerta', alerts_json: '["alergia"]', destination: 'in_care' }]
  });
  expect(await repository.findByEncounterId(record.encounterId, record.accountId)).toMatchObject([
    { initialNotes: 'Paciente alerta', alerts: ['alergia'], destination: 'in_care' }
  ]);

  query.mockResolvedValueOnce({ rows: [triageRow] });
  expect(await repository.findByAccountId(record.accountId)).toHaveLength(1);

  query.mockResolvedValueOnce({ rows: [versionRow] });
  expect(await repository.findVersionsByTriageId(record.id, record.accountId)).toEqual([
    {
      id: versionRow.id,
      triageId: versionRow.triage_id,
      accountId: versionRow.account_id,
      encounterId: versionRow.encounter_id,
      changedFields: [],
      previousSnapshot: { priority: 'medium' },
      nextSnapshot: { priority: 'high' },
      changedByUserId: versionRow.changed_by_user_id,
      createdAt: timestamp.toISOString()
    }
  ]);

  query.mockResolvedValueOnce({ rows: [versionRow] });
  expect(await repository.findVersionsByAccountId(record.accountId)).toHaveLength(1);
  expect(query).toHaveBeenCalled();
  expect(vi.mocked(withTenantQuery).mock.calls.length).toBe(8);
});

test('DatabaseTriageRepository fails closed on missing point lookups', async () => {
  const repository = new DatabaseTriageRepository();
  query.mockResolvedValue({ rows: [] });

  expect(await repository.findById('missing' as never, 'account-1' as never)).toBeNull();
  expect(await repository.findByEncounterId('missing' as never, 'account-1' as never)).toEqual([]);
  expect(await repository.findByAccountId('account-1' as never)).toEqual([]);
  expect(await repository.findVersionsByTriageId('missing' as never, 'account-1' as never)).toEqual([]);
  expect(await repository.findVersionsByAccountId('account-1' as never)).toEqual([]);
});
