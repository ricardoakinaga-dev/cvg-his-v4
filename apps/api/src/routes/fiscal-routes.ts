import type { IncomingMessage, ServerResponse } from 'node:http';

import { FiscalService } from '@cvg-his-v2/module-fiscal';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  CreateFiscalCfopRequest,
  CreateFiscalIbsCbsTableRequest,
  CreateFiscalIcmsMatrixRequest,
  CreateFiscalIcmsTableRequest,
  CreateFiscalIpiTableRequest,
  CreateFiscalPisTableRequest,
  CreateFiscalCofinsTableRequest,
  CreateFiscalNfseLayoutRequest,
  CreateFiscalNfseDocumentRequest,
  CancelFiscalNfseDocumentRequest,
  FiscalCfopListResponse,
  FiscalIbsCbsTableListResponse,
  FiscalIcmsMatrixListResponse,
  FiscalIcmsTableListResponse,
  FiscalIpiTableListResponse,
  FiscalPisTableListResponse,
  FiscalCofinsTableListResponse,
  FiscalNfseDocumentListResponse,
  FiscalNcmEntryListResponse,
  FiscalNfseLayoutListResponse,
  FiscalPisCofinsRuleListResponse,
  UpdateFiscalIcmsTableRequest,
  UpdateFiscalIbsCbsTableRequest,
  UpdateFiscalIpiTableRequest,
  UpdateFiscalPisTableRequest,
  UpdateFiscalCofinsTableRequest,
  UpdateFiscalCfopRequest,
  UpdateFiscalNfseLayoutRequest
} from '@cvg-his-v2/shared-contracts';
import { getPool } from '@cvg-his-v2/shared-database';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import { readJsonBody as readLimitedJsonBody } from '../helpers/common.js';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';

