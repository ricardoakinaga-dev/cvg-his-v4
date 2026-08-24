# CI Gates Documentation

## Merge Gates (Required for PRs to main/develop)

These jobs must pass before any pull request can be merged:

1. **Typecheck** - Runs `pnpm typecheck` to ensure TypeScript compilation passes
2. **Build** - Runs `pnpm build` to ensure all packages build successfully
3. **Unit Tests** - Runs `pnpm test` to ensure unit tests pass
4. **Integration Tests** - Runs `pnpm test:critical` against PostgreSQL to ensure database integrations work

## Release Assist Gates (Informational for develop, required for main)

These jobs provide confidence for releases but do not block merging to develop:

1. **E2E Tests (SPA)** - Runs end-to-end tests against the SPA application
2. **Visual Regression** - Runs visual regression tests to detect UI changes
3. **Coverage Report** - Generates test coverage report

## Release Check (Main branch only)

The `release-ready` job runs only on the main branch and provides an
informational CI summary:

- Reports status of all merge and release gates
- Indicates only whether its configured CI jobs are green; it is not proof of
  production readiness or of the project G5 release gate
- Only runs on pushes to main branch

## How Gates Work

- PRs to main/develop require all merge gates to pass
- Merge gates failing will block the PR from being merged
- Release gates provide feedback but don't block PR merges
- For main branch releases, all gates (including release gates) should pass
- The release-ready job is an informational summary, not a release approval.
  G5 additionally requires the full project Quality Bar: deploy and Helm
  evidence, E2E, performance, restore/failover, parity, and the applicable
  authorized operational evidence.

## Alignment with Project Scripts

All CI jobs use the same scripts available locally:

- `pnpm typecheck` → Typecheck job
- `pnpm build` → Build job
- `pnpm test` → Unit Tests job
- `pnpm test:critical` → Integration Tests job
- `pnpm test:coverage` → Coverage Report job
- `npx playwright test --config playwright-spa.config.ts --grep-invert "Visual"` → E2E Tests (SPA)
- `npx playwright test --config playwright-spa.config.ts -g "Visual"` → Visual Regression

This ensures consistency between local development and CI execution.
