import { describe, expect, it } from 'vitest';

import {
  buildSmokeEndpoints,
  formatValidationReport,
  resolveSmokeAuth,
  validateAdminBootstrapEnv,
  validateAuthMePayload,
  validatePreflightEnv
} from './iamOps.js';

describe('iamOps', () => {
  it('validates a complete preflight env', () => {
    const result = validatePreflightEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/cvg_his',
      JWT_SECRET: 'super-secret-token-1234',
      JWT_ISSUER: 'cvg-his',
      JWT_AUDIENCE: 'cvg-his-api',
      NEXT_PUBLIC_HIS_API_BASE_URL: '/api/proxy',
      HIS_API_INTERNAL_URL: 'http://127.0.0.1:3000'
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(formatValidationReport('IAM preflight', result)).toContain('STATUS: READY');
  });

  it('fails when public proxy env is invalid', () => {
    const result = validatePreflightEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/cvg_his',
      JWT_SECRET: 'super-secret-token-1234',
      JWT_ISSUER: 'cvg-his',
      JWT_AUDIENCE: 'cvg-his-api',
      NEXT_PUBLIC_HIS_API_BASE_URL: 'http://localhost:3000',
      HIS_API_INTERNAL_URL: 'http://127.0.0.1:3000'
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'NEXT_PUBLIC_HIS_API_BASE_URL', level: 'error' })
      ])
    );
  });

  it('fails admin bootstrap validation without explicit strong credentials', () => {
    expect(validateAdminBootstrapEnv({})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'ADMIN_EMAIL', level: 'error' }),
        expect.objectContaining({ field: 'ADMIN_PASSWORD', level: 'error' })
      ])
    );

    expect(
      validateAdminBootstrapEnv({
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'weakpass'
      })
    ).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'ADMIN_PASSWORD', level: 'error' })]));
  });

  it('resolves smoke auth from cookie, bearer token, or raw header', () => {
    expect(resolveSmokeAuth({ IAM_SMOKE_COOKIE: 'his_token=abc' })).toEqual({
      headerName: 'cookie',
      headerValue: 'his_token=abc',
      source: 'cookie'
    });

    expect(resolveSmokeAuth({ IAM_SMOKE_BEARER_TOKEN: 'abc123' })).toEqual({
      headerName: 'authorization',
      headerValue: 'Bearer abc123',
      source: 'bearer_token'
    });

    expect(resolveSmokeAuth({ IAM_SMOKE_AUTH_HEADER: 'Bearer rawtoken' })).toEqual({
      headerName: 'authorization',
      headerValue: 'Bearer rawtoken',
      source: 'auth_header'
    });
  });

  it('builds smoke endpoints from the web base url', () => {
    expect(buildSmokeEndpoints('http://localhost:3001')).toEqual([
      { name: 'auth/me', url: 'http://localhost:3001/api/proxy/auth/me' },
      { name: 'admin/iam/users', url: 'http://localhost:3001/api/proxy/admin/iam/users' },
      { name: 'admin/iam/roles', url: 'http://localhost:3001/api/proxy/admin/iam/roles' }
    ]);
  });

  it('detects incomplete auth/me payloads', () => {
    const issues = validateAuthMePayload({
      accountId: 'acct_1',
      roles: ['admin'],
      permissions: ['users.read'],
      sessionId: 'sess_1'
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'permissions',
          message: expect.stringContaining('roles.read')
        })
      ])
    );
  });
});
