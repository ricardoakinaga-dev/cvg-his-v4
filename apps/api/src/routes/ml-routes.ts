import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LaboratoryService } from '@cvg-his-v2/module-diagnostics';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import {
  DemandForecastingService,
  LabAnomalyDetectionService,
  OcrFiscalService
} from '@cvg-his-v2/module-ml';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface MlRoutesHandlers {
  scheduling: SchedulingService;
  laboratory: LaboratoryService;
  ocrFiscal: OcrFiscalService;
  demandForecasting: DemandForecastingService;
  labAnomalyDetection: LabAnomalyDetectionService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function badRequest(response: ServerResponse, message: string): true {
  return json(response, 400, {
    error: 'invalid_request',
    message
  });
}

export async function handleMlRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: MlRoutesHandlers
): Promise<boolean> {
  if (pathname === '/ml/ocr/fiscal-preview' && request.method === 'POST') {
    const principal = handlers.requirePrincipal(request, 'fiscal.read');
    const body = (await readJsonBody(request)) as { rawText?: string; documentName?: string };
    const preview = handlers.ocrFiscal.preview({
      rawText: String(body.rawText ?? ''),
      documentName: body.documentName
    });
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'ml',
      action: 'ocr_fiscal_preview',
      entityType: 'fiscal-document-preview',
      entityId: preview.previewId,
      payloadSummary: `OCR fiscal preview generated (${preview.detectedType})`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, preview);
  }

  if (pathname === '/ml/forecasting/demand' && request.method === 'GET') {
    const principal = handlers.requirePrincipal(request, 'scheduling.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const rawHorizonDays = url.searchParams.get('horizonDays');
    const rawReferenceDate = url.searchParams.get('referenceDate');
    const horizonDays = rawHorizonDays === null ? 7 : Number(rawHorizonDays);
    if (!Number.isInteger(horizonDays) || horizonDays < 3 || horizonDays > 30) {
      return badRequest(response, 'horizonDays must be an integer between 3 and 30');
    }
    if (rawReferenceDate !== null && Number.isNaN(Date.parse(rawReferenceDate))) {
      return badRequest(response, 'referenceDate must be a valid ISO-8601 date-time');
    }
    const forecast = handlers.demandForecasting.forecast({
      appointments: handlers.scheduling.listAppointments(principal.user.accountId),
      referenceDate: rawReferenceDate ?? undefined,
      horizonDays
    });
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'ml',
      action: 'demand_forecast_read',
      entityType: 'demand-forecast',
      entityId: 'appointments',
      payloadSummary: `Demand forecast generated for ${forecast.horizonDays} day horizon`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, forecast);
  }

  if (pathname === '/ml/anomalies/laboratory-results' && request.method === 'GET') {
    const principal = handlers.requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const examType = url.searchParams.get('examType') ?? undefined;
    const [orders, referenceValues] = await Promise.all([
      handlers.laboratory.listResults(principal.user.accountId, examType),
      handlers.laboratory.listReferenceValues(principal.user.accountId, examType)
    ]);
    const anomalies = handlers.labAnomalyDetection.detect(orders, referenceValues);
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'ml',
      action: 'lab_anomalies_read',
      entityType: 'lab-anomaly',
      entityId: examType ?? 'all',
      payloadSummary: `Laboratory anomaly scan generated for ${orders.length} result(s)`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, anomalies);
  }

  return false;
}
