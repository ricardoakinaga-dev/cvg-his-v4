/**
 * Internal Events route handlers — DLQ, stats, pending, event detail, correlation, and reprocess.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import type { AuditService } from '@cvg-his-v2/module-audit';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { EventBusService, OutboxEvent } from '@cvg-his-v2/module-event-bus';
import type { AuthenticatedPrincipal, CorrelationId } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const CORRELATION_ROUTE_PREFIX = '/internal/events/by-correlation/';

type OutboxEventAdminView = Omit<OutboxEvent, 'payload'>;

function toOutboxEventAdminView(event: OutboxEvent): OutboxEventAdminView {
  return {
    id: event.id,
    accountId: event.accountId,
    correlationId: event.correlationId,
    moduleName: event.moduleName,
    eventType: event.eventType,
    status: event.status,
    attempts: event.attempts,
    maxAttempts: event.maxAttempts,
    scheduledAt: event.scheduledAt,
    processedAt: event.processedAt,
    error: event.error,
    createdAt: event.createdAt
  };
}

function parseLimit(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  const limit = Number(raw);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

export interface InternalEventsHandlers {
  eventBus: EventBusService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  enforceAbac: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    resource: ResourceAttributes,
    request: IncomingMessage
  ) => void;
}

function enforceReadAbac(
  enforceAbac: InternalEventsHandlers['enforceAbac'],
  principal: AuthenticatedPrincipal,
  request: IncomingMessage,
  resourceId: string
): void {
  enforceAbac(
    'audit.read',
    principal,
    {
      resourceType: 'audit_entry',
      resourceId,
      accountId: principal.user.accountId
    },
    request
  );
}

function enforceReprocessAbac(
  enforceAbac: InternalEventsHandlers['enforceAbac'],
  principal: AuthenticatedPrincipal,
  request: IncomingMessage,
  eventId: string
): void {
  enforceAbac(
    'audit.write',
    principal,
    {
      resourceType: 'audit_entry',
      resourceId: eventId,
      accountId: principal.user.accountId
    },
    request
  );
}

/**
 * Handle all internal events-related routes (DLQ, stats, pending, event detail, correlation, reprocess).
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleInternalEventsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InternalEventsHandlers
): Promise<boolean> {
  const { eventBus, audit, requirePrincipal: rp, enforceAbac } = handlers;

  // GET /internal/events/dlq — list dead-letter events
  if (pathname === '/internal/events/dlq' && request.method === 'GET') {
    const principal = await rp(request, 'audit.read');
    enforceReadAbac(enforceAbac, principal, request, 'dlq');
    const url = new globalThis.URL(request.url!, 'http://localhost');
    const limit = parseLimit(url.searchParams.get('limit'));
    const dlqEvents = eventBus.getDeadLetterEvents(principal.user.accountId, limit);
    const sanitized = dlqEvents.then((events) =>
      events.map((e) => ({
        id: e.id,
        correlationId: e.correlationId,
        moduleName: e.moduleName,
        eventType: e.eventType,
        status: e.status,
        attempts: e.attempts,
        maxAttempts: e.maxAttempts,
        error: e.error,
        createdAt: e.createdAt,
        processedAt: e.processedAt,
        scheduledAt: e.scheduledAt
      }))
    );
    return sanitized.then((items) => {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ items, count: items.length }));
      return true;
    });
  }

  // GET /internal/events/stats — event count breakdown by status
  if (pathname === '/internal/events/stats' && request.method === 'GET') {
    const principal = await rp(request, 'audit.read');
    enforceReadAbac(enforceAbac, principal, request, 'stats');
    const counts = eventBus.countEvents(principal.user.accountId);
    return counts.then((result) => {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result));
      return true;
    });
  }

  // GET /internal/events/pending — list pending/retrying events
  if (pathname === '/internal/events/pending' && request.method === 'GET') {
    const principal = await rp(request, 'audit.read');
    enforceReadAbac(enforceAbac, principal, request, 'pending');
    const url = new globalThis.URL(request.url ?? '/', 'http://localhost');
    const limit = parseLimit(url.searchParams.get('limit'));
    const events = eventBus.getPendingEvents(principal.user.accountId, limit);
    return events.then((items) => {
      const sanitized = items.map((e) => ({
        id: e.id,
        correlationId: e.correlationId,
        moduleName: e.moduleName,
        eventType: e.eventType,
        status: e.status,
        attempts: e.attempts,
        maxAttempts: e.maxAttempts,
        error: e.error,
        createdAt: e.createdAt,
        scheduledAt: e.scheduledAt
      }));
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ items: sanitized, count: sanitized.length }));
      return true;
    });
  }

  // GET /internal/events/:eventId — get single event by ID
  if (pathname.match(/^\/internal\/events\/[^/]+$/) && request.method === 'GET') {
    const eventId = pathname.split('/')[3];
    if (!eventId || eventId === 'dlq' || eventId === 'publish' || eventId === 'by-correlation') {
      return false;
    }
    const principal = await rp(request, 'audit.read');
    enforceReadAbac(enforceAbac, principal, request, eventId);
    return eventBus.getEvent(principal.user.accountId, eventId).then((event) => {
      if (!event) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Event not found' }));
        return true;
      }
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(toOutboxEventAdminView(event)));
      return true;
    });
  }

  // GET /internal/events/by-correlation/:correlationId — get events by correlation ID
  if (pathname.startsWith(CORRELATION_ROUTE_PREFIX) && request.method === 'GET') {
    const corrId = pathname.slice(CORRELATION_ROUTE_PREFIX.length);
    if (!corrId || corrId.includes('/')) {
      return false;
    }
    const principal = await rp(request, 'audit.read');
    enforceReadAbac(enforceAbac, principal, request, corrId);
    const url = new globalThis.URL(request.url ?? '/', 'http://localhost');
    const limit = parseLimit(url.searchParams.get('limit'));
    return eventBus
      .getEventsByCorrelationId(principal.user.accountId, corrId as CorrelationId, limit)
      .then((events) => {
        response.statusCode = 200;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({
            items: events.map((event) => toOutboxEventAdminView(event)),
            count: events.length
          })
        );
        return true;
      });
  }

  // POST /internal/events/:eventId/reprocess — replay a failed event
  if (pathname.match(/^\/internal\/events\/[^/]+\/reprocess$/) && request.method === 'POST') {
    const eventId = pathname.split('/')[3];
    if (!eventId) {
      response.statusCode = 400;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ code: 'BAD_REQUEST', message: 'eventId required' }));
      return true;
    }
    const principal = await rp(request, 'audit.write');
    enforceReprocessAbac(enforceAbac, principal, request, eventId);
    return eventBus.getEvent(principal.user.accountId, eventId).then((event) => {
      if (!event) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Event not found' }));
        return true;
      }
      return eventBus.reprocessEvent(principal.user.accountId, eventId).then((reprocessed) => {
        if (!reprocessed) {
          response.statusCode = 404;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Event not found' }));
          return true;
        }
        appendAudit(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'event-bus',
          action: 'reprocess_event',
          entityType: 'outbox-event',
          entityId: event.id,
          payloadSummary: `status=${event.status};result=reprocessing`,
          riskLevel: 'high',
          correlationId
        });
        response.statusCode = 202;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({
            id: event.id,
            status: 'reprocessing',
            message: 'Event queued for reprocessing'
          })
        );
        return true;
      });
    });
  }

  return false;
}
