# CI Gates — CVG-HIS-V2

## Overview

CI pipeline gates determine what is required for merge and what is expected for release confidence. Gates are split into two categories: **Merge Gates** (required for all PRs) and **Release Assist Gates** (informational for release readiness).

---

## Merge Gates

**Required for all pull requests to `main` and `develop`.**

| Job                 | Timeout | What it checks                                           | Blocking |
| ------------------- | ------- | -------------------------------------------------------- | -------- |
| `typecheck`         | 10 min  | TypeScript compilation across all packages               | Yes      |
| `build`             | 15 min  | Production build of all packages                         | Yes      |
| `unit-tests`        | 10 min  | Unit tests via `pnpm test`                               | Yes      |
| `integration-tests` | 15 min  | DB migrations, FKs, constraints via `pnpm test:critical` | Yes      |

### Failure behavior

- Any merge gate failure blocks the PR from being merged
- Artifacts are uploaded automatically on failure for debugging
- No `continue-on-error` flags are used — failures are always reported

### Artifacts

| Artifact                   | When uploaded | Retention |
| -------------------------- | ------------- | --------- |
| `unit-test-results`        | On failure    | 7 days    |
| `integration-test-results` | On failure    | 7 days    |

---

## Release Assist Gates

**Run for release confidence, but do NOT block merging.**

| Job                 | Timeout | What it checks                  | Release relevance |
| ------------------- | ------- | ------------------------------- | ----------------- |
| `e2e-tests-spa`     | 25 min  | Playwright E2E tests on Vue SPA | High              |
| `visual-regression` | 25 min  | Visual regression snapshots     | Medium            |
| `coverage`          | 15 min  | Code coverage report            | Low               |

### Failure behavior

- These jobs can fail without blocking merge
- Failures are visible in the PR status but do not prevent merging
- The `release-ready` job summarizes all gates including these

### Artifacts

| Artifact                   | When uploaded | Retention |
| -------------------------- | ------------- | --------- |
| `e2e-spa-report`           | Always        | 30 days   |
| `e2e-spa-test-results`     | On failure    | 14 days   |
| `visual-regression-report` | Always        | 30 days   |
| `visual-regression-diffs`  | On failure    | 14 days   |
| `coverage-report`          | Always        | 30 days   |

---

## Release Readiness (`release-ready`)

Only runs on `main` branch. Generates a summary of all gate results.

### Merge gate results are evaluated:

- All 4 merge gates pass → **Ready for release**
- Any merge gate fails → **Not ready**

### Release assist results are informational:

- E2E, visual regression, and coverage results are shown but do not affect the readiness decision

---

## Job Dependencies

```
typecheck ──┬── build ──┬── integration-tests
            │           ├── e2e-tests-spa
            │           └── visual-regression
            │
            ├── unit-tests
            │
            └── coverage
```

---

## Scripts Reference

| Script               | Used in             | What it does            |
| -------------------- | ------------------- | ----------------------- |
| `pnpm typecheck`     | `typecheck`         | TypeScript compilation  |
| `pnpm build`         | `build`             | Production build        |
| `pnpm test`          | `unit-tests`        | All unit tests          |
| `pnpm test:critical` | `integration-tests` | DB + foundational tests |
| `pnpm test:coverage` | `coverage`          | Coverage report         |

---

## Local Development

To run the same checks locally:

```bash
# Typecheck
pnpm typecheck

# Build
pnpm build

# Unit tests
pnpm test

# Integration tests (requires DB)
pnpm test:db:start
DATABASE_URL_TEST=... pnpm test:critical
pnpm test:db:stop

# E2E tests (requires API running)
pnpm test:e2e

# Coverage
pnpm test:coverage

# Full release check
pnpm release:check
```

---

## Adding New Gates

When adding a new gate:

1. Decide if it's a **merge gate** (blocks merge) or **release assist** (informational)
2. Add to the appropriate section in `.github/workflows/ci.yml`
3. If merge gate, add to `needs` of `release-ready`
4. Update this document with the new gate

---

## Current Limitations

- No security scanning (SAST/DAST)
- No contract testing
- Coverage thresholds are 0% (informational only)
- No artifact signing or provenance
- Release assist gates run on every push, not just release tags
