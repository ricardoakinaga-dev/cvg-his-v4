import { beforeEach, expect, test, vi } from 'vitest';

import { getPool } from '@cvg-his-v2/shared-database';
import { requireAccountId, withTenantQuery } from '@cvg-his-v2/tenant-context';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

import {
  DatabaseAdministrationEventRepository,
  DatabasePrescriptionExecutionRepository
} from './repositories/database-prescription-execution.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn()
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  requireAccountId: vi.fn(),
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) =>
    fn(pool))
}));

const ACCOUNT_ID = 'account-1';
const OTHER_ACCOUNT_ID = 'account-2';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const pool = { query };

function execution(overrides: Record<string, unknown> = {}) {
  return {
    id: 'execution-1',
    accountId: ACCOUNT_ID,
    clinicalEntryId: 'prescription-1',
    patientId: 'patient-1',
    encounterId: 'encounter-1',
    medicationName: 'Amoxicilina',
    dosage: '500mg',
    route: 'oral',
    frequency: '8/8h',
    scheduledAt: timestamp.toISOString(),
    status: 'pending',
    administeredBy: undefined,
    administeredAt: undefined,
    notes: undefined,
    version: 1,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    ...overrides
  };
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    executionId: 'execution-1',
    eventType: 'scheduled',
    actorId: 'user-1',
    occurredAt: timestamp.toISOString(),
    notes: undefined,
    vitalsSnapshot: undefined,
    createdAt: timestamp.toISOString(),
    ...overrides
  };
}

function prescriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    account_id: ACCOUNT_ID,
    patient_id: 'patient-1',
    encounter_id: 'encounter-1',
    entry_type: 'prescription',
    title: 'Amoxicilina',
    content: 'Posologia: 500mg\nVia: oral\nFrequência: 8/8h',
    deleted_at: null,
    version: 1,
    ...overrides
  };
}

function executionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'execution-1',
    account_id: ACCOUNT_ID,
    clinical_entry_id: 'prescription-1',
    patient_id: 'patient-1',
    encounter_id: 'encounter-1',
    medication_name: 'Amoxicilina',
    dosage: '500mg',
    route: null,
    frequency: null,
    scheduled_at: timestamp,
    status: 'administered',
    administered_by: null,
    administered_at: null,
    notes: null,
    version: 2,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides
  };
}

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    execution_id: 'execution-1',
    event_type: 'administered',
    actor_id: 'user-1',
    occurred_at: timestamp,
    notes: null,
    vitals_snapshot_json: null,
    created_at: timestamp,
    ...overrides
  };
}

function prepareSignedPrescription(overrides: Record<string, unknown> = {}) {
  query
    .mockResolvedValueOnce({ rows: [prescriptionRow(overrides)] })
    .mockResolvedValueOnce({ rows: [{ signed_at: timestamp }] });
}

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(requireAccountId).mockReturnValue(ACCOUNT_ID as never);
  vi.mocked(withTenantQuery).mockImplementation(async (client, fn) => fn(client as never));
});

test('DatabasePrescriptionExecutionRepository writes guarded executions and maps reads', async () => {
  const repository = new DatabasePrescriptionExecutionRepository();
  const currentExecution = execution();
  const currentEvent = event();

  prepareSignedPrescription();
  await repository.createWithEvent(currentExecution as never, currentEvent as never);

  prepareSignedPrescription();
  query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
  query.mockResolvedValueOnce({ rows: [] });
  await repository.updateWithEvent(
    execution({ status: 'administered', version: 2, administeredBy: 'nurse-1' }) as never,
    event({ eventType: 'administered' }) as never,
    1
  );

  query.mockResolvedValueOnce({ rows: [executionRow()] });
  expect(await repository.findById('execution-1' as never)).toMatchObject({
    id: 'execution-1',
    route: undefined,
    administeredAt: undefined,
    version: 2
  });
  query.mockResolvedValueOnce({ rows: [executionRow()] });
  expect(await repository.findByEncounterId('encounter-1' as never)).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [executionRow()] });
  expect(await repository.findByPatientId('patient-1' as never)).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [executionRow()] });
  expect(await repository.findByAccountId(ACCOUNT_ID as never)).toHaveLength(1);
});

