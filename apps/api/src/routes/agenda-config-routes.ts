import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import {
  createAgendaAvailabilityRecord,
  createAppointmentTypeConfigRecord,
  type AgendaConfigRepository,
  type AppointmentTypeConfigRecord,
  type ProfessionalAvailabilityRecord
} from '../repositories/agenda-config-repository.js';

export interface AgendaConfigRoutesHandlers {
  audit: AuditService;
  repository: AgendaConfigRepository;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  /** Refreshes scheduling's read model after persisted agenda changes. */
  refreshScheduling?: (accountId: string) => Promise<void>;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function normalizePage(value: string | null, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page,
    pageSize,
    total: items.length
  };
}

function parseTime(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new ValidationError(`Field '${fieldName}' must use HH:MM format`, { field: fieldName });
  }
  return value;
}

function parseTimezone(value: unknown): string {
  const timezone = String(value ?? 'America/Sao_Paulo').trim();
  if (!timezone || timezone.length > 64) {
    throw new ValidationError("Field 'timezone' must contain a valid IANA timezone", {
      field: 'timezone'
    });
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new ValidationError("Field 'timezone' must contain a valid IANA timezone", {
      field: 'timezone',
      timezone
    });
  }
  return timezone;
}

function parseOptionalDate(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`Field '${fieldName}' must use YYYY-MM-DD format`, { field: fieldName });
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`Field '${fieldName}' must be a valid date`, { field: fieldName });
  }
  return value;
}

function parseAvailabilityPayload(
  payload: Record<string, unknown>,
  accountId: string
): ProfessionalAvailabilityRecord {
  const professionalUserId = String(payload.professionalUserId ?? '').trim();
  if (!professionalUserId || professionalUserId.length > 255) {
    throw new ValidationError("Field 'professionalUserId' is required", {
      field: 'professionalUserId'
    });
  }
  const dayOfWeek = Number(payload.dayOfWeek ?? 0);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new ValidationError("Field 'dayOfWeek' must be an integer between 0 and 6", {
      field: 'dayOfWeek'
    });
  }
  const startTime = parseTime(payload.startTime ?? '08:00', 'startTime');
  const endTime = parseTime(payload.endTime ?? '17:00', 'endTime');
  if (startTime >= endTime) {
    throw new ValidationError("Field 'endTime' must be after 'startTime'", {
      field: 'endTime'
    });
  }
  const slotDurationMinutes = Number(payload.slotDurationMinutes ?? 30);
  if (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes < 5 || slotDurationMinutes > 480) {
    throw new ValidationError("Field 'slotDurationMinutes' must be between 5 and 480", {
      field: 'slotDurationMinutes'
    });
  }
  const notes = payload.notes === undefined || payload.notes === null ? null : String(payload.notes);
  if (notes && notes.length > 1000) {
    throw new ValidationError("Field 'notes' must have at most 1000 characters", {
      field: 'notes'
    });
  }
  const effectiveFrom = parseOptionalDate(payload.effectiveFrom, 'effectiveFrom');
  const effectiveUntil = parseOptionalDate(payload.effectiveUntil, 'effectiveUntil');
  if (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom) {
    throw new ValidationError("Field 'effectiveUntil' must be on or after 'effectiveFrom'", {
      field: 'effectiveUntil'
    });
  }
  return createAgendaAvailabilityRecord({
    accountId,
    professionalUserId,
    dayOfWeek,
    startTime,
    endTime,
    slotDurationMinutes,
    timezone: parseTimezone(payload.timezone),
    effectiveFrom,
    effectiveUntil,
    notes
  });
}

function parseAppointmentTypePayload(
  payload: Record<string, unknown>,
  accountId: string
): AppointmentTypeConfigRecord {
  const code = String(payload.code ?? '').trim().toUpperCase();
  const name = String(payload.name ?? '').trim();
  if (!/^[A-Z0-9_\-]{2,64}$/.test(code)) {
    throw new ValidationError("Field 'code' must contain 2 to 64 uppercase letters, numbers, '_' or '-'", {
      field: 'code'
    });
  }
  if (!name || name.length > 255) {
    throw new ValidationError("Field 'name' is required and must have at most 255 characters", {
      field: 'name'
    });
  }
  const defaultDurationMinutes = Number(payload.defaultDurationMinutes ?? 30);
  if (
    !Number.isInteger(defaultDurationMinutes) ||
    defaultDurationMinutes < 5 ||
    defaultDurationMinutes > 480
  ) {
    throw new ValidationError("Field 'defaultDurationMinutes' must be between 5 and 480", {
      field: 'defaultDurationMinutes'
    });
  }
  const description =
    payload.description === undefined || payload.description === null
      ? null
      : String(payload.description);
  const color = payload.color === undefined || payload.color === null ? null : String(payload.color);
  if (description && description.length > 1000) {
    throw new ValidationError("Field 'description' must have at most 1000 characters", {
      field: 'description'
    });
  }
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new ValidationError("Field 'color' must be a six-digit hexadecimal color", {
      field: 'color'
    });
  }
  return createAppointmentTypeConfigRecord({
    accountId,
    code,
    name,
    description,
    defaultDurationMinutes,
    color,
    active: payload.active !== false
  });
}

