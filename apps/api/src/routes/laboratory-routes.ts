import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  LaboratoryService,
  LaboratoryWorkflowTransitionRequest
} from '@cvg-his-v2/module-diagnostics';
import { normalizeLaboratoryResultValues } from '@cvg-his-v2/module-diagnostics';
import type {
  CreateDiagnosticOrderRequest,
  CreateLaboratoryEquipmentRequest,
  CreateLaboratoryReferenceValueRequest,
  CreateLaboratoryReportTypeRequest,
  DiagnosticOrderListResponse,
  ExamCatalogListResponse,
  LaboratoryEquipmentListResponse,
  LaboratoryReferenceValueListResponse,
  LaboratoryReportTypeListResponse,
  RecordDiagnosticResultRequest,
  UpdateLaboratoryEquipmentRequest,
  UpdateLaboratoryReferenceValueRequest,
  UpdateLaboratoryReportTypeRequest
} from '@cvg-his-v2/shared-contracts';
import { ForbiddenError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody as readLimitedJsonBody } from '../helpers/common.js';

export interface LaboratoryRoutesHandlers {
  laboratory: LaboratoryService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
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

function isLaboratoryBiochemistryCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/biochemistry',
    '/laboratorio/bioquimico',
    '/laboratorio/atendimentos/bioquimico'
  ].includes(pathname);
}

function isLaboratoryEquipmentCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/equipment',
    '/diagnostics/equipment',
    '/laboratorio/equipamentos',
    '/laboratorio/cadastros/equipamentos'
  ].includes(pathname);
}

function isLaboratoryReportTypeCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/report-types',
    '/diagnostics/report-types',
    '/laboratorio/tipos-de-laudo',
    '/laboratorio/cadastros/tipos-de-laudo'
  ].includes(pathname);
}

function isLaboratoryHemogramReferenceValueCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/hemogram-reference-values',
    '/laboratorio/vlr-ref-hemograma',
    '/laboratorio/cadastros/vlr-ref-hemograma'
  ].includes(pathname);
}

function isLaboratoryBiochemistryReferenceValueCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/biochemistry-reference-values',
    '/laboratorio/vlr-ref-bioquimico',
    '/laboratorio/cadastros/vlr-ref-bioquimico'
  ].includes(pathname);
}

function isLaboratoryReferenceValueCollectionPath(pathname: string): boolean {
  return [
    '/laboratory/reference-values',
    '/diagnostics/reference-values',
    '/laboratory/hemogram-reference-values',
    '/laboratorio/vlr-ref-hemograma',
    '/laboratorio/cadastros/vlr-ref-hemograma',
    '/laboratory/biochemistry-reference-values',
    '/laboratorio/vlr-ref-bioquimico',
    '/laboratorio/cadastros/vlr-ref-bioquimico'
  ].includes(pathname);
}

function resolveModuleName(pathname: string): 'laboratory' | 'diagnostics' {
  return pathname.startsWith('/diagnostics') ? 'diagnostics' : 'laboratory';
}

function normalizeSearch(value: string | null | undefined): string | undefined {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized ? normalized : undefined;
}

function laboratoryResultSearchText(order: {
  readonly resultSummary?: string;
  readonly resultValues?: readonly {
    readonly parameter: string;
    readonly value: string;
    readonly unit?: string;
    readonly reference?: string;
  }[];
}): string {
  const parts = [
    order.resultSummary,
    ...(order.resultValues ?? []).flatMap((result) => [
      result.parameter,
      result.value,
      result.unit,
      result.reference
    ])
  ].filter((part): part is string => Boolean(part));
  return normalizeSearch(parts.join(' ')) ?? '';
}

function createdAtMatchesDate(createdAt: string, dateFilter: string): boolean {
  return createdAt.slice(0, 10) === dateFilter;
}

function dateMatches(value: string | undefined, dateFilter: string): boolean {
  return Boolean(value?.slice(0, 10) === dateFilter);
}

