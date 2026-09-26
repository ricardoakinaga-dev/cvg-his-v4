import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { readJsonBody } from '../helpers/request-body.js';
import { matchesCollectionItemPath } from './resource-route-path.js';
import type {
  createResponsibilityTermStore,
  ResponsibilityTermInput
} from '../repositories/responsibility-term-store.js';

export interface ResponsibilityTermRoutesHandlers {
  readonly responsibilityTerms: ReturnType<typeof createResponsibilityTermStore>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly appendAudit: (
    actorId: string,
    accountId: string,
    module: string,
    action: string,
    entityType: string,
    entityId: string,
    payloadSummary: string,
    riskLevel: 'low' | 'medium' | 'high',
    correlationId: string
  ) => void;
}

export async function handleResponsibilityTermRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ResponsibilityTermRoutesHandlers
): Promise<boolean> {
  const { responsibilityTerms, requirePrincipal, appendAudit } = handlers;
  if (pathname === '/responsibility-terms' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const search = url.searchParams.get('search') ?? undefined;
    const activeParam = url.searchParams.get('active');
    const usageContext = url.searchParams.get('usageContext') ?? undefined;
    const active = activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
    const items = await responsibilityTerms.list(principal.user.accountId, {
      search,
      active,
      usageContext
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'responsibility-terms',
      'list',
      'responsibility-term',
      search ?? 'all',
      'Responsibility terms inspected',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/responsibility-terms' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request)) as ResponsibilityTermInput;
    const term = await responsibilityTerms.create(principal.user.accountId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'responsibility-terms',
      'create',
      'responsibility-term',
      term.id,
      `Responsibility term ${term.title} created`,
      'high',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(term));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/responsibility-terms') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const termId = requireNonEmptyString(pathname.split('/')[2], 'termId');
    const term = await responsibilityTerms.getOrThrow(termId);
    if (term.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Responsibility term not found for current account');
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'responsibility-terms',
      'read',
      'responsibility-term',
      term.id,
      `Responsibility term ${term.title} inspected`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(term));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/responsibility-terms') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'service.write');
    const termId = requireNonEmptyString(pathname.split('/')[2], 'termId');
    const existingTerm = await responsibilityTerms.getOrThrow(termId);
    if (existingTerm.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Responsibility term not found for current account');
    }
    const payload = (await readJsonBody(request)) as ResponsibilityTermInput;
    const term = await responsibilityTerms.update(termId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'responsibility-terms',
      'update',
      'responsibility-term',
      term.id,
      `Responsibility term ${term.title} updated`,
      'high',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(term));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/responsibility-terms') && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'service.write');
    const termId = requireNonEmptyString(pathname.split('/')[2], 'termId');
    const existingTerm = await responsibilityTerms.getOrThrow(termId);
    if (existingTerm.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Responsibility term not found for current account');
    }
    await responsibilityTerms.delete(termId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'responsibility-terms',
      'delete',
      'responsibility-term',
      termId,
      `Responsibility term ${existingTerm.title} deleted`,
      'high',
      correlationId
    );
    response.statusCode = 204;
    response.end();
    return true;
  }
  return false;
}
