import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { SmartSchedulingService } from '@cvg-his-v2/module-ml';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import type { ApiFeatureFlagsSnapshot } from '../feature-flags.js';
import type { MlTelemetryService } from '../ml-telemetry.js';
import type {
  AppointmentListResponse,
  CheckInQueueRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  SmartSchedulingRecommendationRequest,
  SmartSchedulingRecommendationResponse,
  QueueListResponse,
  SchedulingAvailabilityResponse,
  SchedulingOverviewResponse
} from '@cvg-his-v2/shared-contracts';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import {
  recordSmartSchedulingRecommendation,
  recordSmartSchedulingRecommendationApplied
} from '../metrics.js';

export interface SchedulingRoutesHandlers {
  scheduling: SchedulingService;
  encounters?: EncountersService;
  smartScheduling: SmartSchedulingService;
  audit: AuditService;
  featureFlags?: Pick<ApiFeatureFlagsSnapshot, 'mlSmartSchedulingEnabled'>;
  telemetry?: MlTelemetryService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseStatuses(url: URL): Array<'scheduled' | 'checked_in' | 'completed' | 'cancelled'> | undefined {
  const raw = url.searchParams.get('statuses') ?? url.searchParams.get('status');
  if (!raw) return undefined;

  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) as Array<'scheduled' | 'checked_in' | 'completed' | 'cancelled'>;

  return values.length > 0 ? values : undefined;
}

