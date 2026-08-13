import { describe, it, expect, beforeEach } from 'vitest';
import type { AccountId, OwnerId, OwnerSummary } from '@cvg-his-v2/shared-types';
import { OwnersService, type OwnerRepository } from './index.js';
import { InMemoryOwnerRepository } from './repositories/in-memory-owner.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

const ACCOUNT_ID = 'acc_test' as AccountId;
const ACCOUNT_ID_2 = 'acc_other' as AccountId;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeOwner(
  overrides?: Partial<{
    fullName: string;
    documentId: string;
    financialResponsible: boolean;
    status: 'active' | 'inactive';
    administrativeNotes: string;
  }>
) {
  return {
    fullName: overrides?.fullName ?? 'Maria Silva',
    documentId: overrides?.documentId ?? '123.456.789-00',
    contacts: [
      { label: 'Celular', value: '+55 11 99999-0000', type: 'phone' as const, primary: true }
    ],
    financialResponsible: overrides?.financialResponsible ?? true,
    administrativeNotes: overrides?.administrativeNotes
  };
}

describe('OwnersService', () => {
  let service: OwnersService;

  beforeEach(() => {
    service = new OwnersService({ seedOwners: [] });
  });

  describe('create', () => {
    it('creates an owner with required fields', () => {
      const owner = service.create(ACCOUNT_ID, makeOwner());
      expect(owner.id).toMatch(UUID_PATTERN);
      expect(owner.fullName).toBe('Maria Silva');
      expect(owner.documentId).toBe('123.456.789-00');
      expect(owner.status).toBe('active');
      expect(owner.financialResponsible).toBe(true);
    });

    it('creates owner with documentId', () => {
      const owner = service.create(ACCOUNT_ID, makeOwner({ documentId: '999.999.999-99' }));
      expect(owner.documentId).toBe('999.999.999-99');
    });

    it('creates owner with financialResponsible false', () => {
      const owner = service.create(ACCOUNT_ID, makeOwner({ financialResponsible: false }));
      expect(owner.financialResponsible).toBe(false);
    });

    it('creates owner with administrativeNotes', () => {
      const owner = service.create(ACCOUNT_ID, makeOwner({ administrativeNotes: 'VIP client' }));
      expect(owner.administrativeNotes).toBe('VIP client');
    });

    it('isolates duplicate detection, reads and updates by account', () => {
      const ownerA = service.create(ACCOUNT_ID, makeOwner());
      const ownerB = service.create(ACCOUNT_ID_2, makeOwner());

      expect(service.listByAccount(ACCOUNT_ID)).toEqual([ownerA]);
      expect(service.listByAccount(ACCOUNT_ID_2)).toEqual([ownerB]);
      expect(() => service.getForAccountOrThrow(ownerA.id, ACCOUNT_ID_2)).toThrow(NotFoundError);
      expect(() => service.update(ownerA.id, { fullName: 'Cross tenant' }, ACCOUNT_ID_2)).toThrow(
        NotFoundError
      );
      expect(service.getForAccountOrThrow(ownerA.id, ACCOUNT_ID).fullName).toBe('Maria Silva');
    });

    it('creates owner with Vetus operational fields', () => {
      const owner = service.create(ACCOUNT_ID, {
        fullName: 'Cliente Vetus',
        documentId: '123.456.789-00',
        contacts: [
          { label: 'Celular', value: '+55 11 99999-1234', type: 'whatsapp', primary: true },
          { label: 'E-mail', value: 'cliente@example.com', type: 'email', primary: false }
        ],
        address: {
          zipCode: '01234-567',
          street: 'Rua Vetus',
          number: '100',
          complement: 'Sala 2',
          state: 'SP',
          city: 'Sao Paulo',
          district: 'Centro',
          reference: 'Proximo ao metro',
          cityCode: '3550308'
        },
        profile: {
          birthDate: '1988-02-03',
          sex: 'female',
          group: 'VIP',
          receiveSms: true,
          personType: 'individual',
          rg: '11.222.333-4'
        },
        financialProfile: {
          allowedDebtLimit: 250,
          creditBalance: 35.5,
          availablePoints: 120,
          blockedPoints: 15
        },
        financialResponsible: true,
        administrativeNotes: 'Cliente com cadastro Vetus completo',
        legacyVetusId: '3835',
        originalCreatedAt: '2024-05-03'
      });

      expect(owner.address).toMatchObject({ street: 'Rua Vetus', cityCode: '3550308' });
      expect(owner.profile).toMatchObject({ group: 'VIP', receiveSms: true, rg: '11.222.333-4' });
      expect(owner.financialProfile).toMatchObject({
        creditBalance: 35.5,
        availablePoints: 120,
        blockedPoints: 15
      });
      expect(owner.legacyVetusId).toBe('3835');
      expect(owner.originalCreatedAt).toBe('2024-05-03');
    });

    it('throws ValidationError when contacts are empty', () => {
      expect(() =>
        service.create(ACCOUNT_ID, {
          fullName: 'No Contact',
          contacts: [],
          financialResponsible: true
        })
      ).toThrow(ValidationError);
    });

    it('throws ConflictError for duplicate owner by name and documentId', () => {
      service.create(
        ACCOUNT_ID,
        makeOwner({ fullName: 'Duplicate', documentId: '111.111.111-11' })
      );
      expect(() =>
        service.create(
          ACCOUNT_ID,
          makeOwner({ fullName: 'Duplicate', documentId: '111.111.111-11' })
        )
      ).toThrow(ConflictError);
    });

    it('allows same name with different documentId', () => {
      service.create(
        ACCOUNT_ID,
        makeOwner({ fullName: 'Same Name', documentId: '111.111.111-11' })
      );
      expect(() =>
        service.create(
          ACCOUNT_ID,
          makeOwner({ fullName: 'Same Name', documentId: '222.222.222-22' })
        )
      ).not.toThrow();
    });
  });

  describe('list', () => {
    it('lists all owners when no search', () => {
      service.create(ACCOUNT_ID, makeOwner({ fullName: 'Owner A' }));
      service.create(ACCOUNT_ID, makeOwner({ fullName: 'Owner B' }));
      expect(service.list()).toHaveLength(2);
    });

    it('filters owners by name substring', () => {
      service.create(ACCOUNT_ID, makeOwner({ fullName: 'João Souza' }));
      service.create(ACCOUNT_ID, makeOwner({ fullName: 'Maria Santos' }));
      expect(service.list('joão')).toHaveLength(1);
      expect(service.list('joão')[0].fullName).toBe('João Souza');
    });

    it('filters owners by documentId', () => {
      service.create(
        ACCOUNT_ID,
        makeOwner({ fullName: 'Doc Owner', documentId: '555.555.555-55' })
      );
      service.create(
        ACCOUNT_ID,
        makeOwner({ fullName: 'Other Owner', documentId: '666.666.666-66' })
      );
      expect(service.list('555.555')).toHaveLength(1);
    });

    it('filters owners by unmasked document, phone, RG and internal id', () => {
      const owner = service.create(ACCOUNT_ID, {
        ...makeOwner({
          fullName: 'Wide Search Owner',
          documentId: '123.456.789-00'
        }),
        contacts: [
          { label: 'Celular', value: '+55 (11) 97777-3333', type: 'whatsapp', primary: true }
        ],
        profile: {
          rg: '11.222.333-4'
        }
      });

      expect(service.list('12345678900').map((item) => item.id)).toContain(owner.id);
      expect(service.list('11977773333').map((item) => item.id)).toContain(owner.id);
      expect(service.list('112223334').map((item) => item.id)).toContain(owner.id);
      expect(service.list(owner.id).map((item) => item.id)).toContain(owner.id);
    });

    it('filters owners by contact value', () => {
      service.create(ACCOUNT_ID, makeOwner({ fullName: 'Contact Owner' }));
      expect(service.list('99999')).toHaveLength(1);
    });

    it('filters owners by Vetus-like operational fields', () => {
      service.create(ACCOUNT_ID, {
        ...makeOwner({ fullName: 'Legacy Owner' }),
        address: { city: 'Sao Paulo', district: 'Moema' },
        profile: { group: 'Tutor VIP', receiveSms: true },
        financialProfile: { availablePoints: 200 },
        legacyVetusId: '3835'
      });

      expect(service.list('3835')).toHaveLength(1);
      expect(service.list('Tutor VIP')).toHaveLength(1);
      expect(service.list('Moema')).toHaveLength(1);
    });

    it('returns empty array for no matches', () => {
      service.create(ACCOUNT_ID, makeOwner());
      expect(service.list('xyz')).toHaveLength(0);
    });

    it('search is case insensitive', () => {
      service.create(ACCOUNT_ID, makeOwner({ fullName: 'MARIA SILVA' }));
      expect(service.list('maria')).toHaveLength(1);
    });

    it('trims search query whitespace', () => {
      service.create(ACCOUNT_ID, makeOwner({ fullName: 'Test Owner' }));
      expect(service.list('  test  ')).toHaveLength(1);
    });
  });

  describe('getOrThrow', () => {
    it('returns owner by id', () => {
      const created = service.create(ACCOUNT_ID, makeOwner());
      const found = service.getOrThrow(created.id);
      expect(found.id).toBe(created.id);
    });

    it('throws NotFoundError for non-existent id', () => {
      expect(() => service.getOrThrow('nonexistent' as OwnerId)).toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates fullName', () => {
      const created = service.create(ACCOUNT_ID, makeOwner({ fullName: 'Original' }));
      const updated = service.update(created.id, { fullName: 'Updated' });
      expect(updated.fullName).toBe('Updated');
    });

    it('updates documentId', () => {
      const created = service.create(ACCOUNT_ID, makeOwner({ documentId: '111.111.111-11' }));
      const updated = service.update(created.id, { documentId: '999.999.999-99' });
      expect(updated.documentId).toBe('999.999.999-99');
    });

    it('updates status', () => {
      const created = service.create(ACCOUNT_ID, makeOwner());
      const updated = service.update(created.id, { status: 'inactive' });
      expect(updated.status).toBe('inactive');
    });

    it('updates administrativeNotes', () => {
      const created = service.create(ACCOUNT_ID, makeOwner());
      const updated = service.update(created.id, { administrativeNotes: 'Updated notes' });
      expect(updated.administrativeNotes).toBe('Updated notes');
    });

    it('updates Vetus operational fields', () => {
      const created = service.create(ACCOUNT_ID, makeOwner());
      const updated = service.update(created.id, {
        address: {
          zipCode: '04567-000',
          street: 'Av. Atualizada',
          number: '500',
          city: 'Sao Paulo',
          state: 'SP',
          district: 'Brooklin',
          reference: 'Portaria azul',
          cityCode: '3550308'
        },
        profile: {
          group: 'Particular',
          receiveSms: true,
          personType: 'individual',
          rg: '99.888.777-6'
        },
        financialProfile: {
          allowedDebtLimit: 400,
          creditBalance: 80,
          availablePoints: 300,
          blockedPoints: 20
        },
        legacyVetusId: '220319',
        originalCreatedAt: '2024-05-03'
      });

      expect(updated.address).toMatchObject({ district: 'Brooklin', reference: 'Portaria azul' });
      expect(updated.profile).toMatchObject({ group: 'Particular', receiveSms: true });
      expect(updated.financialProfile).toMatchObject({ creditBalance: 80, availablePoints: 300 });
      expect(updated.legacyVetusId).toBe('220319');
      expect(updated.originalCreatedAt).toBe('2024-05-03');
    });

    it('preserves unchanged fields after update', () => {
      const created = service.create(
        ACCOUNT_ID,
        makeOwner({ fullName: 'Keep Me', documentId: '111.111.111-11' })
      );
      const updated = service.update(created.id, { fullName: 'Changed' });
      expect(updated.fullName).toBe('Changed');
      expect(updated.documentId).toBe('111.111.111-11');
    });

    it('throws NotFoundError when updating non-existent owner', () => {
      expect(() => service.update('nonexistent' as OwnerId, { fullName: 'New' })).toThrow(
        NotFoundError
      );
    });

    it('throws ValidationError for empty contacts on update', () => {
      const created = service.create(ACCOUNT_ID, makeOwner());
      expect(() => service.update(created.id, { contacts: [] })).toThrow(ValidationError);
    });
  });

  // Note: OwnersService does not expose a delete() method.
  // The repository.delete() exists but service layer only has create/update/list/getOrThrow.
  // Repository delete is tested in "InMemoryOwnerRepository" section.
});

