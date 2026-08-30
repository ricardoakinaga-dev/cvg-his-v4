import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import { isProductionLikeEnvironment } from '@cvg-his-v2/shared-config';
import { AppError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { nowIso } from '@cvg-his-v2/shared-utils';

import {
  fingerprintLaboratoryProviderPayload,
  parseLaboratoryProviderPayload,
  LABORATORY_PROVIDER_MAX_BODY_BYTES,
  type LaboratoryProviderKey,
  type LaboratoryProviderSignatureVerifier
} from '../laboratory-provider-ingress.js';
import type {
  LaboratoryResultImportRecord,
  LaboratoryResultImportRepository
} from '../laboratory-result-import-repository.js';
import { appendAudit, appendAuditAndWait } from '../helpers/audit-helper.js';
import { requireApiKey } from '../helpers/auth-helpers.js';
import {
  readRawRequestBody,
  RawRequestBodyAbortedError,
  RawRequestBodyStreamError,
  RawRequestBodyTooLargeError
} from '../helpers/raw-request-body.js';

const PROVIDER_WRITE_PERMISSION = 'laboratory.results.write';

export function assertLaboratoryProviderIngressReadiness(options: {
  readonly environment: string;
  readonly keyring?: ReadonlyMap<string, LaboratoryProviderKey>;
  readonly repository?: LaboratoryResultImportRepository;
}): void {
  if (
    isProductionLikeEnvironment(options.environment) &&
    options.keyring &&
    options.keyring.size > 0
  ) {
    throw new Error('Production-like API cannot mount the local laboratory provider ingress');
  }
  if (!options.keyring || options.keyring.size === 0) return;
  if (options.repository?.storage !== 'durable') {
    throw new Error(
      'Laboratory provider ingress requires a configured keyring and durable ingress repository'
    );
  }
}

export interface LaboratoryIntegrationRoutesHandlers {
  laboratoryResultImports: LaboratoryResultImportRepository;
  apiKeys: ApiKeysService;
  audit: AuditService;
  laboratoryProviderSignatureVerifier?: LaboratoryProviderSignatureVerifier;
  nowSeconds?: () => number;
}

export async function handleLaboratoryIntegrationRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: LaboratoryIntegrationRoutesHandlers
): Promise<boolean> {
  if (pathname === '/integrations/laboratory/equipment-results/imports' && request.method === 'POST') {
    return handleEquipmentImport(request, response, correlationId, handlers);
  }
  const retryMatch = pathname.match(
    /^\/integrations\/laboratory\/equipment-results\/imports\/([^/]+)\/retry$/
  );
  if (retryMatch && request.method === 'POST') {
    return handleEquipmentImportRetry(retryMatch[1], request, response, correlationId, handlers);
  }
  if (pathname === '/integrations/laboratory/equipment-results/report' && request.method === 'GET') {
    return handleEquipmentReport(request, response, correlationId, handlers);
  }
  return false;
}

function singleHeader(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  if (Array.isArray(value) || typeof value !== 'string') return undefined;
  const rawHeaders = request.rawHeaders;
  if (rawHeaders) {
    let count = 0;
    for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
      if (rawHeaders[index]?.toLowerCase() === name.toLowerCase()) count += 1;
    }
    if (count > 1) return undefined;
  }
  return value;
}

function invalidRequest(message: string, statusCode = 400): AppError {
  return new AppError('LABORATORY_PROVIDER_INVALID_REQUEST', message, statusCode);
}

function unauthorizedProvider(): AppError {
  return new AppError(
    'LABORATORY_PROVIDER_UNAUTHORIZED',
    'Laboratory provider authentication failed',
    401
  );
}

function ingressUnavailable(): AppError {
  return new AppError(
    'LABORATORY_PROVIDER_INGRESS_UNAVAILABLE',
    'Laboratory provider ingress is unavailable',
    503
  );
}

async function readProviderBody(request: IncomingMessage): Promise<Buffer> {
  try {
    return await readRawRequestBody(request, LABORATORY_PROVIDER_MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RawRequestBodyTooLargeError) {
      throw invalidRequest('Laboratory provider body exceeds the maximum size', 413);
    }
    if (error instanceof RawRequestBodyAbortedError) {
      throw invalidRequest('Laboratory provider request body was aborted');
    }
    if (error instanceof RawRequestBodyStreamError) throw ingressUnavailable();
    throw ingressUnavailable();
  }
}

