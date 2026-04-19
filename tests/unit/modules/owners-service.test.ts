import { describe, expect, it } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import { OwnersService } from '../../../packages/modules/owners/src/index.js';

describe('OwnersService coverage guard', () => {
  it('ships with seeded owners and searchable contacts', () => {
    const service = new OwnersService();

    const owners = service.list();
    expect(owners.length).toBeGreaterThanOrEqual(2);
    expect(service.list('111.111')).toHaveLength(1);
    expect(service.list('99999-1111')).toHaveLength(1);
  });

  it('auto-assigns primary contact on create and update', () => {
    const service = new OwnersService({ seedOwners: [] });

    const created = service.create('acc_test' as never, {
      fullName: 'Tutor Primario',
      documentId: '123.456.789-00',
      contacts: [
        { label: 'WhatsApp', value: '+55 11 99999-0001', type: 'whatsapp' },
        { label: 'Email', value: 'tutor@example.com', type: 'email' }
      ],
      financialResponsible: true
    });

    expect(created.contacts[0]?.primary).toBe(true);
    expect(created.contacts.some((contact) => contact.primary)).toBe(true);

    const updated = service.update(created.id, {
      contacts: [
        { label: 'Telefone', value: '+55 11 99999-9999', type: 'phone' },
        { label: 'Email', value: 'novo@example.com', type: 'email', primary: false }
      ]
    });

    expect(updated.contacts[0]?.primary).toBe(true);
    expect(updated.contacts.some((contact) => contact.primary)).toBe(true);
  });

  it('rejects contact collections without any primary contact', () => {
    const service = new OwnersService({ seedOwners: [] });

    expect(() =>
      service.create('acc_test' as never, {
        fullName: 'Tutor Invalido',
        documentId: '123.456.789-00',
        contacts: [
          { label: 'Telefone', value: '+55 11 98888-0000', type: 'phone', primary: false },
          { label: 'Email', value: 'invalid@example.com', type: 'email', primary: false }
        ],
        financialResponsible: true
      })
    ).toThrow(ValidationError);
  });

  it('hydrates owners from repository for the requested account', async () => {
    const service = new OwnersService({
      seedOwners: [],
      ownerRepository: {
        async create() {},
        async update() {},
        async findById() {
          return null;
        },
        async delete() {},
        async findByAccountId(accountId) {
          return [
            {
              id: `owner_${accountId}` as never,
              accountId,
              fullName: 'Repositorio Tutor',
              documentId: '999.999.999-99',
              contacts: [
                {
                  label: 'Telefone',
                  value: '+55 11 97777-0000',
                  type: 'phone',
                  primary: true
                }
              ],
              financialResponsible: false,
              administrativeNotes: 'carregado do repo',
              status: 'active',
              createdAt: '2026-04-18T10:00:00.000Z',
              updatedAt: '2026-04-18T10:00:00.000Z'
            }
          ];
        }
      }
    });

    await service.hydrateFromDatabase('acc_repo' as never);

    const listed = service.list('Repositorio');
    expect(listed).toHaveLength(1);
    expect(listed[0]?.accountId).toBe('acc_repo');
    expect(service.getOrThrow(listed[0]!.id).administrativeNotes).toBe('carregado do repo');
  });
});
