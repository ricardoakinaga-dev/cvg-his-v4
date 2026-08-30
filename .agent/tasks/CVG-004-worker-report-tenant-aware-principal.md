# CVG-004 — tenant-aware worker report service principal

**Status:** `PASS_BOUNDED`; bounded reconciliation complete
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator, with TDD and independent security review
**Parent:** CVG-004 scheduled financial/report journeys
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-IR-001`

## Problem

The previous worker identity slice removed the unsafe `accountId` fallback and
requires an explicit UUID, but one configured UUID can still be a human or a
principal from another account. `report_executions.requested_by_user_id` also
has only a user-only foreign key, so the database does not enforce the
`(account_id, actor_id)` relationship. This leaves scheduled report audit
identity weaker than the PIX service-principal path.

## Frozen bounded contract

1. Extend the existing `account_service_principals` purpose allowlist with the
   non-interactive `report-execution` purpose through one additive migration.
   The migration creates no users and no mapping rows.
2. Add account-composite foreign keys for report execution, export and
   schedule audit actors. Existing rows that violate the relationship must
   make migration fail closed; no repair or deletion is performed.
3. Resolve the configured `WORKER_REPORTS_USER_ID` only when it matches the
   current account, an active `report-execution` mapping and an active
   `service` user with interactive login disabled.
4. Continuous and one-shot workers must resolve the actor per account before
   scheduled report execution. A missing, foreign, inactive, human or
   interactive actor produces no report execution for that account.
5. Keep the existing explicit UUID configuration contract and the
   operator-managed Secret wiring. This slice does not invent a fallback or
   silently provision a principal.

## Authorized surface

- `packages/db/migrations/0152_report_service_principal_tenant_integrity.sql`
- `packages/db/src/schema/account_service_principals.ts`
- worker identity/bootstrap and entrypoint code needed for the resolver
- focused unit, schema, database and worker process tests/fixtures
- bounded task, gate, artifact, risk/debt and verification/state ledgers

## Explicit exclusions

- no user or service-principal provisioning, password/secret generation or
  credential rotation;
- no API route for provisioning or changing service principals;
- no provider, PIX, email, target, deployment, production or external-system
  mutation;
- no report-family expansion, report delivery redesign or browser work;
- no historical data repair or broad schema rewrite.

## TDD acceptance

### RED

- schema tests fail because the purpose allowlist has no `report-execution`
  value and the report audit tables have no account-composite actor foreign
  keys;
- resolver/process tests fail because a human actor, an actor from another
  account and an unmapped service actor are currently accepted or reach the
  report path;
- the valid fixture still uses a human-only actor and must be changed to an
  explicitly mapped non-interactive service principal.

### GREEN

- migration and Drizzle metadata preserve the existing PIX mapping and add
  the report purpose without inserting rows;
- report audit actor references enforce account membership at PostgreSQL;
- the worker resolver uses only parameterized, tenant-scoped reads and
  returns the configured service principal for the current account;
- run-once PostgreSQL proof covers valid mapping, human/foreign/unmapped
  rejection, no execution row on rejection and persisted service actor;
- worker package, database/schema tests, migration checks, full tests,
  coverage, lint, typecheck, build and security/static rails remain green.

## Non-claims

This gate does not certify multi-process continuous-worker runtime behavior,
target RLS/ownership, target restore/RTO-RPO, providers, remote CI,
accessibility, Vetus/clinical parity, operational provisioning or release
readiness. A deployment operator must still provision one valid mapping per
account before enabling scheduled reports.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-worker-report-tenant-aware-principal.json`
- `.agent/artifacts/CVG-004-worker-report-tenant-aware-principal-2026-08-27.md`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-DB-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-DB-002`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-PROCESS-002`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-QUALITY-002`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-GLOBAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-GLOBAL-002`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-HYGIENE-002`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-FINAL-002`

## Reconciliation result — 2026-08-27

The frozen slice is `PASS_BOUNDED` with residual risk `HIGH`. Migration
`0152_report_service_principal_tenant_integrity.sql` extends the existing
purpose allowlist without provisioning rows, adds account-composite actor
foreign keys for executions/exports/schedules and rechecks service-principal
purpose and active state in a transaction-time trigger. The shared resolver
and both worker entrypoints now require a current-account, active,
non-interactive service principal; invalid actors fail closed.

Fresh evidence passed schema contract `4/4`, resolver/trigger PostgreSQL
`9/9`, composite-FK PostgreSQL `6/6`, real run-once process `13/13`, process
fixture regressions (continuous lifecycle `2/2`, continuous entrypoint `1/1`,
public worker chain `1/1`, PIX webhook worker `1/1`), worker package exit 0,
full workspace `pnpm test` exit 0, coverage `80.45%` statements/lines,
`80.19%` branches and `87.74%` functions, plus lint, typecheck, build,
security and contract validators.

The independent reviews remain conditional rather than approvals. A follow-up
review found that the persistence trigger needed to check active service-user
state and actor type; the trigger now locks and validates those fields, with
the inactive-service and human-mapped cases covered by the fresh `9/9` run.
The operating constraint is one valid mapping per worker/account; a single global
`WORKER_REPORTS_USER_ID` cannot represent distinct principals for multiple
accounts. Provisioning, target roles/RLS, distributed continuous runtime,
providers, remote CI, parity, readiness and release remain outside this gate.