function escapeHtml(value: string | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReportDate(value: string | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
}

function buildPrintableLaboratoryReportHtml(order: ReturnType<LaboratoryService['getOrder']>): string {
  const resultValuesMarkup = order.resultValues?.length
    ? `<table class="result-table">
        <thead><tr><th>Parâmetro</th><th>Valor</th><th>Unidade</th><th>Referência</th><th>Status</th></tr></thead>
        <tbody>${order.resultValues.map((result) => `<tr>
          <td>${escapeHtml(result.parameter)}</td>
          <td>${escapeHtml(result.value)}</td>
          <td>${escapeHtml(result.unit ?? '-')}</td>
          <td>${escapeHtml(result.reference ?? '-')}</td>
          <td>${result.outOfRange ? 'Fora da faixa' : 'Dentro da faixa'}</td>
        </tr>`).join('')}</tbody>
      </table>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Laudo Laboratorial ${escapeHtml(order.id)}</title>
  <style>
    body { color: #0f172a; font-family: Arial, sans-serif; margin: 32px; }
    header { border-bottom: 2px solid #0f766e; margin-bottom: 24px; padding-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 8px 16px; }
    dt { color: #475569; font-weight: 700; }
    dd { margin: 0; }
    .result { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; white-space: pre-wrap; }
    .result-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .result-table th, .result-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    .result-table th { background: #f8fafc; }
    .signature { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 24px; padding: 16px; }
    .hash { font-family: monospace; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <header>
    <h1>Laudo Laboratorial</h1>
    <div>CVG-HIS v4 Premium Enterprise</div>
  </header>
  <section>
    <h2>Identificacao</h2>
    <dl>
      <dt>Codigo do laudo</dt><dd>${escapeHtml(order.id)}</dd>
      <dt>Conta</dt><dd>${escapeHtml(order.accountId)}</dd>
      <dt>Atendimento</dt><dd>${escapeHtml(order.encounterId)}</dd>
      <dt>Paciente</dt><dd>${escapeHtml(order.patientId)}</dd>
      <dt>Exame</dt><dd>${escapeHtml(order.examType)}</dd>
      <dt>Catalogo</dt><dd>${escapeHtml(order.examCatalogId ?? '-')}</dd>
      <dt>Solicitacao</dt><dd>${formatReportDate(order.createdAt)}</dd>
      <dt>Coleta</dt><dd>${formatReportDate(order.collectedAt)}</dd>
      <dt>Liberacao</dt><dd>${formatReportDate(order.resultedAt ?? order.updatedAt)}</dd>
    </dl>
  </section>
  <section>
    <h2>Resultado</h2>
    <div class="result">${escapeHtml(order.resultSummary ?? 'Resultado disponível em anexo.')}</div>
    ${resultValuesMarkup}
  </section>
  <section class="signature">
    <h2>Assinatura e auditoria</h2>
    <dl>
      <dt>Liberado por</dt><dd>${escapeHtml(order.releasedByUserId ?? '-')}</dd>
      <dt>Responsavel tecnico</dt><dd>${escapeHtml(order.signedByUserId ?? '-')}</dd>
      <dt>Anexo</dt><dd>${escapeHtml(order.resultAttachmentId ?? '-')}</dd>
      <dt>Hash da assinatura</dt><dd class="hash">${escapeHtml(order.signatureHash ?? '-')}</dd>
    </dl>
  </section>
</body>
</html>`;
}

function normalizeEquipmentStatus(value: unknown): 'active' | 'maintenance' {
  return value === 'maintenance' ? 'maintenance' : 'active';
}

function normalizeCalibrationDate(value: unknown): string {
  const date = new Date(requireNonEmptyString(String(value ?? ''), 'lastCalibrationAt'));
  if (Number.isNaN(date.getTime())) {
    throw new Error('lastCalibrationAt must be a valid date');
  }
  return date.toISOString();
}

function parseCreateEquipmentPayload(payload: Record<string, unknown>): CreateLaboratoryEquipmentRequest {
  return {
    name: requireNonEmptyString(String(payload.name ?? ''), 'name'),
    type: requireNonEmptyString(String(payload.type ?? ''), 'type'),
    serialNumber: requireNonEmptyString(String(payload.serialNumber ?? ''), 'serialNumber'),
    status: normalizeEquipmentStatus(payload.status),
    lastCalibrationAt: normalizeCalibrationDate(payload.lastCalibrationAt)
  };
}

function parseUpdateEquipmentPayload(payload: Record<string, unknown>): UpdateLaboratoryEquipmentRequest {
  const update: {
    name?: string;
    type?: string;
    serialNumber?: string;
    status?: 'active' | 'maintenance';
    lastCalibrationAt?: string;
  } = {};
  if (payload.name !== undefined) update.name = requireNonEmptyString(String(payload.name), 'name');
  if (payload.type !== undefined) update.type = requireNonEmptyString(String(payload.type), 'type');
  if (payload.serialNumber !== undefined) {
    update.serialNumber = requireNonEmptyString(String(payload.serialNumber), 'serialNumber');
  }
  if (payload.status !== undefined) update.status = normalizeEquipmentStatus(payload.status);
  if (payload.lastCalibrationAt !== undefined) {
    update.lastCalibrationAt = normalizeCalibrationDate(payload.lastCalibrationAt);
  }
  return update;
}

function normalizeReportTypeCode(value: unknown): string {
  return requireNonEmptyString(String(value ?? ''), 'code').trim().toUpperCase();
}

function normalizeReportTypeActive(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? 'true').trim().toLowerCase();
  return !['false', '0', 'inactive', 'inativo'].includes(normalized);
}

