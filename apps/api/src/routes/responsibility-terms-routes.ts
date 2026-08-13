import type { IncomingMessage, ServerResponse } from 'node:http';

import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import {
  createResponsibilityTermStore,
  type ResponsibilityTermInput
} from '../catalog-stores.js';
import { readJsonBody } from '../helpers/common.js';
import type { AppendAudit, RequirePrincipal } from './route-handler-types.js';

export interface ResponsibilityTermsRoutesHandlers {
  responsibilityTerms: ReturnType<typeof createResponsibilityTermStore>;
  requirePrincipal: RequirePrincipal;
  appendAudit: AppendAudit;
}

export async function handleResponsibilityTermsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ResponsibilityTermsRoutesHandlers
): Promise<boolean> {
  if (pathname !== '/responsibility-terms' && !pathname.startsWith('/responsibility-terms/')) {
    return false;
  }

  const { responsibilityTerms, requirePrincipal, appendAudit } = handlers;
  const url = new URL(request.url ?? pathname, 'http://localhost');

if (pathname === '/responsibility-terms' && request.method === 'GET') {
  const principal = requirePrincipal(request, 'service.read');
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
  const principal = requirePrincipal(request, 'service.write');
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

if (pathname.startsWith('/responsibility-terms/') && request.method === 'GET') {
  const principal = requirePrincipal(request, 'service.read');
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

if (pathname.startsWith('/responsibility-terms/') && request.method === 'PATCH') {
  const principal = requirePrincipal(request, 'service.write');
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

if (pathname.startsWith('/responsibility-terms/') && request.method === 'DELETE') {
  const principal = requirePrincipal(request, 'service.write');
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

