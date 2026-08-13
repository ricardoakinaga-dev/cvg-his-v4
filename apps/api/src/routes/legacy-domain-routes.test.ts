import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAnimalCatalogRoutes } from './animal-catalog-routes.js';
import { handleAttachmentsRoutes } from './attachments-routes.js';
import { handleCepRoutes } from './cep-routes.js';
import { handleClinicalHandoffsRoutes } from './clinical-handoffs-routes.js';
import { handleCustomerGroupsRoutes } from './customer-groups-routes.js';
import { handleEncountersRoutes } from './encounters-routes.js';
import { handleMedicalRecordsRoutes } from './medical-records-routes.js';
import { handleNotificationsRoutes } from './notifications-routes.js';
import { handlePreventiveCareRoutes } from './preventive-care-routes.js';
import { handleProductsServicesRoutes } from './products-services-routes.js';
import { handleResponsibilityTermsRoutes } from './responsibility-terms-routes.js';
import { handleTriageRoutes } from './triage-routes.js';

test('extracted legacy domain handlers preserve dispatch fall-through', async () => {
  const request = { method: 'GET', url: '/unrelated' } as never;
  const response = {} as never;
  const handlers = {} as never;

  const results = await Promise.all([
    handleAnimalCatalogRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleAttachmentsRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleCepRoutes('/unrelated', request, response, 'corr-1'),
    handleClinicalHandoffsRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleCustomerGroupsRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleEncountersRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleMedicalRecordsRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleNotificationsRoutes('/unrelated', request, response, 'corr-1', handlers),
    handlePreventiveCareRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleProductsServicesRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleResponsibilityTermsRoutes('/unrelated', request, response, 'corr-1', handlers),
    handleTriageRoutes('/unrelated', request, response, 'corr-1', handlers)
  ]);

  assert.deepEqual(results, Array.from({ length: results.length }, () => false));
});