describe('OwnersService with repository', () => {
  let repo: InMemoryOwnerRepository;
  let service: OwnersService;

  beforeEach(() => {
    repo = new InMemoryOwnerRepository();
    service = new OwnersService({ ownerRepository: repo, seedOwners: [] });
  });

  it('creates owner and persists to repository', async () => {
    const owner = service.create(ACCOUNT_ID, makeOwner({ fullName: 'Persisted Owner' }));
    await new Promise((r) => setTimeout(r, 10));
    const found = await repo.findById(owner.id);
    expect(found).not.toBeNull();
    expect(found?.fullName).toBe('Persisted Owner');
  });

  it('updates owner and persists to repository', async () => {
    const created = service.create(ACCOUNT_ID, makeOwner({ fullName: 'Original' }));
    service.update(created.id, { fullName: 'Repo Updated' });
    await new Promise((r) => setTimeout(r, 10));
    const found = await repo.findById(created.id);
    expect(found?.fullName).toBe('Repo Updated');
  });

  it('deletes owner via repository', async () => {
    const owner = service.create(ACCOUNT_ID, makeOwner({ documentId: '111.111.111-11' }));
    await new Promise((r) => setTimeout(r, 10));
    await repo.delete(owner.id);
    await new Promise((r) => setTimeout(r, 10));
    const found = await repo.findById(owner.id);
    expect(found).toBeNull();
  });

  it('rolls back a newly created owner from memory when repository persistence fails', async () => {
    const failingRepository: OwnerRepository = {
      async create() {
        throw new Error('database unavailable');
      },
      async update() {},
      async findById() {
        return null;
      },
      async findByAccountId() {
        return [];
      },
      async delete() {}
    };
    const failingService = new OwnersService({
      ownerRepository: failingRepository,
      seedOwners: []
    });

    const owner = failingService.create(
      ACCOUNT_ID,
      makeOwner({ fullName: 'Should Roll Back' })
    );

    await expect(failingService.waitForPersistence()).rejects.toThrow('database unavailable');
    expect(() => failingService.getOrThrow(owner.id)).toThrow(NotFoundError);
    expect(failingService.list('Should Roll Back')).toHaveLength(0);
  });
});

