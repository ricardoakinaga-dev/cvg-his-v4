# CI Gates Documentation

## Merge Gates (Required for PRs to main/develop)

These jobs must pass before any pull request can be merged:

1. **Typecheck** - Runs `pnpm typecheck` to ensure TypeScript compilation passes
2. **Lint** - Runs `pnpm lint` to enforce the repository code-quality rules
3. **Build** - Runs `pnpm build` to ensure all packages build successfully
4. **Unit Tests** - Runs `pnpm test` to ensure unit tests pass
5. **Integration Tests** - Runs `pnpm test:critical` against PostgreSQL to ensure database integrations work

The Windows process-runner contract is also required: it verifies the
`shell:false` package-manager invocation and the ten-entry manifest/dry-run on
`windows-2022`. The database-backed ten-process matrix remains in the Linux
integration job because its PostgreSQL service and process-group assertions are
platform-specific.

## Release Assist Gates (Blocking CI checks)

These jobs provide release confidence and fail the workflow when their checks
fail:

1. **E2E Tests (SPA)** - Runs end-to-end tests against the SPA application
2. **Visual Regression** - Runs visual regression tests to detect UI changes
3. **Coverage Report** - Generates test coverage report

## Release Check

The current workflow has no `release-ready` job and does not create a release
approval. Main-branch release decisions therefore remain subject to the
project's separately authorized release gate and its required target,
operations and recovery evidence.

## How Gates Work

- PRs to main/develop require all merge gates to pass
- Merge gates failing will block the PR from being merged
- Release-assist gates are blocking workflow checks for both main and develop
- For main branch releases, the configured merge and release-assist gates should
  pass
- CI status is not a release approval. G5 additionally requires the full
  project Quality Bar: deploy and Helm
  evidence, E2E, performance, restore/failover, parity, and the applicable
  authorized operational evidence.

## Alignment with Project Scripts

All CI jobs use the same scripts available locally:

- `pnpm typecheck` → Typecheck job
- `pnpm lint` → Lint job
- `pnpm build` → Build job
- `pnpm test` → Unit Tests job
- `pnpm test:critical` → Integration Tests job
- `pnpm test:critical:process` → serial process-boundary suite used by
  `test:critical`; it runs the ten-entry real child-process manifest with an
  ephemeral database suffix per file and fail-fast semantics. Each child has a
  finite `CRITICAL_PROCESS_TIMEOUT_MS` budget, owned process-group termination,
  typed failure classification and a retained sanitized `failure.json` under
  `CRITICAL_PROCESS_ARTIFACT_DIR` when it fails. The integration job has a
  finite 120-minute envelope for the ten serial children while retaining the
  per-child timeout. POSIX process-group cleanup is exercised locally; the
  Windows uses a suspended native supervisor attached to a Job Object with
  `KILL_ON_JOB_CLOSE`; identity-bound native handles are used for bounded
  termination, failing closed as `cleanup_error` when tree termination cannot
  be confirmed. Its GREEN
  result is a regression gate only, not production or release evidence.
- `REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 pnpm exec vitest run tests/integration/process/laboratory-catalog-bootstrap-concurrency.test.ts --config vitest.integration.config.ts --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000` → dedicated laboratory bootstrap-concurrency evidence; it is intentionally a bounded, optional process gate until its additional ~67s CI cost is accepted.
- `REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 pnpm exec vitest run tests/integration/process/pix-provider-settlement-sigkill.test.ts --config vitest.integration.config.ts --no-cache --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000` → PIX runtime-role/RLS process gate; it creates disposable reconciled roles and proves A/B, ACL negatives, SIGKILL/takeover and stale fencing. The current file contains 25 cases; the fresh bounded run passed 25/25 in ~6m24s and is not a production/provider certification. The latest ten-entry local matrix passed 10/10 and cleaned each per-entry ephemeral database.
- `docker run --rm -v "$PWD:/workspace:ro" -w /workspace alpine/helm:3.15.4 ...` (or an equivalent pinned Helm-enabled runner) → execute the real Helm lint/template path for dev, staging and prod. The host fallback remains static-only when no Helm binary is present.
- `pnpm test:coverage` → Coverage Report job
- `npx playwright test --config playwright-spa.config.ts --grep-invert "Visual"` → E2E Tests (SPA)
- `npx playwright test --config playwright-spa.config.ts -g "Visual"` → Visual Regression

This ensures consistency between local development and CI execution.

## 2026-08-28 bounded process-runner verification

The bounded `CVG-OPS-CRITICAL-PROCESS-RUNNER-001` slice is `PASS_BOUNDED`:
the focused runner/CI contracts passed `31/31`, the final disposable
PostgreSQL matrix passed all `10/10` manifest entries including PIX `25/25`,
and post-run checks found no ephemeral databases, owned processes or failure
artifacts. The evidence is recorded in
`.agent/artifacts/CVG-OPS-CRITICAL-PROCESS-RUNNER-2026-08-28.md` and its
verified bounded gate. The freshest final4 matrix supersedes the earlier final3
run. Windows native execution remains a CI concern because this host cannot
load PowerShell/C#; the Linux evidence must not be promoted to target,
production or release approval.
