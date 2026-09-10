import { ValidationError } from '@cvg-his-v2/shared-errors';

const CASH_DRAWER_MUTATION_PATH =
  /^\/(?:cash-register\/(?:open|movements|close)|financeiro\/gaveta\/(?:abrir|movimentos|fechar)|finance\/drawer\/(?:open|movements|close))$/;

export function isCashDrawerMutationPath(pathname: string, method: string | undefined): boolean {
  return method === 'POST' && CASH_DRAWER_MUTATION_PATH.test(pathname);
}

export function parseIncludeArchived(value: string | null): boolean {
  if (value !== null && value !== 'true' && value !== 'false') {
    throw new ValidationError('includeArchived must be true or false');
  }
  return value === 'true';
}

export function parseListPagination(
  url: URL
): { page: number; pageSize: number } | undefined {
  if (
    !url.searchParams.has('page') &&
    !url.searchParams.has('pageSize') &&
    !url.searchParams.has('limit')
  ) {
    return undefined;
  }
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(
    url.searchParams.get('pageSize') ?? url.searchParams.get('limit') ?? '20'
  );
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new ValidationError('page must be a positive safe integer');
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ValidationError('pageSize must be an integer between 1 and 100');
  }
  return { page, pageSize };
}

export function paginateList<T>(items: readonly T[], url: URL): readonly T[] {
  const pagination = parseListPagination(url);
  return pagination
    ? items.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize
      )
    : items;
}