function parseCreateReportTypePayload(payload: Record<string, unknown>): CreateLaboratoryReportTypeRequest {
  return {
    name: requireNonEmptyString(String(payload.name ?? ''), 'name'),
    code: normalizeReportTypeCode(payload.code),
    category: requireNonEmptyString(String(payload.category ?? ''), 'category'),
    description: requireNonEmptyString(String(payload.description ?? ''), 'description'),
    active: normalizeReportTypeActive(payload.active)
  };
}

function parseUpdateReportTypePayload(payload: Record<string, unknown>): UpdateLaboratoryReportTypeRequest {
  const update: {
    name?: string;
    code?: string;
    category?: string;
    description?: string;
    active?: boolean;
  } = {};
  if (payload.name !== undefined) update.name = requireNonEmptyString(String(payload.name), 'name');
  if (payload.code !== undefined) update.code = normalizeReportTypeCode(payload.code);
  if (payload.category !== undefined) {
    update.category = requireNonEmptyString(String(payload.category), 'category');
  }
  if (payload.description !== undefined) {
    update.description = requireNonEmptyString(String(payload.description), 'description');
  }
  if (payload.active !== undefined) update.active = normalizeReportTypeActive(payload.active);
  return update;
}

function normalizeReferenceValueNumber(value: unknown, fieldName: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return normalized;
}

function normalizeReferenceExamType(value: unknown, fallback: string): string {
  return requireNonEmptyString(String(value ?? fallback), 'examType').trim().toUpperCase();
}

function parseCreateReferenceValuePayload(
  payload: Record<string, unknown>,
  fallbackExamType: string
): CreateLaboratoryReferenceValueRequest {
  const minValue = normalizeReferenceValueNumber(payload.minValue, 'minValue');
  const maxValue = normalizeReferenceValueNumber(payload.maxValue, 'maxValue');
  if (minValue > maxValue) {
    throw new Error('minValue must be less than or equal to maxValue');
  }

  return {
    parameter: requireNonEmptyString(String(payload.parameter ?? ''), 'parameter'),
    examType: normalizeReferenceExamType(payload.examType, fallbackExamType),
    minValue,
    maxValue,
    unit: requireNonEmptyString(String(payload.unit ?? ''), 'unit')
  };
}

function parseUpdateReferenceValuePayload(payload: Record<string, unknown>): UpdateLaboratoryReferenceValueRequest {
  const update: {
    parameter?: string;
    examType?: string;
    minValue?: number;
    maxValue?: number;
    unit?: string;
  } = {};
  if (payload.parameter !== undefined) {
    update.parameter = requireNonEmptyString(String(payload.parameter), 'parameter');
  }
  if (payload.examType !== undefined) update.examType = normalizeReferenceExamType(payload.examType, 'HEM');
  if (payload.minValue !== undefined) {
    update.minValue = normalizeReferenceValueNumber(payload.minValue, 'minValue');
  }
  if (payload.maxValue !== undefined) {
    update.maxValue = normalizeReferenceValueNumber(payload.maxValue, 'maxValue');
  }
  if (payload.unit !== undefined) update.unit = requireNonEmptyString(String(payload.unit), 'unit');
  if (update.minValue !== undefined && update.maxValue !== undefined && update.minValue > update.maxValue) {
    throw new Error('minValue must be less than or equal to maxValue');
  }
  return update;
}

function parseCanonicalLaboratoryTransition(
  payload: Record<string, unknown>,
  principalUserId: string,
  idempotencyKey: string
): LaboratoryWorkflowTransitionRequest {
  const status = payload.status;
  if (Object.hasOwn(payload, 'signedByUserId') || Object.hasOwn(payload, 'signatureHash')) {
    throw new ValidationError(
      'Laboratory signer and signature fields are server-generated from the authenticated principal'
    );
  }
  if (status === 'collected') {
    return {
      status,
      collectedByUserId: principalUserId,
      idempotencyKey
    };
  }
  if (status === 'in_analysis') {
    return {
      status,
      actorUserId: principalUserId,
      idempotencyKey
    };
  }
  if (status === 'reported') {
    return {
      status,
      resultSummary: typeof payload.resultSummary === 'string' ? payload.resultSummary : undefined,
      resultValues: normalizeLaboratoryResultValues(payload.resultValues),
      resultAttachmentId:
        typeof payload.resultAttachmentId === 'string' ? payload.resultAttachmentId : undefined,
      actorUserId: principalUserId,
      idempotencyKey
    };
  }
  if (status === 'delivered') {
    return {
      status,
      deliveredByUserId: principalUserId,
      deliveryChannel: requireNonEmptyString(
        String(payload.deliveryChannel ?? payload.channel ?? ''),
        'deliveryChannel'
      ),
      deliveredAt: typeof payload.deliveredAt === 'string' ? payload.deliveredAt : undefined,
      idempotencyKey
    };
  }
  if (status === 'cancelled') {
    return {
      status,
      cancelledByUserId: principalUserId,
      cancellationReason:
        typeof payload.cancellationReason === 'string' ? payload.cancellationReason : undefined,
      idempotencyKey
    };
  }
  throw new Error(`Unsupported laboratory status '${String(status ?? '')}'`);
}