export async function handleSchedulingRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: SchedulingRoutesHandlers
): Promise<boolean> {
  const { scheduling, encounters, smartScheduling, audit, requirePrincipal, featureFlags, telemetry } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/appointments' && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const payload: AppointmentListResponse = {
      items: scheduling.listAppointments(principal.user.accountId, {
        startAt: url.searchParams.get('startAt') ?? undefined,
        endAt: url.searchParams.get('endAt') ?? undefined,
        patientId: url.searchParams.get('patientId') ?? undefined,
        statuses: parseStatuses(url),
        practitionerStaffId:
          (url.searchParams.get('practitionerStaffId') as 'unassigned' | string | null) ?? undefined,
        serviceId: url.searchParams.get('serviceId') ?? undefined,
        specialty: url.searchParams.get('specialty') ?? undefined,
        unit: url.searchParams.get('unit') ?? undefined,
        search: url.searchParams.get('search') ?? undefined
      })
    };
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'list_appointments',
      entityType: 'appointment',
      entityId: 'all',
      payloadSummary: 'Appointments listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (pathname === '/appointments' && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const payload = (await readJsonBody(request)) as CreateAppointmentRequest;
    const appointment = await scheduling.createAppointment(principal.user.accountId, payload);
    if (payload.smartSchedulingRecommendationId) {
      telemetry?.recordSmartSchedulingApplication({
        accountId: principal.user.accountId,
        recommendationId: payload.smartSchedulingRecommendationId,
        appliedDurationMinutes: payload.durationMinutes
      });
      recordSmartSchedulingRecommendationApplied({
        visitType: payload.visitType ?? 'scheduled'
      });
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'create_appointment',
      entityType: 'appointment',
      entityId: appointment.id,
      payloadSummary: `Appointment created for patient ${appointment.patientId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, appointment);
  }

  if (pathname === '/scheduling/recommendations/duration' && method === 'POST') {
    if (featureFlags?.mlSmartSchedulingEnabled === false) {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: 'feature_disabled', message: 'Smart scheduling is disabled' }));
      return true;
    }
    const principal = requirePrincipal(request, 'scheduling.read');
    const payload = (await readJsonBody(request)) as SmartSchedulingRecommendationRequest;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId');
    const scheduledAt = requireNonEmptyString(payload.scheduledAt, 'scheduledAt');
    const visitType = payload.visitType ?? 'scheduled';
    const previousVisits = scheduling
      .listAppointments(principal.user.accountId)
      .filter((appointment) => appointment.patientId === patientId && appointment.status !== 'cancelled')
      .length;

    const prediction = await smartScheduling.predictDuration({
      visitType,
      patientId,
      previousVisits,
      reason: payload.reason,
      specialty: payload.specialty,
      serviceId: payload.serviceId,
      unit: payload.unit,
      scheduledAt
    });

    recordSmartSchedulingRecommendation({
      visitType,
      confidence: prediction.confidence
    });

    const recommendation: SmartSchedulingRecommendationResponse = {
      recommendationId: createCorrelationId('smartsch'),
      predictedDurationMinutes: prediction.predictedMinutes,
      confidence: prediction.confidence,
      historicalAverageMinutes: prediction.historicalAvg,
      suggestedBufferMinutes: prediction.suggestedBufferMinutes,
      factors: prediction.factors,
      basedOn: {
        patientId,
        previousVisits,
        visitType
      }
    };

    telemetry?.recordSmartSchedulingRecommendation({
      accountId: principal.user.accountId,
      recommendationId: recommendation.recommendationId,
      visitType,
      predictedDurationMinutes: recommendation.predictedDurationMinutes,
      confidence: recommendation.confidence
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'smart_duration_recommendation',
      entityType: 'appointment-recommendation',
      entityId: recommendation.recommendationId,
      payloadSummary: `Smart scheduling recommendation generated for patient ${patientId}`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, recommendation);
  }

  if (pathname.startsWith('/appointments/') && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const appointmentId = requireNonEmptyString(pathname.split('/')[2], 'appointmentId');
    const appointment = scheduling.getAppointmentOrThrow(appointmentId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'get_appointment',
      entityType: 'appointment',
      entityId: appointmentId,
      payloadSummary: `Appointment ${appointmentId} retrieved`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, appointment);
  }

  if (pathname.startsWith('/appointments/') && pathname.endsWith('/cancel') && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const appointmentId = requireNonEmptyString(pathname.split('/')[2], 'appointmentId');
    const body = (await readJsonBody(request).catch(() => ({}))) as Record<string, unknown>;
    const reason = typeof body.reason === 'string' ? body.reason : undefined;
    const cancelled = await scheduling.cancelAppointment(appointmentId as never, reason);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'cancel_appointment',
      entityType: 'appointment',
      entityId: cancelled.id,
      payloadSummary: `Appointment cancelled for patient ${cancelled.patientId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, cancelled);
  }

  if (
    pathname.startsWith('/appointments/')
    && pathname.endsWith('/reschedule')
    && method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const appointmentId = requireNonEmptyString(pathname.split('/')[2], 'appointmentId');
    const payload = (await readJsonBody(request)) as RescheduleAppointmentRequest;
    const rescheduled = await scheduling.rescheduleAppointment(
      principal.user.accountId,
      appointmentId as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'reschedule_appointment',
      entityType: 'appointment',
      entityId: rescheduled.id,
      payloadSummary: `Appointment rescheduled for patient ${rescheduled.patientId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, rescheduled);
  }

  if (
    pathname.startsWith('/appointments/')
    && pathname.endsWith('/start-encounter')
    && method === 'POST'
  ) {
    if (!encounters) {
      return false;
    }
    const principal = requirePrincipal(request, 'encounters.manage');
    const appointmentId = requireNonEmptyString(pathname.split('/')[2], 'appointmentId');
    const appointment = scheduling.getAppointmentOrThrow(appointmentId as never);
    const existingEncounter = encounters
      .listActive()
      .find((encounter) => encounter.patientId === appointment.patientId);

    if (existingEncounter) {
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'encounters',
        action: 'start_from_appointment_reused',
        entityType: 'encounter',
        entityId: existingEncounter.id,
        payloadSummary: `Existing encounter reused from appointment ${appointmentId}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, existingEncounter);
    }

    const encounter = encounters.openEncounter(principal.user.accountId, principal.user.id, {
      patientId: appointment.patientId,
      ownerId: appointment.ownerId,
      appointmentId: appointment.id,
      visitType: appointment.visitType,
      origin: 'schedule',
      reason: appointment.reason
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'start_from_appointment',
      entityType: 'encounter',
      entityId: encounter.id,
      payloadSummary: `Encounter started from appointment ${appointmentId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, encounter);
  }

  if (pathname === '/scheduling/overview' && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const payload: SchedulingOverviewResponse = scheduling.getSchedulingOverview(
      principal.user.accountId,
      {
        viewMode: (url.searchParams.get('viewMode') as 'day' | 'week' | 'month' | null) ?? undefined,
        referenceDate: url.searchParams.get('referenceDate') ?? undefined,
        statuses: parseStatuses(url),
        practitionerStaffId:
          (url.searchParams.get('practitionerStaffId') as 'unassigned' | string | null) ?? undefined,
        serviceId: url.searchParams.get('serviceId') ?? undefined,
        specialty: url.searchParams.get('specialty') ?? undefined,
        unit: url.searchParams.get('unit') ?? undefined,
        search: url.searchParams.get('search') ?? undefined
      }
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'read_overview',
      entityType: 'scheduling-overview',
      entityId: payload.viewMode,
      payloadSummary: `Scheduling overview read in ${payload.viewMode} mode`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (pathname === '/scheduling/availability' && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const scheduledAt = requireNonEmptyString(url.searchParams.get('scheduledAt'), 'scheduledAt');
    const patientId = requireNonEmptyString(url.searchParams.get('patientId'), 'patientId');
    const payload: SchedulingAvailabilityResponse = scheduling.getAvailability(
      principal.user.accountId,
      {
        scheduledAt,
        patientId,
        practitionerStaffId: url.searchParams.get('practitionerStaffId') ?? undefined,
        resourceLabel: url.searchParams.get('resourceLabel') ?? undefined,
        ignoreAppointmentId: url.searchParams.get('ignoreAppointmentId') ?? undefined,
        durationMinutes: url.searchParams.get('durationMinutes')
          ? Number(url.searchParams.get('durationMinutes'))
          : undefined
      }
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'read_availability',
      entityType: 'scheduling-availability',
      entityId: patientId,
      payloadSummary: `Scheduling availability checked for patient ${patientId}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (pathname === '/queue' && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const payload: QueueListResponse = {
      items: scheduling.getQueue(principal.user.accountId)
    };
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'list_queue',
      entityType: 'queue-entry',
      entityId: 'all',
      payloadSummary: 'Operational queue listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (pathname === '/queue/check-in' && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const payload = (await readJsonBody(request)) as CheckInQueueRequest;
    const entry = await scheduling.checkIn(principal.user.accountId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'check_in',
      entityType: 'queue-entry',
      entityId: entry.id,
      payloadSummary: `Patient ${entry.patientId} checked in`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, entry);
  }

  if (pathname.startsWith('/queue/') && pathname.endsWith('/call') && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
    const entry = await scheduling.callQueueEntry(queueEntryId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'call_queue_entry',
      entityType: 'queue-entry',
      entityId: entry.id,
      payloadSummary: `Queue entry ${entry.id} called`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, entry);
  }

  if (pathname.startsWith('/queue/') && pathname.endsWith('/transfer') && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
    const payload = (await readJsonBody(request)) as {
      readonly toSector?: string;
      readonly sentByUserId?: string;
      readonly receivedByUserId?: string;
      readonly responsibleUserId?: string;
      readonly responsibleStaffId?: string;
      readonly nextSector?: string;
      readonly reason?: string;
      readonly urgency?: 'low' | 'medium' | 'high' | 'critical';
      readonly billingRecordId?: string;
      readonly counterSaleId?: string;
    };
    const entry = await scheduling.transferQueueEntry(queueEntryId as never, {
      toSector: requireNonEmptyString(payload.toSector, 'toSector'),
      sentByUserId: payload.sentByUserId?.trim() || principal.user.id,
      receivedByUserId: payload.receivedByUserId,
      responsibleUserId: payload.responsibleUserId,
      responsibleStaffId: payload.responsibleStaffId,
      nextSector: payload.nextSector,
      reason: requireNonEmptyString(payload.reason, 'reason'),
      urgency: payload.urgency,
      billingRecordId: payload.billingRecordId,
      counterSaleId: payload.counterSaleId
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'transfer_queue_entry',
      entityType: 'queue-entry',
      entityId: entry.id,
      payloadSummary: `Queue entry ${entry.id} transferred to ${entry.currentSector}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, entry);
  }

  if (pathname.startsWith('/queue/') && pathname.endsWith('/start-care') && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
    const entry = await scheduling.transitionQueueEntry(queueEntryId as never, 'in_care' as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'start_care',
      entityType: 'queue-entry',
      entityId: entry.id,
      payloadSummary: `Queue entry ${entry.id} transitioned to in_care`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, entry);
  }

  if (pathname.startsWith('/queue/') && pathname.endsWith('/complete') && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
    const entry = await scheduling.completeQueueEntry(queueEntryId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'complete_queue_entry',
      entityType: 'queue-entry',
      entityId: entry.id,
      payloadSummary: `Queue entry ${entry.id} completed`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, entry);
  }

  if (pathname.startsWith('/queue/') && pathname.endsWith('/no-show') && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
    const entry = await scheduling.transitionQueueEntry(queueEntryId as never, 'cancelled' as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'no_show',
      entityType: 'queue-entry',
      entityId: entry.id,
      payloadSummary: `Queue entry ${entry.id} marked as no_show`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, entry);
  }

  return false;
}
