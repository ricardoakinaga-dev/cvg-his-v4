import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';

import type { GoogleCalendarGateway } from '../google-calendar-gateway.js';
import type { GoogleCalendarSyncRepository } from '../google-calendar-sync-repository.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { requireApiKey } from '../helpers/auth-helpers.js';

export interface GoogleCalendarRoutesHandlers {
  scheduling: SchedulingService;
  googleCalendarGateway: GoogleCalendarGateway;
  googleCalendarSyncs: GoogleCalendarSyncRepository;
  googleCalendarMode: 'mock' | 'provider';
  googleCalendarConfigured: boolean;
  googleCalendarCalendarId?: string;
  apiKeys: ApiKeysService;
  audit: AuditService;
}

export async function handleGoogleCalendarRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: GoogleCalendarRoutesHandlers
): Promise<boolean> {
  const syncMatch = pathname.match(/^\/integrations\/google-calendar\/appointments\/([^/]+)\/sync$/);
  if (syncMatch && request.method === 'POST') {
    return handleAppointmentSync(syncMatch[1] ?? '', request, response, correlationId, handlers);
  }
  if (pathname === '/integrations/google-calendar/report' && request.method === 'GET') {
    return handleGoogleCalendarReport(request, response, correlationId, handlers);
  }
  return false;
}

async function handleAppointmentSync(
  appointmentId: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { scheduling, googleCalendarGateway, googleCalendarSyncs, apiKeys, audit }: GoogleCalendarRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'notifications.manage', apiKeys);
  const appointment = scheduling.getAppointmentOrThrow(appointmentId as never);
  if (appointment.accountId !== apiKeyPrincipal.apiKey.accountId) {
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Appointment not found' }));
    return true;
  }

  const syncResult = await googleCalendarGateway.syncAppointment(appointment);
  const record = {
    appointmentId,
    accountId: appointment.accountId,
    provider: syncResult.provider,
    status: syncResult.status === 'failed' ? 'failed' : syncResult.status,
    externalEventId: syncResult.externalEventId,
    lastSyncedAt: syncResult.syncedAt,
    lastError: syncResult.failureReason
  } as const;
  await googleCalendarSyncs.upsert(record);

  appendAudit(audit, {
    actorId: 'system',
    accountId: appointment.accountId,
    module: 'integrations',
    action: syncResult.status === 'failed' ? 'google_calendar_sync_failed' : 'google_calendar_sync',
    entityType: 'appointment',
    entityId: appointmentId,
    payloadSummary: `Appointment ${appointmentId} ${syncResult.status} via ${syncResult.provider}`,
    riskLevel: syncResult.status === 'failed' ? 'medium' : 'low',
    correlationId
  });

  response.statusCode = syncResult.status === 'failed' ? 202 : 200;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(record));
  return true;
}

async function handleGoogleCalendarReport(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { googleCalendarGateway, googleCalendarSyncs, googleCalendarMode, googleCalendarConfigured, googleCalendarCalendarId, apiKeys, audit }: GoogleCalendarRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'integrations.read', apiKeys);
  const items = await googleCalendarSyncs.list(apiKeyPrincipal.apiKey.accountId);
  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: 'google_calendar_report_view',
    entityType: 'appointment-sync',
    entityId: 'all',
    payloadSummary: 'Google Calendar operational report listed',
    riskLevel: 'low',
    correlationId
  });

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      provider: googleCalendarGateway.providerName,
      operational: {
        mode: googleCalendarMode,
        configured: googleCalendarConfigured,
        calendarId: googleCalendarCalendarId ?? null
      },
      summary: {
        total: items.length,
        synced: items.filter((item) => item.status === 'synced').length,
        cancelled: items.filter((item) => item.status === 'cancelled').length,
        failed: items.filter((item) => item.status === 'failed').length
      },
      items
    })
  );
  return true;
}
