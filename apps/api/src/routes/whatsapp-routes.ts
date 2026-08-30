/**
 * WhatsApp inbound route handler.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import type { WhatsAppAppointmentReportResponse } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal, SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface WhatsAppRoutesHandlers {
  scheduling: SchedulingService;
  audit: AuditService;
  notificationsWhatsappInboundActionsEnabled: boolean;
  inboundWebhookSecret?: string;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

type ScopedScheduling = {
  getAppointmentOrThrow(appointmentId: string): SchedulingAppointmentSummary;
  checkIn(
    accountId: string,
    params: { appointmentId: string; patientId: string; ownerId: string; reason: string }
  ): Promise<unknown>;
  cancelAppointment(appointmentId: string, reason?: string): Promise<unknown>;
};

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function extractAuditMetadata(summary: string): Record<string, string> {
  const metadata: Record<string, string> = {};

  for (const segment of summary.split(';')) {
    const separator = segment.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = segment.slice(0, separator).trim();
    const value = segment.slice(separator + 1).trim();
    if (key) {
      metadata[key] = value;
    }
  }

  return metadata;
}

function buildAppointmentReport(
  appointmentId: string,
  audit: AuditService
): WhatsAppAppointmentReportResponse {
  const events = audit.list().filter((event) => {
    if (event.entityId === appointmentId) {
      return true;
    }

    return (
      event.module === 'whatsapp'
      && event.action === 'inbound_received'
      && event.payloadSummary.includes(`appointmentId=${appointmentId}`)
    );
  });
  const sentEvent = events.find((event) => event.action === 'whatsapp_reminder_sent');
  const failedEvent = events.find((event) => event.action === 'whatsapp_reminder_failed');
  const sentMetadata = sentEvent ? extractAuditMetadata(sentEvent.payloadSummary) : {};
  const failedMetadata = failedEvent ? extractAuditMetadata(failedEvent.payloadSummary) : {};

  let deliveryStatus: WhatsAppAppointmentReportResponse['deliveryStatus'] = 'not_scheduled';
  if (events.some((event) => event.action === 'inbound_reschedule_request')) {
    deliveryStatus = 'reschedule_requested';
  } else if (events.some((event) => event.action === 'whatsapp_cancel')) {
    deliveryStatus = 'cancelled';
  } else if (events.some((event) => event.action === 'whatsapp_confirm')) {
    deliveryStatus = 'confirmed';
  } else if (sentEvent) {
    deliveryStatus = 'sent';
  } else if (failedEvent) {
    deliveryStatus = 'failed';
  } else if (events.some((event) => event.action === 'whatsapp_reminder_scheduled')) {
    deliveryStatus = 'scheduled';
  }

  return {
    appointmentId,
    deliveryStatus,
    vendorProvider:
      (sentMetadata['provider'] as 'twilio' | '360dialog' | undefined)
      ?? (failedMetadata['provider'] as 'twilio' | '360dialog' | undefined)
      ?? null,
    vendorMessageId: sentMetadata['messageId'] || null,
    lastError: failedMetadata['error'] || null,
    correlationIds: Array.from(
      new Set(events.map((event) => event.correlationId).filter((value): value is string => Boolean(value)))
    ),
    events
  };
}

/**
 * Handle WhatsApp inbound route.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleWhatsAppRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: WhatsAppRoutesHandlers
): Promise<boolean> {
  const { scheduling, audit, notificationsWhatsappInboundActionsEnabled, requirePrincipal } = handlers;

  if (
    pathname.startsWith('/whatsapp/appointments/') &&
    pathname.endsWith('/report') &&
    request.method === 'GET'
  ) {
    const principal = await requirePrincipal(request, 'notifications.read');
    const appointmentId = pathname.split('/')[3] ?? '';
    const appointment = scheduling.getAppointmentOrThrow(appointmentId as never);
    if (appointment.accountId !== principal.user.accountId) {
      return json(response, 404, { code: 'NOT_FOUND', message: 'Appointment not found' });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'whatsapp',
      action: 'read_report',
      entityType: 'appointment',
      entityId: appointmentId,
      payloadSummary: `WhatsApp operational report read for appointment ${appointmentId}`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, buildAppointmentReport(appointmentId, audit));
  }

  if (pathname !== '/webhooks/whatsapp/inbound' || request.method !== 'POST') {
    return false;
  }

  const headerValue = request.headers['x-webhook-secret'];
  const providedSecret = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const configuredBuffer = Buffer.from(handlers.inboundWebhookSecret ?? '');
  const providedBuffer = Buffer.from(providedSecret ?? '');
  if (
    configuredBuffer.length === 0 ||
    configuredBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(configuredBuffer, providedBuffer)
  ) {
    return json(response, 401, { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' });
  }

  const body = (await readJsonBody(request)) as Record<string, unknown>;
  const waCorrelationId = createCorrelationId('wa-in');
  const messageSid = typeof body['MessageSid'] === 'string' ? body['MessageSid'] : 'unknown';
  const from = typeof body['From'] === 'string' ? body['From'] : '';
  const bodyText = typeof body['Body'] === 'string' ? body['Body'].trim().toUpperCase() : '';
  const appointmentId = typeof body['AppointmentId'] === 'string' ? body['AppointmentId'] : undefined;

  appendAudit(audit, {
    actorId: 'system',
    accountId: 'system' as never,
    module: 'whatsapp',
    action: 'inbound_received',
    entityType: 'webhook',
    entityId: messageSid,
    payloadSummary: `WhatsApp inbound: from=${from}, body="${bodyText}", appointmentId=${appointmentId ?? 'unknown'}`,
    riskLevel: 'low',
    correlationId: waCorrelationId
  });

  const scopedScheduling = scheduling as unknown as ScopedScheduling;

  let responseMessage = 'OK';

  if (!notificationsWhatsappInboundActionsEnabled) {
    const requestedMutation =
      bodyText === 'CONFIRMAR'
      || bodyText === 'CONFIRM'
      || bodyText === 'CANCELAR'
      || bodyText === 'CANCELAR CONSULTA'
      || bodyText === 'REMARCAR';

    if (requestedMutation && appointmentId !== undefined) {
      appendAudit(audit, {
        actorId: 'system',
        accountId: 'system' as never,
        module: 'whatsapp',
        action: 'inbound_action_skipped_flag_disabled',
        entityType: 'appointment',
        entityId: appointmentId,
        payloadSummary: `WhatsApp inbound action "${bodyText}" ignored because notifications.whatsapp.inbound_actions.enabled is disabled`,
        riskLevel: 'low',
        correlationId: waCorrelationId
      });
      response.statusCode = 200;
      response.setHeader('Content-Type', 'text/plain');
      response.end('AUTOMACAO_DESABILITADA');
      return true;
    }
  }

  if ((bodyText === 'CONFIRMAR' || bodyText === 'CONFIRM') && appointmentId !== undefined) {
    try {
      const appointment = scopedScheduling.getAppointmentOrThrow(appointmentId);
      if (appointment.status === 'scheduled') {
        await scopedScheduling.checkIn(appointment.accountId as string, {
          appointmentId,
          patientId: appointment.patientId as string,
          ownerId: appointment.ownerId as string,
          reason: 'Confirmed via WhatsApp by tutor'
        });
        appendAudit(audit, {
          actorId: 'system',
          accountId: appointment.accountId as never,
          module: 'scheduling',
          action: 'whatsapp_confirm',
          entityType: 'appointment',
          entityId: appointmentId,
          payloadSummary: `Appointment ${appointmentId} confirmed via WhatsApp from ${from}`,
          riskLevel: 'high',
          correlationId: waCorrelationId
        });
      }
      responseMessage = 'CONFIRMADO';
    } catch {
      responseMessage = 'CONFIRMADO';
    }
  } else if (
    (bodyText === 'CANCELAR' || bodyText === 'CANCELAR CONSULTA') &&
    appointmentId !== undefined
  ) {
    try {
      const appointment = scopedScheduling.getAppointmentOrThrow(appointmentId);
      await scopedScheduling.cancelAppointment(
        appointmentId,
        'Cancelled via WhatsApp by tutor'
      );
      appendAudit(audit, {
        actorId: 'system',
        accountId: appointment.accountId as never,
        module: 'scheduling',
        action: 'whatsapp_cancel',
        entityType: 'appointment',
        entityId: appointmentId,
        payloadSummary: `Appointment ${appointmentId} cancelled via WhatsApp from ${from}`,
        riskLevel: 'high',
        correlationId: waCorrelationId
      });
      responseMessage = 'CANCELADO';
    } catch {
      responseMessage = 'CANCELADO';
    }
  } else if (bodyText === 'REMARCAR' && appointmentId !== undefined) {
    responseMessage = 'AGUARDANDO REMARCA';
    appendAudit(audit, {
      actorId: 'system',
      accountId: 'system' as never,
      module: 'scheduling',
      action: 'inbound_reschedule_request',
      entityType: 'appointment',
      entityId: appointmentId,
      payloadSummary: `Reschedule requested via WhatsApp from ${from}`,
      riskLevel: 'medium',
      correlationId: waCorrelationId
    });
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/plain');
  response.end(responseMessage);
  return true;
}
