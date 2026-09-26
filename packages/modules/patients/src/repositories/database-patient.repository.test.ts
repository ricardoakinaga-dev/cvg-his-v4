import { beforeEach, expect, test, vi } from 'vitest';

function chainable(rows: () => readonly Record<string, unknown>[]) {
  const builder = {
    from: () => builder,
    where: () => builder,
    limit: () => builder,
    then: (
      resolve: (value: readonly Record<string, unknown>[]) => unknown,
      reject: (reason: unknown) => unknown
    ) => Promise.resolve(rows()).then(resolve, reject)
  };
  return builder;
}

const mockState = vi.hoisted(() => {
  const selectQueue: Array<readonly Record<string, unknown>[]> = [];
  const database = {
    select: vi.fn(() => chainable(() => selectQueue.shift() ?? []))
  };
  return { selectQueue, database, accountId: 'account-1' };
});

vi.mock('@cvg-his-v2/shared-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/shared-database')>();
  return actual;
});

vi.mock('@cvg-his-v2/tenant-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/tenant-context')>();
  return { ...actual, requireAccountId: vi.fn(() => mockState.accountId) };
});

import { DatabasePatientRepository } from './database-patient.repository.js';

const timestamp = new Date('2026-09-16T12:00:00.000Z');
const row = {
  id: '11111111-1111-4111-8111-111111111111',
  accountId: mockState.accountId,
  ownerId: '33333333-3333-4333-8333-333333333333',
  name: 'Luna',
  species: 'canine',
  breed: null,
  sex: 'female',
  birthDate: null,
  weightKg: null,
  microchip: null,
  alertsJson: null,
  createdAt: timestamp,
  updatedAt: timestamp
};

function rejectingDatabase(code: string) {
  const driverFailure = Object.assign(new Error(`mock driver failure ${code}`), { code });
  const wrapped = Object.assign(new Error(`mock query failure ${code}`), { cause: driverFailure });
  return {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({ limit: () => Promise.reject(wrapped) })
      })
    }))
  };
}

beforeEach(() => {
  mockState.selectQueue.length = 0;
  mockState.database.select.mockClear();
});

test('findById maps a persisted row', async () => {
  mockState.selectQueue.push([row]);
  const repository = new DatabasePatientRepository(mockState.database as never);

  const found = await repository.findById(row.id as never);

  expect(found?.id).toBe(row.id);
  expect(found?.accountId).toBe(mockState.accountId);
});

test('findById returns null for a well-formed but unknown identifier', async () => {
  const repository = new DatabasePatientRepository(mockState.database as never);

  await expect(
    repository.findById('22222222-2222-4222-8222-222222222222' as never)
  ).resolves.toBeNull();
  expect(mockState.database.select).toHaveBeenCalledTimes(1);
});

test('findById reports an invalid uuid identifier as unknown instead of failing', async () => {
  const repository = new DatabasePatientRepository(rejectingDatabase('22P02') as never);

  await expect(repository.findById('not-a-uuid' as never)).resolves.toBeNull();
});

test('findById propagates database failures other than invalid uuid input', async () => {
  const repository = new DatabasePatientRepository(rejectingDatabase('57014') as never);

  await expect(repository.findById(row.id as never)).rejects.toThrow(/mock query failure 57014/);
});
