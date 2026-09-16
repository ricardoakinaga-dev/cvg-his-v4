import { beforeEach, expect, test, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  query: vi.fn(),
  pool: { query: vi.fn() }
}));

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => mockState.pool)
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, operation: (client: unknown) => Promise<unknown>) =>
    operation(pool))
}));

import { DatabaseStaffRepository } from './repositories/database-staff.repository.js';

const accountId = 'account-1' as never;
const timestamp = '2026-09-16T12:00:00.000Z';
const staffRow = {
  id: 'staff-1',
  account_id: 'account-1',
  user_id: 'user-1',
  employee_code: 'VET-001',
  full_name: 'Dra. Ana',
  department: 'Clínica',
  job_title: 'Veterinária',
  profession_id: 'profession-1',
  is_active: true,
  created_at: timestamp,
  updated_at: timestamp
};
const professionRow = {
  id: 'profession-1',
  account_id: 'account-1',
  code: 'VET',
  name: 'Veterinária',
  description: 'Atendimento clínico',
  is_active: true,
  created_at: timestamp,
  updated_at: timestamp
};

beforeEach(() => {
  mockState.query.mockReset();
  mockState.pool.query = mockState.query;
  mockState.query.mockResolvedValue({ rows: [], rowCount: 1 });
});

test('DatabaseStaffRepository covers staff CRUD, optional fields and tenant queries', async () => {
  const repository = new DatabaseStaffRepository();
  const created = await repository.create({
    accountId,
    userId: 'user-1' as never,
    employeeCode: 'VET-001',
    fullName: 'Dra. Ana',
    department: 'Clínica',
    jobTitle: 'Veterinária',
    professionId: 'profession-1'
  });
  expect(created).toMatchObject({ accountId, fullName: 'Dra. Ana', isActive: true });
  const defaults = await repository.create({
    accountId,
    employeeCode: 'AUX-001',
    fullName: 'Auxiliar'
  });
  expect(defaults).toMatchObject({ userId: null, department: null, jobTitle: null, professionId: null });

  mockState.query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findById('missing')).toBeNull();
  mockState.query.mockResolvedValueOnce({ rows: [staffRow] });
  expect(await repository.findById('staff-1')).toMatchObject({ id: 'staff-1', userId: 'user-1' });
  mockState.query.mockResolvedValueOnce({ rows: [staffRow] });
  expect(await repository.findByAccountId(accountId)).toHaveLength(1);
  mockState.query.mockResolvedValueOnce({ rows: [staffRow] });
  expect(await repository.findByAccountId()).toHaveLength(1);
  mockState.query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findByUserId(accountId, 'missing-user' as never)).toBeNull();
  mockState.query.mockResolvedValueOnce({ rows: [staffRow] });
  expect(await repository.findByUserId(accountId, 'user-1' as never)).toMatchObject({ employeeCode: 'VET-001' });

  mockState.query.mockResolvedValueOnce({ rows: [staffRow] });
  const updated = await repository.update('staff-1', {
    fullName: 'Dra. Ana Maria',
    department: null,
    jobTitle: null,
    professionId: null,
    isActive: false
  });
  expect(updated).toMatchObject({ fullName: 'Dra. Ana Maria', department: null, isActive: false });
  mockState.query.mockResolvedValueOnce({ rows: [staffRow] });
  await repository.update('staff-1', {});
  mockState.query.mockResolvedValueOnce({ rows: [] });
  await expect(repository.update('missing', {})).rejects.toThrow(/Staff not found/);
  expect(mockState.query).toHaveBeenCalled();
});

test('DatabaseStaffRepository covers profession lifecycle and null-safe mapping', async () => {
  const repository = new DatabaseStaffRepository();
  const created = await repository.createProfession({ accountId, code: 'AUX', name: 'Auxiliar' });
  expect(created).toMatchObject({ accountId, description: null, isActive: true });
  mockState.query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findProfessionById('missing')).toBeNull();
  mockState.query.mockResolvedValueOnce({ rows: [professionRow] });
  expect(await repository.findProfessionById('profession-1')).toMatchObject({ code: 'VET' });
  mockState.query.mockResolvedValueOnce({ rows: [professionRow] });
  expect(await repository.findProfessionsByAccountId(accountId)).toHaveLength(1);

  mockState.query.mockResolvedValueOnce({ rows: [professionRow] });
  expect(await repository.updateProfession('profession-1', {
    code: 'VET-2', name: 'Veterinária sênior', description: null, isActive: false
  })).toMatchObject({ code: 'VET-2', name: 'Veterinária sênior', description: null, isActive: false });
  mockState.query.mockResolvedValueOnce({ rows: [professionRow] });
  await repository.updateProfession('profession-1', {});
  mockState.query.mockResolvedValueOnce({ rows: [] });
  await expect(repository.updateProfession('missing', {})).rejects.toThrow(/Profession not found/);

  mockState.query.mockResolvedValueOnce({ rows: [{ ...staffRow, user_id: null, department: null, job_title: null, profession_id: null, is_active: false }] });
  expect(await repository.findById('staff-sparse')).toMatchObject({
    userId: null,
    department: null,
    jobTitle: null,
    professionId: null,
    isActive: false
  });
});
