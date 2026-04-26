import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LaboratoryService } from '@cvg-his-v2/module-diagnostics';
import type {
  CreateDiagnosticOrderRequest,
  DiagnosticOrderListResponse,
  ExamCatalogListResponse,
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
  return pathname === '/diagnostics/summary'
    || pathname === '/diagnostics/catalog'
    || pathname === '/diagnostics/results'
    || pathname === '/diagnostics/equipment'
    || pathname === '/diagnostics/report-types'
    || pathname === '/diagnostics/reference-values'
    || pathname === '/diagnostics/orders'
    || pathname.startsWith('/diagnostics/orders/')
    || pathname === '/exam-orders'
    || pathname.startsWith('/exam-orders/')
    || pathname === '/exam-results'
    || pathname.startsWith('/exam-results/');
}

function isLaboratoryOrdersCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/orders',
    '/laboratory/exams',
    '/laboratorio/exames',
    '/laboratorio/atendimentos/exames'
  ].includes(pathname);
}

function isLaboratoryResultsCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/results',
    '/laboratory/reports',
    '/laboratorio/laudos',
    '/laboratorio/atendimentos/laudos'
  ].includes(pathname);
}

function isLaboratoryHemogramsCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/hemograms',
    '/laboratorio/hemogramas',
    '/laboratorio/atendimentos/hemogramas'
  ].includes(pathname);
}

function isLaboratoryUrinalysisCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/urinalysis',
    '/laboratorio/urina',
    '/laboratorio/atendimentos/urina'
  ].includes(pathname);
}

function resolveModuleName(pathname: string): 'laboratory' | 'diagnostics' {
  return pathname.startsWith('/diagnostics') ? 'diagnostics' : 'laboratory';
}