describe('InMemoryOwnerRepository', () => {
  let repo: InMemoryOwnerRepository;

  beforeEach(() => {
    repo = new InMemoryOwnerRepository();
  });

  async function createOwner(overrides?: {
    id?: string;
    accountId?: AccountId;
    fullName?: string;
    documentId?: string;
    status?: 'active' | 'inactive';
  }): Promise<OwnerSummary> {
    const owner: OwnerSummary = {
      id: (overrides?.id ??
        `owner_${Date.now()}_${Math.random().toString(36).slice(2)}`) as OwnerId,
      accountId: (overrides?.accountId ?? ACCOUNT_ID) as AccountId,
      fullName: overrides?.fullName ?? 'Test Owner',
      documentId: overrides?.documentId ?? '000.000.000-00',
      contacts: [{ label: 'Phone', value: '+55 11 99999-0000', type: 'phone', primary: true }],
      financialResponsible: true,
      status: (overrides?.status ?? 'active') as 'active' | 'inactive',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await repo.create(owner);
    return owner;
  }

  it('creates and retrieves an owner', async () => {
    const created = await createOwner();
    const found = await repo.findById(created.id);
    expect(found?.fullName).toBe('Test Owner');
  });

  it('returns null for non-existent id', async () => {
    const found = await repo.findById('nonexistent' as OwnerId);
    expect(found).toBeNull();
  });

  it('updates an existing owner', async () => {
    const created = await createOwner({ fullName: 'Original' });
    await repo.update({ ...created, fullName: 'Updated' });
    const found = await repo.findById(created.id);
    expect(found?.fullName).toBe('Updated');
  });

  it('throws when updating non-existent owner', async () => {
    const owner = await createOwner();
    await expect(repo.update({ ...owner, id: 'fake' as OwnerId })).rejects.toThrow(
      'Owner not found'
    );
  });

  it('deletes an owner', async () => {
    const created = await createOwner();
    await repo.delete(created.id);
    const found = await repo.findById(created.id);
    expect(found).toBeNull();
  });

  it('finds owners by accountId', async () => {
    await createOwner({ accountId: ACCOUNT_ID });
    await createOwner({ accountId: ACCOUNT_ID });
    await createOwner({ accountId: ACCOUNT_ID_2 });
    const results = await repo.findByAccountId(ACCOUNT_ID);
    expect(results).toHaveLength(2);
  });

  it('filters by search term in findByAccountId', async () => {
    await createOwner({ id: 'owner_1', fullName: 'João Silva', accountId: ACCOUNT_ID });
    await createOwner({ id: 'owner_2', fullName: 'Maria Santos', accountId: ACCOUNT_ID });
    const results = await repo.findByAccountId(ACCOUNT_ID, 'joão');
    expect(results).toHaveLength(1);
    expect(results[0].fullName).toBe('João Silva');
  });

  it('returns empty array when no matches in findByAccountId', async () => {
    await createOwner({ accountId: ACCOUNT_ID });
    const results = await repo.findByAccountId(ACCOUNT_ID, 'nonexistent');
    expect(results).toHaveLength(0);
  });

  it('clear removes all owners', async () => {
    await createOwner();
    await createOwner();
    repo.clear();
    const all = repo.getAll();
    expect(all).toHaveLength(0);
  });

  it('getAll returns all owners without filtering', async () => {
    await createOwner({ accountId: ACCOUNT_ID });
    await createOwner({ accountId: ACCOUNT_ID_2 });
    const all = repo.getAll();
    expect(all).toHaveLength(2);
  });

  it('finds owners by different accountIds separately', async () => {
    await createOwner({ id: 'acc1_owner', accountId: ACCOUNT_ID });
    await createOwner({ id: 'acc2_owner', accountId: ACCOUNT_ID_2 });
    const acc1Owners = await repo.findByAccountId(ACCOUNT_ID);
    const acc2Owners = await repo.findByAccountId(ACCOUNT_ID_2);
    expect(acc1Owners).toHaveLength(1);
    expect(acc2Owners).toHaveLength(1);
  });
});
