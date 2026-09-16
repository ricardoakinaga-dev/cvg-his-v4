import { beforeEach, expect, test, vi } from 'vitest';

const mockState = vi.hoisted(() => {
  const selectQueue: Array<readonly Record<string, unknown>[]> = [];
  const operations: string[] = [];
  const database = {
    insert: vi.fn(() => ({
      values: vi.fn(async (payload: Record<string, unknown>) => {
        operations.push(`insert:${String(payload.fullName)}`);
      })
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => operations.push('update')) }))
    })),
    delete: vi.fn(() => ({ where: vi.fn(async () => operations.push('delete')) })),
    select: vi.fn(() => {
      const builder = {
        from: () => builder,
        where: () => builder,
        limit: () => builder,
        then: (
          resolve: (value: readonly Record<string, unknown>[]) => unknown,
          reject: (reason: unknown) => unknown
        ) => Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject)
      };
      return builder;
    })
  };
  return { selectQueue, operations, database, accountId: 'account-1' };
});

vi.mock('@cvg-his-v2/shared-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/shared-database')>();
  return actual;
});

vi.mock('@cvg-his-v2/tenant-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/tenant-context')>();
  return { ...actual, requireAccountId: vi.fn(() => mockState.accountId) };
});

import { DatabaseOwnerRepository } from './repositories/database-owner.repository.js';

const timestamp = new Date('2026-09-16T12:00:00.000Z');
const owner = {
  id: 'owner-1' as never,
  accountId: mockState.accountId as never,
  fullName: 'Maria Silva',
  documentId: '123.456.789-00',
  contacts: [
    { label: 'Celular', value: '+55 11 99999-0000', type: 'phone' as const, primary: true },
    { label: 'E-mail', value: 'maria@example.test', type: 'email' as const, primary: false },
    { label: 'WhatsApp', value: '+55 11 98888-0000', type: 'whatsapp' as const, primary: false }
  ],
  address: {
    zipCode: '01234-567', street: 'Rua A', number: '10', complement: 'Casa', state: 'SP',
    city: 'São Paulo', district: 'Centro', reference: 'Praça', cityCode: '3550308'
  },
  profile: {
    birthDate: '1988-02-03', sex: 'female' as const, group: 'VIP', receiveSms: true,
    personType: 'individual' as const, rg: '11.222.333-4'
  },
  financialProfile: { allowedDebtLimit: 250, creditBalance: 35.5, availablePoints: 120, blockedPoints: 15 },
  financialResponsible: true,
  administrativeNotes: 'Cliente premium',
  legacyVetusId: '3835',
  originalCreatedAt: '2024-05-03',
  status: 'active' as const,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

const fullRow = {
  id: owner.id,
  accountId: owner.accountId,
  document: owner.documentId,
  fullName: owner.fullName,
  email: 'maria@example.test',
  phoneMain: '+55 11 99999-0000',
  phoneAlt: '+55 11 98888-0000',
  addressJson: {
    version: 2,
    contacts: [
      ...owner.contacts,
      { label: '', value: 'invalid', type: 'email' },
      { label: 'Invalid type', value: 'x', type: 'fax' }
    ],
    address: owner.address,
    profile: owner.profile,
    financialProfile: owner.financialProfile,
    administrativeNotes: owner.administrativeNotes,
    financialResponsible: true,
    legacyVetusId: owner.legacyVetusId,
    originalCreatedAt: owner.originalCreatedAt,
    status: 'active'
  },
  createdAt: timestamp,
  updatedAt: timestamp
};

beforeEach(() => {
  mockState.selectQueue.length = 0;
  mockState.operations.length = 0;
  vi.clearAllMocks();
});

test('DatabaseOwnerRepository persists metadata-rich owners and searches by account', async () => {
  const repository = new DatabaseOwnerRepository(mockState.database as never);
  await repository.create(owner);
  await repository.update({ ...owner, status: 'inactive', contacts: owner.contacts.slice(0, 1) });
  expect(mockState.operations).toEqual(['insert:Maria Silva', 'update']);

  mockState.selectQueue.push([fullRow]);
  const found = await repository.findById(owner.id);
  expect(found).toMatchObject({
    id: owner.id,
    documentId: owner.documentId,
    status: 'active',
    address: { cityCode: '3550308' },
    profile: { sex: 'female', personType: 'individual' },
    financialProfile: { creditBalance: 35.5 },
    contacts: expect.arrayContaining([
      expect.objectContaining({ type: 'phone' }),
      expect.objectContaining({ type: 'email' }),
      expect.objectContaining({ type: 'whatsapp' })
    ])
  });
  mockState.selectQueue.push([fullRow]);
  expect(await repository.findByAccountId(mockState.accountId as never)).toHaveLength(1);
  mockState.selectQueue.push([fullRow]);
  expect(await repository.findByAccountId(mockState.accountId as never, '999.999')).toHaveLength(1);
  mockState.selectQueue.push([fullRow]);
  expect(await repository.findByAccountId(mockState.accountId as never, 'Maria')).toHaveLength(1);
  mockState.selectQueue.push([]);
  expect(await repository.findById('missing' as never)).toBeNull();
  await repository.delete(owner.id);
  expect(mockState.operations.at(-1)).toBe('delete');
});

test('DatabaseOwnerRepository supports legacy contact fallback and empty metadata', async () => {
  const repository = new DatabaseOwnerRepository(mockState.database as never);
  mockState.selectQueue.push([{
    ...fullRow,
    addressJson: null,
    phoneMain: '11999990000',
    email: 'legacy@example.test',
    phoneAlt: '11888880000'
  }]);
  expect(await repository.findById('legacy-owner' as never)).toMatchObject({
    contacts: [
      { type: 'phone', primary: true },
      { type: 'email', primary: false },
      { type: 'phone', primary: false }
    ],
    financialResponsible: true,
    status: 'active'
  });
  mockState.selectQueue.push([{
    ...fullRow,
    addressJson: { version: 2, status: 'inactive' },
    phoneMain: null,
    email: null,
    phoneAlt: null
  }]);
  expect(await repository.findById('minimal-owner' as never)).toMatchObject({
    contacts: [],
    address: undefined,
    profile: undefined,
    financialProfile: undefined,
    status: 'inactive'
  });
  mockState.selectQueue.push([{
    ...fullRow,
    addressJson: {
      version: 2,
      address: { city: '' },
      profile: { sex: 'invalid', receiveSms: 'yes', personType: 'unknown' },
      financialProfile: { allowedDebtLimit: Number.NaN, creditBalance: 'bad' },
      contacts: 'not-an-array',
      status: 'unknown'
    }
  }]);
  expect(await repository.findById('malformed-owner' as never)).toMatchObject({
    contacts: expect.any(Array),
    financialResponsible: true,
    status: 'active'
  });
});

test('DatabaseOwnerRepository requires tenant context for every mutation and read', async () => {
  const repository = new DatabaseOwnerRepository(mockState.database as never);
  const tenant = vi.mocked((await import('@cvg-his-v2/tenant-context')).requireAccountId);
  tenant.mockImplementation(() => { throw new Error('tenant context required'); });
  await expect(repository.create(owner)).rejects.toThrow(/tenant context/);
  await expect(repository.update(owner)).rejects.toThrow(/tenant context/);
  await expect(repository.findById(owner.id)).rejects.toThrow(/tenant context/);
  await expect(repository.findByAccountId(mockState.accountId as never)).rejects.toThrow(/tenant context/);
  await expect(repository.delete(owner.id)).rejects.toThrow(/tenant context/);
});