function normalizeSearch(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function createdAtMatchesDate(createdAt: string, dateFilter: string): boolean {
  return createdAt.slice(0, 10) === dateFilter;
}

function dateMatches(value: string | undefined, dateFilter: string): boolean {
  return Boolean(value?.slice(0, 10) === dateFilter);
}

export async function handleLaboratoryRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: LaboratoryRoutesHandlers
): Promise<boolean> {
  const isLaboratoryPath = pathname.startsWith('/laboratory') || pathname.startsWith('/laboratorio');
  const isDiagnosticsPath = isDiagnosticsBridge(pathname);
  if (!isLaboratoryPath && !isDiagnosticsPath) {
    return false;
  }

  const { laboratory, audit, requirePrincipal } = handlers;
  const routeModule = resolveModuleName(pathname);

  if ((pathname === '/laboratory/summary' || pathname === '/diagnostics/summary') && request.method === 'GET') {
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

  if ((pathname === '/laboratory/catalog' || pathname === '/diagnostics/catalog') && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const payload: ExamCatalogListResponse = {
      items: laboratory.listCatalog()
    };

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'catalog_read',
      entityType: 'diagnostic-catalog',
      entityId: 'default',
      payloadSummary: 'Diagnostics catalog inspected',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if ((isLaboratoryOrdersCollectionPath(pathname) || pathname === '/diagnostics/orders') && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterId = url.searchParams.get('encounterId') ?? undefined;
    const patientFilter = normalizeSearch(url.searchParams.get('patientId') ?? url.searchParams.get('animal'));
    const idFilter = normalizeSearch(url.searchParams.get('id'));
    const dateFilter = url.searchParams.get('date') ?? url.searchParams.get('data') ?? undefined;
    const items = (await laboratory.listOrders(principal.user.accountId as never, encounterId)).filter((order) => {
      if (idFilter && !order.id.toLowerCase().includes(idFilter)) return false;
      if (patientFilter && !order.patientId.toLowerCase().includes(patientFilter)) return false;
      if (dateFilter && !createdAtMatchesDate(order.createdAt, dateFilter)) return false;
      return true;
    });
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

  if (pathname === '/exam-orders' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterId = url.searchParams.get('encounterId') ?? undefined;
    const items = await laboratory.listOrders(principal.user.accountId as never, encounterId);
    return json(response, 200, {
      items: items.map((order) => ({
        id: order.id,
        accountId: order.accountId,
        patientId: order.patientId,
        encounterId: order.encounterId,
        category: 'laboratory',
        examName: order.examType,
        examCode: order.examCatalogId ?? null,
        priority: 'routine',
        status:
          order.status === 'requested'
            ? 'requested'
            : order.status === 'collected'
              ? 'collected'
              : order.status === 'resulted'
                ? 'completed'
                : 'cancelled',
        notes: order.reason,
        requestedAt: order.createdAt,
        completedAt: order.status === 'resulted' ? order.updatedAt : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }))
    });
  }

  const orderRouteMatch = pathname.match(/^\/(?:laboratory|diagnostics)\/orders\/([^/]+)$/);
  if (orderRouteMatch && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const orderId = requireNonEmptyString(orderRouteMatch[1], 'diagnosticOrderId');
    const payload = laboratory.getOrder(principal.user.accountId as never, orderId as never);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'read',
      entityType: 'diagnostic-order',
      entityId: orderId,
      payloadSummary: `Laboratory order ${orderId} inspected`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  const examOrderRouteMatch = pathname.match(/^\/exam-orders\/([^/]+)$/);
  if (examOrderRouteMatch && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const order = laboratory.getOrder(principal.user.accountId as never, examOrderRouteMatch[1] as never);
    return json(response, 200, {
      id: order.id,
      accountId: order.accountId,
      patientId: order.patientId,
      encounterId: order.encounterId,
      category: 'laboratory',
      examName: order.examType,
      examCode: order.examCatalogId ?? null,
      priority: 'routine',
      status:
        order.status === 'requested'
          ? 'requested'
          : order.status === 'collected'
            ? 'collected'
            : order.status === 'resulted'
              ? 'completed'
              : 'cancelled',
      notes: order.reason,
      requestedAt: order.createdAt,
      completedAt: order.status === 'resulted' ? order.updatedAt : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });
  }

  if ((isLaboratoryOrdersCollectionPath(pathname) || pathname === '/diagnostics/orders') && request.method === 'POST') {
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

  if (
    (pathname === '/exam-orders' || pathname.match(/^\/encounters\/[^/]+\/exam-orders$/))
    && request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'diagnostics.manage');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const encounterIdFromPath = pathname.match(/^\/encounters\/([^/]+)\/exam-orders$/)?.[1];
    const order = laboratory.createOrder({
      encounterId: encounterIdFromPath ?? String(payload.encounterId ?? ''),
      patientId: String(payload.patientId ?? ''),
      examType: String(payload.examName ?? payload.examType ?? ''),
      examCatalogId: typeof payload.examCode === 'string' ? payload.examCode : undefined,
      reason: String(payload.notes ?? payload.reason ?? 'Pedido criado via surface enterprise')
    });
    handlers.onOrderCreated?.(order, principal.user.id);
    return json(response, 201, {
      id: order.id,
      accountId: order.accountId,
      patientId: order.patientId,
      encounterId: order.encounterId,
      category: 'laboratory',
      examName: order.examType,
      examCode: order.examCatalogId ?? null,
      priority: 'routine',
      status: 'requested',
      notes: order.reason,
      requestedAt: order.createdAt,
      completedAt: null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });
  }

  if (
    (
      isLaboratoryResultsCollectionPath(pathname)
      || isLaboratoryHemogramsCollectionPath(pathname)
      || isLaboratoryUrinalysisCollectionPath(pathname)
      || pathname === '/diagnostics/results'
    )
    && request.method === 'GET'
  ) {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const examType = isLaboratoryHemogramsCollectionPath(pathname)
      ? (url.searchParams.get('examType') ?? 'HEM')
      : isLaboratoryUrinalysisCollectionPath(pathname)
        ? (url.searchParams.get('examType') ?? 'URIN')
      : (url.searchParams.get('examType') ?? undefined);
    const codeFilter = normalizeSearch(url.searchParams.get('code') ?? url.searchParams.get('codigo'));
    const patientFilter = normalizeSearch(url.searchParams.get('patientId') ?? url.searchParams.get('animal'));
    const bodyFilter = normalizeSearch(url.searchParams.get('body') ?? url.searchParams.get('corpo'));
    const finalizedAt = url.searchParams.get('finalizedAt') ?? url.searchParams.get('dataFinalizacao') ?? undefined;
    const enteredAt = url.searchParams.get('enteredAt') ?? url.searchParams.get('dataEntrada') ?? undefined;
    const includeClosed = url.searchParams.get('closed') ?? url.searchParams.get('fechados');
    const items = (await laboratory.listResults(principal.user.accountId as never, examType)).filter((order) => {
      if (codeFilter && !order.id.toLowerCase().includes(codeFilter)) return false;
      if (patientFilter && !order.patientId.toLowerCase().includes(patientFilter)) return false;
      if (bodyFilter && !normalizeSearch(order.resultSummary)?.includes(bodyFilter)) return false;
      if (finalizedAt && !dateMatches(order.updatedAt, finalizedAt)) return false;
      if (enteredAt && !dateMatches(order.createdAt, enteredAt)) return false;
      if (includeClosed === 'false' && order.status === 'resulted') return false;
      return true;
    });
    const payload: DiagnosticOrderListResponse = { items };

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: isLaboratoryHemogramsCollectionPath(pathname)
        ? 'hemograms_list'
        : isLaboratoryUrinalysisCollectionPath(pathname)
          ? 'urinalysis_list'
          : 'results_list',
      entityType: 'diagnostic-order',
      entityId: examType ?? 'all-results',
      payloadSummary: isLaboratoryHemogramsCollectionPath(pathname)
        ? 'Laboratory hemograms listed'
        : isLaboratoryUrinalysisCollectionPath(pathname)
          ? 'Laboratory urinalysis results listed'
        : 'Released laboratory results listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (pathname === '/exam-results' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const examType = url.searchParams.get('category') ?? url.searchParams.get('examType') ?? undefined;
    const items = await laboratory.listResults(principal.user.accountId as never, examType);
    return json(response, 200, {
      items: items.map((order) => ({
        id: order.id,
        accountId: order.accountId,
        patientId: order.patientId,
        examOrderId: order.id,
        category: 'laboratory',
        examName: order.examType,
        examCode: order.examCatalogId ?? null,
        requestedAt: order.createdAt,
        status: order.status === 'resulted' ? 'released' : order.status === 'cancelled' ? 'cancelled' : 'draft',
        findings: order.resultSummary ?? null,
        interpretation: order.resultSummary ?? null,
        resultValues: null,
        normalRange: null,
        performedByUserId: order.collectedByUserId ?? null,
        performedAt: order.status === 'resulted' ? order.updatedAt : null,
        reviewedByUserId: null,
        reviewedAt: null,
        releasedAt: order.status === 'resulted' ? order.updatedAt : null,
        notes: order.reason ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }))
    });
  }

  const examResultRouteMatch = pathname.match(/^\/exam-results\/([^/]+)$/);
  if (examResultRouteMatch && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const order = laboratory.getOrder(principal.user.accountId as never, examResultRouteMatch[1] as never);
    return json(response, 200, {
      id: order.id,
      accountId: order.accountId,
      patientId: order.patientId,
      examOrderId: order.id,
      category: 'laboratory',
      examName: order.examType,
      examCode: order.examCatalogId ?? null,
      requestedAt: order.createdAt,
      status: order.status === 'resulted' ? 'released' : order.status === 'cancelled' ? 'cancelled' : 'draft',
      findings: order.resultSummary ?? null,
      interpretation: order.resultSummary ?? null,
      resultValues: null,
      normalRange: null,
      performedByUserId: order.collectedByUserId ?? null,
      performedAt: order.status === 'resulted' ? order.updatedAt : null,
      reviewedByUserId: null,
      reviewedAt: null,
      releasedAt: order.status === 'resulted' ? order.updatedAt : null,
      notes: order.reason ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });
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

  if (pathname.match(/^\/exam-results\/[^/]+$/) && request.method === 'PATCH') {
    const principal = requirePrincipal(request, 'diagnostics.manage');
    const orderId = requireNonEmptyString(pathname.split('/')[2], 'examResultId');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const status =
      payload.status === 'released'
        ? 'resulted'
        : payload.status === 'cancelled'
          ? 'cancelled'
          : 'collected';
    const order = laboratory.recordResult(orderId as never, {
      status,
      resultSummary:
        typeof payload.findings === 'string'
          ? payload.findings
          : typeof payload.interpretation === 'string'
            ? payload.interpretation
            : undefined,
      resultAttachmentId:
        typeof payload.resultAttachmentId === 'string' ? payload.resultAttachmentId : undefined,
      collectedByUserId: principal.user.id
    });
    handlers.onOrderStatusChanged?.(
      order,
      {
        status,
        resultSummary:
          typeof payload.findings === 'string'
            ? payload.findings
            : typeof payload.interpretation === 'string'
              ? payload.interpretation
              : undefined,
        resultAttachmentId:
          typeof payload.resultAttachmentId === 'string' ? payload.resultAttachmentId : undefined,
        collectedByUserId: principal.user.id
      },
      principal.user.id
    );
    return json(response, 200, {
      id: order.id,
      accountId: order.accountId,
      patientId: order.patientId,
      examOrderId: order.id,
      category: 'laboratory',
      examName: order.examType,
      examCode: order.examCatalogId ?? null,
      requestedAt: order.createdAt,
      status: order.status === 'resulted' ? 'released' : order.status === 'cancelled' ? 'cancelled' : 'draft',
      findings: order.resultSummary ?? null,
      interpretation: order.resultSummary ?? null,
      resultValues: null,
      normalRange: null,
      performedByUserId: order.collectedByUserId ?? null,
      performedAt: order.status === 'resulted' ? order.updatedAt : null,
      reviewedByUserId: null,
      reviewedAt: null,
      releasedAt: order.status === 'resulted' ? order.updatedAt : null,
      notes: order.reason ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });
  }

  if ((pathname === '/laboratory/equipment' || pathname === '/diagnostics/equipment') && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const payload: LaboratoryEquipmentListResponse = {
      items: await laboratory.listEquipment(principal.user.accountId as never)
    };
    return json(response, 200, payload);
  }

  if ((pathname === '/laboratory/report-types' || pathname === '/diagnostics/report-types') && request.method === 'GET') {
    const principal = requirePrincipal(request, 'diagnostics.read');
    const payload: LaboratoryReportTypeListResponse = {
      items: await laboratory.listReportTypes(principal.user.accountId as never)
    };
    return json(response, 200, payload);
  }

  if (
    (pathname === '/laboratory/reference-values' || pathname === '/diagnostics/reference-values')
    && request.method === 'GET'
  ) {
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
