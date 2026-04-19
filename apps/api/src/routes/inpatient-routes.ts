/**
 * Inpatient route handlers — sectors, beds, inpatient stays.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { InpatientService } from '@cvg-his-v2/module-inpatient';
import type { SectorBedService } from '@cvg-his-v2/module-inpatient';
import type {
  CreateSectorRequest,
  CreateBedRequest,
  InpatientHandoverPreviewResponse
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface InpatientRoutesHandlers {
  inpatient: InpatientService;
  sectorBedService: SectorBedService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

export async function handleInpatientRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InpatientRoutesHandlers
): Promise<boolean> {
  const { inpatient, sectorBedService, audit, requirePrincipal: rp } = handlers;

  // GET /sectors
  if (pathname === '/sectors' && request.method === 'GET') {
    const principal = rp(request, 'inpatient.read');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'sectors',
      action: 'list',
      entityType: 'sector',
      entityId: 'all',
      payloadSummary: 'Sectors listed',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: await sectorBedService.listSectors(principal.user.accountId as never)
      })
    );
    return true;
  }

  // POST /sectors
  if (pathname === '/sectors' && request.method === 'POST') {
    const principal = rp(request, 'inpatient.manage');
    const payload = (await readJsonBody(request)) as CreateSectorRequest;
    const sector = await sectorBedService.createSector(
      principal.user.accountId as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'sectors',
      action: 'create',
      entityType: 'sector',
      entityId: sector.id,
      payloadSummary: `Sector ${sector.name} created`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(sector));
    return true;
  }

  // GET /beds
  if (pathname === '/beds' && request.method === 'GET') {
    const principal = rp(request, 'inpatient.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const sectorId = url.searchParams.get('sectorId') ?? undefined;
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'beds',
      action: 'list',
      entityType: 'bed',
      entityId: sectorId ?? 'all',
      payloadSummary: 'Beds listed',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: await sectorBedService.listBeds(
          principal.user.accountId as never,
          sectorId as never
        )
      })
    );
    return true;
  }

  // POST /beds
  if (pathname === '/beds' && request.method === 'POST') {
    const principal = rp(request, 'inpatient.manage');
    const payload = (await readJsonBody(request)) as CreateBedRequest;
    const bed = await sectorBedService.createBed(principal.user.accountId as never, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'beds',
      action: 'create',
      entityType: 'bed',
      entityId: bed.id,
      payloadSummary: `Bed ${bed.name} created in sector`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(bed));
    return true;
  }

  // GET /bed-map
  if (pathname === '/bed-map' && request.method === 'GET') {
    const principal = rp(request, 'inpatient.read');
    const bedMap = await sectorBedService.buildBedMap(principal.user.accountId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'bed-map',
      action: 'read',
      entityType: 'bed-map',
      entityId: 'current',
      payloadSummary: 'Bed map consulted',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(bedMap));
    return true;
  }

  // GET /inpatient/handover-preview
  if (pathname === '/inpatient/handover-preview' && request.method === 'GET') {
    const principal = rp(request, 'inpatient.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const payload: InpatientHandoverPreviewResponse = inpatient.buildHandoverPreview({
      unit: url.searchParams.get('unit') ?? undefined,
      ward: url.searchParams.get('ward') ?? undefined,
      includeDischarged: url.searchParams.get('includeDischarged') === 'true'
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'read_handover_preview',
      entityType: 'handover-preview',
      entityId: `${url.searchParams.get('ward') ?? 'all'}:${url.searchParams.get('unit') ?? 'all'}`,
      payloadSummary: `Inpatient handover preview generated with ${payload.items.length} stay(s)`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return true;
  }

  // POST /inpatient/:stayId/assign-bed
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/assign-bed') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'inpatient.manage');
    const stayId = requireNonEmptyString(pathname.split('/')[2], 'stayId');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const payload = (await readJsonBody(request)) as { bedId: string; sectorId: string };
    const stay = await inpatient.assignBed(stayId as never, payload as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'assign_bed',
      entityType: 'inpatient-stay',
      entityId: stay.id,
      payloadSummary: `Inpatient stay assigned to sector/bed`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(stay));
    return true;
  }

  // POST /inpatient/:stayId/transfer-bed
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/transfer-bed') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'inpatient.manage');
    const stayId = requireNonEmptyString(pathname.split('/')[2], 'stayId');
    const payload = (await readJsonBody(request)) as { bedId: string; sectorId: string };
    const stay = await inpatient.transferBed(stayId as never, payload as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'transfer_bed',
      entityType: 'inpatient-stay',
      entityId: stay.id,
      payloadSummary: `Inpatient stay transferred to new sector/bed`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(stay));
    return true;
  }

  // PATCH /inpatient/:stayId/update-status
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/update-status') &&
    request.method === 'PATCH'
  ) {
    const principal = rp(request, 'inpatient.manage');
    const stayId = pathname.split('/')[2];
    if (!stayId) { return false; }
    const payload = (await readJsonBody(request)) as {
      status: 'admitted' | 'stable' | 'transferred' | 'discharged';
      dischargeReason?: string;
      transferToUnit?: string;
      transferToWard?: string;
    };
    const stay = inpatient.updateStatus(stayId as never, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'update_status',
      entityType: 'inpatient-stay',
      entityId: stay.id,
      payloadSummary: `Inpatient status updated to ${payload.status}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(stay));
    return true;
  }

  // GET /inpatient/:stayId/progress
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/progress') &&
    request.method === 'GET'
  ) {
    const principal = rp(request, 'inpatient.read');
    const stayId = pathname.split('/')[2];
    if (!stayId) { return false; }
    const progress = inpatient.listProgress(stayId as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ items: progress }));
    return true;
  }

  // POST /inpatient/:stayId/progress
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/progress') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'inpatient.manage');
    const stayId = pathname.split('/')[2];
    if (!stayId) { return false; }
    const payload = (await readJsonBody(request)) as { note: string };
    const progress = inpatient.addProgress(principal.user.id as never, {
      stayId,
      note: payload.note
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'add_progress',
      entityType: 'inpatient-stay',
      entityId: stayId,
      payloadSummary: `Progress note added to inpatient stay`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(progress));
    return true;
  }

  return false;
}
