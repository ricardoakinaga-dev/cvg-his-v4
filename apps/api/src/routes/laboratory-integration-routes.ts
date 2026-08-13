import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LaboratoryService } from '@cvg-his-v2/module-diagnostics';
import type { LaboratoryResultImportRepository } from '../laboratory-result-import-repository.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { requireApiKey } from '../helpers/auth-helpers.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';

export interface LaboratoryIntegrationRoutesHandlers {
  laboratory: LaboratoryService;
  laboratoryResultImports: LaboratoryResultImportRepository;
  apiKeys: ApiKeysService;
  audit: AuditService;
}

export async function handleLaboratoryIntegrationRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: LaboratoryIntegrationRoutesHandlers
): Promise<boolean> {
  if (
    pathname === '/integrations/laboratory/equipment-results/imports' &&
    request.method === 'POST'
  ) {
    return handleEquipmentImport(request, response, correlationId, handlers);
  }
  if (
    pathname === '/integrations/laboratory/equipment-results/report' &&
    request.method === 'GET'
  ) {
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
  const existing = await laboratoryResultImports.findByExternalResultId(externalResultId);
  if (existing) {
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(existing));
    return true;
  }

  const order = laboratory.getOrder(
    apiKeyPrincipal.apiKey.accountId as never,
    String(body.orderId) as never
  );
  if (order.status === 'requested') {
    await laboratory.recordResult(
      order.id,
      {
        status: 'collected',
        collectedByUserId: 'equipment_bridge'
      },
      apiKeyPrincipal.apiKey.accountId as never
    );
  }
  const updated = await laboratory.recordResult(
    order.id,
    {
      status: 'resulted',
      resultSummary: String(body.resultSummary),
      releasedByUserId: 'equipment_bridge',
      signedByUserId: 'equipment_bridge'
    },
    apiKeyPrincipal.apiKey.accountId as never
  );
  const record = {
    externalResultId,
    orderId: order.id,
    accountId: apiKeyPrincipal.apiKey.accountId,
    equipmentId: String(body.equipmentId),
    status: 'imported' as const,
    importedAt: updated.updatedAt,
    resultSummary: updated.resultSummary ?? ''
  };
  await laboratoryResultImports.create(record);

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: 'equipment_result_import',
    entityType: 'diagnostic-order',
    entityId: order.id,
    payloadSummary: `Equipment result ${externalResultId} imported for order ${order.id}`,
    riskLevel: 'medium',
    correlationId
  });

  response.statusCode = 201;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(record));
  return true;
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
