import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
  CommercialService,
  LoyaltyPointSource,
  LoyaltyRedemptionStatus,
  PosSyncKind,
  PosSyncStatus,
  PriceTableItemKind
} from '@cvg-his-v2/module-commercial';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface CommercialRoutesHandlers {
  commercial: CommercialService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function query(request: IncomingMessage, pathname: string): URL {
  return new URL(request.url ?? pathname, 'http://localhost');
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ValidationError('active must be true or false');
}

const priceTableCollectionPaths = new Set([
  '/price-tables',
  '/tabelas-de-preco',
  '/tabelas-de-preços',
  '/estoque/tabelas-de-preco',
  '/estoque/tabelas-de-preços',
  '/estoque/cadastros/tabelas-de-preco',
  '/estoque/cadastros/tabelas-de-preços'
]);

function parsePriceTableId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:price-tables|tabelas-de-preco|tabelas-de-preços)\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function parsePriceTableItemsId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:price-tables|tabelas-de-preco|tabelas-de-preços)\/([^/]+)\/items$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function handleCommercialRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: CommercialRoutesHandlers
): Promise<boolean> {
  if (
    !pathname.startsWith('/loyalty') &&
    !pathname.startsWith('/price-tables') &&
    !pathname.startsWith('/tabelas-de-preco') &&
    !pathname.startsWith('/tabelas-de-preços') &&
    !pathname.startsWith('/estoque/tabelas-de-preco') &&
    !pathname.startsWith('/estoque/tabelas-de-preços') &&
    !pathname.startsWith('/estoque/cadastros/tabelas-de-preco') &&
    !pathname.startsWith('/estoque/cadastros/tabelas-de-preços') &&
    !pathname.startsWith('/pos-sync')
  ) {
    return false;
  }

  const { commercial, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';

  if (pathname === '/loyalty/programs' && method === 'GET') {
    const principal = requirePrincipal(request, 'counter_sale.read');
    return json(response, 200, {
      items: commercial.listLoyaltyPrograms(principal.user.accountId)
    });
  }

  if (pathname === '/loyalty/programs' && method === 'POST') {
    const principal = requirePrincipal(request, 'counter_sale.write');
    const payload = await readJsonBody(request) as {
      name: string;
      pointsPerReal?: number;
      redemptionRules?: Record<string, unknown>;
      isActive?: boolean;
    };
    const program = await commercial.createLoyaltyProgram(principal.user.accountId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'create_loyalty_program',
      entityType: 'loyalty-program',
      entityId: program.id,
      payloadSummary: `Loyalty program ${program.name} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, program);
  }

  if (pathname === '/loyalty/summary' && method === 'GET') {
    const principal = requirePrincipal(request, 'counter_sale.read');
    const ownerId = query(request, pathname).searchParams.get('ownerId');
    return json(response, 200, commercial.getLoyaltyBalance(principal.user.accountId, ownerId));
  }

  if (pathname === '/loyalty/points' && method === 'POST') {
    const principal = requirePrincipal(request, 'counter_sale.write');
    const payload = await readJsonBody(request) as {
      ownerId: string;
      points: number;
      programId?: string | null;
      sourceType?: LoyaltyPointSource;
      sourceId?: string | null;
      isBlocked?: boolean;
      expiresAt?: string | null;
    };
    const point = await commercial.awardPoints(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'award_loyalty_points',
      entityType: 'loyalty-point',
      entityId: point.id,
      payloadSummary: `Awarded ${point.points} loyalty points to owner ${point.ownerId}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, point);
  }

  if (pathname === '/loyalty/redemptions' && method === 'GET') {
    const principal = requirePrincipal(request, 'counter_sale.read');
    const ownerId = query(request, pathname).searchParams.get('ownerId') ?? undefined;
    return json(response, 200, {
      items: commercial.listLoyaltyRedemptions(principal.user.accountId, { ownerId })
    });
  }

  if (pathname === '/loyalty/redemptions' && method === 'POST') {
    const principal = requirePrincipal(request, 'counter_sale.write');
    const payload = await readJsonBody(request) as {
      ownerId: string;
      pointsUsed: number;
      rewardDescription: string;
      programId?: string | null;
      productQuantity?: number;
      serviceQuantity?: number;
      status?: LoyaltyRedemptionStatus;
      metadata?: Record<string, unknown>;
    };
    const redemption = await commercial.redeemPoints(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'redeem_loyalty_points',
      entityType: 'loyalty-redemption',
      entityId: redemption.id,
      payloadSummary: `Redeemed ${redemption.pointsUsed} points for owner ${redemption.ownerId}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, redemption);
  }

  if (priceTableCollectionPaths.has(pathname) && method === 'GET') {
    const principal = requirePrincipal(request, 'inventory.read');
    const url = query(request, pathname);
    return json(response, 200, {
      items: commercial.listPriceTables(principal.user.accountId, {
        search: url.searchParams.get('search') ?? undefined,
        active: parseBoolean(url.searchParams.get('active'))
      })
    });
  }

  if (priceTableCollectionPaths.has(pathname) && method === 'POST') {
    const principal = requirePrincipal(request, 'inventory.manage');
    const payload = await readJsonBody(request) as {
      legacyId?: string | null;
      description: string;
      context?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
    };
    const table = await commercial.createPriceTable(principal.user.accountId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'create_price_table',
      entityType: 'price-table',
      entityId: table.id,
      payloadSummary: `Price table ${table.description} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, table);
  }

  const priceTableId = parsePriceTableId(pathname);
  if (priceTableId && method === 'GET') {
    const principal = requirePrincipal(request, 'inventory.read');
    return json(response, 200, commercial.getPriceTableDetail(principal.user.accountId, priceTableId));
  }

  if (priceTableId && method === 'PATCH') {
    const principal = requirePrincipal(request, 'inventory.manage');
    const payload = await readJsonBody(request) as {
      legacyId?: string | null;
      description: string;
      context?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
    };
    const table = await commercial.updatePriceTable(principal.user.accountId, priceTableId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'update_price_table',
      entityType: 'price-table',
      entityId: table.id,
      payloadSummary: `Price table ${table.description} updated`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, table);
  }

  if (priceTableId && method === 'DELETE') {
    const principal = requirePrincipal(request, 'inventory.manage');
    const table = await commercial.archivePriceTable(principal.user.accountId, priceTableId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'archive_price_table',
      entityType: 'price-table',
      entityId: table.id,
      payloadSummary: `Price table ${table.description} archived`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 204;
    response.end();
    return true;
  }

  const priceTableItemsId = parsePriceTableItemsId(pathname);
  if (priceTableItemsId && method === 'POST') {
    const principal = requirePrincipal(request, 'inventory.manage');
    const payload = await readJsonBody(request) as {
      itemKind: PriceTableItemKind;
      itemId: string;
      price: number;
    };
    const item = await commercial.addPriceTableItem(
      principal.user.accountId,
      priceTableItemsId,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'add_price_table_item',
      entityType: 'price-table-item',
      entityId: item.id,
      payloadSummary: `Price table item ${item.itemId} added`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, item);
  }

  if (pathname === '/pos-sync/jobs' && method === 'GET') {
    const principal = requirePrincipal(request, 'inventory.read');
    const url = query(request, pathname);
    return json(response, 200, {
      items: commercial.listPosSyncJobs(principal.user.accountId, {
        syncKind: url.searchParams.get('syncKind') as PosSyncKind | null ?? undefined,
        status: url.searchParams.get('status') as PosSyncStatus | null ?? undefined
      })
    });
  }

  if (pathname === '/pos-sync/jobs' && method === 'POST') {
    const principal = requirePrincipal(request, 'inventory.manage');
    const payload = await readJsonBody(request) as {
      syncKind: PosSyncKind;
      metadata?: Record<string, unknown>;
    };
    const job = await commercial.createPosSyncJob(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'create_pos_sync_job',
      entityType: 'pos-sync-job',
      entityId: job.id,
      payloadSummary: `POS sync job ${job.syncKind} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, job);
  }

  const posSyncJobMatch = pathname.match(/^\/pos-sync\/jobs\/([^/]+)$/);
  if (posSyncJobMatch && method === 'PATCH') {
    const principal = requirePrincipal(request, 'inventory.manage');
    const payload = await readJsonBody(request) as {
      status: PosSyncStatus;
      processedCount?: number;
      errorMessage?: string | null;
    };
    const job = await commercial.updatePosSyncJob(
      principal.user.accountId,
      posSyncJobMatch[1],
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'commercial',
      action: 'update_pos_sync_job',
      entityType: 'pos-sync-job',
      entityId: job.id,
      payloadSummary: `POS sync job ${job.id} updated to ${job.status}`,
      riskLevel: job.status === 'failed' ? 'high' : 'medium',
      correlationId
    });
    return json(response, 200, job);
  }

  return false;
}
