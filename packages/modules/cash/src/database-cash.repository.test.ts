import { beforeEach, expect, test, vi } from 'vitest';

import {
  createScopedDatabaseClient,
  getPool,
  runInTenantTransaction,
  withTenantTransaction
} from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import { DatabaseCashRepository } from './repositories/database-cash.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  createScopedDatabaseClient: vi.fn((client: unknown) => client),
  getPool: vi.fn(),
  runInTenantTransaction: vi.fn(async (_pool: unknown, _accountId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn(database)),
  withTenantTransaction: vi.fn(async (_accountId: string, fn: (database: unknown) => Promise<unknown>) =>
    fn(database))
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) =>
    fn(pool))
}));

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const execute = vi.fn();
const pool = { query };
const database = { execute };

const registerRow = {
  id: 'register-1',
  account_id: accountId,
  opened_by_user_id: 'user-1',
  closed_by_user_id: 'user-2',
  opening_amount: '100.00',
  closing_amount: '120.00',
  expected_closing_amount: '118.00',
  difference: '2.00',
  status: 'closed',
  opened_at: timestamp,
  closed_at: timestamp,
  notes: 'Daily register',
  created_at: timestamp,
  updated_at: timestamp
};

const sparseRegisterRow = {
  ...registerRow,
  closed_by_user_id: null,
  closing_amount: null,
  expected_closing_amount: null,
  difference: null,
  closed_at: null,
  notes: null,
  status: 'open'
};

const movementRow = {
  id: 'movement-1',
  cash_register_id: 'register-1',
  account_id: accountId,
  movement_type: 'payment',
  amount: '20.00',
  running_balance: '120.00',
  reference: 'payment-1',
  notes: 'Payment',
  created_by_user_id: 'user-1',
  created_at: timestamp
};

const register = {
  id: 'register-1',
  accountId: accountId as never,
  openedByUserId: 'user-1' as never,
  closedByUserId: null,
  openingAmount: 100,
  closingAmount: null,
  expectedClosingAmount: null,
  difference: null,
  status: 'open' as const,
  openedAt: timestamp.toISOString(),
  closedAt: null,
  notes: null,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

const movement = {
  id: 'movement-1',
  cashRegisterId: 'register-1',
  accountId: accountId as never,
  movementType: 'payment' as const,
  amount: 20,
  runningBalance: 120,
  reference: null,
  notes: null,
  createdByUserId: 'user-1' as never,
  createdAt: timestamp.toISOString()
};

beforeEach(() => {
  query.mockReset();
  execute.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantQuery).mockImplementation(async (client, fn) => fn(client as never));
  vi.mocked(withTenantTransaction).mockImplementation(async (_accountId, fn) => fn(database as never));
  vi.mocked(runInTenantTransaction).mockImplementation(async (_pool, _accountId, fn) => fn(database as never));
  vi.mocked(createScopedDatabaseClient).mockImplementation((client) => client as never);
  query.mockResolvedValue({ rows: [], rowCount: 1 });
  execute.mockResolvedValue({ rows: [], rowCount: 1 });
});
test('DatabaseCashRepository covers register, movement and balance projections', async () => {
  const repository = new DatabaseCashRepository();
  await repository.openRegisterWithMovement(register, movement);
  await repository.openRegister(register);
  await repository.closeRegister('register-1', 120, 118, 2, 'user-2' as never, timestamp.toISOString(), timestamp.toISOString());

  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findOpenRegister(accountId as never)).toBeNull();
  query.mockResolvedValueOnce({ rows: [sparseRegisterRow] });
  expect(await repository.findOpenRegister(accountId as never)).toMatchObject({
    id: register.id,
    status: 'open',
    closingAmount: null,
    notes: null
  });
  query.mockResolvedValueOnce({ rows: [registerRow, sparseRegisterRow] });
  expect(await repository.findRegistersByAccount(accountId as never)).toHaveLength(2);
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findById('missing')).toBeNull();
  query.mockResolvedValueOnce({ rows: [registerRow] });
  expect(await repository.findById('register-1')).toMatchObject({ closingAmount: 120, difference: 2 });

  await repository.createMovement(movement);
  query.mockResolvedValueOnce({ rows: [movementRow] });
  expect(await repository.findMovementsByRegister('register-1')).toMatchObject([{ amount: 20, reference: 'payment-1' }]);
  query.mockResolvedValueOnce({ rows: [movementRow] });
  expect(await repository.findMovementsByAccount(accountId as never, '2026-01-01', '2026-12-31')).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findMovementsByAccount(accountId as never)).toEqual([]);
  query.mockResolvedValueOnce({ rows: [{ balance: '119.50' }] });
  expect(await repository.calculateCurrentBalance('register-1')).toBe(119.5);
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.calculateCurrentBalance('register-1')).toBe(0);
});

