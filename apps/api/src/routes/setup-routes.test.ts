import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import {
  handleSetupRoutes,
  validateAdminPassword,
  MAX_ADMIN_PASSWORD_LENGTH,
  MIN_ADMIN_PASSWORD_LENGTH,
  SETUP_MAX_BODY_BYTES
} from './setup-routes.js';
import { INITIAL_ROLE_SEEDS, toAccountSlug } from '../setup-provisioning.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #headers = new Map<string, string>();
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

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(method: 'GET' | 'POST', body?: string): never {
  return {
    method,
    url: method === 'GET' ? '/auth/setup/status' : '/auth/setup',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(body);
    }
  } as never;
}

function setupHandlers(input: {
  readonly setupBootstrapToken?: string;
  readonly setupRequired?: boolean;
  readonly checkedRoutes?: string[];
  readonly queryCount?: { value: number };
  readonly warningContexts?: unknown[];
  readonly poolQuery?: (
    sql: string,
    values?: readonly unknown[]
  ) => Promise<{ readonly rows: readonly Record<string, unknown>[]; readonly rowCount: number }>;
} = {}): never {
  return {
    auth: {},
    users: {},
    setupRateLimiter: {
      check: async ({ route }: { route: string }) => {
        input.checkedRoutes?.push(route);
        return { limit: 5, remaining: 4, reset: 1, blocked: false, retryAfterMs: 0 };
      }
    },
    logger: {
      error: () => {},
      warn: (_message: string, context?: unknown) => input.warningContexts?.push(context),
      info: () => {}
    },
    setupBootstrapToken: input.setupBootstrapToken,
    getPool: () => ({
      query: async (sql: string, values?: readonly unknown[]) => {
        if (input.queryCount) input.queryCount.value += 1;
        if (input.poolQuery) return input.poolQuery(sql, values);
        return {
          rows: [{ exists: !(input.setupRequired ?? true), setup_required: input.setupRequired ?? true }],
          rowCount: 1
        };
      }
    }),
    appendAudit: () => {}
  } as never;
}

test('rejects passwords shorter than the policy minimum', () => {
  const result = validateAdminPassword('Ab1!' + 'x'.repeat(MIN_ADMIN_PASSWORD_LENGTH - 5));

  assert.match(result ?? '', /ao menos 12 caracteres/);
});

test('rejects passwords built from too few character classes', () => {
  assert.match(validateAdminPassword('abcdefghijklmno') ?? '', /ao menos três/);
  assert.match(validateAdminPassword('abcdefghijklABC') ?? '', /ao menos três/);
});

test('accepts a password with enough length and variety', () => {
  assert.equal(validateAdminPassword('Clinica2026!vet'), null);
  assert.equal(validateAdminPassword('senha-forte-123'), null);
});

test('rejects an oversized administrator password', () => {
  assert.match(validateAdminPassword(`Aa1!${'x'.repeat(MAX_ADMIN_PASSWORD_LENGTH)}`) ?? '', /máximo/);
});

test('reports required and available as separate setup states', async () => {
  const response = new MockResponse();
  const handled = await handleSetupRoutes(
    '/auth/setup/status',
    request('GET'),
    response as never,
    'corr-setup-status',
    setupHandlers({ setupRequired: true })
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), { setupRequired: true, setupAvailable: false });
});

test('uses independent rate-limit buckets for status and mutation', async () => {
  const checkedRoutes: string[] = [];
  await handleSetupRoutes(
    '/auth/setup/status',
    request('GET'),
    new MockResponse() as never,
    'corr-status-limit',
    setupHandlers({ setupBootstrapToken: 'a'.repeat(32), checkedRoutes })
  );
  await handleSetupRoutes(
    '/auth/setup',
    request('POST', '{}'),
    new MockResponse() as never,
    'corr-create-limit',
    setupHandlers({ setupBootstrapToken: 'a'.repeat(32), checkedRoutes })
  );

  assert.deepEqual(checkedRoutes, ['/auth/setup/status', '/auth/setup']);
});

test('fails setup closed when no bootstrap secret is configured', async () => {
  const response = new MockResponse();
  await handleSetupRoutes(
    '/auth/setup',
    request('POST', JSON.stringify({ token: 'attacker-controlled' })),
    response as never,
    'corr-setup-disabled',
    setupHandlers({ setupRequired: true })
  );

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.bodyJson(), {
    code: 'SETUP_DISABLED',
    message: 'Initial setup is disabled until the operator configures a bootstrap secret.'
  });
});

