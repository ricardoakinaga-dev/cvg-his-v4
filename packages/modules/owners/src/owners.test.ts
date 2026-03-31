import { describe, it, expect, beforeEach } from 'vitest';
import { OwnersService } from './index.js';
import type { AccountId, OwnerId } from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;

describe('OwnersService', () => {
  let service: OwnersService;

  beforeEach(() => {
    service = new OwnersService({ seedOwners: [] });
  });

  it('should create an owner', () => {
    const owner = service.create(ACCOUNT_ID, {
      fullName: 'Maria Silva',
      documentId: '123.456.789-00',
      contacts: [{ label: 'Celular', value: '+55 11 99999-0000', type: 'phone', primary: true }],
      financialResponsible: true
    });
    expect(owner.fullName).toBe('Maria Silva');
    expect(owner.documentId).toBe('123.456.789-00');
    expect(owner.status).toBe('active');
    expect(owner.contacts.length).toBe(1);
  });

  it('should list owners', () => {
    service.create(ACCOUNT_ID, {
      fullName: 'Owner 1',
      contacts: [{ label: 'Phone', value: '111', type: 'phone', primary: true }],
      financialResponsible: true
    });
    service.create(ACCOUNT_ID, {
      fullName: 'Owner 2',
      contacts: [{ label: 'Phone', value: '222', type: 'phone', primary: true }],
      financialResponsible: false
    });
    expect(service.list().length).toBe(2);
  });

  it('should search owners by name', () => {
    service.create(ACCOUNT_ID, {
      fullName: 'João Souza',
      contacts: [{ label: 'Phone', value: '111', type: 'phone', primary: true }],
      financialResponsible: true
    });
    service.create(ACCOUNT_ID, {
      fullName: 'Maria Santos',
      contacts: [{ label: 'Phone', value: '222', type: 'phone', primary: true }],
      financialResponsible: true
    });
    expect(service.list('joão').length).toBe(1);
    expect(service.list('maria').length).toBe(1);
    expect(service.list('xyz').length).toBe(0);
  });

  it('should get owner by id', () => {
    const created = service.create(ACCOUNT_ID, {
      fullName: 'Test',
      contacts: [{ label: 'Phone', value: '111', type: 'phone', primary: true }],
      financialResponsible: true
    });
    const found = service.getOrThrow(created.id);
    expect(found.id).toBe(created.id);
  });

  it('should throw NotFoundError for missing owner', () => {
    expect(() => service.getOrThrow('missing' as OwnerId)).toThrow();
  });

  it('should update an owner', () => {
    const created = service.create(ACCOUNT_ID, {
      fullName: 'Original',
      contacts: [{ label: 'Phone', value: '111', type: 'phone', primary: true }],
      financialResponsible: true
    });
    const updated = service.update(created.id, { fullName: 'Updated' });
    expect(updated.fullName).toBe('Updated');
    expect(updated.contacts).toEqual(created.contacts);
  });

  it('should validate contacts on create', () => {
    expect(() =>
      service.create(ACCOUNT_ID, {
        fullName: 'No Contact',
        contacts: [],
        financialResponsible: true
      })
    ).toThrow();
  });

  it('should detect duplicate owners', () => {
    service.create(ACCOUNT_ID, {
      fullName: 'Duplicate',
      documentId: '111.111.111-11',
      contacts: [{ label: 'Phone', value: '111', type: 'phone', primary: true }],
      financialResponsible: true
    });
    expect(() =>
      service.create(ACCOUNT_ID, {
        fullName: 'Duplicate',
        documentId: '111.111.111-11',
        contacts: [{ label: 'Phone', value: '222', type: 'phone', primary: true }],
        financialResponsible: true
      })
    ).toThrow();
  });
});
