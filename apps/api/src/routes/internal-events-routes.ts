/**
 * Internal Events route handlers — DLQ, stats, pending, event detail, correlation, and reprocess.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { EventBusService } from '@cvg-his-v2/module-event-bus';
import type { AuthenticatedPrincipal, CorrelationId } from '@cvg-his-v2/shared-types';

export interface InternalEventsHandlers {
  eventBus: EventBusService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

/**
 * Handle all internal events-related routes (DLQ, stats, pending, event detail, correlation, reprocess).
 * Returns true if the request was handled, false if the route didn't match.
 */
export function handleInternalEventsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InternalEventsHandlers
): Promise<boolean> | boolean {
  const { eventBus, requirePrincipal: rp } = handlers;

  // GET /internal/events/dlq — list dead-letter events
  if (pathname === '/internal/events/dlq' && request.method === 'GET') {
    rp(request, 'audit.read');
    const url = new globalThis.URL(request.url!, 'http://localhost');
    const limitRaw = url.searchParams.get('limit') ?? '';
    const limit = limitRaw ? Math.min(parseInt(limitRaw, 10), 200) : 50;
    const dlqEvents = eventBus.getDeadLetterEvents(limit);
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
    rp(request, 'audit.read');
    const counts = eventBus.countEvents();
    return counts.then((result) => {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result));
      return true;
    });
  }

  // GET /internal/events/pending — list pending/retrying events
  if (pathname === '/internal/events/pending' && request.method === 'GET') {
    rp(request, 'audit.read');
    const url = new globalThis.URL(request.url ?? '/', 'http://localhost');
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;
    const events = eventBus.getPendingEvents(limit);
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
    if (!eventId || eventId === 'dlq' || eventId === 'publish') {
      return false;
    }
    rp(request, 'audit.read');
    return eventBus.getEvent(eventId).then((event) => {
      if (!event) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Event not found' }));
        return true;
      }
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(event));
      return true;
    });
  }

  // GET /internal/events/:correlationId — get events by correlation ID
  if (pathname.startsWith('/internal/events/') && request.method === 'GET') {
    const parts = pathname.split('/');
    const corrId = parts[3];
    if (!corrId || corrId === 'dlq' || corrId === 'publish') {
      return false;
    }
    rp(request, 'audit.read');
    return eventBus.getEventsByCorrelationId(corrId as CorrelationId).then((events) => {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ items: events, count: events.length }));
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
    rp(request, 'audit.write');
    return eventBus.getEvent(eventId).then((event) => {
      if (!event) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Event not found' }));
        return true;
      }
      return eventBus.reprocessEvent(eventId).then((reprocessed) => {
        if (!reprocessed) {
          response.statusCode = 404;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Event not found' }));
          return true;
        }
        response.statusCode = 202;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({ id: event.id, status: 'reprocessing', message: 'Event queued for reprocessing' })
        );
        return true;
      });
    });
  }

  return false;
}