test('rejects an invalid bootstrap token before provisioning and never logs the candidate', async () => {
  const response = new MockResponse();
  const queryCount = { value: 0 };
  const warningContexts: unknown[] = [];
  const candidate = 'invalid-bootstrap-secret-canary';

  await handleSetupRoutes(
    '/auth/setup',
    request('POST', JSON.stringify({ token: candidate })),
    response as never,
    'corr-setup-invalid-token',
    setupHandlers({
      setupBootstrapToken: '0123456789abcdef'.repeat(4),
      setupRequired: true,
      queryCount,
      warningContexts
    })
  );

  assert.equal(response.statusCode, 401);
  assert.equal(queryCount.value, 1, 'only the read-only status capability may run');
  assert.doesNotMatch(JSON.stringify(warningContexts), new RegExp(candidate));
  assert.doesNotMatch(JSON.stringify(response.bodyJson()), new RegExp(candidate));
});

test('preserves malformed and oversized body errors instead of misreporting an invalid token', async () => {
  const token = 'a'.repeat(32);
  const malformedResponse = new MockResponse();
  await handleSetupRoutes(
    '/auth/setup',
    request('POST', '{'),
    malformedResponse as never,
    'corr-setup-malformed',
    setupHandlers({ setupBootstrapToken: token })
  );

  assert.equal(malformedResponse.statusCode, 400);
  assert.equal(malformedResponse.bodyJson<{ code: string }>().code, 'INVALID_JSON_BODY');

  const oversizedResponse = new MockResponse();
  await handleSetupRoutes(
    '/auth/setup',
    request('POST', JSON.stringify({ padding: 'x'.repeat(SETUP_MAX_BODY_BYTES) })),
    oversizedResponse as never,
    'corr-setup-oversized',
    setupHandlers({ setupBootstrapToken: token })
  );

  assert.equal(oversizedResponse.statusCode, 413);
  assert.equal(oversizedResponse.bodyJson<{ code: string }>().code, 'SETUP_PAYLOAD_TOO_LARGE');
});

test('confirms durable setup without returning a session or any submitted secret', async () => {
  const response = new MockResponse();
  const setupToken = '0123456789abcdef'.repeat(4);
  const adminPassword = 'Clinica2026!vet';

  await handleSetupRoutes(
    '/auth/setup',
    request(
      'POST',
      JSON.stringify({
        token: setupToken,
        clinicName: 'Clínica Central',
        adminUsername: 'admin',
        adminFullName: 'Admin CVG',
        adminEmail: 'admin@example.com',
        adminPassword
      })
    ),
    response as never,
    'corr-setup-success',
    setupHandlers({
      setupBootstrapToken: setupToken,
      poolQuery: async (sql) =>
        sql.includes('is_initial_setup_required')
          ? { rows: [{ setup_required: true }], rowCount: 1 }
          : {
              rows: [
                {
                  account_id: 'account-1',
                  user_id: 'user-1',
                  clinic_slug: 'clinica-central'
                }
              ],
              rowCount: 1
            }
    })
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.bodyJson(), { setupCompleted: true, requiresLogin: true });
  const serializedResponse = JSON.stringify(response.bodyJson());
  assert.doesNotMatch(serializedResponse, new RegExp(setupToken));
  assert.doesNotMatch(serializedResponse, new RegExp(adminPassword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(serializedResponse, /accessToken|refreshToken/);
});

test('derives url-safe account slugs from clinic names', () => {
  assert.equal(toAccountSlug('Clínica Veterinária Central'), 'clinica-veterinaria-central');
  assert.equal(toAccountSlug('  Pet & Cia  '), 'pet-cia');
  assert.equal(toAccountSlug('CVG--- HIS'), 'cvg-his');
});

test('falls back to a stable slug when the name has no latin characters', () => {
  assert.equal(toAccountSlug('動物病院'), 'default');
  assert.equal(toAccountSlug('!!!'), 'default');
});

test('never emits a slug longer than the accounts.slug column', () => {
  const slug = toAccountSlug('a'.repeat(200));

  assert.ok(slug.length <= 64, `slug was ${slug.length} characters`);
});

test('provisions the admin role the initial user is bound to', () => {
  const roleNames = INITIAL_ROLE_SEEDS.map((role) => role.name);

  assert.ok(roleNames.includes('admin'), 'super admin role must exist');
  assert.deepEqual(
    [...roleNames].sort(),
    ['admin', 'veterinarian', 'nurse', 'reception', 'finance', 'inventory', 'auditor'].sort(),
    'role catalog must contain the seven canonical access-control roles'
  );
});
