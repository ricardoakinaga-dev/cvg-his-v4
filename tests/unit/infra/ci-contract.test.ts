import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');
const usabilityCertificationWorkflow = readFileSync(
  resolve(root, '.github/workflows/usability-certification.yml'),
  'utf8'
);
const playwrightApiConfig = readFileSync(resolve(root, 'playwright.config.ts'), 'utf8');
const playwrightConfig = readFileSync(resolve(root, 'playwright-spa.config.ts'), 'utf8');

describe('CI repository guardrails', () => {
  it('blocks build on lint and exercises the process runner on Windows', () => {
    expect(workflow).toContain('  lint:');
    expect(workflow).toContain('run: pnpm lint');
    expect(workflow).toContain('needs: [typecheck, validate-openapi, lint]');
    expect(workflow).toContain('  critical-process-runner-windows:');
    expect(workflow).toContain('runs-on: windows-2022');
    expect(workflow).toContain(
      'run: node --test tests/unit/infra/critical-process-suite-windows-contract.test.mjs'
    );
  });

  it('keeps visual regression blocking when the workflow runs it', () => {
    const jobStart = workflow.indexOf('  test-visual:');
    expect(jobStart).toBeGreaterThan(-1);
    const nextJobOffset = workflow.slice(jobStart + 3).search(/\n {2}[a-z0-9-]+:\n/);
    const job = workflow.slice(
      jobStart,
      nextJobOffset === -1 ? undefined : jobStart + 3 + nextJobOffset
    );
    expect(job).toContain('name: Visual Regression');
    expect(job).toContain('Run visual regression tests');
    expect(job).not.toContain('continue-on-error: true');
  });

  it('publishes Playwright failure artifacts from the configured output directory', () => {
    expect(playwrightConfig).toContain("outputDir: 'test-results'");

    const visualJobStart = workflow.indexOf('  test-visual:');
    expect(visualJobStart).toBeGreaterThan(-1);
    const nextJobOffset = workflow.slice(visualJobStart + 3).search(/\n {2}[a-z0-9-]+:\n/);
    const visualJob = workflow.slice(
      visualJobStart,
      nextJobOffset === -1 ? undefined : visualJobStart + 3 + nextJobOffset
    );
    expect(visualJob).toContain('path: test-results/');
  });

  it('runs the complete PostgreSQL usability gate and retains auditable evidence', () => {
    const jobStart = workflow.indexOf('  test-e2e-spa:');
    expect(jobStart).toBeGreaterThan(-1);
    const nextJobOffset = workflow.slice(jobStart + 3).search(/\n {2}[a-z0-9-]+:\n/);
    const job = workflow.slice(
      jobStart,
      nextJobOffset === -1 ? undefined : jobStart + 3 + nextJobOffset
    );

    expect(job).toContain("E2E_DATABASE_MODE: '1'");
    expect(job).toContain('npx playwright test --config playwright-spa.config.ts --list');
    expect(job).toContain('npx playwright test --config playwright-spa.config.ts');
    expect(job).toContain('node scripts/validate-usability-playwright-evidence.mjs');
    expect(job).toContain('playwright-report/usability/');
    expect(job).toContain('tmp/master-usability-audit.json');
    expect(job).toContain('retention-days: 30');
    expect(job).toContain('playwright-1.58.2-chromium');
  });

  it('seeds every principal required by the PostgreSQL tenant and RBAC journeys', () => {
    const jobStart = workflow.indexOf('  test-e2e-spa:');
    expect(jobStart).toBeGreaterThan(-1);
    const nextJobOffset = workflow.slice(jobStart + 3).search(/\n {2}[a-z0-9-]+:\n/);
    const job = workflow.slice(
      jobStart,
      nextJobOffset === -1 ? undefined : jobStart + 3 + nextJobOffset
    );

    expect(job).toContain('RECEPTION_USERNAME: reception');
    expect(job).toContain('RECEPTION_PASSWORD: seed_reception');
    expect(job).toContain('SECOND_ADMIN_USERNAME: admin_b');
    expect(job).toContain('SECOND_ADMIN_PASSWORD: seed_admin_b');
    expect(job).toContain('SECOND_TENANT_SLUG: e2e-secondary');
    expect(job).toContain('SECOND_ACCOUNT_SLUG: e2e-secondary');
  });

  it('certifies the same SHA three times and binds manual, cross-browser and go/no-go evidence', () => {
    expect(usabilityCertificationWorkflow).toContain('matrix:\n        run: [1, 2, 3]');
    expect(usabilityCertificationWorkflow).toContain(
      'matrix:\n        browser: [chromium, firefox, webkit]'
    );
    expect(usabilityCertificationWorkflow).toContain('uat_evidence_reference:');
    expect(usabilityCertificationWorkflow).toContain('uat_approvers:');
    expect(usabilityCertificationWorkflow).toContain('residual_risks:');
    expect(usabilityCertificationWorkflow).toContain('options: [go, no-go]');
    expect(usabilityCertificationWorkflow).toContain(
      'node scripts/validate-usability-playwright-evidence.mjs'
    );
    expect(usabilityCertificationWorkflow).toContain(
      'node scripts/generate-usability-certification-index.mjs'
    );
    expect(usabilityCertificationWorkflow).toContain('retention-days: 90');
  });

  it('propagates the API-mode Playwright URL to global setup', () => {
    expect(playwrightApiConfig).toContain(
      'process.env.API_URL = process.env.API_URL || E2E_API_URL;'
    );
    expect(playwrightApiConfig).toContain(
      'process.env.BASE_URL = process.env.BASE_URL || E2E_API_URL;'
    );
  });

  it('propagates SPA E2E infrastructure URLs to database-backed fixtures', () => {
    expect(playwrightConfig).toContain(
      'process.env.E2E_DATABASE_URL = process.env.E2E_DATABASE_URL || E2E_DATABASE_URL;'
    );
    expect(playwrightConfig).toContain(
      'process.env.E2E_REDIS_URL = process.env.E2E_REDIS_URL || E2E_REDIS_URL;'
    );
  });

  it('runs the canonical operational validators as a blocking job', () => {
    const jobStart = workflow.indexOf('  repository-guards:');
    expect(jobStart).toBeGreaterThan(-1);

    const nextJobOffset = workflow.slice(jobStart + 3).search(/\n {2}[a-z0-9-]+:\n/);
    const job = workflow.slice(
      jobStart,
      nextJobOffset === -1 ? undefined : jobStart + 3 + nextJobOffset
    );

    expect(job).toContain('needs: [typecheck]');
    expect(job).toContain('run: pnpm test:db:start');
    expect(job).toContain('pnpm validate:openapi');
    expect(job).toContain('pnpm validate:namespaces');
    expect(job).toContain('pnpm validate:migration-source');
    expect(job).toContain('pnpm validate:rls');
    expect(job).toContain('pnpm validate:deploy-surface');
    expect(job).toContain('pnpm docs:validate');
    expect(job).toContain('pnpm complexity:check');
    expect(job).toContain('CVG_HELM_VERSION: v3.15.4');
    expect(job).toContain('sha256sum --check');
    expect(job).toContain('test "$(command -v helm)" = "/usr/local/bin/helm"');
    expect(job).toContain('HELM_BIN=/usr/local/bin/helm REQUIRE_HELM=1 pnpm validate:helm');
    expect(job).toContain('pnpm deploy:check');
    expect(job).toContain('pnpm ops:backup:check');
    expect(job).toContain('pnpm ops:install-upgrade:drill');
    expect(job).toContain('path: artifacts/operations/install-upgrade/');
    expect(job).toContain(
      'REQUIRE_TEST_DB=1 pnpm vitest run tests/unit/infra/requirement-evidence-matrix.test.ts --config vitest.config.ts'
    );
    expect(job).toContain('node --test tests/unit/infra/gauntlet-subcriteria-evidence.test.mjs');
    expect(job).toContain('pnpm vetus:parity:test');
    expect(job).toContain(
      'pnpm vitest run tests/integration/process/runtime-lifecycle.test.ts --config vitest.integration.config.ts'
    );
    expect(job).toContain(
      'REQUIRE_TEST_DB=1 pnpm vitest run tests/integration/database/migration-integrity-runtime.test.ts --config vitest.integration.config.ts'
    );
    expect(job).toContain(
      'REQUIRE_TEST_DB=1 pnpm vitest run tests/integration/rls/force-rls-catalog.test.ts tests/integration/rls/rls-isolation.test.ts tests/integration/rls/rls-access-governance.test.ts tests/integration/rls/runtime-role-sensitive-acl.test.ts --config vitest.integration.config.ts'
    );
    expect(job).toContain(
      'REQUIRE_TEST_DB=1 pnpm vitest run tests/integration/setup/production-like-runtime-bootstrap.test.ts --config vitest.integration.config.ts'
    );
    expect(job).toContain(
      'REQUIRE_TEST_DB=1 pnpm vitest run tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts --config vitest.integration.config.ts'
    );
    expect(job).toContain(
      'GRAFANA_ADMIN_PASSWORD="${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-compose-validation" docker compose --env-file .env.v2.example -f docker-compose.v2.yml config --quiet'
    );
    expect(job).toContain('run: pnpm test:db:stop');
  });

  it('runs the full workspace suite against the required isolated PostgreSQL', () => {
    const jobStart = workflow.indexOf('  unit-tests:');
    expect(jobStart).toBeGreaterThan(-1);

    const nextJobOffset = workflow.slice(jobStart + 3).search(/\n {2}[a-z0-9-]+:\n/);
    const job = workflow.slice(
      jobStart,
      nextJobOffset === -1 ? undefined : jobStart + 3 + nextJobOffset
    );

    expect(job).toContain('run: pnpm test:db:start');
    expect(job).toContain('run: pnpm test');
    expect(job).toContain('REQUIRE_TEST_DB: 1');
    expect(job).toContain('name: Run critical process runner contract');
    expect(job).toContain(
      'run: pnpm exec vitest run tests/unit/infra/critical-process-suite-contract.test.ts --config vitest.config.ts --no-file-parallelism'
    );
    expect(job).toContain('name: Run CI workflow contract');
    expect(job).toContain(
      'run: pnpm exec vitest run tests/unit/infra/ci-contract.test.ts --config vitest.config.ts --no-file-parallelism'
    );
    expect(job).toContain('run: pnpm test:db:stop');
  });

  it('budgets shared memory for every GitHub PostgreSQL service', () => {
    expect((workflow.match(/--shm-size 1g/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('uses the canonical TypeScript migration entrypoint in API contract setup', () => {
    const jobStart = workflow.indexOf('  api-contract-tests:');
    expect(jobStart).toBeGreaterThan(-1);

    const nextJobOffset = workflow.slice(jobStart + 3).search(/\n {2}[a-z0-9-]+:\n/);
    const job = workflow.slice(
      jobStart,
      nextJobOffset === -1 ? undefined : jobStart + 3 + nextJobOffset
    );

    expect(job).toContain('run: pnpm exec tsx packages/db/src/migrate.ts');
    expect(job).not.toContain('run: node packages/db/src/migrate.ts');
  });
});
