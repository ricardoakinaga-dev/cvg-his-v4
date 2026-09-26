import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { ProductsService } from '@cvg-his-v2/module-products';
import type { ServicesService } from '@cvg-his-v2/module-services';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { readJsonBody } from '../helpers/request-body.js';
import { matchesCollectionItemPath } from './resource-route-path.js';

export interface ProductServiceCatalogRoutesHandlers {
  readonly products: Pick<ProductsService, 'list' | 'create' | 'getOrThrow' | 'update'>;
  readonly services: Pick<ServicesService, 'list' | 'create' | 'getOrThrow' | 'update'>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly appendAudit: (
    actorId: string,
    accountId: string,
    module: string,
    action: string,
    entityType: string,
    entityId: string,
    payloadSummary: string,
    riskLevel: 'low' | 'medium' | 'high',
    correlationId: string
  ) => void;
}

export async function handleProductServiceCatalogRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ProductServiceCatalogRoutesHandlers
): Promise<boolean> {
  const { products, services, requirePrincipal, appendAudit } = handlers;

  if (pathname === '/products' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'product.read');
    const search = url.searchParams.get('search') ?? undefined;
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'products',
      'list',
      'product',
      search ?? 'all',
      'Products catalog inspected',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: products.list(principal.user.accountId as never, { search })
      })
    );
    return true;
  }

  if (pathname === '/products' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'product.write');
    const payload = (await readJsonBody(request)) as {
      name: string;
      code?: string | null;
      description?: string | null;
      basePrice: number;
      active?: boolean;
    };
    const product = await products.create(principal.user.accountId as never, {
      name: requireNonEmptyString(payload.name, 'name'),
      code: payload.code,
      description: payload.description,
      basePrice: payload.basePrice,
      active: payload.active
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'products',
      'create',
      'product',
      product.id,
      `Product ${product.name} created`,
      'medium',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(product));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/products') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'product.read');
    const productId = requireNonEmptyString(pathname.split('/')[2], 'productId');
    const product = products.getOrThrow(productId);
    if (product.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Product not found for current account');
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'products',
      'read',
      'product',
      product.id,
      `Product ${product.name} inspected`,
      'low',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(product));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/products') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'product.write');
    const productId = requireNonEmptyString(pathname.split('/')[2], 'productId');
    const existingProduct = products.getOrThrow(productId);
    if (existingProduct.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Product not found for current account');
    }
    const payload = (await readJsonBody(request)) as {
      name?: string;
      code?: string | null;
      description?: string | null;
      basePrice?: number;
      active?: boolean;
    };
    const product = await products.update(productId, {
      name: payload.name,
      code: payload.code,
      description: payload.description,
      basePrice: payload.basePrice,
      active: payload.active
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'products',
      'update',
      'product',
      product.id,
      `Product ${product.name} updated`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(product));
    return true;
  }

  if (pathname === '/services' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const search = url.searchParams.get('search') ?? undefined;
    const activeParam = url.searchParams.get('active');
    const active = activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'services',
      'list',
      'service',
      search ?? 'all',
      'Services catalog inspected',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: services.list(principal.user.accountId as never, { search, active })
      })
    );
    return true;
  }

  if (pathname === '/services' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request)) as {
      name: string;
      code?: string | null;
      description?: string | null;
      basePrice: number;
      active?: boolean;
    };
    const service = await services.create(principal.user.accountId as never, {
      name: requireNonEmptyString(payload.name, 'name'),
      code: payload.code,
      description: payload.description,
      basePrice: payload.basePrice,
      active: payload.active
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'services',
      'create',
      'service',
      service.id,
      `Service ${service.name} created`,
      'medium',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(service));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/services') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const serviceId = requireNonEmptyString(pathname.split('/')[2], 'serviceId');
    const service = services.getOrThrow(serviceId);
    if (service.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Service not found for current account');
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'services',
      'read',
      'service',
      service.id,
      `Service ${service.name} inspected`,
      'low',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(service));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/services') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'service.write');
    const serviceId = requireNonEmptyString(pathname.split('/')[2], 'serviceId');
    const existingService = services.getOrThrow(serviceId);
    if (existingService.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Service not found for current account');
    }
    const payload = (await readJsonBody(request)) as {
      name?: string;
      code?: string | null;
      description?: string | null;
      basePrice?: number;
      active?: boolean;
    };
    const service = await services.update(serviceId, {
      name: payload.name,
      code: payload.code,
      description: payload.description,
      basePrice: payload.basePrice,
      active: payload.active
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'services',
      'update',
      'service',
      service.id,
      `Service ${service.name} updated`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(service));
    return true;
  }

  return false;
}
