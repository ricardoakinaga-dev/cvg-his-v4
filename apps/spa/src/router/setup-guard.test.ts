import { describe, expect, it } from 'vitest';

import { getSanitizedRoute, resolveSetupRedirect } from './index';

describe('setup navigation guard', () => {
  it('sends an unauthenticated visitor to setup when installation requires it', () => {
    expect(
      resolveSetupRedirect({
        path: '/login',
        fullPath: '/login',
        requiresAuth: false,
        isAuthenticated: false,
        needsMfa: false,
        setupState: { setupRequired: true, setupAvailable: true }
      })
    ).toEqual({ path: '/setup' });
  });

  it('keeps the setup recovery page reachable when provisioning is unavailable', () => {
    expect(
      resolveSetupRedirect({
        path: '/setup',
        fullPath: '/setup',
        requiresAuth: false,
        isAuthenticated: false,
        needsMfa: false,
        setupState: { setupRequired: true, setupAvailable: false }
      })
    ).toBeUndefined();
  });

  it('sends setup back to login after installation is complete', () => {
    expect(
      resolveSetupRedirect({
        path: '/setup',
        fullPath: '/setup',
        requiresAuth: false,
        isAuthenticated: false,
        needsMfa: false,
        setupState: { setupRequired: false, setupAvailable: false }
      })
    ).toEqual({ path: '/login' });
  });

  it('does not strand login when installation status is temporarily unknown', () => {
    expect(
      resolveSetupRedirect({
        path: '/login',
        fullPath: '/login',
        requiresAuth: false,
        isAuthenticated: false,
        needsMfa: false,
        setupState: null
      })
    ).toBeUndefined();
  });

  it('preserves the MFA flow ahead of setup routing', () => {
    expect(
      resolveSetupRedirect({
        path: '/login',
        fullPath: '/login?next=/appointments',
        nextPath: '/appointments',
        requiresAuth: false,
        isAuthenticated: false,
        needsMfa: true,
        setupState: { setupRequired: true, setupAvailable: true }
      })
    ).toEqual({ path: '/auth/mfa', query: { next: '/appointments' } });
  });

  it('removes setup and refresh credentials from query strings and hashes', () => {
    expect(
      getSanitizedRoute({
        path: '/setup',
        query: {
          setupToken: 'secret',
          refresh_token: 'secret',
          source: 'operator'
        },
        hash: '#access_token=secret'
      })
    ).toEqual({ path: '/setup', query: { source: 'operator' }, hash: '' });
  });
});
