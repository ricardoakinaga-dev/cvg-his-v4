import { describe, expect, it } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import { paginateList, parseListPagination } from '../../../apps/api/src/request-boundaries.ts';

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
    expect(() => parseListPagination(new URL('http://localhost/items?pageSize=101'))).toThrow(
      ValidationError
    );
  });
});
