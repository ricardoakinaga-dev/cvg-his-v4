# CVG-003 — Encounter tenant boundary

**Status:** IN_PROGRESS / CHECKPOINT  
**Priority:** P0  
**Owner:** root integrator  
**Date opened:** 2026-08-31

## Objective

Make the reusable `EncountersService` account-aware for every encounter read,
timeline operation and lifecycle command. A caller from another account must
receive the same sanitized not-found behavior as an absent encounter and must
not change the process cache, timeline, persistence queue, callbacks or
durable state.

## Authorized scope

- Require explicit `AccountId` on encounter collection/detail, timeline,
  snapshot/restore, transition, close, reopen and delete operations.
- Filter process-local cache and repository-hydrated encounter/timeline rows by
  the requested account before returning or publishing them.
- Preserve the existing account-aware open/open-authoritatively behavior,
  lifecycle validation, status transitions, persistence ordering, rollback and
  callback semantics.
- Propagate the authenticated principal account through scheduling,
  discharge, surgery and server encounter routes, runtime summaries, clinical
  handoffs and first-party clinical/financial/inpatient/diagnostics/surgery,
  triage/attachment/billing/inventory/notification callers.
- Add adversarial two-account service/cache tests and route/runtime regressions
  proving same-account behavior, foreign-ID denial and no mutation residue.

## Explicit exclusions

- No database schema, migration, RLS policy or repository SQL redesign.
- No redesign of encounter persistence, timeline tables, clinical workflows,
  finance, billing, providers, credentials, target, production, deployment,
  release or global ERP promotion.
- Do not weaken existing repository tenant predicates or replace the
  authenticated principal with request-supplied account data.
- Do not preserve an unscoped compatibility surface for reusable encounter
  reads or commands.

## Quality bar

Close only as `COMPLETE_BOUNDED` / `PASS_BOUNDED` after intentional TDD RED,
focused GREEN with changed-service coverage at or above 80%, route and runtime
regressions, official critical integration regressions, workspace typecheck/
build/lint, security/static checks, independent read-only review and
control-plane reconciliation. Preserve global ERP `IN_PROGRESS/PARTIAL` and
promotion `BLOCKED`.

## Scout evidence

Fresh local inspection and delegated read-only scout James identified a P0
clinical confidentiality gap in `EncountersService`. The process-wide cache is
keyed only by encounter ID; `getOrThrow`, `listActive`, `listAll`, timeline
reads and lifecycle commands do not require an account. `hydrateFromDatabase`
adds rows without a post-filter, and `apps/api/src/routes/scheduling-routes.ts`
calls `listActive()` without principal scope. The repository layer already has
tenant-aware durable predicates, so the smallest bounded correction is a
service/cache boundary plus first-party propagation, without schema or SQL
redesign.

The same unscoped seam is consumed by authenticated server routes and clinical,
financial, inpatient, diagnostics, surgery, triage, attachment, billing,
inventory and notification modules. Existing route-level ownership checks are
compensating defenses and do not protect direct reusable callers.

Evidence: `.agent/verification.jsonl#VFY-SCOUT-CVG-003-ENCOUNTER-TENANT-BOUNDARY-001`.

## Implementation plan

1. Capture intentional RED with account-first service/cache/timeline tests.
2. Implement scoped reads and commands, including contaminated hydration and
   async cache-miss filtering.
3. Migrate all first-party callers and route adapters; remove unscoped calls.
4. Run focused coverage, route/runtime/HTTP and official critical regressions.
5. Run workspace/static/security gates, obtain independent review, remediate any
   bounded findings and reconcile the append-only control plane.

## RED evidence — 2026-08-31

The new focused boundary contract was run before changing production source.
The file failed `3/3` as expected: contaminated hydration leaked the foreign
encounter into account collections, a foreign account-first operation was not
rejected at the reusable boundary, and a same-account account-first transition
was rejected by the legacy signature. The ephemeral test database was cleaned
during teardown. Evidence:
`.agent/verification.jsonl#VFY-CVG-003-ENCOUNTER-TENANT-BOUNDARY-RED-001`.

## Implementation and bounded verification — 2026-08-31