export interface FiscalRoutesHandlers {
  fiscal: FiscalService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  fiscalBackofficeEnabled: boolean;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseOptionalBoolean(value: string | null): boolean | undefined {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

const MAX_NFSE_DOCUMENT_LIST_ROWS = 1_000;

function parseNfseDocumentListLimit(value: string | null): number {
  if (value === null || value === '') return MAX_NFSE_DOCUMENT_LIST_ROWS;
  if (!/^\d+$/.test(value)) {
    throw new ValidationError('limit must be a positive integer', { value });
  }

  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_NFSE_DOCUMENT_LIST_ROWS) {
    throw new ValidationError(`limit must be between 1 and ${MAX_NFSE_DOCUMENT_LIST_ROWS}`, {
      value
    });
  }
  return limit;
}

function mapFiscalDocumentStateError(message: string): number {
  if (
    message.includes('Cannot issue document in status') ||
    message.includes('Cannot cancel document in status') ||
    message.includes('NFS-e operation is already in progress')
  ) {
    return 409;
  }

  return 400;
}

function getScopedFiscalService(
  fiscal: FiscalService,
  accountId: AuthenticatedPrincipal['user']['accountId']
): FiscalService {
  try {
    getPool();
    return fiscal.forAccount(accountId);
  } catch {
    // The development/test fallback is still tenant-scoped. FiscalService
    // keeps NFS-e memory state in an account-keyed store when persistence is
    // unavailable; returning the process-global service here would leak a
    // document across accounts.
    return fiscal.forAccount(accountId);
  }
}

function getNfseOperationKey(
  request: IncomingMessage,
  accountId: AuthenticatedPrincipal['user']['accountId'],
  action: 'issue' | 'cancel',
  documentId: string
): string {
  const rawHeader = request.headers?.['idempotency-key'];
  const rawValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const clientKey = rawValue?.trim();
  if (clientKey && (clientKey.length > 128 || /[\r\n]/.test(clientKey))) {
    throw new Error('Idempotency-Key must be at most 128 characters and contain no line breaks');
  }

  return `nfse:${String(accountId)}:${action}:${clientKey || documentId}`;
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  return (await readLimitedJsonBody(request)) as T;
}

export async function handleFiscalRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: FiscalRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/fiscal')) {
    return false;
  }

  const { fiscal, audit, requirePrincipal, fiscalBackofficeEnabled } = handlers;

  // Feature flag gate: fiscal backoffice write operations require the flag
  const isWriteOperation = request.method !== 'GET';
  if (isWriteOperation && !fiscalBackofficeEnabled) {
    response.statusCode = 403;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ code: 'FLAG_DISABLED', message: 'Fiscal backoffice is not enabled' })
    );
    return true;
  }

  if (pathname === '/fiscal/summary' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'fiscal.read');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'summary_read',
      entityType: 'fiscal_summary',
      entityId: 'dashboard',
      payloadSummary: 'Fiscal summary inspected',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, await scopedFiscal.getDashboardSummary());
  }

  if (pathname === '/fiscal/tax-preview') {
    if (request.method !== 'GET') {
      return false;
    }
    return json(response, 200, await fiscal.getTaxPreview());
  }

  if (pathname === '/fiscal/icms') {
    const url = new URL(request.url ?? pathname, 'http://localhost');

    if (request.method === 'GET') {
      const principal = await requirePrincipal(request, 'fiscal.read');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload: FiscalIcmsTableListResponse = {
        items: await scopedFiscal.listIcmsTables({
          search: url.searchParams.get('search') ?? undefined
        })
      };
      return json(response, 200, payload);
    }

    if (request.method === 'POST') {
      const principal = await requirePrincipal(request, 'fiscal.manage');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload = (await readJsonBody(request)) as CreateFiscalIcmsTableRequest;
      const created = await scopedFiscal.createIcmsTable(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'icms-table',
        entityId: created.id,
        payloadSummary: `ICMS table ${created.code} created`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    }

    return false;
  }

  const icmsTableMatch = pathname.match(/^\/fiscal\/icms\/([^/]+)$/);
  if (icmsTableMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const payload = (await readJsonBody(request)) as UpdateFiscalIcmsTableRequest;
    const updated = await scopedFiscal.updateIcmsTable(
      decodeURIComponent(icmsTableMatch[1] ?? ''),
      payload
    );

    if (!updated) {
      return json(response, 404, { code: 'ICMS_TABLE_NOT_FOUND', message: 'ICMS table not found' });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'update',
      entityType: 'icms-table',
      entityId: updated.id,
      payloadSummary: `ICMS table ${updated.code} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updated);
  }

  if (pathname === '/fiscal/ipi') {
    const url = new URL(request.url ?? pathname, 'http://localhost');

    if (request.method === 'GET') {
      const principal = await requirePrincipal(request, 'fiscal.read');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload: FiscalIpiTableListResponse = {
        items: await scopedFiscal.listIpiTables({
          search: url.searchParams.get('search') ?? undefined
        })
      };
      return json(response, 200, payload);
    }

    if (request.method === 'POST') {
      const principal = await requirePrincipal(request, 'fiscal.manage');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload = (await readJsonBody(request)) as CreateFiscalIpiTableRequest;
      const created = await scopedFiscal.createIpiTable(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'ipi-table',
        entityId: created.id,
        payloadSummary: `IPI table ${created.code} created`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    }

    return false;
  }

  const ipiTableMatch = pathname.match(/^\/fiscal\/ipi\/([^/]+)$/);
  if (ipiTableMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const payload = (await readJsonBody(request)) as UpdateFiscalIpiTableRequest;
    const updated = await scopedFiscal.updateIpiTable(
      decodeURIComponent(ipiTableMatch[1] ?? ''),
      payload
    );

    if (!updated) {
      return json(response, 404, { code: 'IPI_TABLE_NOT_FOUND', message: 'IPI table not found' });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'update',
      entityType: 'ipi-table',
      entityId: updated.id,
      payloadSummary: `IPI table ${updated.code} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updated);
  }

  if (pathname === '/fiscal/pis') {
    const url = new URL(request.url ?? pathname, 'http://localhost');

    if (request.method === 'GET') {
      const principal = await requirePrincipal(request, 'fiscal.read');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload: FiscalPisTableListResponse = {
        items: await scopedFiscal.listPisTables({
          search: url.searchParams.get('search') ?? undefined
        })
      };
      return json(response, 200, payload);
    }

    if (request.method === 'POST') {
      const principal = await requirePrincipal(request, 'fiscal.manage');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload = (await readJsonBody(request)) as CreateFiscalPisTableRequest;
      const created = await scopedFiscal.createPisTable(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'pis-table',
        entityId: created.id,
        payloadSummary: `PIS table ${created.code} created`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    }

    return false;
  }

  const pisTableMatch = pathname.match(/^\/fiscal\/pis\/([^/]+)$/);
  if (pisTableMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const payload = (await readJsonBody(request)) as UpdateFiscalPisTableRequest;
    const updated = await scopedFiscal.updatePisTable(
      decodeURIComponent(pisTableMatch[1] ?? ''),
      payload
    );

    if (!updated) {
      return json(response, 404, { code: 'PIS_TABLE_NOT_FOUND', message: 'PIS table not found' });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'update',
      entityType: 'pis-table',
      entityId: updated.id,
      payloadSummary: `PIS table ${updated.code} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updated);
  }

  if (pathname === '/fiscal/cofins') {
    const url = new URL(request.url ?? pathname, 'http://localhost');

    if (request.method === 'GET') {
      const principal = await requirePrincipal(request, 'fiscal.read');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload: FiscalCofinsTableListResponse = {
        items: await scopedFiscal.listCofinsTables({
          search: url.searchParams.get('search') ?? undefined
        })
      };
      return json(response, 200, payload);
    }

    if (request.method === 'POST') {
      const principal = await requirePrincipal(request, 'fiscal.manage');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload = (await readJsonBody(request)) as CreateFiscalCofinsTableRequest;
      const created = await scopedFiscal.createCofinsTable(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'cofins-table',
        entityId: created.id,
        payloadSummary: `COFINS table ${created.code} created`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    }

    return false;
  }

  const cofinsTableMatch = pathname.match(/^\/fiscal\/cofins\/([^/]+)$/);
  if (cofinsTableMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const payload = (await readJsonBody(request)) as UpdateFiscalCofinsTableRequest;
    const updated = await scopedFiscal.updateCofinsTable(
      decodeURIComponent(cofinsTableMatch[1] ?? ''),
      payload
    );

    if (!updated) {
      return json(response, 404, {
        code: 'COFINS_TABLE_NOT_FOUND',
        message: 'COFINS table not found'
      });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'update',
      entityType: 'cofins-table',
      entityId: updated.id,
      payloadSummary: `COFINS table ${updated.code} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updated);
  }

  if (pathname === '/fiscal/ibs-cbs') {
    const url = new URL(request.url ?? pathname, 'http://localhost');

    if (request.method === 'GET') {
      const principal = await requirePrincipal(request, 'fiscal.read');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload: FiscalIbsCbsTableListResponse = {
        items: await scopedFiscal.listIbsCbsTables({
          search: url.searchParams.get('search') ?? undefined
        })
      };
      return json(response, 200, payload);
    }

    if (request.method === 'POST') {
      const principal = await requirePrincipal(request, 'fiscal.manage');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload = (await readJsonBody(request)) as CreateFiscalIbsCbsTableRequest;
      const created = await scopedFiscal.createIbsCbsTable(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'ibs-cbs-table',
        entityId: created.id,
        payloadSummary: `IBS/CBS table ${created.code} created`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    }

    return false;
  }

  const ibsCbsTableMatch = pathname.match(/^\/fiscal\/ibs-cbs\/([^/]+)$/);
  if (ibsCbsTableMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const payload = (await readJsonBody(request)) as UpdateFiscalIbsCbsTableRequest;
    const updated = await scopedFiscal.updateIbsCbsTable(
      decodeURIComponent(ibsCbsTableMatch[1] ?? ''),
      payload
    );

    if (!updated) {
      return json(response, 404, {
        code: 'IBS_CBS_TABLE_NOT_FOUND',
        message: 'IBS/CBS table not found'
      });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'update',
      entityType: 'ibs-cbs-table',
      entityId: updated.id,
      payloadSummary: `IBS/CBS table ${updated.code} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updated);
  }

  if (pathname === '/fiscal/pis-cofins') {
    if (request.method !== 'GET') {
      return false;
    }
    const principal = await requirePrincipal(request, 'fiscal.read');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const payload: FiscalPisCofinsRuleListResponse = {
      items: await scopedFiscal.listPisCofinsRules({
        regime:
          (url.searchParams.get('regime') as
            | 'simples_nacional'
            | 'lucro_presumido'
            | 'lucro_real'
            | null) ?? undefined,
        appliesTo:
          (url.searchParams.get('appliesTo') as 'mercadoria' | 'servico' | 'ambos' | null) ??
          undefined
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/cfop') {
    const url = new URL(request.url ?? pathname, 'http://localhost');

    if (request.method === 'GET') {
      const principal = await requirePrincipal(request, 'fiscal.read');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload: FiscalCfopListResponse = {
        items: await scopedFiscal.listCfop({
          search: url.searchParams.get('search') ?? undefined,
          section: (url.searchParams.get('section') as 'entrada' | 'saida' | null) ?? undefined,
          documentType:
            (url.searchParams.get('documentType') as 'nfe' | 'nfce' | 'nfse' | 'cte' | null) ??
            undefined
        })
      };
      return json(response, 200, payload);
    }

    if (request.method === 'POST') {
      const principal = await requirePrincipal(request, 'fiscal.manage');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload = (await readJsonBody(request)) as CreateFiscalCfopRequest;
      const created = await scopedFiscal.createCfop(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'cfop',
        entityId: created.code,
        payloadSummary: `CFOP ${created.code} created`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    }

    return false;
  }

  const cfopMatch = pathname.match(/^\/fiscal\/cfop\/([^/]+)$/);
  if (cfopMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const payload = (await readJsonBody(request)) as UpdateFiscalCfopRequest;
    const updated = await scopedFiscal.updateCfop(decodeURIComponent(cfopMatch[1] ?? ''), payload);

    if (!updated) {
      return json(response, 404, { code: 'CFOP_NOT_FOUND', message: 'CFOP not found' });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'update',
      entityType: 'cfop',
      entityId: updated.code,
      payloadSummary: `CFOP ${updated.code} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updated);
  }

  if (pathname === '/fiscal/nfse' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'fiscal.read');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const payload: FiscalNfseLayoutListResponse = {
      items: await scopedFiscal.listNfseLayouts({
        search: url.searchParams.get('search') ?? undefined,
        state: url.searchParams.get('state') ?? undefined,
        active: parseOptionalBoolean(url.searchParams.get('active'))
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/nfse' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const payload = (await readJsonBody(request)) as CreateFiscalNfseLayoutRequest;
    const created = await scopedFiscal.createNfseLayout(payload);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'create',
      entityType: 'nfse-layout',
      entityId: created.id,
      payloadSummary: `NFS-e layout ${created.city}/${created.state} created`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, created);
  }

  if (pathname === '/fiscal/nfse/documents' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'fiscal.read');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const payload: FiscalNfseDocumentListResponse = {
      items: await scopedFiscal.listNfseDocuments({
        status:
          (url.searchParams.get('status') as 'draft' | 'issued' | 'cancelled' | 'error' | null) ??
          undefined,
        customerSearch: url.searchParams.get('customerSearch') ?? undefined,
        limit: parseNfseDocumentListLimit(url.searchParams.get('limit'))
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/nfse/documents' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);

    try {
      const payload = (await readJsonBody(request)) as CreateFiscalNfseDocumentRequest;
      const created = await scopedFiscal.createNfseDocument(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'nfse-document',
        entityId: created.id,
        payloadSummary: `NFS-e document #${created.numero} for ${created.customer.name}`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    } catch (error) {
      return json(response, 400, {
        code: 'INVALID_REQUEST',
        message: error instanceof Error ? error.message : 'invalid request'
      });
    }
  }

  const nfseDocumentGetMatch = pathname.match(/^\/fiscal\/nfse\/documents\/([^/]+)$/);
  if (nfseDocumentGetMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'fiscal.read');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const documentId = requireNonEmptyString(nfseDocumentGetMatch[1], 'documentId');
    const found = await scopedFiscal.getNfseDocument(documentId);

    if (!found) {
      return json(response, 404, {
        code: 'NFSE_DOCUMENT_NOT_FOUND',
        message: 'NFS-e document not found'
      });
    }

    return json(response, 200, found);
  }

  const nfseDocumentActionMatch = pathname.match(
    /^\/fiscal\/nfse\/documents\/([^/]+)\/(issue|cancel)$/
  );
  if (nfseDocumentActionMatch && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const documentId = requireNonEmptyString(nfseDocumentActionMatch[1], 'documentId');
    const action = nfseDocumentActionMatch[2];

    try {
      if (action === 'issue') {
        const issued = await scopedFiscal.issueNfseDocument(
          documentId,
          getNfseOperationKey(request, principal.user.accountId, 'issue', documentId)
        );
        if (!issued) {
          return json(response, 404, {
            code: 'NFSE_DOCUMENT_NOT_FOUND',
            message: 'NFS-e document not found'
          });
        }

        if (issued.status === 'error') {
          appendAudit(audit, {
            actorId: principal.user.id,
            accountId: principal.user.accountId,
            module: 'fiscal',
            action: 'issue_error',
            entityType: 'nfse-document',
            entityId: documentId,
            payloadSummary: `NFS-e document ${documentId} provider authorization failed`,
            riskLevel: 'high',
            correlationId
          });

          return json(response, 502, {
            code: 'NFSE_PROVIDER_ERROR',
            message: 'NFS-e provider did not authorize the document',
            document: issued
          });
        }

        appendAudit(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'fiscal',
          action: 'issue',
          entityType: 'nfse-document',
          entityId: documentId,
          payloadSummary: `NFS-e document ${documentId} issued`,
          riskLevel: 'high',
          correlationId
        });

        return json(response, 200, issued);
      }

      const payload = (await readJsonBody(request)) as CancelFiscalNfseDocumentRequest;
      const cancelled = await scopedFiscal.cancelNfseDocument(
        documentId,
        payload,
        getNfseOperationKey(request, principal.user.accountId, 'cancel', documentId)
      );

      if (!cancelled) {
        return json(response, 404, {
          code: 'NFSE_DOCUMENT_NOT_FOUND',
          message: 'NFS-e document not found'
        });
      }

      if (cancelled.status === 'error') {
        appendAudit(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'fiscal',
          action: 'cancel_error',
          entityType: 'nfse-document',
          entityId: documentId,
          payloadSummary: `NFS-e document ${documentId} provider cancellation failed`,
          riskLevel: 'high',
          correlationId
        });

        return json(response, 502, {
          code: 'NFSE_PROVIDER_ERROR',
          message: 'NFS-e provider did not authorize the cancellation',
          document: cancelled
        });
      }

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'cancel',
        entityType: 'nfse-document',
        entityId: documentId,
        payloadSummary: `NFS-e document ${documentId} cancelled`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 200, cancelled);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid request';
      return json(response, mapFiscalDocumentStateError(message), {
        code: 'INVALID_DOCUMENT_STATE',
        message
      });
    }
  }

  const nfseLayoutMatch = pathname.match(/^\/fiscal\/nfse\/([^/]+)$/);
  if (nfseLayoutMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'fiscal.manage');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const layoutId = requireNonEmptyString(nfseLayoutMatch[1], 'layoutId');
    const payload = (await readJsonBody(request)) as UpdateFiscalNfseLayoutRequest;
    const updated = await scopedFiscal.updateNfseLayout(layoutId, payload);

    if (!updated) {
      return json(response, 404, {
        code: 'NFSE_LAYOUT_NOT_FOUND',
        message: 'NFS-e layout not found'
      });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'fiscal',
      action: 'update',
      entityType: 'nfse-layout',
      entityId: updated.id,
      payloadSummary: `NFS-e layout ${updated.city}/${updated.state} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updated);
  }

  if (pathname === '/fiscal/ncm') {
    if (request.method !== 'GET') {
      return false;
    }
    const principal = await requirePrincipal(request, 'fiscal.read');
    const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const payload: FiscalNcmEntryListResponse = {
      items: await scopedFiscal.listNcmEntries({
        search: url.searchParams.get('search') ?? undefined
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/icms-matrix') {
    const url = new URL(request.url ?? pathname, 'http://localhost');

    if (request.method === 'GET') {
      const principal = await requirePrincipal(request, 'fiscal.read');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload: FiscalIcmsMatrixListResponse = {
        items: await scopedFiscal.listIcmsMatrix({
          search: url.searchParams.get('search') ?? undefined,
          ufOrigin: url.searchParams.get('ufOrigin') ?? undefined,
          ufDestination: url.searchParams.get('ufDestination') ?? undefined,
          operationType:
            (url.searchParams.get('operationType') as 'interna' | 'interestadual' | null) ??
            undefined
        })
      };
      return json(response, 200, payload);
    }

    if (request.method === 'POST') {
      const principal = await requirePrincipal(request, 'fiscal.manage');
      const scopedFiscal = getScopedFiscalService(fiscal, principal.user.accountId);
      const payload = (await readJsonBody(request)) as CreateFiscalIcmsMatrixRequest;
      const created = await scopedFiscal.createIcmsMatrix(payload);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'fiscal',
        action: 'create',
        entityType: 'icms-state-matrix',
        entityId: created.id,
        payloadSummary: `ICMS matrix ${created.ufOrigin}/${created.ufDestination} created`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 201, created);
    }

    return false;
  }

  return false;
}
