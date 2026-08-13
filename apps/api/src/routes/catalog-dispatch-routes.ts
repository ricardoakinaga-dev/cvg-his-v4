import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  handleAnimalCatalogRoutes,
  type AnimalCatalogRoutesHandlers
} from './animal-catalog-routes.js';
import {
  handleCustomerGroupsRoutes,
  type CustomerGroupsRoutesHandlers
} from './customer-groups-routes.js';
import {
  handlePreventiveCareRoutes,
  type PreventiveCareRoutesHandlers
} from './preventive-care-routes.js';
import {
  handleProductsServicesRoutes,
  type ProductsServicesRoutesHandlers
} from './products-services-routes.js';
import {
  handleResponsibilityTermsRoutes,
  type ResponsibilityTermsRoutesHandlers
} from './responsibility-terms-routes.js';

export interface CatalogDispatchRoutesHandlers
  extends AnimalCatalogRoutesHandlers,
    CustomerGroupsRoutesHandlers,
    PreventiveCareRoutesHandlers,
    ProductsServicesRoutesHandlers,
    ResponsibilityTermsRoutesHandlers {}

export async function handleCatalogDispatchRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: CatalogDispatchRoutesHandlers
): Promise<boolean> {
  return (
    (await handleProductsServicesRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handleAnimalCatalogRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handleCustomerGroupsRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handlePreventiveCareRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handleResponsibilityTermsRoutes(pathname, request, response, correlationId, handlers))
  );
}
