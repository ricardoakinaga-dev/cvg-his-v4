import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const configText = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
const spaConfigText = readFileSync(
  new URL('../playwright-spa.config.ts', import.meta.url),
  'utf8'
);

test('API E2E provisions the canonical database schema and fixtures before startup', () => {
  assert.match(configText, /node infra\/scripts\/prepare-test-db\.mjs/);
  assert.match(configText, /node packages\/db\/dist\/seed\.js/);
  assert.match(configText, /DATABASE_URL:\s*E2E_DATABASE_URL/);
  assert.match(configText, /DATABASE_URL_TEST:\s*E2E_DATABASE_URL/);
  assert.match(configText, /ADMIN_PASSWORD:\s*E2E_ADMIN_PASSWORD/);
  assert.doesNotMatch(
    configText,
    /process\.env\.E2E_DATABASE_URL\s*\|\|\s*process\.env\.DATABASE_URL/,
    'generic DATABASE_URL must never become the target of the destructive E2E reset'
  );
});

test('API E2E only skips provisioning when explicitly reusing an external server', () => {
  assert.match(configText, /reuseExistingServer:\s*E2E_REUSE_EXISTING_SERVER/);
});

test('SPA E2E owns the same canonical database lifecycle when starting its API', () => {
  assert.match(spaConfigText, /node infra\/scripts\/prepare-test-db\.mjs/);
  assert.match(spaConfigText, /node packages\/db\/dist\/seed\.js/);
  assert.match(spaConfigText, /DATABASE_URL:\s*E2E_DATABASE_URL/);
  assert.match(spaConfigText, /DATABASE_URL_TEST:\s*E2E_DATABASE_URL/);
  assert.match(spaConfigText, /ADMIN_PASSWORD:\s*E2E_ADMIN_PASSWORD/);
  assert.doesNotMatch(
    spaConfigText,
    /process\.env\.E2E_DATABASE_URL\s*\|\|\s*process\.env\.DATABASE_URL/,
    'generic DATABASE_URL must never become the target of the destructive SPA E2E reset'
  );
});
