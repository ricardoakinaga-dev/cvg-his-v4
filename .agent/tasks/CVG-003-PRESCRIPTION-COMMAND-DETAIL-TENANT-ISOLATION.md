# CVG-003 — Prescription command and detail tenant isolation

**Status:** COMPLETE_BOUNDED / PASS_BOUNDED  
**Priority:** P0  
**Owner:** root integrator  
**Date opened:** 2026-08-31

## Objective

Require an explicit `AccountId` at the reusable prescription detail/document,
revision and command boundary. A prescription belonging to another account
must fail closed before disclosure, cache publication, revision access,
signature creation or mutation. Authenticated HTTP routes and first-party
callers must forward the principal account directly into the scoped methods.

## Authorized scope

- Add account-aware service signatures for detail, document, revision, update,
  archive and sign operations.
- Validate non-empty account context before reads and return `NotFoundError`
  for a foreign prescription without changing memory, revisions, signatures or
  persistence queues.
- Filter repository-hydrated prescriptions by the requested account before
  publishing cache entries, including contaminated repository results.
- Preserve the existing collection filters, optimistic-version checks,
  archive/sign semantics, document rendering and persistence contracts.
- Migrate authenticated prescription routes and all first-party callers/tests;
  add focused two-account direct-service and HTTP regressions.

## Explicit exclusions

- No database schema, migration, RLS policy or repository SQL redesign.
- No prescription-execution redesign, provider, credential, target,
  production, deployment, release or global ERP promotion.
- No removal of the existing `getByIdForAccount` compatibility surface unless
  required for type-safe migration; it must remain fail-closed if retained.

## Quality bar

Close only as `COMPLETE_BOUNDED` / `PASS_BOUNDED` after intentional TDD RED,
focused GREEN with changed-service coverage at or above 80%, route and runtime
regressions, workspace typecheck/build/lint, security/static checks,
independent read-only review and control-plane reconciliation. Preserve global
ERP `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`.

## Scout evidence

Fresh read-only scouting identified that `PrescriptionsService.getById` is a
process-wide cache lookup and that `renderDocument`, `update`, `archive`,
`getRevisions` and `sign` call it without account scope. The HTTP adapter uses
an ownership pre-check but then invokes the unscoped commands, so reusable
service callers can bypass that boundary. `runtime.ts` already uses
`getByIdForAccount` for prescription execution, while the detail/command path
remains unscoped. The smallest correction is account-first service methods,
direct route propagation and focused negative evidence.

Evidence: `.agent/verification.jsonl#VFY-SCOUT-CVG-003-PRESCRIPTION-COMMAND-DETAIL-TENANT-ISOLATION-001`.

## RED evidence — 2026-08-31

The initial adversarial tests are intentionally expected to fail against the
current global-ID signatures: same-account account-first detail calls cannot
resolve the prescription, and the current command implementations do not
enforce account ownership at their reusable boundary. The exact RED output is
recorded before implementation in the task verification log: the focused
boundary file failed `3/3` tests, with `Prescription not found` for the
same-account account-first lookup and contaminated-hydration assertions.

## Residuals and non-promotion

This bounded slice does not prove repository SQL/RLS behavior, target
PostgreSQL/Redis, providers, production, remote CI, backup/restore, cutover,
Vetus parity or global ERP readiness. Those remain global release blockers.

## GREEN and closure evidence — 2026-08-31

The smallest account-aware correction was implemented and reviewed:

- `PrescriptionsService` now requires account scope for detail, document,
  revision, update, archive and sign operations, fails closed for foreign
  records and filters contaminated repository hydration before cache/revision
  publication.
- Authenticated prescription routes and first-party callers forward the
  authoritative account directly into the scoped service methods.
- Direct-service, route and HTTP regressions prove same-account behavior,
  foreign-account non-disclosure and absence of mutation/persistence residue.
- Focused service/boundary evidence passed `36/36`; changed-service coverage
  passed `94.18%` statements/lines, `90.74%` branches and `94.11%` functions.
- API route tests passed `7/7`; the authenticated PostgreSQL HTTP integration
  passed `6/6`; the canonical runtime contract passed `1/1`.
- Workspace typecheck, build and lint passed; security/static controls passed,
  including secret scan, OpenAPI, namespaces, RLS, migration-source,
  deploy-surface and design-system import guardrails.
- The official critical base passed `57/57` files and `556/556` tests. The
  serial process matrix passed `10/10`, with every ephemeral database cleaned.
- Independent read-only review returned `APPROVE_BOUNDED` with no actionable
  in-scope finding.

The critical base also exposed a stale test fixture in
`tests/integration/database/encounter-active-uniqueness.test.ts`; its
incompatible simulation index was corrected to use unique `id` values while
retaining the intended incompatible-index contract. This was test-only
compatibility work and did not change production behavior.

The slice is closed as `COMPLETE_BOUNDED` / `PASS_BOUNDED`. Global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`; target, production,
provider, remote-CI, backup/restore, cutover and release evidence remain out of
scope and unresolved.
