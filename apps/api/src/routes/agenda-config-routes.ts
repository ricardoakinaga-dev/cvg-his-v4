import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface AgendaConfigRoutesHandlers {
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

interface AvailabilityRecord {
  id: string;
  accountId: string;
  professionalUserId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  notes?: string | null;
}

interface AppointmentTypeRecord {
  id: string;
  accountId: string;
  code: string;
  name: string;
  description?: string | null;
  defaultDurationMinutes: number;
  color?: string | null;
  active: boolean;
}

const availabilityStore = new Map<string, AvailabilityRecord>([
  [
    'avail-camila-seg',
    {
      id: 'avail-camila-seg',
      accountId: 'acc_cvg_demo',
      professionalUserId: 'staff_camila_vet',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      notes: 'Agenda clínica principal'
    }
  ],
  [
    'avail-enf-ter',
    {
      id: 'avail-enf-ter',
      accountId: 'acc_cvg_demo',
      professionalUserId: 'staff_rafa_enf',
      dayOfWeek: 2,
      startTime: '09:00',
      endTime: '18:00',
      slotDurationMinutes: 20,
      notes: 'Cobertura triagem e apoio'
    }
  ]
]);

const appointmentTypeStore = new Map<string, AppointmentTypeRecord>([
  [
    'appt-clinica',
    {
      id: 'appt-clinica',
      accountId: 'acc_cvg_demo',
      code: 'CONS_CLIN',
      name: 'Consulta Clínica',
      description: 'Atendimento clínico geral',
      defaultDurationMinutes: 30,
      color: '#0F766E',
      active: true
    }
  ],
  [
    'appt-retorno',
    {
      id: 'appt-retorno',
      accountId: 'acc_cvg_demo',
      code: 'RETORNO',
      name: 'Retorno',
      description: 'Revisão e acompanhamento pós-atendimento',
      defaultDurationMinutes: 20,
      color: '#1D4ED8',
      active: true
    }
  ]
]);

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

export async function handleAgendaConfigRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AgendaConfigRoutesHandlers
): Promise<boolean> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');
  const { audit, requirePrincipal } = handlers;

  if (pathname === '/availability' && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const professionalUserId = url.searchParams.get('professionalUserId') ?? undefined;
    const page = normalizePage(url.searchParams.get('page'), 1);
    const pageSize = normalizePage(url.searchParams.get('pageSize'), 20);
    const items = Array.from(availabilityStore.values())
      .filter((item) => item.accountId === principal.user.accountId)
      .filter((item) => (professionalUserId ? item.professionalUserId === professionalUserId : true))
      .sort((left, right) => {
        if (left.dayOfWeek !== right.dayOfWeek) return left.dayOfWeek - right.dayOfWeek;
        return left.startTime.localeCompare(right.startTime);
      });

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
    const payload = (await readJsonBody(request)) as Partial<AvailabilityRecord>;
    const record: AvailabilityRecord = {
      id: createCorrelationId('avail'),
      accountId: principal.user.accountId,
      professionalUserId: String(payload.professionalUserId ?? '').trim(),
      dayOfWeek: Number(payload.dayOfWeek ?? 0),
      startTime: String(payload.startTime ?? '08:00'),
      endTime: String(payload.endTime ?? '17:00'),
      slotDurationMinutes: Number(payload.slotDurationMinutes ?? 30),
      notes: typeof payload.notes === 'string' ? payload.notes : null
    };
    availabilityStore.set(record.id, record);

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
    const record = availabilityStore.get(availabilityMatch[1]);
    if (!record || record.accountId !== principal.user.accountId) {
      return json(response, 404, { error: 'not_found', message: 'Availability not found' });
    }
    return json(response, 200, record);
  }

  if (availabilityMatch && method === 'PATCH') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const current = availabilityStore.get(availabilityMatch[1]);
    if (!current || current.accountId !== principal.user.accountId) {
      return json(response, 404, { error: 'not_found', message: 'Availability not found' });
    }
    const payload = (await readJsonBody(request)) as Partial<AvailabilityRecord>;
    const next: AvailabilityRecord = {
      ...current,
      startTime: payload.startTime ?? current.startTime,
      endTime: payload.endTime ?? current.endTime,
      slotDurationMinutes:
        typeof payload.slotDurationMinutes === 'number'
          ? payload.slotDurationMinutes
          : current.slotDurationMinutes,
      notes: payload.notes === undefined ? current.notes : payload.notes
    };
    availabilityStore.set(next.id, next);
    return json(response, 200, next);
  }

  if (availabilityMatch && method === 'DELETE') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const current = availabilityStore.get(availabilityMatch[1]);
    if (!current || current.accountId !== principal.user.accountId) {
      return json(response, 404, { error: 'not_found', message: 'Availability not found' });
    }
    availabilityStore.delete(current.id);
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
    const items = Array.from(appointmentTypeStore.values())
      .filter((item) => item.accountId === principal.user.accountId)
      .filter((item) => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query)
          || item.code.toLowerCase().includes(query)
          || (item.description ?? '').toLowerCase().includes(query)
        );
      })
      .filter((item) => {
        if (active === 'true') return item.active;
        if (active === 'false') return !item.active;
        return true;
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

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
    const payload = (await readJsonBody(request)) as Partial<AppointmentTypeRecord>;
    const record: AppointmentTypeRecord = {
      id: createCorrelationId('apptype'),
      accountId: principal.user.accountId,
      code: String(payload.code ?? '').trim().toUpperCase(),
      name: String(payload.name ?? '').trim(),
      description: typeof payload.description === 'string' ? payload.description : null,
      defaultDurationMinutes: Number(payload.defaultDurationMinutes ?? 30),
      color: typeof payload.color === 'string' ? payload.color : null,
      active: payload.active !== false
    };
    appointmentTypeStore.set(record.id, record);
    return json(response, 201, record);
  }

  const appointmentTypeMatch = pathname.match(/^\/appointment-types\/([^/]+)$/);
  if (appointmentTypeMatch && method === 'GET') {
    const principal = requirePrincipal(request, 'scheduling.read');
    const record = appointmentTypeStore.get(appointmentTypeMatch[1]);
    if (!record || record.accountId !== principal.user.accountId) {
      return json(response, 404, { error: 'not_found', message: 'Appointment type not found' });
    }
    return json(response, 200, record);
  }

  if (appointmentTypeMatch && method === 'PATCH') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const current = appointmentTypeStore.get(appointmentTypeMatch[1]);
    if (!current || current.accountId !== principal.user.accountId) {
      return json(response, 404, { error: 'not_found', message: 'Appointment type not found' });
    }
    const payload = (await readJsonBody(request)) as Partial<AppointmentTypeRecord>;
    const next: AppointmentTypeRecord = {
      ...current,
      name: payload.name ?? current.name,
      description: payload.description === undefined ? current.description : payload.description,
      defaultDurationMinutes:
        typeof payload.defaultDurationMinutes === 'number'
          ? payload.defaultDurationMinutes
          : current.defaultDurationMinutes,
      color: payload.color === undefined ? current.color : payload.color,
      active: typeof payload.active === 'boolean' ? payload.active : current.active
    };
    appointmentTypeStore.set(next.id, next);
    return json(response, 200, next);
  }

  if (appointmentTypeMatch && method === 'DELETE') {
    const principal = requirePrincipal(request, 'scheduling.manage');
    const current = appointmentTypeStore.get(appointmentTypeMatch[1]);
    if (!current || current.accountId !== principal.user.accountId) {
      return json(response, 404, { error: 'not_found', message: 'Appointment type not found' });
    }
    appointmentTypeStore.delete(current.id);
    response.statusCode = 204;
    response.end();
    return true;
  }

  return false;
}
