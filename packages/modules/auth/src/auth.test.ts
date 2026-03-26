import assert from 'node:assert/strict';
import test from 'node:test';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import { StaffService } from '@cvg-his-v2/module-staff';
import { UsersService } from '@cvg-his-v2/module-users';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';

import { AuthService } from './index.js';

function createAuthService() {
  const users = new UsersService();
  const staff = new StaffService();
  const accessControl = new AccessControlService();
  const audit = new AuditService();

  return new AuthService({
    secret: 'test-secret-key',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    users,
    staff,
    accessControl,
    audit
  });
}

test('AuthService: login with valid credentials returns session', () => {
  const auth = createAuthService();

  const result = auth.login({ username: 'admin', password: 'admin123' }, 'corr-test-1');

  assert.ok(result.accessToken);
  assert.ok(result.refreshToken);
  assert.equal(result.principal.user.username, 'admin');
  assert.equal(result.principal.session.active, true);
});

test('AuthService: login with invalid credentials throws AuthenticationError', () => {
  const auth = createAuthService();

  assert.throws(
    () => auth.login({ username: 'admin', password: 'wrong' }, 'corr-test-2'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});

test('AuthService: login with non-existent user throws', () => {
  const auth = createAuthService();

  assert.throws(
    () => auth.login({ username: 'nonexistent', password: 'test' }, 'corr-test-3'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});

test('AuthService: refresh rotates tokens but keeps same session', () => {
  const auth = createAuthService();

  const login = auth.login({ username: 'admin', password: 'admin123' }, 'corr-test-4');
  const originalSessionId = login.principal.session.sessionId;
  const originalRefresh = login.refreshToken;

  const refreshed = auth.refresh({ refreshToken: login.refreshToken }, 'corr-test-4-refresh');

  assert.equal(refreshed.principal.session.sessionId, originalSessionId);
  assert.notEqual(refreshed.refreshToken, originalRefresh);
  assert.ok(refreshed.accessToken);
});

test('AuthService: revoked session cannot be refreshed', () => {
  const auth = createAuthService();

  const login = auth.login({ username: 'admin', password: 'admin123' }, 'corr-test-5');

  auth.logout({ refreshToken: login.refreshToken }, 'corr-test-5-logout');

  assert.throws(
    () => auth.refresh({ refreshToken: login.refreshToken }, 'corr-test-5-should-fail'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});

test('AuthService: authenticateAccessToken returns principal for valid token', () => {
  const auth = createAuthService();

  const login = auth.login({ username: 'admin', password: 'admin123' }, 'corr-test-6');

  const principal = auth.authenticateAccessToken(login.accessToken);

  assert.equal(principal.user.id, login.principal.user.id);
  assert.equal(principal.session.sessionId, login.principal.session.sessionId);
});

test('AuthService: authenticateAccessToken throws for invalid token', () => {
  const auth = createAuthService();

  assert.throws(
    () => auth.authenticateAccessToken('invalid-token'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});