The reusable encounter service now requires `AccountId` for detail,
collections, timeline, snapshot/restore and lifecycle operations. Repository
hydration and asynchronous timeline loads filter both encounter and event
rows before cache publication. Authenticated route adapters and reviewed
first-party clinical, financial, inpatient, diagnostic, surgery, triage,
attachment, billing, inventory, notification, handoff, worker and runtime
callers forward the principal account explicitly.

Lifecycle and timeline persistence queues now gate callbacks on persistence,
recover after rejected queue work and compensate cache state on failures. The
service-level compensation is intentionally best-effort because the existing
repository interfaces do not expose one shared transaction; API tenant
unit-of-work paths remain the authoritative database transaction boundary.

TDD GREEN and focused evidence passed as follows:

- encounter service and boundary tests: `38/38`;
- attachment, inpatient and notification affected suites: `23/23`, `22/22`
  and `12/12`;
- handoff/inpatient boundary regressions: `8/8`;
- broader affected module/API suite: `125/125`;
- changed encounter service coverage: `89.05%` statements/lines, `88.10%`
  branches and `90.00%` functions;
- official critical database baseline: `57/57` files, `556/556` tests;
- official serial critical process matrix: `10/10`;
- API critical E2E: `11/11`; authenticated SPA E2E: `72/72`, including
  reports, RBAC/tenant isolation, operational walkthroughs and visual
  desktop/mobile snapshots.

Workspace typecheck, lint and build passed for `70/71` selected projects.
Global coverage passed with `194` files, `2,246` tests and one intentional
skip at `80.66%` statements/lines, `81.36%` branches and `87.19%` functions.
OpenAPI, namespace, migration-source, RLS, Helm, deploy-surface, secret and
enterprise dependency gates passed. The two browser harness corrections
(exact server-report row contracts and hermetic counter-sales visual data)
are test-only verification repairs; the counter-sales restart regression was
also fixed by hydrating the generated-number high-water mark before issuing
new persisted numbers.

## Review and decision — 2026-08-31

The first fresh compatible independent read-only review returned
`REQUEST_CHANGES`. No schema, migration, RLS policy, provider, target,
production, deployment, release or global promotion change is included. No
commit or push was performed.

The review found five actionable repository-local items adjacent to the
encounter boundary: same-tenant concurrent counter-sale number allocation,
explicit account scope in the database prescription repository, explicit
account scope in attachment deletion, report E2E interception/static-row
divergence from backend contracts, and insufficient visual state coverage.
They are being handled as fresh, disjoint bounded follow-up work; this child
must not be marked closed until the findings are either remediated and
reverified or formally excluded with an explicit residual decision.

The full SPA run emitted cleanup warnings for two intentionally protected
financial states: settled cash receipts require explicit reversal before
encounter deletion, and the legacy payment-attempt trigger can reject one
cascade order when billing children are present. These are recorded residuals,
not suppressed test failures, and remain outside this task's explicit
schema/migration exclusion.

## Current remediation gate

The encounter implementation itself has passed its focused and affected
tests, but the child gate is suspended at `REVIEW_FINDINGS` while the five
review findings are remediated. The two browser cleanup protections below
remain visible and are not being suppressed.

## Shutdown checkpoint — 2026-08-31

The latest compatible independent review revalidated the attachment deletion,
report E2E and visual-state findings. Two bounded findings remain open and are
the exact next work item: PostgreSQL-backed counter-sale number allocation
must be serialized across replicas per account, and critical database
prescription commands/readers must require an explicit `accountId` instead of
falling back to ambient tenant context.

All implementation and verification work is saved in the working tree. The
resume artifact is `.agent/artifacts/CVG-003-ENCOUNTER-TENANT-BOUNDARY-CHECKPOINT-2026-08-31.md`.
On resume, start with intentional RED tests for those two contracts, then
implement, run the full affected gates, obtain a fresh independent review and
only then reconcile this child to `COMPLETE_BOUNDED` if approved. Do not
delete or reset the mixed dirty worktree.

## Residuals and non-promotion

This bounded slice does not prove PostgreSQL/RLS behavior under target roles,
target Redis, provider or fiscal homologation, production operations,
backup/restore, cutover, Vetus parity, remote CI, accessibility, LGPD or global
ERP readiness. Those remain release blockers.
