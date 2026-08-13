import type { IncomingMessage, ServerResponse } from 'node:http';

import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import { AuthenticationError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import {
  createPreventiveEventStore,
  type PreventiveEventExecuteInput,
  type PreventiveEventInput,
  type PreventiveEventListFilters
} from '../catalog-stores.js';
import { readJsonBody } from '../helpers/common.js';
import type { AppendAudit, RequirePrincipal } from './route-handler-types.js';

export interface PreventiveCareRoutesHandlers {
  preventiveEvents: ReturnType<typeof createPreventiveEventStore>;
  owners?: OwnersService;
  patients?: PatientsService;
  requirePrincipal: RequirePrincipal;
  appendAudit: AppendAudit;
}

export async function handlePreventiveCareRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PreventiveCareRoutesHandlers
): Promise<boolean> {
  if (pathname !== '/vaccines-dewormers' && !pathname.startsWith('/vaccines-dewormers/')) {
    return false;
  }

  const { preventiveEvents, owners, patients, requirePrincipal, appendAudit } = handlers;
  const url = new URL(request.url ?? pathname, 'http://localhost');

if (pathname === '/vaccines-dewormers' && request.method === 'GET') {
  const principal = requirePrincipal(request, 'service.read');
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
  const principal = requirePrincipal(request, 'service.write');
  const payload = (await readJsonBody(request)) as PreventiveEventInput;
  if (payload.ownerId) {
    owners?.getForAccountOrThrow(payload.ownerId as never, principal.user.accountId as never);
  }
  if (payload.patientId) {
    patients?.getForAccountOrThrow(payload.patientId as never, principal.user.accountId as never);
  }
  if (
    payload.ownerId &&
    payload.patientId &&
    patients &&
    patients.listLinks({
      accountId: principal.user.accountId as never,
      ownerId: payload.ownerId as never,
      patientId: payload.patientId as never
    }).length === 0
  ) {
    throw new NotFoundError('Owner-patient relationship not found');
  }
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
  const principal = requirePrincipal(request, 'service.write');
  const payload = (await readJsonBody(request).catch(
    () => ({})
  )) as PreventiveEventListFilters;
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
  pathname.startsWith('/vaccines-dewormers/') &&
  pathname.endsWith('/execute') &&
  request.method === 'POST'
) {
  const principal = requirePrincipal(request, 'service.write');
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
  pathname.startsWith('/vaccines-dewormers/') &&
  pathname.endsWith('/email') &&
  request.method === 'POST'
) {
  const principal = requirePrincipal(request, 'service.write');
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

if (pathname.startsWith('/vaccines-dewormers/') && request.method === 'GET') {
  const principal = requirePrincipal(request, 'service.read');
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

if (pathname.startsWith('/vaccines-dewormers/') && request.method === 'PATCH') {
  const principal = requirePrincipal(request, 'service.write');
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

if (pathname.startsWith('/vaccines-dewormers/') && request.method === 'DELETE') {
  const principal = requirePrincipal(request, 'service.write');
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
