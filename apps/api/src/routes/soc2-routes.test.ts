import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { AbacEngine } from '@cvg-his-v2/module-access-control';
import {
  AccessReviewControlService,
  DisasterRecoveryControlService,
  IncidentResponseControlService,
  MfaControlService,
  VulnerabilityControlService
} from '@cvg-his-v2/module-soc2';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleSoc2Routes } from './soc2-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;

    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createHandlers() {
  const principal: AuthenticatedPrincipal = {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['audit.read'],
      capabilities: []
    }
  };

  return {
    requirePrincipal: () => principal,
    appendAudit: () => {},
    logError: () => {},
    abacEngine: new AbacEngine(),
    mfaControl: new MfaControlService(),
    vulnerabilityControl: new VulnerabilityControlService(),
    accessControl: new AccessReviewControlService(),
    drControl: new DisasterRecoveryControlService(),
    incidentControl: new IncidentResponseControlService()
  };
}

test('handleSoc2Routes serves summarized ABAC policies', async () => {
  const response = new MockResponse();
  const handled = await handleSoc2Routes(
    '/soc2/policies',
    { method: 'GET', url: '/soc2/policies' } as never,
    response as never,
    'corr-1',
    createHandlers()
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    abacPolicies: Array<{ id: string; rulesCount: number }>;
    totalPolicies: number;
  }>();
  assert.equal(payload.totalPolicies, payload.abacPolicies.length);
  assert.ok(payload.abacPolicies.every((policy) => typeof policy.id === 'string'));
  assert.ok(payload.abacPolicies.every((policy) => policy.rulesCount >= 0));
});

test('handleSoc2Routes calculates a security score for authenticated requests', async () => {
  const response = new MockResponse();
  const handled = await handleSoc2Routes(
    '/soc2/security-score',
    { method: 'GET', url: '/soc2/security-score' } as never,
    response as never,
    'corr-2',
    createHandlers()
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ overall: number }>();
  assert.equal(typeof payload.overall, 'number');
  assert.ok(payload.overall >= 0);
  assert.ok(payload.overall <= 100);
});