test('DatabasePrescriptionExecutionRepository validates tenant, event and signed prescription invariants', async () => {
  const repository = new DatabasePrescriptionExecutionRepository();

  await expect(
    repository.createWithEvent(
      execution() as never,
      event({ executionId: 'other-execution' }) as never
    )
  ).rejects.toBeInstanceOf(ValidationError);

  vi.mocked(requireAccountId).mockReturnValue(OTHER_ACCOUNT_ID as never);
  await expect(repository.createWithEvent(execution() as never, event() as never)).rejects.toThrow(
    'account does not match tenant context'
  );
  vi.mocked(requireAccountId).mockReturnValue(ACCOUNT_ID as never);

  const invalidCases: Array<{ message: string; prescription: Record<string, unknown> }> = [
    { message: 'Prescription not found', prescription: { entry_type: 'progress_note' } },
    { message: 'Archived prescriptions cannot be executed', prescription: { deleted_at: timestamp } },
    { message: 'Prescription must be signed before execution', prescription: {} },
    {
      message: 'Prescription patient does not match execution patient',
      prescription: { patient_id: 'patient-other' }
    },
    {
      message: 'Prescription encounter does not match execution encounter',
      prescription: { encounter_id: 'encounter-other' }
    },
    {
      message: 'Execution medication must match the prescription',
      prescription: { title: 'Dipirona' }
    },
    {
      message: 'Execution dosage must match the prescription',
      prescription: { content: 'Posologia: 1g\nVia: oral\nFrequência: 8/8h' }
    },
    {
      message: 'Execution route must match the prescription',
      prescription: { content: 'Posologia: 500mg\nVia: intravenosa\nFrequência: 8/8h' }
    },
    {
      message: 'Execution frequency must match the prescription',
      prescription: { content: 'Posologia: 500mg\nVia: oral\nFrequência: 12/12h' }
    },
    {
      message: 'Prescription dosage is empty',
      prescription: { content: 'Posologia: \nVia: oral\nFrequência: 8/8h' }
    }
  ];

  for (const current of invalidCases) {
    query.mockReset();
    if (current.message === 'Prescription not found') {
      query.mockResolvedValueOnce({ rows: [prescriptionRow(current.prescription)] });
    } else if (current.message === 'Archived prescriptions cannot be executed') {
      query.mockResolvedValueOnce({ rows: [prescriptionRow(current.prescription)] });
    } else if (current.message === 'Prescription must be signed before execution') {
      query
        .mockResolvedValueOnce({ rows: [prescriptionRow()] })
        .mockResolvedValueOnce({ rows: [] });
    } else {
      prepareSignedPrescription(current.prescription);
    }

    await expect(
      repository.createWithEvent(execution() as never, event() as never)
    ).rejects.toThrow(current.message === 'Prescription dosage is empty'
      ? 'Execution dosage must match the prescription'
      : current.message);
  }
});

test('DatabasePrescriptionExecutionRepository reports update conflicts and not-found rows', async () => {
  const repository = new DatabasePrescriptionExecutionRepository();

  prepareSignedPrescription();
  query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(
    repository.updateWithEvent(execution({ version: 2 }) as never, event() as never, 1)
  ).rejects.toBeInstanceOf(NotFoundError);

  prepareSignedPrescription();
  query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  query.mockResolvedValueOnce({ rowCount: 1, rows: [{ version: 4 }] });
  await expect(
    repository.updateWithEvent(execution({ version: 2 }) as never, event() as never, 1)
  ).rejects.toBeInstanceOf(ConflictError);
});

test('DatabaseAdministrationEventRepository persists and hydrates nullable vitals', async () => {
  const repository = new DatabaseAdministrationEventRepository();

  await repository.create(event() as never);
  query.mockResolvedValueOnce({ rows: [eventRow()] });
  expect(await repository.findById('event-1' as never)).toMatchObject({
    id: 'event-1',
    notes: undefined,
    vitalsSnapshot: undefined
  });
  query.mockResolvedValueOnce({ rows: [eventRow({ vitals_snapshot_json: '{"temperature": 38.2}' })] });
  expect(await repository.findByExecutionId('execution-1' as never)).toMatchObject([
    { vitalsSnapshot: { temperature: 38.2 } }
  ]);
  query.mockResolvedValueOnce({ rows: [eventRow({ vitals_snapshot_json: { pulse: 90 } })] });
  expect(await repository.findByExecutionId('execution-1' as never)).toMatchObject([
    { vitalsSnapshot: { pulse: 90 } }
  ]);
  await repository.deleteById('event-1' as never);

  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findById('missing' as never)).toBeNull();
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findByExecutionId('missing' as never)).toEqual([]);
});
