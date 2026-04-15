/**
 * WhatsApp inbound route handler.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface WhatsAppRoutesHandlers {
  scheduling: SchedulingService;
  audit: AuditService;
  notificationsWhatsappInboundActionsEnabled: boolean;
}

type ScopedScheduling = {
  getAppointmentOrThrow(appointmentId: string): SchedulingAppointmentSummary;
  checkIn(
    accountId: string,
    params: { appointmentId: string; patientId: string; ownerId: string; reason: string }
  ): Promise<unknown>;
  cancelAppointment(appointmentId: string, reason?: string): Promise<unknown>;
};

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
  const { scheduling, audit, notificationsWhatsappInboundActionsEnabled } = handlers;

  if (pathname !== '/webhooks/whatsapp/inbound' || request.method !== 'POST') {
    return false;
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
