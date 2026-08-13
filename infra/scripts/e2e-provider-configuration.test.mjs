import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const playwrightConfig = readFileSync('playwright-spa.config.ts', 'utf8');
const apiPlaywrightConfig = readFileSync('playwright.config.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const productionCompose = readFileSync('docker-compose.v2.yml', 'utf8');
const spaGlobalSetup = readFileSync('e2e/fixtures/spa-global-setup.ts', 'utf8');
const globalSetup = readFileSync('e2e/fixtures/global-setup.ts', 'utf8');
const spaFixture = readFileSync('e2e/spa/fixtures/spa-fixture.ts', 'utf8');
const loginFlow = readFileSync('e2e/spa/login-owner-patient-ui.spec.ts', 'utf8');

test('SPA E2E declares every external provider mock explicitly', () => {
  for (const name of [
    'PIX_MOCK_MODE',
    'EMAIL_MOCK_MODE',
    'SMS_MOCK_MODE',
    'GOOGLE_CALENDAR_MOCK_MODE'
  ]) {
    assert.match(playwrightConfig, new RegExp(`${name}="true"`));
  }
});

test('API E2E declares every external provider mock explicitly', () => {
  for (const name of [
    'PIX_MOCK_MODE',
    'EMAIL_MOCK_MODE',
    'SMS_MOCK_MODE',
    'GOOGLE_CALENDAR_MOCK_MODE'
  ]) {
    assert.match(apiPlaywrightConfig, new RegExp(`${name}="true"`));
  }
});

test('production compose keeps external provider mocks disabled by default', () => {
  for (const name of [
    'PIX_MOCK_MODE',
    'EMAIL_MOCK_MODE',
    'SMS_MOCK_MODE',
    'GOOGLE_CALENDAR_MOCK_MODE'
  ]) {
    const expected = `${name}: ` + '${' + `${name}:-false` + '}';
    assert.ok(productionCompose.includes(expected), `missing production-safe default for ${name}`);
  }
});

test('SPA E2E login selects the seeded tenant explicitly', () => {
  assert.match(spaGlobalSetup, /accountSlug:\s*resolveE2EAccountSlug\(\)/);
  assert.match(spaGlobalSetup, /return 'default';/);
  assert.match(spaFixture, /accountSlug:\s*resolveE2EAccountSlug\(\)/);
  assert.match(spaFixture, /page\.fill\('#account-slug',\s*resolveE2EAccountSlug\(\)\)/);
  assert.match(loginFlow, /page\.fill\('#account-slug',\s*resolveE2EAccountSlug\(\)\)/);
});

test('SPA E2E uses database repositories unless an operator explicitly opts out', () => {
  assert.match(playwrightConfig, /process\.env\.API_DISABLE_INCOMPATIBLE_DB_REPOS \?\? '0'/);
});

test('SPA E2E rebuilds API and SPA before serving compiled output', () => {
  const apiDependenciesBuild = playwrightConfig.indexOf('pnpm --filter @cvg-his-v2/api^... build');
  const apiBuild = playwrightConfig.indexOf('pnpm --filter @cvg-his-v2/api build');
  const apiStart = playwrightConfig.indexOf('node apps/api/dist/index.js');
  const spaBuild = playwrightConfig.indexOf('pnpm --filter @cvg-his-v2/spa build');
  const spaStart = playwrightConfig.indexOf('node infra/scripts/serve-spa-e2e.mjs');

  assert.ok(
    apiDependenciesBuild >= 0 && apiDependenciesBuild < apiBuild,
    'API workspace dependencies must be rebuilt before the API package'
  );
  assert.ok(apiBuild >= 0 && apiBuild < apiStart, 'API must be rebuilt before dist is started');
  assert.ok(spaBuild >= 0 && spaBuild < spaStart, 'SPA must be rebuilt before dist is served');
});

test('SPA E2E starts isolated servers unless reuse is explicitly enabled', () => {
  assert.match(
    playwrightConfig,
    /const E2E_REUSE_EXISTING_SERVER = process\.env\.E2E_REUSE_EXISTING_SERVER === 'true'/
  );
  assert.doesNotMatch(playwrightConfig, /reuseExistingServer:\s*true/);
  assert.equal(
    playwrightConfig.match(/reuseExistingServer:\s*E2E_REUSE_EXISTING_SERVER/g)?.length,
    2
  );
});

test('API E2E rebuilds the complete API graph and starts an isolated database runtime', () => {
  const dependenciesBuild = apiPlaywrightConfig.indexOf('pnpm --filter @cvg-his-v2/api^... build');
  const apiBuild = apiPlaywrightConfig.indexOf('pnpm --filter @cvg-his-v2/api build');
  const apiStart = apiPlaywrightConfig.indexOf('node apps/api/dist/index.js');

  assert.ok(dependenciesBuild >= 0 && dependenciesBuild < apiBuild);
  assert.ok(apiBuild >= 0 && apiBuild < apiStart);
  assert.match(
    apiPlaywrightConfig,
    /const E2E_REUSE_EXISTING_SERVER = process\.env\.E2E_REUSE_EXISTING_SERVER === 'true'/
  );
  assert.match(
    apiPlaywrightConfig,
    /API_DISABLE_INCOMPATIBLE_DB_REPOS="\$\{E2E_DISABLE_INCOMPATIBLE_DB_REPOS\}"/
  );
  assert.match(apiPlaywrightConfig, /DATABASE_URL="\$\{E2E_DATABASE_URL\}"/);
  assert.match(apiPlaywrightConfig, /url:\s*`\$\{E2E_API_URL\}\/ready`/);
  assert.match(apiPlaywrightConfig, /reuseExistingServer:\s*E2E_REUSE_EXISTING_SERVER/);
  assert.doesNotMatch(apiPlaywrightConfig, /reuseExistingServer:\s*true/);
});

test('E2E startup waits for real database and repository readiness', () => {
  assert.match(playwrightConfig, /url:\s*`\$\{process\.env\.API_URL \|\| E2E_API_URL\}\/ready`/);

  for (const setup of [spaGlobalSetup, globalSetup]) {
    assert.match(setup, /fetch\(`\$\{API_URL\}\/ready`\)/);
    assert.match(setup, /readiness\?\.ready === true/);
    assert.match(setup, /readiness\?\.productionReady === true/);
    assert.match(setup, /readiness\?\.persistenceMode === 'database'/);
    assert.match(setup, /dependencies\?\.database\?\.state === 'healthy'/);
    assert.match(setup, /dependencies\?\.repositories\?\.state === 'ready'/);
    assert.match(setup, /dependencies\?\.worker\?\.state === 'ready'/);
    assert.doesNotMatch(setup, /fetch\(`\$\{API_URL\}\/health`\)/);
  }
});

test('token login fails closed instead of silently using the UI', () => {
  const tokenLogin = spaFixture.slice(
    spaFixture.indexOf('export async function loginViaToken'),
    spaFixture.indexOf('// ── UI creation helpers')
  );

  assert.doesNotMatch(tokenLogin, /loginViaUI\(/);
  assert.match(tokenLogin, /throw new Error\(/);
});

test('root all-tests gate covers complete integration, API E2E and functional SPA suites', () => {
  assert.equal(
    packageJson.scripts['test:e2e'],
    'npx playwright test --config playwright.config.ts'
  );
  assert.match(packageJson.scripts['test:all'], /test:integration/);
  assert.match(packageJson.scripts['test:all'], /test:e2e/);
  assert.match(packageJson.scripts['test:all'], /test:e2e:spa:functional/);
  assert.match(packageJson.scripts['test:e2e:spa:functional'], /--grep-invert "Visual"/);
});
