import type { IncomingMessage, ServerResponse } from 'node:http';

import type { FiscalService } from '@cvg-his-v2/module-fiscal';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  FiscalCfopListResponse,
  FiscalIcmsMatrixListResponse,
  FiscalIcmsRuleListResponse,
  FiscalNcmEntryListResponse,
  FiscalNfseLayoutListResponse,
  FiscalPisCofinsRuleListResponse
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';

export interface FiscalRoutesHandlers {
  fiscal: FiscalService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
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

export function handleFiscalRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: FiscalRoutesHandlers
): boolean {
  if (request.method !== 'GET' || !pathname.startsWith('/fiscal')) {
    return false;
  }

  const { fiscal, audit, requirePrincipal } = handlers;
  const principal = requirePrincipal(request, 'fiscal.read');
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/fiscal/summary') {
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
    return json(response, 200, fiscal.getDashboardSummary());
  }

  if (pathname === '/fiscal/tax-preview') {
    return json(response, 200, fiscal.getTaxPreview());
  }

  if (pathname === '/fiscal/icms') {
    const payload: FiscalIcmsRuleListResponse = {
      items: fiscal.listIcmsRules({
        ufOrigin: url.searchParams.get('ufOrigin') ?? undefined,
        ufDestination: url.searchParams.get('ufDestination') ?? undefined,
        ncm: url.searchParams.get('ncm') ?? undefined,
        operationType:
          (url.searchParams.get('operationType') as 'interna' | 'interestadual' | null)
          ?? undefined
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/pis-cofins') {
    const payload: FiscalPisCofinsRuleListResponse = {
      items: fiscal.listPisCofinsRules({
        regime:
          (url.searchParams.get('regime') as 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null)
          ?? undefined,
        appliesTo:
          (url.searchParams.get('appliesTo') as 'mercadoria' | 'servico' | 'ambos' | null)
          ?? undefined
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/cfop') {
    const payload: FiscalCfopListResponse = {
      items: fiscal.listCfop({
        search: url.searchParams.get('search') ?? undefined,
        section: (url.searchParams.get('section') as 'entrada' | 'saida' | null) ?? undefined,
        documentType:
          (url.searchParams.get('documentType') as 'nfe' | 'nfce' | 'nfse' | 'cte' | null)
          ?? undefined
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/nfse') {
    const payload: FiscalNfseLayoutListResponse = {
      items: fiscal.listNfseLayouts({
        state: url.searchParams.get('state') ?? undefined,
        active: parseOptionalBoolean(url.searchParams.get('active'))
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/ncm') {
    const payload: FiscalNcmEntryListResponse = {
      items: fiscal.listNcmEntries({
        search: url.searchParams.get('search') ?? undefined
      })
    };
    return json(response, 200, payload);
  }

  if (pathname === '/fiscal/icms-matrix') {
    const payload: FiscalIcmsMatrixListResponse = {
      items: fiscal.listIcmsMatrix({
        ufOrigin: url.searchParams.get('ufOrigin') ?? undefined,
        ufDestination: url.searchParams.get('ufDestination') ?? undefined,
        operationType:
          (url.searchParams.get('operationType') as 'interna' | 'interestadual' | null)
          ?? undefined
      })
    };
    return json(response, 200, payload);
  }

  return false;
}
