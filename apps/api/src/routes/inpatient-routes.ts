/**
 * Inpatient route handlers — sectors, beds, inpatient stays.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { InpatientService } from '@cvg-his-v2/module-inpatient';
import type { SectorBedService } from '@cvg-his-v2/module-inpatient';
import type {
  CreateSectorRequest,
  CreateBedRequest,
  UpdateBedRequest,
  InpatientDailyChargeWorklistResponse,
  InpatientHandoverPreviewResponse,
  AddInpatientOccurrenceRequest,
  CreateInpatientDailyChargeRequest,
  MarkInpatientDailyChargeBilledRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type {
  InpatientProgressSummary,
  InpatientStaySummary
} from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

const bedCollectionPaths = new Set(['/beds', '/boxes-de-internacao', '/box-internacao']);

function parseBedId(pathname: string): string | null {
  const match = pathname.match(/^\/beds\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export interface InpatientRoutesHandlers {
  inpatient: InpatientService;
  billing?: BillingService;
  sectorBedService: SectorBedService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  onProgressAdded?: (event: {
    stay: InpatientStaySummary;
    progress: InpatientProgressSummary;
    principal: AuthenticatedPrincipal;
  }) => void;
  onStatusUpdated?: (event: {
    stay: InpatientStaySummary;
    previousStatus: InpatientStaySummary['status'];
    principal: AuthenticatedPrincipal;
  }) => void;
}

export async function handleInpatientRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InpatientRoutesHandlers
): Promise<boolean> {
  const { inpatient, billing, sectorBedService, audit, requirePrincipal: rp } = handlers;

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
  if (bedCollectionPaths.has(pathname) && request.method === 'GET') {
    const principal = rp(request, 'inpatient.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const sectorId = url.searchParams.get('sectorId') ?? undefined;
    const code = normalizeSearch(url.searchParams.get('code'));
    const description = normalizeSearch(url.searchParams.get('description') ?? url.searchParams.get('name'));
    const activeOnly = url.searchParams.get('active') !== 'false';
    const items = await sectorBedService.listBeds(
      principal.user.accountId as never,
      sectorId as never
    );
    const filteredItems = items.filter((bed) => {
      const matchesCode = !code || normalizeSearch(bed.code).includes(code);
      const matchesDescription = !description || normalizeSearch(bed.name).includes(description);
      const matchesActive = !activeOnly || bed.active;
      return matchesCode && matchesDescription && matchesActive;
    });
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
        items: filteredItems
      })
    );
    return true;
  }

  // POST /beds
  if (bedCollectionPaths.has(pathname) && request.method === 'POST') {
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

  const bedId = parseBedId(pathname);

  // GET /beds/:id
  if (bedId && request.method === 'GET') {
    const principal = rp(request, 'inpatient.read');
    const bed = await sectorBedService.getBedForAccountOrThrow(
      principal.user.accountId as never,
      bedId as never
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'beds',
      action: 'read',
      entityType: 'bed',
      entityId: bed.id,
      payloadSummary: `Bed ${bed.name} opened`,
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(bed));
    return true;
  }

  // PATCH /beds/:id
  if (bedId && request.method === 'PATCH') {
    const principal = rp(request, 'inpatient.manage');
    const payload = (await readJsonBody(request)) as UpdateBedRequest;
    const bed = await sectorBedService.updateBed(
      principal.user.accountId as never,
      bedId as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'beds',
      action: 'update',
      entityType: 'bed',
      entityId: bed.id,
      payloadSummary: `Bed ${bed.name} updated`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(bed));
    return true;
  }

  // DELETE /beds/:id
  if (bedId && request.method === 'DELETE') {
    const principal = rp(request, 'inpatient.manage');
    await sectorBedService.archiveBed(principal.user.accountId as never, bedId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'beds',
      action: 'archive',
      entityType: 'bed',
      entityId: bedId,
      payloadSummary: `Bed ${bedId} archived`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 204;
    response.end();
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

  // GET /inpatient/daily-charges/worklist
  if (pathname === '/inpatient/daily-charges/worklist' && request.method === 'GET') {
    const principal = rp(request, 'inpatient.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const status = url.searchParams.get('status') || undefined;
    const items = inpatient.listDailyChargeWorklist({
      status: status as never,
      unit: url.searchParams.get('unit') || undefined,
      ward: url.searchParams.get('ward') || undefined
    });
    const payload: InpatientDailyChargeWorklistResponse = {
      items,
      totalPendingAmount: items
        .filter((item) => item.status === 'pending')
        .reduce((sum, item) => sum + item.totalAmount, 0),
      totalBilledAmount: items
        .filter((item) => item.status === 'billed')
        .reduce((sum, item) => sum + item.totalAmount, 0)
    };
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'list_daily_charge_worklist',
      entityType: 'inpatient-daily-charge',
      entityId: status ?? 'all',
      payloadSummary: `Inpatient daily charge worklist listed with ${payload.items.length} item(s)`,
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
    const previousStay = inpatient.getOrThrow(stayId as never);
    const stay = inpatient.updateStatus(stayId as never, payload);
    handlers.onStatusUpdated?.({
      stay,
      previousStatus: previousStay.status,
      principal
    });
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

  // GET /inpatient/:stayId/occurrences
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/occurrences') &&
    request.method === 'GET'
  ) {
    const principal = rp(request, 'inpatient.read');
    const stayId = pathname.split('/')[2];
    if (!stayId) { return false; }
    const occurrences = inpatient.listOccurrences(stayId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'list_occurrences',
      entityType: 'inpatient-stay',
      entityId: stayId,
      payloadSummary: `Inpatient occurrences listed`,
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items: occurrences }));
    return true;
  }

  // POST /inpatient/:stayId/occurrences
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/occurrences') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'inpatient.manage');
    const stayId = pathname.split('/')[2];
    if (!stayId) { return false; }
    const payload = (await readJsonBody(request)) as Omit<AddInpatientOccurrenceRequest, 'stayId'>;
    const occurrence = inpatient.addOccurrence(principal.user.id as never, {
      ...payload,
      stayId
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'add_occurrence',
      entityType: 'inpatient-stay',
      entityId: stayId,
      payloadSummary: `Inpatient occurrence added: ${occurrence.title}`,
      riskLevel: occurrence.severity === 'critical' ? 'high' : 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(occurrence));
    return true;
  }

  // GET /inpatient/:stayId/daily-charges
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/daily-charges') &&
    request.method === 'GET'
  ) {
    const principal = rp(request, 'inpatient.read');
    const stayId = pathname.split('/')[2];
    if (!stayId) { return false; }
    const charges = inpatient.listDailyCharges(stayId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'list_daily_charges',
      entityType: 'inpatient-stay',
      entityId: stayId,
      payloadSummary: `Inpatient daily charges listed`,
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items: charges }));
    return true;
  }

  // POST /inpatient/:stayId/daily-charges
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.endsWith('/daily-charges') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'inpatient.manage');
    const stayId = pathname.split('/')[2];
    if (!stayId) { return false; }
    const payload = (await readJsonBody(request)) as Omit<CreateInpatientDailyChargeRequest, 'stayId'>;
    const charge = inpatient.createDailyCharge(principal.user.id as never, {
      ...payload,
      stayId
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'create_daily_charge',
      entityType: 'inpatient-stay',
      entityId: stayId,
      payloadSummary: `Inpatient daily charge created: ${charge.description}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(charge));
    return true;
  }

  // POST /inpatient/:stayId/daily-charges/:chargeId/bill
  if (
    pathname.startsWith('/inpatient/') &&
    pathname.includes('/daily-charges/') &&
    pathname.endsWith('/bill') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'inpatient.manage');
    const parts = pathname.split('/');
    const stayId = parts[2];
    const chargeId = parts[4];
    if (!stayId || !chargeId) { return false; }
    const payload = (await readJsonBody(request)) as MarkInpatientDailyChargeBilledRequest;
    const pendingCharge = inpatient
      .listDailyCharges(stayId as never)
      .find((item) => item.id === chargeId);
    let billingRecordId = payload.billingRecordId;

    if (billing && pendingCharge && pendingCharge.status === 'pending') {
      const billingItem = await billing.addItem(principal.user.id as never, {
        encounterId: pendingCharge.encounterId,
        itemType: 'daily_rate',
        description: pendingCharge.description,
        quantity: pendingCharge.quantity,
        unitPriceAmount: pendingCharge.unitAmount,
        sourceEntityType: 'inpatient_daily_charge',
        sourceEntityId: pendingCharge.id
      });
      billingRecordId = billingItem.billingRecordId;
    }

    const charge = inpatient.markDailyChargeBilled(stayId as never, chargeId as never, {
      ...payload,
      billingRecordId
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inpatient',
      action: 'bill_daily_charge',
      entityType: 'inpatient-daily-charge',
      entityId: charge.id,
      payloadSummary: `Inpatient daily charge billed`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(charge));
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
    handlers.onProgressAdded?.({
      stay: inpatient.getOrThrow(stayId as never),
      progress,
      principal
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
