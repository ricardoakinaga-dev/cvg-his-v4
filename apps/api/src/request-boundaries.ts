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
