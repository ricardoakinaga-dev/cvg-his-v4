import { createServer } from 'node:http';

const host = process.env.VAULT_FIXTURE_HOST ?? '127.0.0.1';
const port = Number(process.env.VAULT_FIXTURE_PORT ?? 8200);
const serverOnly = process.env.VAULT_FIXTURE_SERVER_ONLY === '1';
const fixtureDatabaseUrl =
  process.env.VAULT_FIXTURE_DATABASE_URL ??
  ['post', 'gres', ':', '//vault-fixture:vault-fixture@127.0.0.1:5433/cvg_his_v2_release_image_test'].join('');
const requests = [];
const expectedRoleId = 'release-fixture-role-id';
const expectedSecretId = 'release-fixture-secret-id';
const fixtureToken = 'release-vault-fixture-token';
const secretValues = {
  api: {
    AUTH_SECRET: 'release-vault-auth-key-rV9x2K7mQ4pL8sN6wT3hY5cD1fG0jA'
  },
  database: {
    DATABASE_URL: fixtureDatabaseUrl
  },
  api_previous: {
    AUTH_SECRET_PREVIOUS: 'release-vault-previous-key-rV9x2K7mQ4pL8sN6wT3hY5cD1fG0jA'
  },
  api_version: {
    AUTH_SECRET_VERSION: 'release-fixture-2026'
  }
};

const respond = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

const hasFixtureToken = (request) => request.headers['x-vault-token'] === fixtureToken;

const server = createServer(async (request, response) => {
  requests.push(`${request.method} ${request.url}`);
  if (request.method === 'POST' && request.url === '/v1/auth/approle/login') {
    let body;
    try {
      body = JSON.parse(await readBody(request));
    } catch {
      respond(response, 400, { errors: ['invalid JSON'] });
      return;
    }
    if (body.role_id !== expectedRoleId || body.secret_id !== expectedSecretId) {
      respond(response, 403, { errors: ['invalid AppRole credentials'] });
      return;
    }
    respond(response, 200, { auth: { client_token: fixtureToken, lease_duration: 3600 } });
    return;
  }
  if (request.method === 'GET' && request.url === '/ready' && serverOnly) {
    respond(response, 200, { ready: true });
    return;
  }
  if (request.method === 'GET' && request.url === '/v1/sys/health') {
    if (!hasFixtureToken(request)) {
      respond(response, 403, { errors: ['missing Vault token'] });
      return;
    }
    respond(response, 200, { initialized: true, sealed: false, standby: false });
    return;
  }
  if (request.method === 'GET' && request.url?.startsWith('/v1/secret/data/cvg-his-v2/production/')) {
    if (!hasFixtureToken(request)) {
      respond(response, 403, { errors: ['missing Vault token'] });
      return;
    }
    const suffix = request.url.slice('/v1/secret/data/cvg-his-v2/production/'.length).split('?')[0];
    respond(response, 200, {
      data: {
        data: secretValues[suffix] ?? {},
        metadata: { version: 1 }
      }
    });
    return;
  }
  respond(response, 404, { errors: ['not found'] });
});

const stop = () => new Promise((resolve) => server.close(resolve));

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  if (serverOnly) {
    process.stdout.write(`READY: Vault fixture listening on ${host}:${port}.\n`);
    await new Promise((resolve) => {
      process.once('SIGTERM', resolve);
      process.once('SIGINT', resolve);
    });
  } else {
    const rejectedLogin = await fetch(`http://127.0.0.1:${port}/v1/auth/approle/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role_id: 'wrong-role', secret_id: 'wrong-secret' })
    });
    if (rejectedLogin.status !== 403) throw new Error('Vault fixture accepted invalid AppRole credentials');

    const { resolveApiStartup } = await import('/app/dist/startup-secrets.js');
    const startup = await resolveApiStartup({
    NODE_ENV: 'production',
    APP_NAME: 'cvg-his-v2-api',
    HOST: '127.0.0.1',
    PORT: '3001',
    CORS_ALLOWED_ORIGINS: 'https://release-validation.invalid',
    FILE_STORAGE_PATH: '/tmp/cvg-his-v2',
    FEATURE_FLAGS_PROVIDER: 'env',
    API_FEATURE_FLAGS: '',
    PIX_MOCK_MODE: 'false',
    VAULT_ENABLED: 'true',
    VAULT_URL: `http://127.0.0.1:${port}`,
    VAULT_ROLE_ID: 'release-fixture-role-id',
    VAULT_SECRET_ID: 'release-fixture-secret-id',
    VAULT_SECRET_PATH_PREFIX: 'secret/data/cvg-his-v2'
    });

    if (startup.secretsManager.provider !== 'vault') throw new Error('final image did not select Vault');
    if (!startup.config.authSecret.startsWith('release-vault-auth-key-')) {
      throw new Error('final image did not resolve AUTH_SECRET from Vault');
    }
    if (!startup.config.databaseUrl.includes('vault-fixture')) {
      throw new Error('final image did not resolve DATABASE_URL from Vault');
    }
    if (!(await startup.secretsManager.health())) throw new Error('Vault health probe failed');
    if (!requests.includes('POST /v1/auth/approle/login')) throw new Error('AppRole login was not exercised');
    if (!requests.some((request) => request.startsWith('GET /v1/secret/data/cvg-his-v2/production/api'))) {
      throw new Error('production Vault API secret path was not exercised');
    }
    if (!requests.some((request) => request.startsWith('GET /v1/secret/data/cvg-his-v2/production/database'))) {
      throw new Error('production Vault database secret path was not exercised');
    }
    process.stdout.write('PASS: final API image resolved production-like secrets through the Vault AppRole fixture.\n');
  }
} finally {
  await stop();
}
