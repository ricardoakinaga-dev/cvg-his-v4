import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LaboratoryService } from '@cvg-his-v2/module-diagnostics';
import type {
  CreateDiagnosticOrderRequest,
  DiagnosticOrderListResponse,
  LaboratoryEquipmentListResponse,
  LaboratoryReferenceValueListResponse,
  LaboratoryReportTypeListResponse,
  RecordDiagnosticResultRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';

export interface LaboratoryRoutesHandlers {
  laboratory: LaboratoryService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  onOrderCreated?: (order: { encounterId: string; examType: string }, principalUserId: string) => void;
  onOrderStatusChanged?: (
    order: { encounterId: string; examType: string },
    payload: RecordDiagnosticResultRequest,
    principalUserId: string
  ) => void;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function isDiagnosticsBridge(pathname: string): boolean {
  return pathname === '/diagnostics/orders' || pathname.startsWith('/diagnostics/orders/');
}

function resolveModuleName(pathname: string): 'laboratory' | 'diagnostics' {
  return pathname.startsWith('/diagnostics') ? 'diagnostics' : 'laboratory';
}

export async function handleLaboratoryRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: LaboratoryRoutesHandlers
): Promise<boolean> {
  const isLaboratoryPath = pathname.startsWith('/laboratory');
  const isDiagnosticsPath = isDiagnosticsBridge(pathname);
  if (!isLaboratoryPath && !isDiagnosticsPath) {
    return false;
  }

  const { laboratory, audit, requirePrincipal } = handlers;
  const routeModule = resolveModuleName(pathname);

  if (pathname === '/laboratory/summary' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const payload = await laboratory.getDashboardSummary(principal.user.accountId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'summary_read',
      entityType: 'laboratory-summary',
      entityId: 'dashboard',
      payloadSummary: 'Laboratory summary inspected',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if ((pathname === '/laboratory/orders' || pathname === '/diagnostics/orders') && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterId = url.searchParams.get('encounterId') ?? undefined;
    const items = await laboratory.listOrders(principal.user.accountId as never, encounterId);
    const payload: DiagnosticOrderListResponse = { items };

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'list',
      entityType: 'diagnostic-order',
      entityId: encounterId ?? 'all',
      payloadSummary: 'Laboratory orders listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  if ((pathname === '/laboratory/orders' || pathname === '/diagnostics/orders') && request.method === 'POST') {
    const principal = requirePrincipal(request, 'diagnostics.manage');
    const payload = (await readJsonBody(request)) as CreateDiagnosticOrderRequest;
    const order = laboratory.createOrder(payload);
    handlers.onOrderCreated?.(order, principal.user.id);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'create',
      entityType: 'diagnostic-order',
      entityId: order.id,
      payloadSummary: `Laboratory order ${order.examType} created`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, order);
  }

  const resultRouteMatch = pathname.match(
    /^\/(?:laboratory|diagnostics)\/orders\/([^/]+)\/result$/
  );
  if (resultRouteMatch && request.method === 'POST') {
    const principal = requirePrincipal(request, 'diagnostics.manage');
    const orderId = requireNonEmptyString(resultRouteMatch[1], 'diagnosticOrderId');
    const payload = (await readJsonBody(request)) as RecordDiagnosticResultRequest;
    const order = laboratory.recordResult(orderId as never, payload);
    handlers.onOrderStatusChanged?.(order, payload, principal.user.id);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: payload.status,
      entityType: 'diagnostic-order',
      entityId: order.id,
      payloadSummary: `Laboratory order moved to ${payload.status}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, order);
  }

  if (pathname === '/laboratory/equipment' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const payload: LaboratoryEquipmentListResponse = {
      items: await laboratory.listEquipment(principal.user.accountId as never)
    };
    return json(response, 200, payload);
  }

  if (pathname === '/laboratory/report-types' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const payload: LaboratoryReportTypeListResponse = {
      items: await laboratory.listReportTypes(principal.user.accountId as never)
    };
    return json(response, 200, payload);
  }

  if (pathname === '/laboratory/reference-values' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const examType = url.searchParams.get('examType') ?? undefined;
    const payload: LaboratoryReferenceValueListResponse = {
      items: await laboratory.listReferenceValues(principal.user.accountId as never, examType)
    };
    return json(response, 200, payload);
  }

  return false;
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}
