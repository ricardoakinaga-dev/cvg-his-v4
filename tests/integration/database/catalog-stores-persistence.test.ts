import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import {
  createAnimalSpeciesStore,
  createBreedStore,
  createCoatColorStore,
  createCustomerGroupStore,
  createPreventiveEventStore,
  createResponsibilityTermStore
} from '../../../apps/api/src/catalog-stores.ts';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '../../../packages/shared/database/src/index.ts';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../../setup/env.ts';

const tenantId = randomUUID();
const accountId = randomUUID();
const otherAccountId = randomUUID();
const previousDisabledRepositories = process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS;

function inCatalogTenant<T>(operation: () => T): T {
  return runWithTenantContext({ tenantId, accountId }, operation);
}

describe('catalog stores PostgreSQL persistence', () => {
  beforeAll(async () => {
    delete process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS;
    await closeDatabaseClient();

    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query(
        `INSERT INTO tenants (id, slug, name, status)
         VALUES ($1, $2, 'Catalog persistence tenant', 'active')`,
        [tenantId, `catalog-persistence-${process.pid}`]
      );
      await admin.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $3, $4, 'Catalog persistence account'),
                ($2, $3, $5, 'Other catalog account')`,
        [
          accountId,
          otherAccountId,
          tenantId,
          `catalog-account-${process.pid}`,
          `catalog-other-${process.pid}`
        ]
      );
    } finally {
      await admin.end();
    }

    createDatabaseClient(TEST_DB_URL);
  });

  afterAll(async () => {
    await closeDatabaseClient();
    if (previousDisabledRepositories === undefined) {
      delete process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS;
    } else {
      process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS = previousDisabledRepositories;
    }
  });

  it('persists responsibility terms with tenant-scoped filters and immutable updates', async () => {
    await inCatalogTenant(async () => {
      const store = createResponsibilityTermStore({ allowInMemoryFallback: false });
      const created = await store.create(accountId, {
        title: 'Termo cirúrgico',
        code: 'TERM-DB-001',
        usageContext: 'procedimento',
        content: 'Consentimento informado para procedimento.',
        requiresWitnessSignature: true
      });

      expect(await store.getOrThrow(created.id)).toEqual(created);
      expect(await store.list(accountId, {
        active: true,
        usageContext: 'procedimento',
        search: 'DB-001'
      })).toEqual([created]);
      expect(await store.list(otherAccountId, {})).toEqual([]);

      const updated = await store.update(created.id, {
        title: 'Termo cirúrgico revisado',
        code: null,
        usageContext: 'autorizacao',
        content: 'Consentimento revisado.',
        active: false,
        requiresOwnerSignature: false,
        requiresWitnessSignature: false
      });
      expect(updated).not.toBe(created);
      expect(updated).toMatchObject({
        title: 'Termo cirúrgico revisado',
        code: null,
        usageContext: 'autorizacao',
        active: false
      });

      await store.delete(created.id);
      await expect(store.getOrThrow(created.id)).rejects.toThrow('Responsibility term not found');
    });
  });

  it('materializes breed seed data and persists the full breed lifecycle', async () => {
    await inCatalogTenant(async () => {
      const store = createBreedStore({ allowInMemoryFallback: false });
      const seeded = await store.list(accountId, { species: 'canine', active: true });
      expect(seeded.length).toBeGreaterThan(0);

      const created = await store.create(accountId, {
        name: 'Raça de integração',
        code: 'BREED-DB-001',
        species: 'feline',
        description: 'Persistida no PostgreSQL'
      });
      expect(await store.getOrThrow(created.id)).toEqual(created);
      expect(await store.list(accountId, {
        active: true,
        species: 'feline',
        search: 'integração'
      })).toContainEqual(created);

      const updated = await store.update(created.id, {
        name: 'Raça de integração revisada',
        code: null,
        species: 'other',
        description: null,
        active: false
      });
      expect(updated).toMatchObject({ code: null, species: 'other', description: null, active: false });
      await store.delete(created.id);
      await expect(store.getOrThrow(created.id)).rejects.toThrow('Breed not found');
    });
  });

  it('materializes species seed data and persists species updates', async () => {
    await inCatalogTenant(async () => {
      const store = createAnimalSpeciesStore({ allowInMemoryFallback: false });
      expect(await store.list(accountId, { systemCode: 'canine', active: true })).toHaveLength(1);

      const created = await store.create(accountId, {
        name: 'Espécie de integração',
        code: 'SPECIES-DB-001',
        systemCode: 'primate',
        description: 'Persistida no PostgreSQL'
      });
      expect(await store.list(accountId, { search: 'SPECIES-DB-001' })).toEqual([created]);
      const updated = await store.update(created.id, {
        name: 'Espécie revisada',
        code: null,
        systemCode: 'other',
        description: null,
        active: false
      });
      expect(updated).toMatchObject({ systemCode: 'other', active: false });
      await store.delete(created.id);
      await expect(store.getOrThrow(created.id)).rejects.toThrow('Animal species not found');
    });
  });

  it('persists coat colors and customer financial groups without crossing accounts', async () => {
    await inCatalogTenant(async () => {
      const colors = createCoatColorStore({ allowInMemoryFallback: false });
      const color = await colors.create(accountId, {
        name: 'Chocolate DB',
        code: 'COLOR-DB-001',
        colorGroup: 'Sólida',
        hexColor: '#AABBCC',
        description: 'Cor persistida'
      });
      expect(await colors.list(accountId, {
        active: true,
        colorGroup: 'sólida',
        search: 'COLOR-DB'
      })).toEqual([color]);
      expect(await colors.list(otherAccountId, {})).toEqual([]);
      const updatedColor = await colors.update(color.id, {
        code: null,
        colorGroup: null,
        hexColor: null,
        description: null,
        active: false
      });
      expect(updatedColor).toMatchObject({ code: null, colorGroup: null, hexColor: null, active: false });
      await colors.delete(color.id);
      await expect(colors.getOrThrow(color.id)).rejects.toThrow('Coat color not found');

      const groups = createCustomerGroupStore({ allowInMemoryFallback: false });
      const group = await groups.create(accountId, {
        name: 'Convênio DB',
        code: 'GROUP-DB-001',
        segment: 'Corporativo',
        discountPercent: 12.5,
        paymentTermDays: 30,
        creditLimitAmount: 1500.45,
        description: 'Grupo persistido'
      });
      expect(await groups.list(accountId, {
        active: true,
        segment: 'corporativo',
        search: 'GROUP-DB'
      })).toEqual([group]);
      const updatedGroup = await groups.update(group.id, {
        code: null,
        segment: null,
        discountPercent: 0,
        paymentTermDays: null,
        creditLimitAmount: null,
        description: null,
        active: false
      });
      expect(updatedGroup).toMatchObject({
        code: null,
        segment: null,
        discountPercent: 0,
        paymentTermDays: 0,
        creditLimitAmount: null,
        active: false
      });
      await groups.delete(group.id);
      await expect(groups.getOrThrow(group.id)).rejects.toThrow('Customer group not found');
    });
  });

  it('persists preventive execution, rescheduling and reminder preparation atomically', async () => {
    await inCatalogTenant(async () => {
      const store = createPreventiveEventStore({ allowInMemoryFallback: false });
      const created = await store.create(accountId, {
        clientName: 'Maria DB',
        animalName: 'Luna DB',
        eventDate: '2026-09-10',
        itemType: 'vaccine',
        description: 'Vacina anual',
        observation: 'Avisar tutora'
      });
      expect(await store.getOrThrow(created.id)).toEqual(created);
      expect(await store.list(accountId, {
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        itemType: 'vaccine',
        client: 'maria',
        animal: 'luna'
      })).toEqual([created]);

      const updated = await store.update(created.id, {
        clientName: 'Maria revisada',
        animalName: 'Luna revisada',
        eventDate: '2026-09-11',
        itemType: 'other',
        description: 'Cuidado anual',
        observation: null
      });
      const execution = await store.execute(updated.id, {
        observation: 'Executado sem intercorrência',
        rescheduleTo: '2027-09-11'
      });
      expect(execution.event).toMatchObject({ status: 'executed' });
      expect(execution.rescheduledEvent).toMatchObject({
        status: 'scheduled',
        eventDate: '2027-09-11',
        rescheduledFromId: updated.id
      });

      const rescheduledId = execution.rescheduledEvent!.id;
      expect(await store.prepareEmail(rescheduledId)).toMatchObject({
        reminderEmailPreparedAt: expect.any(String)
      });
      const bulk = await store.prepareBulkEmail(accountId, { includeExecuted: false });
      expect(bulk.preparedCount).toBeGreaterThanOrEqual(1);
      expect(await store.list(accountId, { includeExecuted: false })).toContainEqual(
        expect.objectContaining({ id: rescheduledId })
      );

      await store.delete(created.id);
      await store.delete(rescheduledId);
      await expect(store.getOrThrow(rescheduledId)).rejects.toThrow('Preventive event not found');
    });
  });
});
