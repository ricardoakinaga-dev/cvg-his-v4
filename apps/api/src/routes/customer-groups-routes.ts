import type { IncomingMessage, ServerResponse } from 'node:http';

import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import {
  createCustomerGroupStore,
  type CustomerGroupInput
} from '../catalog-stores.js';
import { readJsonBody } from '../helpers/common.js';
import type { AppendAudit, RequirePrincipal } from './route-handler-types.js';

export interface CustomerGroupsRoutesHandlers {
  customerGroups: ReturnType<typeof createCustomerGroupStore>;
  requirePrincipal: RequirePrincipal;
  appendAudit: AppendAudit;
}

export async function handleCustomerGroupsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: CustomerGroupsRoutesHandlers
): Promise<boolean> {
  const isCustomerGroupRoute =
    pathname === '/customer-groups' ||
    pathname === '/customer-group' ||
    pathname === '/grupos-de-clientes' ||
    pathname.startsWith('/customer-groups/');
  if (!isCustomerGroupRoute) {
    return false;
  }

  const { customerGroups, requirePrincipal, appendAudit } = handlers;
  const url = new URL(request.url ?? pathname, 'http://localhost');

if (
  (pathname === '/customer-groups' ||
    pathname === '/customer-group' ||
    pathname === '/grupos-de-clientes') &&
  request.method === 'GET'
) {
  const principal = requirePrincipal(request, 'service.read');
  const search = url.searchParams.get('search') ?? undefined;
  const activeParam = url.searchParams.get('active');
  const segment = url.searchParams.get('segment') ?? undefined;
  const active = activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
  const items = await customerGroups.list(principal.user.accountId, {
    search,
    active,
    segment
  });
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'customer-groups',
    'list',
    'customer-group',
    search ?? segment ?? 'all',
    'Customer groups catalog inspected',
    'medium',
    correlationId
  );
  response.statusCode = 200;
  response.end(JSON.stringify({ items }));
  return true;
}

if (pathname === '/customer-groups' && request.method === 'POST') {
  const principal = requirePrincipal(request, 'service.write');
  const payload = (await readJsonBody(request)) as CustomerGroupInput;
  const customerGroup = await customerGroups.create(principal.user.accountId, payload);
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'customer-groups',
    'create',
    'customer-group',
    customerGroup.id,
    `Customer group ${customerGroup.name} created`,
    'medium',
    correlationId
  );
  response.statusCode = 201;
  response.end(JSON.stringify(customerGroup));
  return true;
}

if (pathname.startsWith('/customer-groups/') && request.method === 'GET') {
  const principal = requirePrincipal(request, 'service.read');
  const customerGroupId = requireNonEmptyString(
    pathname.split('/')[2],
    'customerGroupId'
  );
  const customerGroup = await customerGroups.getOrThrow(customerGroupId);
  if (customerGroup.accountId !== principal.user.accountId) {
    throw new AuthenticationError('Customer group not found for current account');
  }
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'customer-groups',
    'read',
    'customer-group',
    customerGroup.id,
    `Customer group ${customerGroup.name} inspected`,
    'low',
    correlationId
  );
  response.statusCode = 200;
  response.end(JSON.stringify(customerGroup));
  return true;
}

if (pathname.startsWith('/customer-groups/') && request.method === 'PATCH') {
  const principal = requirePrincipal(request, 'service.write');
  const customerGroupId = requireNonEmptyString(
    pathname.split('/')[2],
    'customerGroupId'
  );
  const existingCustomerGroup = await customerGroups.getOrThrow(customerGroupId);
  if (existingCustomerGroup.accountId !== principal.user.accountId) {
    throw new AuthenticationError('Customer group not found for current account');
  }
  const payload = (await readJsonBody(request)) as CustomerGroupInput;
  const customerGroup = await customerGroups.update(customerGroupId, payload);
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'customer-groups',
    'update',
    'customer-group',
    customerGroup.id,
    `Customer group ${customerGroup.name} updated`,
    'medium',
    correlationId
  );
  response.statusCode = 200;
  response.end(JSON.stringify(customerGroup));
  return true;
}

if (pathname.startsWith('/customer-groups/') && request.method === 'DELETE') {
  const principal = requirePrincipal(request, 'service.write');
  const customerGroupId = requireNonEmptyString(
    pathname.split('/')[2],
    'customerGroupId'
  );
  const existingCustomerGroup = await customerGroups.getOrThrow(customerGroupId);
  if (existingCustomerGroup.accountId !== principal.user.accountId) {
    throw new AuthenticationError('Customer group not found for current account');
  }
  await customerGroups.delete(customerGroupId);
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'customer-groups',
    'delete',
    'customer-group',
    customerGroupId,
    `Customer group ${existingCustomerGroup.name} deleted`,
    'medium',
    correlationId
  );
  response.statusCode = 204;
  response.end();
  return true;
}

  return false;
}

