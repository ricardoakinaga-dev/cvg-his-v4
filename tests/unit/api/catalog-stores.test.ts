import { afterAll, describe, expect, it } from 'vitest';

import {
  createAnimalSpeciesStore,
  createBreedStore,
  createCoatColorStore,
  createCustomerGroupStore,
  createPreventiveEventStore,
  createResponsibilityTermStore
} from '../../../apps/api/src/catalog-stores.js';

const ACCOUNT_ID = 'account-catalog-test';

const previousIncompatibleRepositoryFlag = process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS;
process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS = '1';

afterAll(() => {
  if (previousIncompatibleRepositoryFlag === undefined) {
    delete process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS;
  } else {
    process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS = previousIncompatibleRepositoryFlag;
  }
});

describe('catalog stores', () => {
  it('persists responsibility terms in memory with validation, filtering and immutable updates', async () => {
    const store = createResponsibilityTermStore();
    const term = await store.create(ACCOUNT_ID, {
      title: '  Termo de atendimento  ',
      code: ' TERM-001 ',
      content: 'Conteúdo obrigatório',
      usageContext: 'atendimento'
    });

    expect(term.title).toBe('Termo de atendimento');
    expect(term.code).toBe('TERM-001');
    expect(term.requiresOwnerSignature).toBe(true);
    expect(await store.list(ACCOUNT_ID, { search: 'term-001', active: true })).toEqual([term]);

    const updated = await store.update(term.id, {
      title: 'Termo atualizado',
      usageContext: 'internacao',
      active: false,
      requiresOwnerSignature: false,
      requiresWitnessSignature: true
    });
    expect(updated).not.toBe(term);
    expect(updated).toMatchObject({
      title: 'Termo atualizado',
      usageContext: 'internacao',
      active: false,
      requiresOwnerSignature: false,
      requiresWitnessSignature: true
    });
    expect(await store.list(ACCOUNT_ID, { usageContext: 'internacao', active: false })).toEqual([
      updated
    ]);
    expect(await store.list(ACCOUNT_ID, { usageContext: 'invalido' })).toEqual([updated]);

    await store.delete(term.id);
    await expect(store.getOrThrow(term.id)).rejects.toThrow('Responsibility term not found');
    await expect(
      store.create(ACCOUNT_ID, { title: '', content: 'x' })
    ).rejects.toThrow('title');
    await expect(
      store.create(ACCOUNT_ID, { title: 'x', content: 'y', usageContext: 'invalid' as never })
    ).rejects.toThrow('usageContext');
  });

  it('seeds breeds and supports scoped CRUD, filters and validation', async () => {
    const store = createBreedStore();
    const seeded = await store.list(ACCOUNT_ID, {});
    expect(seeded.length).toBeGreaterThanOrEqual(8);
    expect(await store.list(ACCOUNT_ID, { species: 'canine', search: 'gold' })).toHaveLength(1);
    expect(await store.list(ACCOUNT_ID, { species: 'unknown' })).toHaveLength(seeded.length);

    const breed = await store.create(ACCOUNT_ID, {
      name: '  SRD especial ',
      code: 'SRD-001',
      species: 'feline',
      description: 'Descrição',
      active: true
    });
    const updated = await store.update(breed.id, { active: false, description: null });
    expect(updated).toMatchObject({ name: 'SRD especial', active: false, description: null });
    expect(await store.list(ACCOUNT_ID, { active: false, search: 'srd' })).toEqual([updated]);

    await store.delete(breed.id);
    await expect(store.getOrThrow(breed.id)).rejects.toThrow('Breed not found');
    await expect(store.create(ACCOUNT_ID, { name: 'x', species: 'invalid' as never })).rejects.toThrow(
      'species'
    );
  });

  it('seeds animal species and supports filters, updates and validation', async () => {
    const store = createAnimalSpeciesStore();
    const seeded = await store.list(ACCOUNT_ID, { systemCode: 'canine', active: true });
    expect(seeded).toHaveLength(1);
    expect(await store.list(ACCOUNT_ID, { search: 'feline' })).toHaveLength(1);

    const species = await store.create(ACCOUNT_ID, {
      name: '  Marsupial ',
      code: 'MARSUPIAL',
      systemCode: 'other',
      description: 'Descrição',
      active: true
    });
    const updated = await store.update(species.id, {
      name: 'Marsupial atualizado',
      systemCode: 'primate',
      active: false,
      code: null,
      description: null
    });
    expect(updated).toMatchObject({
      name: 'Marsupial atualizado',
      systemCode: 'primate',
      active: false,
      code: null,
      description: null
    });
    await store.delete(species.id);
    await expect(store.getOrThrow(species.id)).rejects.toThrow('Animal species not found');
    await expect(
      store.create(ACCOUNT_ID, { name: 'x', systemCode: 'invalid' as never })
    ).rejects.toThrow('systemCode');
  });

  it('handles coat colors with normalized hex values, filters and errors', async () => {
    const store = createCoatColorStore();
    const color = await store.create(ACCOUNT_ID, {
      name: '  Chocolate ',
      code: 'CHOC-001',
      colorGroup: ' Sólida ',
      hexColor: ' #AABBCC ',
      description: 'Pelagem escura',
      active: true
    });
    expect(color).toMatchObject({
      name: 'Chocolate',
      colorGroup: 'Sólida',
      hexColor: '#AABBCC'
    });
    expect(await store.list(ACCOUNT_ID, { colorGroup: 'sólida', search: 'choc' })).toEqual([color]);

    const updated = await store.update(color.id, {
      name: 'Chocolate atualizado',
      code: null,
      colorGroup: null,
      hexColor: null,
      description: null,
      active: false
    });
    expect(updated).toMatchObject({
      name: 'Chocolate atualizado',
      code: null,
      colorGroup: null,
      hexColor: null,
      description: null,
      active: false
    });
    await expect(
      store.create(ACCOUNT_ID, { name: 'x', hexColor: '#12345' })
    ).rejects.toThrow('hexColor');
    await store.delete(color.id);
    await expect(store.getOrThrow(color.id)).rejects.toThrow('Coat color not found');
  });

  it('normalizes customer group financial fields and supports lifecycle operations', async () => {
    const store = createCustomerGroupStore();
    const group = await store.create(ACCOUNT_ID, {
      name: '  Convênio ',
      code: 'CONV-001',
      segment: ' Convênio ',
      discountPercent: '12.345',
      paymentTermDays: '30.8',
      creditLimitAmount: '1500.456',
      description: 'Grupo corporativo',
      active: true
    });
    expect(group).toMatchObject({
      name: 'Convênio',
      discountPercent: 12.35,
      paymentTermDays: 31,
      creditLimitAmount: 1500.46
    });
    expect(await store.list(ACCOUNT_ID, { segment: 'convênio', search: 'conv-001' })).toEqual([
      group
    ]);

    const updated = await store.update(group.id, {
      segment: null,
      discountPercent: 0,
      paymentTermDays: null,
      creditLimitAmount: null,
      description: null,
      active: false
    });
    expect(updated).toMatchObject({
      segment: null,
      discountPercent: 0,
      paymentTermDays: 0,
      creditLimitAmount: null,
      description: null,
      active: false
    });
    await expect(
      store.create(ACCOUNT_ID, { name: 'x', discountPercent: 101 })
    ).rejects.toThrow('discountPercent');
    await expect(
      store.create(ACCOUNT_ID, { name: 'x', creditLimitAmount: -1 })
    ).rejects.toThrow('creditLimitAmount');
    await store.delete(group.id);
    await expect(store.getOrThrow(group.id)).rejects.toThrow('Customer group not found');
  });

  it('executes preventive events, reschedules them and prepares reminder emails', async () => {
    const store = createPreventiveEventStore();
    const scheduled = await store.create(ACCOUNT_ID, {
      patientId: 'patient-1',
      ownerId: 'owner-1',
      clientName: '  Maria Silva ',
      animalName: '  Luna ',
      eventDate: '2026-09-10',
      itemType: 'vaccine',
      description: 'Vacina anual',
      observation: 'Observar reação'
    });
    const executed = await store.create(ACCOUNT_ID, {
      clientName: 'João',
      animalName: 'Thor',
      eventDate: '2026-09-11',
      itemType: 'dewormer',
      description: 'Vermífugo',
      status: 'executed'
    });

    expect(await store.list(ACCOUNT_ID, {})).toEqual([scheduled]);
    expect(
      await store.list(ACCOUNT_ID, {
        includeExecuted: true,
        dateFrom: '2026-09-10',
        dateTo: '2026-09-11',
        client: 'maria',
        animal: 'luna',
        patientId: 'patient-1',
        ownerId: 'owner-1',
        itemType: 'vaccine'
      })
    ).toEqual([scheduled]);

    const updated = await store.update(scheduled.id, {
      clientName: 'Maria Atualizada',
      animalName: 'Luna Atualizada',
      eventDate: '2026-09-12',
      itemType: 'other',
      description: 'Outro cuidado',
      observation: null,
      patientId: null,
      ownerId: null,
      status: 'scheduled'
    });
    expect(updated).toMatchObject({
      clientName: 'Maria Atualizada',
      animalName: 'Luna Atualizada',
      eventDate: '2026-09-12',
      itemType: 'other',
      observation: null
    });

    const execution = await store.execute(updated.id, { observation: 'Aplicado', rescheduleTo: null });
    expect(execution.event).toMatchObject({ status: 'executed', executedObservation: 'Aplicado' });
    expect(execution.rescheduledEvent).toBeNull();

    const rescheduled = await store.execute(executed.id, {
      observation: null,
      rescheduleTo: '2026-10-11'
    });
    expect(rescheduled.rescheduledEvent).toMatchObject({
      status: 'scheduled',
      eventDate: '2026-10-11',
      rescheduledFromId: executed.id
    });

    await expect(store.prepareEmail(executed.id)).resolves.toMatchObject({
      reminderEmailPreparedAt: expect.any(String)
    });
    const bulk = await store.prepareBulkEmail(ACCOUNT_ID, { includeExecuted: false });
    expect(bulk.preparedCount).toBe(1);
    expect((await store.getOrThrow(rescheduled.rescheduledEvent!.id)).reminderEmailPreparedAt).toBe(
      bulk.preparedAt
    );

    await expect(
      store.create(ACCOUNT_ID, {
        clientName: 'x',
        animalName: 'y',
        eventDate: '2026-02-31',
        description: 'z'
      })
    ).rejects.toThrow('eventDate');
    await expect(
      store.create(ACCOUNT_ID, {
        clientName: 'x',
        animalName: 'y',
        eventDate: '2026-09-01',
        description: 'z',
        itemType: 'invalid' as never,
        status: 'invalid' as never
      })
    ).rejects.toThrow('itemType');
    await store.delete(rescheduled.rescheduledEvent!.id);
    await expect(store.getOrThrow(rescheduled.rescheduledEvent!.id)).rejects.toThrow(
      'Preventive event not found'
    );
  });

  it('covers default values and optional normalization paths across catalog repositories', async () => {
    const responsibilityTerms = createResponsibilityTermStore();
    const term = await responsibilityTerms.create(ACCOUNT_ID, {
      title: 'Termo padrão',
      content: 'Conteúdo padrão'
    });
    expect(term).toMatchObject({
      code: null,
      usageContext: 'atendimento',
      active: true,
      requiresOwnerSignature: true,
      requiresWitnessSignature: false
    });
    await responsibilityTerms.update(term.id, {});
    await expect(
      responsibilityTerms.create(ACCOUNT_ID, {
        title: 'x'.repeat(161),
        content: 'y'
      })
    ).rejects.toThrow('title');
    await expect(
      responsibilityTerms.create(ACCOUNT_ID, {
        title: 'x',
        code: 'x'.repeat(81),
        content: 'y'
      })
    ).rejects.toThrow('code');
    await expect(
      responsibilityTerms.create(ACCOUNT_ID, {
        title: 'x',
        content: 'x'.repeat(20_001)
      })
    ).rejects.toThrow('content');

    const breeds = createBreedStore();
    const breed = await breeds.create(ACCOUNT_ID, { name: 'Raça padrão' });
    expect(breed).toMatchObject({ species: 'canine', code: null, description: null, active: true });
    await breeds.update(breed.id, {});
    await expect(breeds.create(ACCOUNT_ID, { name: 'x', code: 'x'.repeat(81) })).rejects.toThrow(
      'code'
    );
    await expect(
      breeds.create(ACCOUNT_ID, { name: 'x', description: 'x'.repeat(1001) })
    ).rejects.toThrow('description');

    const speciesStore = createAnimalSpeciesStore();
    const species = await speciesStore.create(ACCOUNT_ID, { name: 'Espécie padrão' });
    expect(species).toMatchObject({ systemCode: 'other', code: null, description: null, active: true });
    await speciesStore.update(species.id, {});
    await expect(
      speciesStore.create(ACCOUNT_ID, { name: 'x', code: 'x'.repeat(81) })
    ).rejects.toThrow('code');
    await expect(
      speciesStore.create(ACCOUNT_ID, { name: 'x', description: 'x'.repeat(1001) })
    ).rejects.toThrow('description');

    const coatColors = createCoatColorStore();
    const coatColor = await coatColors.create(ACCOUNT_ID, { name: 'Cor padrão' });
    expect(coatColor).toMatchObject({
      code: null,
      colorGroup: null,
      hexColor: null,
      description: null,
      active: true
    });
    await coatColors.update(coatColor.id, {});

    const customerGroups = createCustomerGroupStore();
    const customerGroup = await customerGroups.create(ACCOUNT_ID, { name: 'Grupo padrão' });
    expect(customerGroup).toMatchObject({
      code: null,
      segment: null,
      discountPercent: 0,
      paymentTermDays: 0,
      creditLimitAmount: null,
      description: null,
      active: true
    });
    await customerGroups.update(customerGroup.id, {});

    const preventiveEvents = createPreventiveEventStore();
    const preventiveEvent = await preventiveEvents.create(ACCOUNT_ID, {
      clientName: 'Cliente padrão',
      animalName: 'Animal padrão',
      eventDate: '2026-12-01',
      description: 'Evento padrão'
    });
    expect(preventiveEvent).toMatchObject({
      patientId: null,
      ownerId: null,
      itemType: 'vaccine',
      status: 'scheduled',
      observation: null
    });
    await preventiveEvents.update(preventiveEvent.id, {});
    await expect(
      preventiveEvents.create(ACCOUNT_ID, {
        clientName: 'x'.repeat(161),
        animalName: 'y',
        eventDate: '2026-12-01',
        description: 'z'
      })
    ).rejects.toThrow('clientName');
    await expect(
      preventiveEvents.create(ACCOUNT_ID, {
        clientName: 'x',
        animalName: 'y',
        eventDate: '2026-12-01',
        description: 'z'.repeat(256)
      })
    ).rejects.toThrow('description');
  });

  it('fails fast when a production-like catalog repository is unavailable', () => {
    expect(() => createResponsibilityTermStore({ allowInMemoryFallback: false })).toThrow(
      /database repository is unavailable/
    );
    expect(() => createBreedStore({ allowInMemoryFallback: false })).toThrow(
      /database repository is unavailable/
    );
    expect(() => createAnimalSpeciesStore({ allowInMemoryFallback: false })).toThrow(
      /database repository is unavailable/
    );
    expect(() => createCoatColorStore({ allowInMemoryFallback: false })).toThrow(
      /database repository is unavailable/
    );
    expect(() => createCustomerGroupStore({ allowInMemoryFallback: false })).toThrow(
      /database repository is unavailable/
    );
    expect(() => createPreventiveEventStore({ allowInMemoryFallback: false })).toThrow(
      /database repository/
    );
  });
});
