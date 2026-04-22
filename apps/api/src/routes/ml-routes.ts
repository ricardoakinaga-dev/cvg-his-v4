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
import type { ApiFeatureFlagsSnapshot } from '../feature-flags.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { MlTelemetryService } from '../ml-telemetry.js';

export interface MlRoutesHandlers {
  scheduling: SchedulingService;
  laboratory: LaboratoryService;
  ocrFiscal: OcrFiscalService;
  demandForecasting: DemandForecastingService;
  labAnomalyDetection: LabAnomalyDetectionService;
  telemetry?: MlTelemetryService;
  audit: AuditService;
  featureFlags?: ApiFeatureFlagsSnapshot;
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
  if (pathname === '/ml/report' && request.method === 'GET') {
    const principal = handlers.requirePrincipal(request, 'scheduling.read');
    const report = handlers.telemetry?.getReport({
      accountId: principal.user.accountId,
      appointments: handlers.scheduling.listAppointments(principal.user.accountId),
      featureFlags: handlers.featureFlags ?? {
        providerName: 'unknown',
        enabledKeys: [],
        decisions: {},
        authOidcEnabled: false,
        authWebauthnEnabled: false,
        runtimeDistributedStateEnabled: false,
        fiscalBackofficeEnabled: false,
        notificationsWhatsappRemindersEnabled: false,
        notificationsWhatsappInboundActionsEnabled: false,
        mlSmartSchedulingEnabled: true,
        mlForecastingEnabled: true,
        mlAnomalyDetectionEnabled: true,
        mlOcrFiscalEnabled: true,
        provider: { name: 'unknown', evaluate: async () => ({ key: '', enabled: false, provider: 'unknown', reason: 'unknown', evaluatedAt: '', definition: {} as never, context: {} as never }) } as never
      }
    }) ?? {
      generatedAt: new Date().toISOString(),
      smartScheduling: { recommendations: 0, adopted: 0, adoptionRate: 0, overrides: 0, overrideRate: 0 },
      forecasting: { snapshots: 0, comparedDays: 0, meanAbsoluteError: 0 },
      anomalyDetection: { scans: 0, reviewedOrders: 0, confirmedOrders: 0, dismissedOrders: 0, precision: 0 },
      governance: { features: [] },
      valueSummary: { keep: [], monitor: [] }
    };
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'ml',
      action: 'ml_operational_report_read',
      entityType: 'ml-report',
      entityId: 'operational',
      payloadSummary: 'ML operational report generated',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, report);
  }

  if (pathname === '/ml/ocr/fiscal-preview' && request.method === 'POST') {
    if (handlers.featureFlags?.mlOcrFiscalEnabled === false) {
      return json(response, 404, { error: 'feature_disabled', message: 'OCR fiscal is disabled' });
    }
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
    if (handlers.featureFlags?.mlForecastingEnabled === false) {
      return json(response, 404, { error: 'feature_disabled', message: 'Demand forecasting is disabled' });
    }
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
    handlers.telemetry?.recordForecastSnapshot({
      accountId: principal.user.accountId,
      generatedAt: forecast.generatedAt,
      horizonDays: forecast.horizonDays,
      days: forecast.days
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
    if (handlers.featureFlags?.mlAnomalyDetectionEnabled === false) {
      return json(response, 404, { error: 'feature_disabled', message: 'Anomaly detection is disabled' });
    }
    const principal = handlers.requirePrincipal(request, 'diagnostics.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const examType = url.searchParams.get('examType') ?? undefined;
    const [orders, referenceValues] = await Promise.all([
      handlers.laboratory.listResults(principal.user.accountId, examType),
      handlers.laboratory.listReferenceValues(principal.user.accountId, examType)
    ]);
    const anomalies = handlers.labAnomalyDetection.detect(orders, referenceValues);
    handlers.telemetry?.recordAnomalyScan({
      accountId: principal.user.accountId,
      generatedAt: anomalies.generatedAt,
      examType,
      totalAnalyzed: anomalies.totalAnalyzed,
      flaggedOrders: anomalies.flaggedOrders,
      flags: anomalies.flags.map((flag) => ({
        orderId: flag.orderId,
        severity: flag.severity
      }))
    });
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

  if (pathname === '/ml/anomalies/reviews' && request.method === 'POST') {
    if (handlers.featureFlags?.mlAnomalyDetectionEnabled === false) {
      return json(response, 404, { error: 'feature_disabled', message: 'Anomaly detection is disabled' });
    }
    const principal = handlers.requirePrincipal(request, 'diagnostics.manage');
    const body = (await readJsonBody(request)) as {
      orderId?: string;
      disposition?: 'confirmed' | 'dismissed';
      note?: string;
    };
    const orderId = String(body.orderId ?? '').trim();
    const disposition = body.disposition;
    if (orderId.length === 0 || (disposition !== 'confirmed' && disposition !== 'dismissed')) {
      return badRequest(response, 'orderId and disposition are required');
    }
    const review = handlers.telemetry?.recordAnomalyReview({
      accountId: principal.user.accountId,
      orderId,
      disposition,
      note: body.note,
      actorId: principal.user.id,
      correlationId
    }) ?? {
      accountId: principal.user.accountId,
      orderId,
      disposition,
      note: body.note,
      actorId: principal.user.id,
      correlationId,
      reviewedAt: new Date().toISOString()
    };
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'ml',
      action: 'lab_anomaly_review',
      entityType: 'lab-anomaly-review',
      entityId: orderId,
      payloadSummary: `Laboratory anomaly review marked as ${disposition}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, review);
  }

  return false;
}
