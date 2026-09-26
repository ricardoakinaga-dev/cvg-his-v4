import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { readJsonBody } from '../helpers/request-body.js';
import {
  matchesCollectionItemActionPath,
  matchesCollectionItemPath
} from './resource-route-path.js';
import type {
  createPreventiveEventStore,
  PreventiveEventExecuteInput,
  PreventiveEventInput,
  PreventiveEventListFilters
} from '../repositories/preventive-event-store.js';

export interface PreventiveEventRoutesHandlers {
  readonly preventiveEvents: ReturnType<typeof createPreventiveEventStore>;
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

export async function handlePreventiveEventRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PreventiveEventRoutesHandlers
): Promise<boolean> {
  const { preventiveEvents, requirePrincipal, appendAudit } = handlers;
  if (pathname === '/vaccines-dewormers' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const includeExecutedParam = url.searchParams.get('includeExecuted');
    const filters: PreventiveEventListFilters = {
      dateFrom: url.searchParams.get('dateFrom') ?? undefined,
      dateTo: url.searchParams.get('dateTo') ?? undefined,
      client: url.searchParams.get('client') ?? undefined,
      animal: url.searchParams.get('animal') ?? undefined,
      patientId: url.searchParams.get('patientId') ?? undefined,
      ownerId: url.searchParams.get('ownerId') ?? undefined,
      itemType: url.searchParams.get('itemType') ?? undefined,
      includeExecuted: includeExecutedParam?.toLowerCase() === 'true'
    };
    const items = await preventiveEvents.list(principal.user.accountId, filters);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'list',
      'preventive-event',
      filters.patientId ??
        filters.ownerId ??
        filters.client ??
        filters.animal ??
        filters.itemType ??
        'all',
      'Preventive events inspected',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/vaccines-dewormers' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request)) as PreventiveEventInput;
    const event = await preventiveEvents.create(principal.user.accountId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'create',
      'preventive-event',
      event.id,
      `Preventive event ${event.description} created`,
      'medium',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(event));
    return true;
  }

  if (pathname === '/vaccines-dewormers/reminders/email' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request).catch(() => ({}))) as PreventiveEventListFilters;
    const result = await preventiveEvents.prepareBulkEmail(principal.user.accountId, {
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
      client: payload.client,
      animal: payload.animal,
      patientId: payload.patientId,
      ownerId: payload.ownerId,
      itemType: payload.itemType,
      includeExecuted: false
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'prepare-email',
      'preventive-event',
      'bulk',
      `Preventive reminder emails prepared for ${result.preparedCount} event(s)`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(result));
    return true;
  }

  if (
    matchesCollectionItemActionPath(pathname, '/vaccines-dewormers', 'execute') &&
    request.method === 'POST'
  ) {
    const principal = await requirePrincipal(request, 'service.write');
    const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
    const existingEvent = await preventiveEvents.getOrThrow(eventId);
    if (existingEvent.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Preventive event not found for current account');
    }
    const payload = (await readJsonBody(request)) as PreventiveEventExecuteInput;
    const result = await preventiveEvents.execute(eventId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'execute',
      'preventive-event',
      eventId,
      `Preventive event ${existingEvent.description} executed`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(result));
    return true;
  }

  if (
    matchesCollectionItemActionPath(pathname, '/vaccines-dewormers', 'email') &&
    request.method === 'POST'
  ) {
    const principal = await requirePrincipal(request, 'service.write');
    const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
    const existingEvent = await preventiveEvents.getOrThrow(eventId);
    if (existingEvent.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Preventive event not found for current account');
    }
    const event = await preventiveEvents.prepareEmail(eventId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'prepare-email',
      'preventive-event',
      event.id,
      `Preventive reminder email prepared for ${event.description}`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(event));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/vaccines-dewormers') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
    const event = await preventiveEvents.getOrThrow(eventId);
    if (event.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Preventive event not found for current account');
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'read',
      'preventive-event',
      event.id,
      `Preventive event ${event.description} inspected`,
      'low',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(event));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/vaccines-dewormers') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'service.write');
    const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
    const existingEvent = await preventiveEvents.getOrThrow(eventId);
    if (existingEvent.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Preventive event not found for current account');
    }
    const payload = (await readJsonBody(request)) as PreventiveEventInput;
    const event = await preventiveEvents.update(eventId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'update',
      'preventive-event',
      event.id,
      `Preventive event ${event.description} updated`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(event));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/vaccines-dewormers') && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'service.write');
    const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
    const existingEvent = await preventiveEvents.getOrThrow(eventId);
    if (existingEvent.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Preventive event not found for current account');
    }
    await preventiveEvents.delete(eventId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'vaccines-dewormers',
      'delete',
      'preventive-event',
      eventId,
      `Preventive event ${existingEvent.description} deleted`,
      'medium',
      correlationId
    );
    response.statusCode = 204;
    response.end();
    return true;
  }
  return false;
}
