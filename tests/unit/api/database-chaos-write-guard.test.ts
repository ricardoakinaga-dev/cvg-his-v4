import { describe, expect, it } from 'vitest';

import {
  isDatabaseFailureMutationPath,
  isDatabaseFailurePublicMutationPath
} from '../../../apps/api/src/database-chaos-write-guard.js';

describe('database chaos write guard', () => {
  it.each([
    ['POST', '/encounters'],
    ['PATCH', '/patients/patient-1'],
    ['DELETE', '/billing/item-1'],
    ['PUT', '/inventory/products/product-1']
  ])('recognizes %s %s as a durable mutation', (method, pathname) => {
    expect(isDatabaseFailureMutationPath(pathname, method)).toBe(true);
  });

  it.each([
    ['GET', '/encounters'],
    ['HEAD', '/patients/patient-1'],
    ['OPTIONS', '/billing/items']
  ])('allows %s %s to remain readable or preflight-only', (method, pathname) => {
    expect(isDatabaseFailureMutationPath(pathname, method)).toBe(false);
  });

  it.each([
    ['POST', '/auth/login'],
    ['POST', '/api/auth/refresh'],
    ['POST', '/chaos/experiments/database-failure/stop'],
    ['GET', '/health'],
    ['GET', '/ready'],
    ['GET', '/live'],
    ['GET', '/metrics']
  ])('does not classify %s %s as a tenant data mutation', (method, pathname) => {
    expect(isDatabaseFailureMutationPath(pathname, method)).toBe(false);
  });

  it.each([
    '/webhooks/pix/synthetic/v1',
    '/webhooks/whatsapp/inbound',
    '/api/webhooks/whatsapp/inbound'
  ])('identifies public durable mutation %s for early containment', (pathname) => {
    expect(isDatabaseFailurePublicMutationPath(pathname, 'POST')).toBe(true);
  });

  it('does not classify read-only webhook inspection as a public mutation', () => {
    expect(isDatabaseFailurePublicMutationPath('/webhooks/pix/synthetic/v1', 'GET')).toBe(false);
  });

  it('keeps authenticated control-plane mutations outside the database data guard', () => {
    expect(isDatabaseFailureMutationPath('/auth/logout', 'POST')).toBe(false);
    expect(isDatabaseFailureMutationPath('/chaos/experiments/database-failure/stop', 'POST')).toBe(
      false
    );
  });
});