export async function handleAgendaConfigRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AgendaConfigRoutesHandlers
): Promise<boolean> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');
  const { audit, repository, requirePrincipal, refreshScheduling } = handlers;

  if (pathname === '/availability' && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const professionalUserId = url.searchParams.get('professionalUserId') ?? undefined;
    const page = normalizePage(url.searchParams.get('page'), 1);
    const pageSize = normalizePage(url.searchParams.get('pageSize'), 20);
    const items = await repository.listAvailability(
      principal.user.accountId,
      professionalUserId
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'list_availability',
      entityType: 'professional-availability',
      entityId: professionalUserId ?? 'all',
      payloadSummary: 'Professional availability listed',
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, paginate(items, page, pageSize));
  }

  if (pathname === '/availability' && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const record = await repository.createAvailability(
      parseAvailabilityPayload(payload, principal.user.accountId)
    );
    await refreshScheduling?.(principal.user.accountId);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'create_availability',
      entityType: 'professional-availability',
      entityId: record.id,
      payloadSummary: `Availability created for professional ${record.professionalUserId}`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 201, record);
  }

  const availabilityMatch = pathname.match(/^\/availability\/([^/]+)$/);
  if (availabilityMatch && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const record = await repository.findAvailabilityById(
      principal.user.accountId,
      availabilityMatch[1]
    );
    if (!record) {
      return json(response, 404, { error: 'not_found', message: 'Availability not found' });
    }
    return json(response, 200, record);
  }

  if (availabilityMatch && method === 'PATCH') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const current = await repository.findAvailabilityById(
      principal.user.accountId,
      availabilityMatch[1]
    );
    if (!current) {
      return json(response, 404, { error: 'not_found', message: 'Availability not found' });
    }
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const parsed = parseAvailabilityPayload(
      {
        professionalUserId: current.professionalUserId,
        dayOfWeek: current.dayOfWeek,
        startTime: payload.startTime ?? current.startTime,
        endTime: payload.endTime ?? current.endTime,
        slotDurationMinutes: payload.slotDurationMinutes ?? current.slotDurationMinutes,
        timezone: payload.timezone ?? current.timezone,
        effectiveFrom: payload.effectiveFrom ?? current.effectiveFrom,
        effectiveUntil: payload.effectiveUntil ?? current.effectiveUntil,
        notes: payload.notes === undefined ? current.notes : payload.notes
      },
      principal.user.accountId
    );
    const next = await repository.updateAvailability({ ...parsed, id: current.id });
    await refreshScheduling?.(principal.user.accountId);
    return json(response, 200, next);
  }

  if (availabilityMatch && method === 'DELETE') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const deleted = await repository.deleteAvailability(
      principal.user.accountId,
      availabilityMatch[1]
    );
    if (!deleted) {
      return json(response, 404, { error: 'not_found', message: 'Availability not found' });
    }
    await refreshScheduling?.(principal.user.accountId);
    response.statusCode = 204;
    response.end();
    return true;
  }

  if (pathname === '/appointment-types' && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const query = (url.searchParams.get('query') ?? url.searchParams.get('q') ?? '').trim().toLowerCase();
    const active = url.searchParams.get('active');
    const page = normalizePage(url.searchParams.get('page'), 1);
    const pageSize = normalizePage(url.searchParams.get('pageSize'), 20);
    const items = await repository.listAppointmentTypes(principal.user.accountId, {
      query,
      active: active === 'true' ? true : active === 'false' ? false : undefined
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'scheduling',
      action: 'list_appointment_types',
      entityType: 'appointment-type',
      entityId: query || 'all',
      payloadSummary: 'Appointment types listed',
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, paginate(items, page, pageSize));
  }

  if (pathname === '/appointment-types' && method === 'POST') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const record = await repository.createAppointmentType(
      parseAppointmentTypePayload(payload, principal.user.accountId)
    );
    return json(response, 201, record);
  }

  const appointmentTypeMatch = pathname.match(/^\/appointment-types\/([^/]+)$/);
  if (appointmentTypeMatch && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const record = await repository.findAppointmentTypeById(
      principal.user.accountId,
      appointmentTypeMatch[1]
    );
    if (!record) {
      return json(response, 404, { error: 'not_found', message: 'Appointment type not found' });
    }
    return json(response, 200, record);
  }

  if (appointmentTypeMatch && method === 'PATCH') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const current = await repository.findAppointmentTypeById(
      principal.user.accountId,
      appointmentTypeMatch[1]
    );
    if (!current) {
      return json(response, 404, { error: 'not_found', message: 'Appointment type not found' });
    }
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const parsed = parseAppointmentTypePayload(
      {
        code: current.code,
        name: payload.name ?? current.name,
        description: payload.description === undefined ? current.description : payload.description,
        defaultDurationMinutes:
          payload.defaultDurationMinutes ?? current.defaultDurationMinutes,
        color: payload.color === undefined ? current.color : payload.color,
        active: payload.active === undefined ? current.active : payload.active
      },
      principal.user.accountId
    );
    const next = await repository.updateAppointmentType({ ...parsed, id: current.id });
    return json(response, 200, next);
  }

  if (appointmentTypeMatch && method === 'DELETE') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const deleted = await repository.deleteAppointmentType(
      principal.user.accountId,
      appointmentTypeMatch[1]
    );
    if (!deleted) {
      return json(response, 404, { error: 'not_found', message: 'Appointment type not found' });
    }
    response.statusCode = 204;
    response.end();
    return true;
  }

  return false;
}
