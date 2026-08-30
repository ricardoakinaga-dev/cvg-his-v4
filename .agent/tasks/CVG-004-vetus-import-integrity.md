# CVG-004 — durable Vetus import idempotency and reconciliation integrity

**Status:** `PASS_BOUNDED`  
**Stage/activity:** `VERIFY` / `CHECKPOINT`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-004 Vetus parity journeys  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-VETUS-IMPORT-INTEGRITY-IR-001`

## Problem

The Vetus import routes already cover owner/patient upsert, durable import
logs, batch dry-run, rejected rows, resume and rollback. The original route
tests were in-memory, however, and a source reference replay returned the first
result even when the second payload was different. In a production import this
could silently acknowledge a conflicting file or row. The bounded slice now
adds normalized internal fingerprints, a transaction-safe source-reference
boundary and disposable HTTP/PostgreSQL evidence across two API instances.

## Frozen bounded contract

1. Add one additive canonical migration after 0148 (`0149`) with nullable SHA-256
   request fingerprints on `vetus_import_logs` and `vetus_import_batches`.
   Existing rows remain readable and are treated as legacy when no fingerprint
   is present; migrations 0098/0102 are not rewritten and no data is deleted.
2. Compute the fingerprint from the normalized, bounded import command. Store
   it only as an internal persistence fact; do not expose it in public API
   responses or logs.
3. A new request with an existing `(account, sourceSystem, sourceReference)`
   replays only when its fingerprint matches. A divergent fingerprint returns
   a stable 409 conflict without changing owners, patients, batches or logs.
4. Serialize source-reference acquisition inside the existing tenant database
   transaction using a transaction-scoped advisory lock. Preserve the current
   unique indexes as the final database invariant.
5. Verify the real authenticated HTTP composition against disposable
   PostgreSQL, including restart/second-instance reads, batch dry-run,
   rejected-row persistence and resume, rollback of only records created by the
   batch, source-reference replay/conflict, audit/idempotency atomicity and
   two-tenant isolation. An import-specific outbox event is not added by this
   bounded slice and remains an explicit open claim.
6. Keep the existing monolith/Vue/PostgreSQL architecture. No external Vetus,
   Live Pet, Live Lab, provider, target, credential, deployment, production or
   release action is included.

## TDD acceptance

### RED

- A route test must fail because a divergent single-import source reference is
  currently accepted as a replay.
- A route test must fail because a divergent batch source reference is
  currently accepted as a replay.
- A route test must fail because a normalized replay, a conflicting item-level
  source reference, a later-row resume, an immutable completed batch and an
  oversized response are not protected.
- Database-backed HTTP tests must fail until persisted fingerprints and the
  source-reference transaction boundary are implemented.

### GREEN

- New single and batch imports persist internal fingerprints through the
  canonical repository, while public responses retain the existing shape.
- Exact source-reference replays return the original durable result without
  creating duplicate owners, patients, logs, batches or items.
- Divergent source-reference requests return 409 and leave all durable facts
  unchanged, including under two API instances with distinct idempotency keys.
- Batch fingerprints are computed from the normalized bounded command; item
  source-reference conflicts are rejected before batch/domain mutation; resume
  preserves the original rejected row number and stored payload; completed
  batches cannot be resumed or have identity/mode changed.
- Batch dry-run creates only its durable control-plane rows; rejected rows are
  explainable and resumable; rollback deactivates only owner/patient records
  created by that batch and preserves linked pre-existing records.
- Batch responses are bounded before durable mutation so the existing 256 KiB
  tenant-UoW response cap is not approached by a normal 1000-row response.
- Focused route/API/PostgreSQL tests, full API regression, typecheck, lint,
  build, coverage, OpenAPI, RLS, migration-source, deploy-surface, secrets
  and dependency-security controls pass.

## Bounded verification checkpoint — 2026-08-26

The local slice reached `PASS_BOUNDED`. The focused route/cache/UoW suite
passed 25/25, the Owners and Patients focused regressions passed 44/44 and
50/50, and a fresh disposable PostgreSQL run passed 7/7 over two
authenticated API instances. The database evidence covers migration 0149,
persisted internal fingerprints, normalized replay, 409 conflicts for single
and item-level references, later-row resume with durable row identity,
immutable resume constraints, dry-run/rejected/rollback, same-reference
concurrency, and cross-tenant isolation. The oversized-batch case returned
400 before batch or domain mutation.

The full API suite passed 401/401. Workspace typecheck and lint passed across
70 projects. Official coverage passed and remained above the 80%
statement/branch/function bar (82.10% statements, 80.08% branches and 88.55%
functions). OpenAPI, RLS, migration source-of-truth,
deploy-surface, static Helm, secret scan and enterprise dependency security
also passed. The global parity audit remains 98/100 with 4/11 verified; the
clinical audit remains 100/100 with 2/3 verified; enterprise readiness remains
95/100 with 42 PASS, 3 WARN and 1 FAIL. Those global gates are not promoted by
this slice.

The bounded cache reconciliation removes stale owner/patient/audit entries
after a transaction boundary, including late response-budget rollback. It is
intentionally separate from bootstrap hydration. Refreshes for one account are
serialized and wait for all sibling snapshots to settle before the queue
advances; the import fingerprint is internal and omitted from public summaries.

The first independent static review identified two cache-boundary findings:
audit cache ghosts after late rollback and refresh overlap after an early
`Promise.all` rejection. The implementation addressed them by refreshing the
audit cache, moving the final response-budget assertion before `appendAudit`,
serializing per-account refreshes and using `Promise.allSettled`. The RED/GREEN
regression covers the sibling-failure case, and the final independent review
returned `PASS_BOUNDED` with no current HIGH or MEDIUM findings.

## Continuation — browser E2E composition — 2026-08-27

The previously open browser-coverage claim is now proven as a separate local
bounded slice. The official command
`E2E_PLAYWRIGHT_TARGET=e2e/spa/vetus-import-flow.spec.ts ./infra/scripts/run-e2e-spa.sh`
passed `1/1` with fresh disposable PostgreSQL/Redis, migrations `0000`–`0153`,
canonical two-tenant seed, real SPA authentication and a database-backed API
(`persistenceMode=database`, `workerReady=true`).

The browser test validates the accessible CSV field, one-row preview, durable
dry-run, durable import and participant visibility, then triggers rollback from
the UI and reads the persisted owner and patient by their returned IDs to
require `status=inactive`. The first independent review found the missing
post-rollback domain assertion and a weak selector; both were fixed before the
final rerun. The independent reviewer then returned `APPROVE_BOUNDED` with no
remaining correctness, security or test-quality finding.

This closes only local browser → API → disposable PostgreSQL evidence. External
Vetus/Live Pet/Live Lab connectors and homologation, target/provider behavior,
distributed worker failure/observability, backup/restore, operational LGPD,
remote CI, accessibility, full parity, enterprise readiness and release
acceptance remain open.

## Explicit non-claims

This is a repository-local bounded import-integrity result. It does not prove
Vetus behavioral parity, external import reconciliation, an import-specific
outbox event, rejected/rollback behavior in the target environment, browser
E2E beyond the local seeded composition now covered above, Live Pet/Live Lab/provider contracts, distributed worker
failure/observability, accessibility, backup/restore, remote CI, production
readiness or release acceptance.

## Revalidation triggers

- Any change to owner/patient transaction composition, source-reference
  identity, import rollback semantics or the 0098/0102 schema.
- Any external Vetus/Live Pet/Live Lab integration, backfill, provider,
  target, credential, deployment, production or release action.

## Control-plane references

- `.agent/gates/verified-CVG-004-vetus-import-integrity.json`
- `.agent/artifacts/CVG-004-vetus-import-integrity-2026-08-26.md`
- `.agent/artifacts/CVG-004-vetus-import-browser-e2e-2026-08-27.md`
- `.agent/authority.jsonl#AUTH-CVG-004-VETUS-IMPORT-INTEGRITY-IR-001`
- `.agent/verification.jsonl#VFY-CVG-004-VETUS-IMPORT-INTEGRITY-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-VETUS-IMPORT-BROWSER-E2E-FINAL-001`
