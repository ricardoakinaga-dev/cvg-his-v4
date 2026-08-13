import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { ProductsService } from '@cvg-his-v2/module-products';
import type { ServicesService } from '@cvg-his-v2/module-services';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

interface CatalogItemPayload {
  name?: string;
  code?: string | null;
  description?: string | null;
  basePrice?: number;
  active?: boolean;
}

export interface ProductsServicesRoutesHandlers {
  products: ProductsService;
  services: ServicesService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

export async function handleProductsServicesRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ProductsServicesRoutesHandlers
): Promise<boolean> {
  const isProductRoute = pathname === '/products' || pathname.startsWith('/products/');
  const isServiceRoute = pathname === '/services' || pathname.startsWith('/services/');
  if (!isProductRoute && !isServiceRoute) {
    return false;
  }

  const { products, services, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/products' && method === 'GET') {
    const principal = requirePrincipal(request, 'product.read');
    const search = url.searchParams.get('search') ?? undefined;
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'products',
      action: 'list',
      entityType: 'product',
      entityId: search ?? 'all',
      payloadSummary: 'Products catalog inspected',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: products.list(principal.user.accountId as never, { search })
    });
  }

  if (pathname === '/products' && method === 'POST') {
    const principal = requirePrincipal(request, 'product.write');
    const payload = (await readJsonBody(request)) as CatalogItemPayload;
    const product = await products.create(principal.user.accountId as never, {
      name: requireNonEmptyString(payload.name, 'name'),
      code: payload.code,
      description: payload.description,
      basePrice: payload.basePrice as number,
      active: payload.active
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'products',
      action: 'create',
      entityType: 'product',
      entityId: product.id,
      payloadSummary: `Product ${product.name} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, product);
  }

  if (pathname.startsWith('/products/') && method === 'GET') {
    const principal = requirePrincipal(request, 'product.read');
    const productId = requireNonEmptyString(pathname.split('/')[2], 'productId');
    const product = products.getOrThrow(productId);
    if (product.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Product not found for current account');
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'products',
      action: 'read',
      entityType: 'product',
      entityId: product.id,
      payloadSummary: `Product ${product.name} inspected`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, product);
  }

  if (pathname.startsWith('/products/') && method === 'PATCH') {
    const principal = requirePrincipal(request, 'product.write');
    const productId = requireNonEmptyString(pathname.split('/')[2], 'productId');
    const existingProduct = products.getOrThrow(productId);
    if (existingProduct.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Product not found for current account');
    }
    const payload = (await readJsonBody(request)) as CatalogItemPayload;
    const product = await products.update(productId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'products',
      action: 'update',
      entityType: 'product',
      entityId: product.id,
      payloadSummary: `Product ${product.name} updated`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, product);
  }

  if (pathname === '/services' && method === 'GET') {
    const principal = requirePrincipal(request, 'service.read');
    const search = url.searchParams.get('search') ?? undefined;
    const activeParam = url.searchParams.get('active');
    const active = activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'services',
      action: 'list',
      entityType: 'service',
      entityId: search ?? 'all',
      payloadSummary: 'Services catalog inspected',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: services.list(principal.user.accountId as never, { search, active })
    });
  }

  if (pathname === '/services' && method === 'POST') {
    const principal = requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request)) as CatalogItemPayload;
    const service = await services.create(principal.user.accountId as never, {
      name: requireNonEmptyString(payload.name, 'name'),
      code: payload.code,
      description: payload.description,
      basePrice: payload.basePrice as number,
      active: payload.active
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'services',
      action: 'create',
      entityType: 'service',
      entityId: service.id,
      payloadSummary: `Service ${service.name} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, service);
  }

  if (pathname.startsWith('/services/') && method === 'GET') {
    const principal = requirePrincipal(request, 'service.read');
    const serviceId = requireNonEmptyString(pathname.split('/')[2], 'serviceId');
    const service = services.getOrThrow(serviceId);
    if (service.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Service not found for current account');
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'services',
      action: 'read',
      entityType: 'service',
      entityId: service.id,
      payloadSummary: `Service ${service.name} inspected`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, service);
  }

  if (pathname.startsWith('/services/') && method === 'PATCH') {
    const principal = requirePrincipal(request, 'service.write');
    const serviceId = requireNonEmptyString(pathname.split('/')[2], 'serviceId');
    const existingService = services.getOrThrow(serviceId);
    if (existingService.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Service not found for current account');
    }
    const payload = (await readJsonBody(request)) as CatalogItemPayload;
    const service = await services.update(serviceId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'services',
      action: 'update',
      entityType: 'service',
      entityId: service.id,
      payloadSummary: `Service ${service.name} updated`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, service);
  }

  return false;
}