test('DatabaseCashRepository derives authoritative close and movement balances with fencing', async () => {
  const repository = new DatabaseCashRepository();

  execute
    .mockResolvedValueOnce({ rows: [{ id: 'register-1' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ running_balance: '118.25' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 });
  const closed = await repository.closeRegisterWithMovement(
    accountId as never,
    'register-1',
    120,
    'user-2' as never,
    timestamp.toISOString(),
    timestamp.toISOString(),
    movement
  );
  expect(closed).toMatchObject({ expectedClosingAmount: 118.25, difference: 1.75, movement: { runningBalance: 118.25 } });

  execute.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.closeRegisterWithMovement(accountId as never, 'register-1', 120, 'user-2' as never, timestamp.toISOString(), timestamp.toISOString(), movement)).rejects.toThrow(/outside/);
  execute
    .mockResolvedValueOnce({ rows: [{ id: 'register-1' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.closeRegisterWithMovement(accountId as never, 'register-1', 120, 'user-2' as never, timestamp.toISOString(), timestamp.toISOString(), movement)).rejects.toThrow(/outside/);

  execute
    .mockResolvedValueOnce({ rows: [{ status: 'open' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ running_balance: '100' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 });
  expect(await repository.recordMovementAtomically(accountId as never, 'register-1', movement)).toMatchObject({
    runningBalance: 120,
    accountId,
    cashRegisterId: 'register-1'
  });
  execute
    .mockResolvedValueOnce({ rows: [{ status: 'open' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ running_balance: '100' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 });
  expect(await repository.recordMovementAtomically(accountId as never, 'register-1', { ...movement, movementType: 'withdrawal', amount: 20 })).toMatchObject({ runningBalance: 80 });
  execute.mockResolvedValueOnce({ rows: [{ status: 'closed' }], rowCount: 1 });
  await expect(repository.recordMovementAtomically(accountId as never, 'register-1', movement)).rejects.toThrow(/not found/);
  execute.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  await expect(repository.recordMovementAtomically(accountId as never, 'register-1', movement)).rejects.toThrow(/not found/);
  execute
    .mockResolvedValueOnce({ rows: [{ status: 'open' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ running_balance: '0' }], rowCount: 1 });
  await expect(repository.recordMovementAtomically(accountId as never, 'register-1', { ...movement, movementType: 'withdrawal', amount: 1 })).rejects.toThrow(/Insufficient/);
});

test('DatabaseCashRepository supports the scoped transaction adapter path', async () => {
  const override = { query: vi.fn() };
  const repository = new DatabaseCashRepository(override as never);
  execute
    .mockResolvedValueOnce({ rows: [{ id: 'register-1' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ running_balance: '10' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 });
  await repository.closeRegisterWithMovement(accountId as never, 'register-1', 10, 'user-2' as never, timestamp.toISOString(), timestamp.toISOString(), movement);
  expect(vi.mocked(runInTenantTransaction)).toHaveBeenCalledWith(override, accountId, expect.any(Function));
  expect(vi.mocked(createScopedDatabaseClient)).toHaveBeenCalled();
});
