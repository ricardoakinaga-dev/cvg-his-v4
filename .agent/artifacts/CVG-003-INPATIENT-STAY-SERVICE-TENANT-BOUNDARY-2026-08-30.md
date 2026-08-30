# CVG-003 — InpatientService stay tenant boundary

Date: 2026-08-30

## Bounded objective

Require the principal-derived `AccountId` at identifier-based
`InpatientService` stay operations and authenticated inpatient, discharge and
inventory callers. Preserve response shapes, persistence, cache refresh,
audit/idempotency and clinical-financial behavior. No schema, provider,
target, production, deployment or release work was authorized.

## Implementation evidence

The implementation is present in the checkpoint commit `819329ce24d49cc3f5bf3ab3d5a858b4fae3d9f0`:

- `packages/modules/inpatient/src/index.ts` requires `AccountId` for stay
  resolution and identifier-based bed, progress, occurrence, daily-charge and
  status operations.
- `apps/api/src/routes/inpatient-routes.ts` forwards the authenticated account
  through the stay boundary.
- `apps/api/src/routes/discharges-routes.ts` and
  `apps/api/src/routes/inventory-routes.ts` forward the principal account.
- `packages/modules/inpatient/src/repositories/database-inpatient.repository.ts`
  applies tenant-context/account predicates to stay and child reads/writes.
- No database migration was added.

## TDD and executable evidence

- Historical RED: `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-RED-001` — module and compiled route assertions failed at the missing account propagation before the correction.
- GREEN: `pnpm --filter @cvg-his-v2/module-inpatient run test` — `19/19`.
- GREEN: `pnpm --filter @cvg-his-v2/module-inpatient run typecheck` and `run build` — exit `0`.
- PostgreSQL: `REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=inpatient_stay_boundary_20260830 pnpm exec vitest run tests/integration/database/inpatient-stay-service-tenant-boundary.test.ts --config vitest.integration.config.ts --reporter=verbose` — `2/2`; the ephemeral database was migrated and dropped by teardown.
- Compiled route regression: `NODE_ENV=test node --test apps/api/dist/routes/inpatient-routes.test.js` — `26/26`.
- API regression: `pnpm --filter @cvg-his-v2/api run test` — `519/519`.
- API build/typecheck: `pnpm --filter @cvg-his-v2/api run build` and `run typecheck` — exit `0`.

The PostgreSQL fixture creates two accounts under one tenant and proves that
account A cannot read account B's stay, progress, occurrence or daily charge;
foreign child writes are rejected; and an account-A update attempt cannot
discharge account B's stay or bill its pending charge. Account B retains its
admitted stay and pending charge.

## Quality and security evidence

- `pnpm test:coverage` — `2,174` passed, `1` skipped; `80.17%` statements/lines,
  `80.74%` branches, `86.66%` functions.
- `pnpm validate:migration-source` — PASS; canonical checksum-aware migration
  rail remains the source of truth.
- `pnpm validate:rls` — PASS; `165/166` tenant tables protected and one
  documented exception.
- `pnpm validate:openapi` — PASS; `354` paths, `40` tags, `413` schemas.
- `pnpm security:secrets` — PASS/no findings.
- Targeted Prettier and diff checks — PASS.

## Review and decision

The configured specialized reviewer could not start because its fixed model is
unsupported for the active account. A compatible general read-only reviewer
timed out and was closed without editing files. This is recorded as
`.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-REVIEW-UNAVAILABLE-001`; it is not approval.

Decision: `PASS_BOUNDED`, `COMPLETE_BOUNDED`, medium confidence, high residual
risk. The PostgreSQL pre-fix RED is not claimed because the first fixture run
used an invalid textual value for an existing UUID bed column. Parent
CVG-003/global ERP remain `IN_PROGRESS/PARTIAL`; functional parity, target
RLS/roles, providers, production, deployment, remote CI, release and global
ERP acceptance remain open, and promotion is blocked.
