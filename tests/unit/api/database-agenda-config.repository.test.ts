import { beforeEach, expect, test, vi } from 'vitest';

import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import { DatabaseAgendaConfigRepository } from '../../../apps/api/src/repositories/database-agenda-config.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({ getPool: vi.fn() }));
vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) => fn(pool))
}));

const accountId = 'account-1';
const query = vi.fn();
const pool = { query };
const availabilityRow = {
  id: 'availability-1', account_id: accountId, professional_user_id: 'user-1', day_of_week: 1,
  start_time: '08:00:00', end_time: '17:00:00', slot_duration_minutes: '30',
  timezone: 'America/Sao_Paulo', effective_from: '2026-01-01', effective_until: '2026-12-31', notes: 'Weekday'
};
const typeRow = {
  id: 'type-1', account_id: accountId, code: 'CONSULT', name: 'Consultation', description: null,
  default_duration_minutes: '30', color: null, active: true
};

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantQuery).mockImplementation(async (client, fn) => fn(client as never));
  query.mockResolvedValue({ rows: [], rowCount: 1 });
});
test('agenda config repository persists and filters availability safely', async () => {
  const repository = new DatabaseAgendaConfigRepository();
  query.mockResolvedValueOnce({ rows: [availabilityRow] });
  expect(await repository.listAvailability(accountId, 'user-1')).toMatchObject([{ startTime: '08:00' }]);
  query.mockResolvedValueOnce({ rows: [{ ...availabilityRow, timezone: null, effective_from: null, effective_until: null, notes: null }] });
  expect(await repository.listAvailability(accountId)).toMatchObject([{ timezone: 'America/Sao_Paulo', effectiveFrom: null, notes: null }]);
  query.mockResolvedValueOnce({ rows: [availabilityRow] });
  expect(await repository.createAvailability({
    ...availabilityRow,
    accountId,
    professionalUserId: 'user-1',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
    timezone: undefined,
    effectiveFrom: undefined,
    effectiveUntil: undefined,
    notes: null
  } as never)).toMatchObject({ id: 'availability-1' });
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findAvailabilityById(accountId, 'missing')).toBeNull();
  query.mockResolvedValueOnce({ rows: [availabilityRow] });
  expect(await repository.findAvailabilityById(accountId, 'availability-1')).toMatchObject({ slotDurationMinutes: 30 });
  query.mockResolvedValueOnce({ rows: [] });
  await expect(repository.updateAvailability({ ...availabilityRow, accountId } as never)).rejects.toThrow(/not found/);
  query.mockResolvedValueOnce({ rows: [availabilityRow] });
  await repository.updateAvailability({ ...availabilityRow, accountId } as never);
  query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
  await expect(repository.deleteAvailability(accountId, 'availability-1')).resolves.toBe(true);
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.deleteAvailability(accountId, 'missing')).resolves.toBe(false);
});

test('agenda config repository covers appointment type filters and lifecycle', async () => {
  const repository = new DatabaseAgendaConfigRepository();
  query.mockResolvedValueOnce({ rows: [typeRow] });
  expect(await repository.listAppointmentTypes(accountId)).toMatchObject([{ description: null, color: null }]);
  query.mockResolvedValueOnce({ rows: [typeRow] });
  expect(await repository.listAppointmentTypes(accountId, { query: 'cons', active: false })).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [typeRow] });
  await repository.createAppointmentType(typeRow as never);
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findAppointmentTypeById(accountId, 'missing')).toBeNull();
  query.mockResolvedValueOnce({ rows: [typeRow] });
  await repository.findAppointmentTypeById(accountId, 'type-1');
  query.mockResolvedValueOnce({ rows: [] });
  await expect(repository.updateAppointmentType(typeRow as never)).rejects.toThrow(/not found/);
  query.mockResolvedValueOnce({ rows: [typeRow] });
  await repository.updateAppointmentType(typeRow as never);
  query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
  await expect(repository.deleteAppointmentType(accountId, 'type-1')).resolves.toBe(true);
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.deleteAppointmentType(accountId, 'missing')).resolves.toBe(false);
});
