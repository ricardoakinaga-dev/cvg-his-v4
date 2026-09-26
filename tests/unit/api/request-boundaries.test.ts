import { describe, expect, it } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import {
  isCashDrawerMutationPath,
  paginateList,
  parseIncludeArchived,
  parseListPagination,
  parsePatientListStatus
} from '../../../apps/api/src/request-boundaries.ts';

describe('list pagination request boundary', () => {
  it('keeps unpaginated requests unchanged and applies canonical bounds', () => {
    const items = ['one', 'two', 'three'];
    const url = new URL('http://localhost/items?page=2&pageSize=1');

    expect(parseListPagination(url)).toEqual({ page: 2, pageSize: 1 });
    expect(paginateList(items, url)).toEqual(['two']);
    expect(paginateList(items, new URL('http://localhost/items'))).toBe(items);
  });

  it('accepts the legacy limit alias', () => {
    expect(parseListPagination(new URL('http://localhost/items?limit=2'))).toEqual({
      page: 1,
      pageSize: 2
    });
  });

  it('rejects invalid page and pageSize values', () => {
    expect(() => parseListPagination(new URL('http://localhost/items?page=0'))).toThrow(
      ValidationError
    );
    expect(() => parseListPagination(new URL('http://localhost/items?page=1.5'))).toThrow(
      ValidationError
    );
    expect(() => parseListPagination(new URL('http://localhost/items?pageSize=201'))).toThrow(
      ValidationError
    );
    expect(() => parseListPagination(new URL('http://localhost/items?pageSize=0'))).toThrow(
      ValidationError
    );
    expect(() => parseListPagination(new URL('http://localhost/items?limit=abc'))).toThrow(
      ValidationError
    );
  });

  it('parses includeArchived and patient status flags', () => {
    expect(parseIncludeArchived(null)).toBe(false);
    expect(parseIncludeArchived('true')).toBe(true);
    expect(parseIncludeArchived('false')).toBe(false);
    expect(() => parseIncludeArchived('yes')).toThrow(ValidationError);

    expect(parsePatientListStatus(null)).toBeUndefined();
    expect(parsePatientListStatus('active')).toBe('active');
    expect(parsePatientListStatus('inactive')).toBe('inactive');
    expect(parsePatientListStatus('deceased')).toBe('deceased');
    expect(() => parsePatientListStatus('unknown')).toThrow(ValidationError);
  });

  it('detects cash drawer mutation paths for POST only', () => {
    expect(isCashDrawerMutationPath('/cash-register/open', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/cash-register/movements', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/cash-register/close', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/financeiro/gaveta/abrir', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/financeiro/gaveta/movimentos', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/financeiro/gaveta/fechar', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/finance/drawer/open', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/finance/drawer/movements', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/finance/drawer/close', 'POST')).toBe(true);
    expect(isCashDrawerMutationPath('/cash-register/open', 'GET')).toBe(false);
    expect(isCashDrawerMutationPath('/cash-register/other', 'POST')).toBe(false);
  });

  it('slices lists across pages', () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginateList(items, new URL('http://localhost/i?page=2&pageSize=2'))).toEqual([3, 4]);
    expect(paginateList(items, new URL('http://localhost/i?page=3&pageSize=2'))).toEqual([5]);
    expect(paginateList(items, new URL('http://localhost/i?page=9&pageSize=2'))).toEqual([]);
  });
});
