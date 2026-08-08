import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LaboratoryService } from '@cvg-his-v2/module-diagnostics';
import { AppError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type {
  LaboratoryResultImportRecord,
  LaboratoryResultImportRepository
} from '../laboratory-result-import-repository.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { requireApiKey } from '../helpers/auth-helpers.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';

export interface LaboratoryIntegrationRoutesHandlers {
  laboratory: LaboratoryService;
  laboratoryResultImports: LaboratoryResultImportRepository;
  apiKeys: ApiKeysService;
  audit: AuditService;
}

const importLocks = new Map<string, Promise<void>>();

async function withImportLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = importLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  importLocks.set(key, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (importLocks.get(key) === current) importLocks.delete(key);
  }
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

async function handleEquipmentImport(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { laboratory, laboratoryResultImports, apiKeys, audit }: LaboratoryIntegrationRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'notifications.manage', apiKeys);
  const body = (await readJsonBody(request)) as Record<string, unknown>;
  validateRequestBody(
    body,
    {
      externalResultId: { type: 'string', required: true, minLength: 3, maxLength: 120 },
      orderId: { type: 'string', required: true, minLength: 3, maxLength: 120 },
      equipmentId: { type: 'string', required: true, minLength: 2, maxLength: 120 },
      resultSummary: { type: 'string', required: true, minLength: 1, maxLength: 4000 }
    },
    correlationId
  );

  const externalResultId = String(body.externalResultId);
  const accountId = apiKeyPrincipal.apiKey.accountId;
  return withImportLock(`${accountId}:${externalResultId}`, async () => {
    const existing = await laboratoryResultImports.findByExternalResultId(externalResultId, accountId);
    if (existing) {
      if (existing.status === 'imported') {
        writeJson(response, 200, existing);
        return true;
      }
      if (
        existing.orderId !== String(body.orderId) ||
        existing.equipmentId !== String(body.equipmentId)
      ) {
        throw new AppError(
          'LABORATORY_IMPORT_CORRELATION_MISMATCH',
          'A failed external result cannot be rebound to another order or equipment',
          409,
          { externalResultId }
        );
      }
    }

    return processEquipmentImport({
      externalResultId,
      orderId: String(body.orderId),
      equipmentId: String(body.equipmentId),
      resultSummary: String(body.resultSummary),
      accountId: accountId as AccountId,
      existing,
      laboratory,
      laboratoryResultImports,
      audit,
      response,
      correlationId
    });
  });
}

async function handleEquipmentImportRetry(
  externalResultId: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { laboratory, laboratoryResultImports, apiKeys, audit }: LaboratoryIntegrationRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'notifications.manage', apiKeys);
  const accountId = apiKeyPrincipal.apiKey.accountId;
  return withImportLock(`${accountId}:${externalResultId}`, async () => {
    const existing = await laboratoryResultImports.findByExternalResultId(
      externalResultId,
      accountId
    );
    if (!existing) {
      throw new NotFoundError('Laboratory result import not found', { externalResultId });
    }
    if (existing.status === 'imported') {
      writeJson(response, 200, existing);
      return true;
    }
    return processEquipmentImport({
      externalResultId,
      orderId: existing.orderId,
      equipmentId: existing.equipmentId,
      resultSummary: existing.resultSummary,
      accountId: accountId as AccountId,
      existing,
      laboratory,
      laboratoryResultImports,
      audit,
      response,
      correlationId
    });
  });
}

interface EquipmentImportProcessingInput {
  readonly externalResultId: string;
  readonly orderId: string;
  readonly equipmentId: string;
  readonly resultSummary: string;
  readonly accountId: AccountId;
  readonly existing: Awaited<ReturnType<LaboratoryResultImportRepository['findByExternalResultId']>>;
  readonly laboratory: LaboratoryService;
  readonly laboratoryResultImports: LaboratoryResultImportRepository;
  readonly audit: AuditService;
  readonly response: ServerResponse;
  readonly correlationId: string;
}

function errorReason(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Laboratory result import failed';
  return message.slice(0, 1000);
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
}

async function processEquipmentImport({
  externalResultId,
  orderId,
  equipmentId,
  resultSummary,
  accountId,
  existing,
  laboratory,
  laboratoryResultImports,
  audit,
  response,
  correlationId
}: EquipmentImportProcessingInput): Promise<boolean> {
  const attemptCount = (existing?.attemptCount ?? 0) + 1;
  const attemptedAt = nowIso();
  try {
    const order = laboratory.getOrder(accountId as never, orderId as never);
    if (order.status === 'requested') {
      await laboratory.recordResultAndPersist(order.id, {
        status: 'collected',
        collectedByUserId: 'equipment_bridge'
      });
    }
    const updated = await laboratory.recordResultAndPersist(order.id, {
      status: 'resulted',
      resultSummary,
      releasedByUserId: 'equipment_bridge',
      signedByUserId: 'equipment_bridge'
    });
    const record = {
      externalResultId,
      orderId: order.id,
      accountId,
      equipmentId,
      status: 'imported' as const,
      importedAt: existing?.importedAt ?? updated.updatedAt,
      resultSummary: updated.resultSummary ?? resultSummary,
      attemptCount,
      lastAttemptAt: attemptedAt
    };
    if (existing && laboratoryResultImports.update) {
      await laboratoryResultImports.update(record);
    } else {
      await laboratoryResultImports.create(record);
    }

    appendAudit(audit, {
      actorId: 'system',
      accountId,
      module: 'integrations',
      action: existing ? 'equipment_result_retry' : 'equipment_result_import',
      entityType: 'diagnostic-order',
      entityId: order.id,
      payloadSummary: `Equipment result ${externalResultId} imported for order ${order.id} (attempt ${attemptCount})`,
      riskLevel: 'medium',
      correlationId
    });

    writeJson(response, existing ? 200 : 201, record);
    return true;
  } catch (error) {
    const failedRecord = {
      externalResultId,
      orderId,
      accountId,
      equipmentId,
      status: 'failed' as const,
      importedAt: existing?.importedAt ?? attemptedAt,
      resultSummary,
      failureReason: errorReason(error),
      attemptCount,
      lastAttemptAt: attemptedAt
    };
    if (existing && laboratoryResultImports.update) {
      await laboratoryResultImports.update(failedRecord);
    } else {
      await laboratoryResultImports.create(failedRecord);
    }
    appendAudit(audit, {
      actorId: 'system',
      accountId,
      module: 'integrations',
      action: 'equipment_result_import_failed',
      entityType: 'equipment-result-import',
      entityId: externalResultId,
      payloadSummary: `Equipment result import failed (attempt ${attemptCount}): ${failedRecord.failureReason}`,
      riskLevel: 'high',
      correlationId
    });
    writeJson(response, 202, failedRecord);
    return true;
  }
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
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: 'equipment_result_report_view',
    entityType: 'equipment-result-import',
    entityId: 'all',
    payloadSummary: 'Equipment result operational report listed',
    riskLevel: 'low',
    correlationId
  });

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      provider: 'equipment-bridge',
      summary: {
        total: items.length,
        imported: items.filter((item) => item.status === 'imported').length,
        failed: items.filter((item) => item.status === 'failed').length
      },
      items
    })
  );
  return true;
}