function requireEnabledLaboratorySigner(principal: AuthenticatedPrincipal): string {
  const staff = principal.staff;
  const hasEnabledProfessionalStaff = principal.user.status === 'active'
    && !!staff
    && staff.accountId === principal.user.accountId
    && staff.userId === principal.user.id
    && staff.status === 'active'
    && typeof staff.professionId === 'string'
    && staff.professionId.trim().length > 0;
  if (!hasEnabledProfessionalStaff) {
    throw new ForbiddenError(
      'Laboratory result requires an enabled professional/staff principal'
    );
  }
  return principal.user.id;
}

function requireLaboratoryIdempotencyKey(request: IncomingMessage): string {
  const raw = request.headers?.['idempotency-key'];
  const value = Array.isArray(raw) ? undefined : raw;
  const key = requireNonEmptyString(value ?? '', 'idempotency-key').trim();
  if (key.length > 255 || /[\u0000-\u001f\u007f]/u.test(key)) {
    throw new ValidationError('idempotency-key must contain 1 to 255 printable characters');
  }
  return key;
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
    const principal = await requirePrincipal(request, 'diagnostics.read');
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
    const principal = await requirePrincipal(request, 'diagnostics.read');
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
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterId = url.searchParams.get('encounterId') ?? undefined;
    const patientFilter = normalizeSearch(url.searchParams.get('patientId') ?? url.searchParams.get('animal'));
    const idFilter = normalizeSearch(url.searchParams.get('id'));
    const dateFilter = url.searchParams.get('date') ?? url.searchParams.get('data') ?? undefined;
    const sourceItems = pathname === '/diagnostics/orders'
      ? await laboratory.listOrders(principal.user.accountId as never, encounterId)
      : await laboratory.listWorkflowOrders(principal.user.accountId as never, encounterId);
    const items = sourceItems.filter((order) => {
      if (idFilter && !order.id.toLowerCase().includes(idFilter)) return false;
      if (patientFilter && !order.patientId.toLowerCase().includes(patientFilter)) return false;
      if (dateFilter && !createdAtMatchesDate(order.createdAt, dateFilter)) return false;
      return true;
    });
    const payload = { items };

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
    const principal = await requirePrincipal(request, 'diagnostics.read');
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
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const orderId = requireNonEmptyString(orderRouteMatch[1], 'diagnosticOrderId');
    const payload = pathname.startsWith('/laboratory/')
      ? laboratory.getWorkflowOrder(principal.user.accountId as never, orderId as never)
      : laboratory.getOrder(principal.user.accountId as never, orderId as never);

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
    const principal = await requirePrincipal(request, 'diagnostics.read');
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
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const payload = (await readJsonBody(request)) as CreateDiagnosticOrderRequest;
    const order = await laboratory.createOrderAndPersistForAccount(
      principal.user.accountId as never,
      payload
    );
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
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const encounterIdFromPath = pathname.match(/^\/encounters\/([^/]+)\/exam-orders$/)?.[1];
    const order = await laboratory.createOrderAndPersistForAccount(
      principal.user.accountId as never,
      {
        encounterId: encounterIdFromPath ?? String(payload.encounterId ?? ''),
        patientId: String(payload.patientId ?? ''),
        examType: String(payload.examName ?? payload.examType ?? ''),
        examCatalogId: typeof payload.examCode === 'string' ? payload.examCode : undefined,
        reason: String(payload.notes ?? payload.reason ?? 'Pedido criado via surface enterprise')
      }
    );
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
      || isLaboratoryBiochemistryCollectionPath(pathname)
      || pathname === '/diagnostics/results'
    )
    && request.method === 'GET'
  ) {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const examType = isLaboratoryHemogramsCollectionPath(pathname)
      ? (url.searchParams.get('examType') ?? 'HEM')
      : isLaboratoryUrinalysisCollectionPath(pathname)
        ? (url.searchParams.get('examType') ?? 'URIN')
        : isLaboratoryBiochemistryCollectionPath(pathname)
          ? (url.searchParams.get('examType') ?? 'BIO')
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
      if (bodyFilter && !laboratoryResultSearchText(order).includes(bodyFilter)) return false;
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
          : isLaboratoryBiochemistryCollectionPath(pathname)
            ? 'biochemistry_list'
            : 'results_list',
      entityType: 'diagnostic-order',
      entityId: examType ?? 'all-results',
      payloadSummary: isLaboratoryHemogramsCollectionPath(pathname)
        ? 'Laboratory hemograms listed'
        : isLaboratoryUrinalysisCollectionPath(pathname)
          ? 'Laboratory urinalysis results listed'
          : isLaboratoryBiochemistryCollectionPath(pathname)
            ? 'Laboratory biochemistry results listed'
            : 'Released laboratory results listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (pathname === '/exam-results' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
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
        resultValues: order.resultValues ?? null,
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
    const principal = await requirePrincipal(request, 'diagnostics.read');
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
      resultValues: order.resultValues ?? null,
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

  const printableReportMatch = pathname.match(
    /^\/(?:laboratory\/reports|laboratorio\/atendimentos\/laudos|exam-results)\/([^/]+)\/print$/
  );
  if (printableReportMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const orderId = requireNonEmptyString(printableReportMatch[1], 'diagnosticOrderId');
    const order = laboratory.getOrder(principal.user.accountId as never, orderId as never);
    if (order.status !== 'resulted') {
      throw new Error('Only released laboratory reports can be printed');
    }
    const html = buildPrintableLaboratoryReportHtml(order);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'report_print',
      entityType: 'diagnostic-order',
      entityId: order.id,
      payloadSummary: `Laboratory report ${order.id} printable HTML generated`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, { html });
  }

  const resultRouteMatch = pathname.match(
    /^\/(?:laboratory|diagnostics)\/orders\/([^/]+)\/result$/
  );
  if (resultRouteMatch && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const orderId = requireNonEmptyString(resultRouteMatch[1], 'diagnosticOrderId');
    const idempotencyKey = requireLaboratoryIdempotencyKey(request);
    const incomingPayload = (await readJsonBody(request)) as Record<string, unknown>;
    const canonicalStatus = incomingPayload.status;
    if (
      canonicalStatus === 'collected'
      || canonicalStatus === 'in_analysis'
      || canonicalStatus === 'reported'
      || canonicalStatus === 'cancelled'
      || canonicalStatus === 'delivered'
    ) {
      if (canonicalStatus === 'reported') {
        requireEnabledLaboratorySigner(principal);
      }
      const transition = parseCanonicalLaboratoryTransition(
        incomingPayload,
        principal.user.id,
        idempotencyKey
      );
      const order = await laboratory.transitionOrderAndPersistForAccount(
        principal.user.accountId as never,
        orderId as never,
        transition
      );
      const callbackStatus: RecordDiagnosticResultRequest['status'] =
        transition.status === 'reported' || transition.status === 'delivered'
          ? 'resulted'
          : transition.status === 'in_analysis'
            ? 'collected'
            : transition.status;
      handlers.onOrderStatusChanged?.(
        order,
        {
          status: callbackStatus,
          resultSummary: order.resultSummary,
          resultValues: order.resultValues,
          resultAttachmentId: order.resultAttachmentId,
          collectedByUserId: order.collectedByUserId,
          releasedByUserId: order.releasedByUserId,
          signedByUserId: order.signedByUserId
        },
        principal.user.id
      );
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: routeModule,
        action: transition.status,
        entityType: 'diagnostic-order',
        entityId: order.id,
        payloadSummary: `Laboratory order moved to ${transition.status}`,
        riskLevel: 'high',
        correlationId
      });
      return json(response, 200, order);
    }

    if (canonicalStatus !== 'resulted') {
      throw new Error(`Unsupported laboratory status '${String(canonicalStatus ?? '')}'`);
    }

    requireEnabledLaboratorySigner(principal);
    if (Object.hasOwn(incomingPayload, 'signedByUserId') || Object.hasOwn(incomingPayload, 'signatureHash')) {
      throw new ValidationError(
        'Laboratory signer and signature fields are server-generated from the authenticated principal'
      );
    }
    const payload: RecordDiagnosticResultRequest & { readonly idempotencyKey: string } = {
      status: 'resulted',
      resultSummary: typeof incomingPayload.resultSummary === 'string'
        ? incomingPayload.resultSummary
        : undefined,
      resultValues: normalizeLaboratoryResultValues(incomingPayload.resultValues),
      resultAttachmentId: typeof incomingPayload.resultAttachmentId === 'string'
        ? incomingPayload.resultAttachmentId
        : undefined,
      releasedByUserId: principal.user.id,
      idempotencyKey
    };
    const order = await laboratory.recordResultAndPersistForAccount(
      principal.user.accountId as never,
      orderId as never,
      payload
    );
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

  const recollectRouteMatch = pathname.match(/^\/laboratory\/orders\/([^/]+)\/recollect$/);
  if (recollectRouteMatch && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const orderId = requireNonEmptyString(recollectRouteMatch[1], 'diagnosticOrderId');
    const idempotencyKey = requireLaboratoryIdempotencyKey(request);
    const incomingPayload = (await readJsonBody(request)) as Record<string, unknown>;
    const order = await laboratory.recollectOrderAndPersistForAccount(
      principal.user.accountId as never,
      orderId as never,
      {
        reason: requireNonEmptyString(String(incomingPayload.reason ?? ''), 'reason'),
        collectedByUserId: principal.user.id,
        idempotencyKey
      }
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'recollected',
      entityType: 'diagnostic-order',
      entityId: order.id,
      payloadSummary: `Laboratory order ${order.id} recollected (attempt ${order.collectionAttempt})`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, order);
  }

  const deliverRouteMatch = pathname.match(/^\/laboratory\/orders\/([^/]+)\/deliver$/);
  if (deliverRouteMatch && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const orderId = requireNonEmptyString(deliverRouteMatch[1], 'diagnosticOrderId');
    const idempotencyKey = requireLaboratoryIdempotencyKey(request);
    const incomingPayload = (await readJsonBody(request)) as Record<string, unknown>;
    const order = await laboratory.transitionOrderAndPersistForAccount(
      principal.user.accountId as never,
      orderId as never,
      {
        status: 'delivered',
        deliveredByUserId: principal.user.id,
        deliveryChannel: requireNonEmptyString(
          String(incomingPayload.deliveryChannel ?? incomingPayload.channel ?? ''),
          'deliveryChannel'
        ),
        deliveredAt: typeof incomingPayload.deliveredAt === 'string'
          ? incomingPayload.deliveredAt
          : undefined,
        idempotencyKey
      }
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'delivered',
      entityType: 'diagnostic-order',
      entityId: order.id,
      payloadSummary: `Laboratory order ${order.id} delivered via ${order.deliveryChannel}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, order);
  }

  if (pathname.match(/^\/exam-results\/[^/]+$/) && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const orderId = requireNonEmptyString(pathname.split('/')[2], 'examResultId');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const status =
      payload.status === 'released'
        ? 'resulted'
        : payload.status === 'cancelled'
          ? 'cancelled'
          : 'collected';
    const order = await laboratory.recordResultAndPersistForAccount(
      principal.user.accountId as never,
      orderId as never,
      {
        status,
        resultSummary:
          typeof payload.findings === 'string'
            ? payload.findings
            : typeof payload.interpretation === 'string'
              ? payload.interpretation
              : undefined,
        resultValues: normalizeLaboratoryResultValues(payload.resultValues),
        resultAttachmentId:
          typeof payload.resultAttachmentId === 'string' ? payload.resultAttachmentId : undefined,
        collectedByUserId: principal.user.id,
        releasedByUserId: status === 'resulted' ? principal.user.id : undefined,
        signedByUserId:
          status === 'resulted'
            ? typeof payload.signedByUserId === 'string'
              ? payload.signedByUserId
              : principal.user.id
            : undefined
      }
    );
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
        resultValues: normalizeLaboratoryResultValues(payload.resultValues),
        resultAttachmentId:
          typeof payload.resultAttachmentId === 'string' ? payload.resultAttachmentId : undefined,
        collectedByUserId: principal.user.id,
        releasedByUserId: status === 'resulted' ? principal.user.id : undefined,
        signedByUserId:
          status === 'resulted'
            ? typeof payload.signedByUserId === 'string'
              ? payload.signedByUserId
              : principal.user.id
            : undefined
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
      resultValues: order.resultValues ?? null,
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

  const equipmentDetailMatch = pathname.match(/^\/laboratory\/equipment\/([^/]+)$/);
  if (equipmentDetailMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const equipmentId = requireNonEmptyString(equipmentDetailMatch[1], 'equipmentId');
    const payload = await laboratory.getEquipment(principal.user.accountId as never, equipmentId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'equipment_read',
      entityType: 'laboratory-equipment',
      entityId: equipmentId,
      payloadSummary: `Laboratory equipment ${equipmentId} inspected`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (isLaboratoryEquipmentCollectionPath(pathname) && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const idFilter = normalizeSearch(url.searchParams.get('id') ?? url.searchParams.get('codigo'));
    const descriptionFilter = normalizeSearch(url.searchParams.get('description') ?? url.searchParams.get('descricao'));
    const typeFilter = normalizeSearch(url.searchParams.get('type') ?? url.searchParams.get('tipo'));
    const statusFilter = normalizeSearch(url.searchParams.get('status') ?? url.searchParams.get('situacao'));
    const items = (await laboratory.listEquipment(principal.user.accountId as never)).filter((equipment) => {
      if (idFilter && !normalizeSearch(`${equipment.id} ${equipment.serialNumber}`)?.includes(idFilter)) return false;
      if (descriptionFilter && !normalizeSearch(equipment.name)?.includes(descriptionFilter)) return false;
      if (typeFilter && !normalizeSearch(equipment.type)?.includes(typeFilter)) return false;
      if (statusFilter && !normalizeSearch(equipment.status)?.includes(statusFilter)) return false;
      return true;
    });
    const payload: LaboratoryEquipmentListResponse = {
      items
    };

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'equipment_list',
      entityType: 'laboratory-equipment',
      entityId: 'all',
      payloadSummary: 'Laboratory equipment listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (isLaboratoryEquipmentCollectionPath(pathname) && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const payload = parseCreateEquipmentPayload((await readJsonBody(request)) as Record<string, unknown>);
    const equipment = await laboratory.createEquipment(principal.user.accountId as never, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'equipment_create',
      entityType: 'laboratory-equipment',
      entityId: equipment.id,
      payloadSummary: `Laboratory equipment ${equipment.name} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, equipment);
  }

  if (equipmentDetailMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const equipmentId = requireNonEmptyString(equipmentDetailMatch[1], 'equipmentId');
    const payload = parseUpdateEquipmentPayload((await readJsonBody(request)) as Record<string, unknown>);
    const equipment = await laboratory.updateEquipment(principal.user.accountId as never, equipmentId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'equipment_update',
      entityType: 'laboratory-equipment',
      entityId: equipment.id,
      payloadSummary: `Laboratory equipment ${equipment.name} updated`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, equipment);
  }

  const reportTypeDetailMatch = pathname.match(
    /^\/(?:laboratory\/report-types|laboratorio\/cadastros\/tipos-de-laudo|laboratorio\/tipos-de-laudo)\/([^/]+)$/
  );

  if (reportTypeDetailMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const reportTypeId = requireNonEmptyString(reportTypeDetailMatch[1], 'reportTypeId');
    const payload = await laboratory.getReportType(principal.user.accountId as never, reportTypeId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'report_type_read',
      entityType: 'laboratory-report-type',
      entityId: reportTypeId,
      payloadSummary: `Laboratory report type ${reportTypeId} inspected`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (isLaboratoryReportTypeCollectionPath(pathname) && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const codeFilter = normalizeSearch(url.searchParams.get('code') ?? url.searchParams.get('codigo'));
    const descriptionFilter = normalizeSearch(url.searchParams.get('description') ?? url.searchParams.get('descricao'));
    const categoryFilter = normalizeSearch(url.searchParams.get('category') ?? url.searchParams.get('categoria'));
    const statusFilter = normalizeSearch(url.searchParams.get('status') ?? url.searchParams.get('situacao'));
    const items = (await laboratory.listReportTypes(principal.user.accountId as never)).filter((reportType) => {
      if (codeFilter && !normalizeSearch(`${reportType.id} ${reportType.code}`)?.includes(codeFilter)) return false;
      if (descriptionFilter && !normalizeSearch(`${reportType.name} ${reportType.description}`)?.includes(descriptionFilter)) {
        return false;
      }
      if (categoryFilter && !normalizeSearch(reportType.category)?.includes(categoryFilter)) return false;
      if (statusFilter) {
        const status = reportType.active ? 'ativo active' : 'inativo inactive';
        if (!normalizeSearch(status)?.includes(statusFilter)) return false;
      }
      return true;
    });
    const payload: LaboratoryReportTypeListResponse = { items };

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'report_type_list',
      entityType: 'laboratory-report-type',
      entityId: 'all',
      payloadSummary: 'Laboratory report types listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (isLaboratoryReportTypeCollectionPath(pathname) && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const payload = parseCreateReportTypePayload((await readJsonBody(request)) as Record<string, unknown>);
    const reportType = await laboratory.createReportType(principal.user.accountId as never, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'report_type_create',
      entityType: 'laboratory-report-type',
      entityId: reportType.id,
      payloadSummary: `Laboratory report type ${reportType.name} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, reportType);
  }

  if (reportTypeDetailMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const reportTypeId = requireNonEmptyString(reportTypeDetailMatch[1], 'reportTypeId');
    const payload = parseUpdateReportTypePayload((await readJsonBody(request)) as Record<string, unknown>);
    const reportType = await laboratory.updateReportType(principal.user.accountId as never, reportTypeId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'report_type_update',
      entityType: 'laboratory-report-type',
      entityId: reportType.id,
      payloadSummary: `Laboratory report type ${reportType.name} updated`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, reportType);
  }

  const referenceValueDetailMatch = pathname.match(
    /^\/(?:laboratory\/reference-values|laboratory\/hemogram-reference-values|laboratory\/biochemistry-reference-values|laboratorio\/cadastros\/vlr-ref-hemograma|laboratorio\/vlr-ref-hemograma|laboratorio\/cadastros\/vlr-ref-bioquimico|laboratorio\/vlr-ref-bioquimico)\/([^/]+)$/
  );

  if (referenceValueDetailMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const referenceValueId = requireNonEmptyString(referenceValueDetailMatch[1], 'referenceValueId');
    const payload = await laboratory.getReferenceValue(principal.user.accountId as never, referenceValueId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'reference_value_read',
      entityType: 'laboratory-reference-value',
      entityId: referenceValueId,
      payloadSummary: `Laboratory reference value ${referenceValueId} inspected`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (isLaboratoryReferenceValueCollectionPath(pathname) && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const examType = isLaboratoryHemogramReferenceValueCollectionPath(pathname)
      ? 'HEM'
      : isLaboratoryBiochemistryReferenceValueCollectionPath(pathname)
        ? 'BIO'
        : (url.searchParams.get('examType') ?? undefined);
    const idFilter = normalizeSearch(url.searchParams.get('id') ?? url.searchParams.get('codigo'));
    const parameterFilter = normalizeSearch(url.searchParams.get('parameter') ?? url.searchParams.get('parametro'));
    const unitFilter = normalizeSearch(url.searchParams.get('unit') ?? url.searchParams.get('unidade'));
    const items = (await laboratory.listReferenceValues(principal.user.accountId as never, examType)).filter((referenceValue) => {
      if (idFilter && !normalizeSearch(referenceValue.id)?.includes(idFilter)) return false;
      if (parameterFilter && !normalizeSearch(referenceValue.parameter)?.includes(parameterFilter)) return false;
      if (unitFilter && !normalizeSearch(referenceValue.unit)?.includes(unitFilter)) return false;
      return true;
    });
    const payload: LaboratoryReferenceValueListResponse = {
      items
    };
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: isLaboratoryHemogramReferenceValueCollectionPath(pathname)
        ? 'hemogram_reference_value_list'
        : isLaboratoryBiochemistryReferenceValueCollectionPath(pathname)
          ? 'biochemistry_reference_value_list'
        : 'reference_value_list',
      entityType: 'laboratory-reference-value',
      entityId: examType ?? 'all',
      payloadSummary: isLaboratoryHemogramReferenceValueCollectionPath(pathname)
        ? 'Laboratory hemogram reference values listed'
        : isLaboratoryBiochemistryReferenceValueCollectionPath(pathname)
          ? 'Laboratory biochemistry reference values listed'
        : 'Laboratory reference values listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, payload);
  }

  if (isLaboratoryHemogramReferenceValueCollectionPath(pathname) && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const payload = parseCreateReferenceValuePayload((await readJsonBody(request)) as Record<string, unknown>, 'HEM');
    const referenceValue = await laboratory.createReferenceValue(principal.user.accountId as never, {
      ...payload,
      examType: 'HEM'
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'hemogram_reference_value_create',
      entityType: 'laboratory-reference-value',
      entityId: referenceValue.id,
      payloadSummary: `Laboratory hemogram reference value ${referenceValue.parameter} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, referenceValue);
  }

  if (isLaboratoryBiochemistryReferenceValueCollectionPath(pathname) && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const payload = parseCreateReferenceValuePayload((await readJsonBody(request)) as Record<string, unknown>, 'BIO');
    const referenceValue = await laboratory.createReferenceValue(principal.user.accountId as never, {
      ...payload,
      examType: 'BIO'
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'biochemistry_reference_value_create',
      entityType: 'laboratory-reference-value',
      entityId: referenceValue.id,
      payloadSummary: `Laboratory biochemistry reference value ${referenceValue.parameter} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, referenceValue);
  }

  if (referenceValueDetailMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'diagnostics.manage');
    const referenceValueId = requireNonEmptyString(referenceValueDetailMatch[1], 'referenceValueId');
    const payload = parseUpdateReferenceValuePayload((await readJsonBody(request)) as Record<string, unknown>);
    const referenceValue = await laboratory.updateReferenceValue(principal.user.accountId as never, referenceValueId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: routeModule,
      action: 'reference_value_update',
      entityType: 'laboratory-reference-value',
      entityId: referenceValue.id,
      payloadSummary: `Laboratory reference value ${referenceValue.parameter} updated`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, referenceValue);
  }

  return false;
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  return (await readLimitedJsonBody(request)) as T;
}
