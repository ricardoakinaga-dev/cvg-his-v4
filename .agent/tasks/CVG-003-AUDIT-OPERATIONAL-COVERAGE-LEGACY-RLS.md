# CVG-003 — tenant-safe legacy audit coverage under RLS

**Status:** `COMPLETE_BOUNDED` — restricted-role RLS proof and repository defense-in-depth are green
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with TDD and security review
**Parent:** CVG-003-AUDIT-OPERATIONAL-COVERAGE-SOURCE-OF-TRUTH
**Tier/risk/blast radius:** `T3_HIGH` / `HIGH` / silent tenant undercount or legacy audit exposure
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-AUDIT-OPERATIONAL-COVERAGE-LEGACY-RLS-IR-001`

## Problem

The durable coverage query includes rows whose historical `account_id` is
`NULL` and whose tenant identity is retained in `metadata.legacyAccountId`.
The existing `audit_events` RLS policy exposes those rows only when no tenant
context is set. API requests and NOBYPASSRLS runtime roles always set a tenant
context, so the previous PostgreSQL test was a privileged false positive.

## Frozen bounded contract

1. Extend only the `audit_events` RLS policy so a tenant context can read a
   legacy row when its exact `metadata.legacyAccountId` equals the current
   account UUID. Preserve ordinary `account_id` equality and deny legacy-row
   writes from a tenant context; no broad null-row visibility is allowed under
   tenant context.
2. Add a canonical SQL migration after the current migration head. Do not edit
   an already-applied migration, alter the report JSON, or add a bypass
   role/function. The existing repository compatibility predicates may receive
   the matching explicit `account_id IS NULL` guard when required by review to
   prevent mis-tagged ordinary rows from bypassing the same tenant boundary.
3. Add a PostgreSQL integration proof using the restricted `cvg_test_rls`
   NOBYPASSRLS role and `app.current_account_id`, including legacy inclusion,
   cross-account exclusion, complete committed history beyond 100 rows and
   deterministic ordering.
4. Preserve the existing administrative setup/cleanup harness and all current
   report, route, ABAC and no-repository behavior.
5. Exclude all unrelated RLS policies, migrations, requirements, routes,
   mutations, replay/idempotency, providers, credentials, targets,
   production, deployment and release acceptance.

## TDD acceptance

- RED: restricted-role legacy coverage cannot see the legacy row and therefore
  undercounts the expected account snapshot before the migration.
- GREEN: the restricted role sees only its own ordinary and legacy rows,
  excludes another account's legacy row, counts more than 100 committed rows,
  and preserves newest-first timestamp/ID ordering.
- Regression: existing audit module, focused route, PostgreSQL, API and quality
  gates remain green.

## Explicit non-claims

This child task does not certify global Vetus parity, external providers,
target-cluster rollout, remote CI, production release or the remaining replay,
atomicity and systemic ABAC residuals.

## Scope amendment during verification — 2026-08-29

Independent review identified a defense-in-depth gap in the two pre-existing
repository compatibility branches: an administrative/bypass connection could
match an ordinary row solely because its metadata carried a coincidental
`legacyAccountId`. The implementation therefore added only explicit
`account_id IS NULL` guards to `listPage` and `listForCacheRefresh`, plus a
regression fixture for that mis-tagged row. No report shape, route, migration
history, helper, role, provider, target or production behavior changed.

## Bounded completion

`PASS_BOUNDED` under
`.agent/gates/verified-CVG-003-audit-operational-coverage-legacy-rls.json`.
The restricted `cvg_test_rls` role is proven `NOBYPASSRLS`; matching legacy
rows are readable only for the active tenant, legacy writes are denied, the
complete history and ordering are stable, and module/API/coverage/quality
regressions remain green. Fresh independent review returned `APPROVE` with no
findings. Global ERP remains `IN_PROGRESS/PARTIAL` and promotion remains
`BLOCKED`.

## Decision

`COMPLETE_BOUNDED` as the minimum security correction required to make the
parent durable source-of-truth claim valid under the actual runtime RLS
boundary. Revalidate before changing any policy outside `audit_events`, the
report contract or an environment boundary.