async function handleEquipmentImport(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { laboratoryResultImports, apiKeys, audit, laboratoryProviderSignatureVerifier, nowSeconds }: LaboratoryIntegrationRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, PROVIDER_WRITE_PERMISSION, apiKeys);
  if (laboratoryResultImports.storage !== 'durable' || !laboratoryProviderSignatureVerifier) {
    throw ingressUnavailable();
  }

  if (singleHeader(request, 'content-type') !== 'application/json') {
    throw invalidRequest('Laboratory provider content type must be application/json');
  }
  const contentEncoding = singleHeader(request, 'content-encoding');
  if (contentEncoding !== undefined && contentEncoding !== 'identity') {
    throw invalidRequest('Laboratory provider content encoding is not supported');
  }

  const rawBody = await readProviderBody(request);
  const keyId = singleHeader(request, 'x-lab-provider-key-id');
  const timestamp = singleHeader(request, 'x-lab-timestamp');
  const signature = singleHeader(request, 'x-lab-signature');
  if (!keyId || !timestamp || !signature) throw unauthorizedProvider();

  const verification = await laboratoryProviderSignatureVerifier.verify({
    keyId,
    timestamp,
    signature,
    rawBody,
    nowSeconds: nowSeconds?.() ?? Math.floor(Date.now() / 1_000)
  });
  if (!verification || verification.accountId !== apiKeyPrincipal.apiKey.accountId) {
    throw unauthorizedProvider();
  }

  let payload;
  try {
    payload = parseLaboratoryProviderPayload(rawBody);
  } catch {
    throw invalidRequest('Invalid laboratory provider payload');
  }

  const accountId = apiKeyPrincipal.apiKey.accountId;
  const payloadFingerprint = fingerprintLaboratoryProviderPayload(payload);
  const receivedAt = nowIso();
  const record: LaboratoryResultImportRecord = {
    externalResultId: payload.externalResultId,
    orderId: payload.orderId,
    accountId,
    equipmentId: payload.equipmentId,
    providerCode: payload.provider,
    schemaVersion: payload.schemaVersion,
    signatureKeyId: verification.keyId,
    payloadFingerprint,
    observedAt: payload.observedAt,
    status: 'pending_human_review',
    importedAt: receivedAt,
    resultSummary: payload.resultSummary,
    attemptCount: 1,
    lastAttemptAt: receivedAt
  };

  let persistence;
  try {
    persistence = await laboratoryResultImports.recordProviderIngress(record);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw ingressUnavailable();
  }

  try {
    await appendAuditAndWait(audit, {
      actorId: 'system',
      accountId: accountId as never,
      module: 'integrations',
      action: persistence.replayed
        ? 'laboratory_provider_result_replayed'
        : 'laboratory_provider_result_queued',
      entityType: 'laboratory-provider-result',
      entityId: payloadFingerprint,
      payloadSummary: `Laboratory provider result ${persistence.replayed ? 'replayed' : 'queued'}; provider=${payload.provider}; schemaVersion=${payload.schemaVersion}; status=pending_human_review`,
      riskLevel: 'high',
      correlationId
    });
  } catch {
    throw new AppError(
      'LABORATORY_PROVIDER_AUDIT_UNAVAILABLE',
      'Laboratory provider ingress is temporarily unavailable',
      503
    );
  }

  writeJson(response, persistence.replayed ? 200 : 202, {
    ...persistence.record,
    replayed: persistence.replayed
  });
  return true;
}

async function handleEquipmentImportRetry(
  externalResultId: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { laboratoryResultImports, apiKeys }: LaboratoryIntegrationRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, PROVIDER_WRITE_PERMISSION, apiKeys);
  const existing = await laboratoryResultImports.findByExternalResultId(
    externalResultId,
    apiKeyPrincipal.apiKey.accountId
  );
  if (!existing) throw new NotFoundError('Laboratory result import not found', { externalResultId });
  if (existing.status === 'pending_human_review' || existing.status === 'imported') {
    writeJson(response, 200, { ...existing, replayed: true });
    return true;
  }
  throw new AppError(
    'LABORATORY_RETRY_REQUIRES_HUMAN_REVIEW',
    'Failed laboratory provider results require human review before clinical processing',
    409
  );
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function handleEquipmentReport(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { laboratoryResultImports, apiKeys, audit }: LaboratoryIntegrationRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'integrations.read', apiKeys);
  const items = await laboratoryResultImports.list(apiKeyPrincipal.apiKey.accountId);

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId as never,
    module: 'integrations',
    action: 'equipment_result_report_view',
    entityType: 'equipment-result-import',
    entityId: 'all',
    payloadSummary: 'Equipment result operational report listed',
    riskLevel: 'low',
    correlationId
  });

  writeJson(response, 200, {
    provider: 'equipment-bridge',
    summary: {
      total: items.length,
      pendingHumanReview: items.filter((item) => item.status === 'pending_human_review').length,
      imported: items.filter((item) => item.status === 'imported').length,
      failed: items.filter((item) => item.status === 'failed').length
    },
    items
  });
  return true;
}
