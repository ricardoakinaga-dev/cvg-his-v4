# CVG-003 — bounded operational audit coverage source of truth

**Status:** `COMPLETE_BOUNDED` — durable snapshot, fail-closed route and tenant-safe legacy dependency are verified  
**Stage/activity:** `VERIFY` / `CLOSE`  
**Owner:** root integrator with TDD, security and compatibility review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T3_HIGH` / `HIGH` / misleading tenant compliance and operational metrics  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-AUDIT-OPERATIONAL-COVERAGE-SOURCE-OF-TRUTH-IR-001`

## Problem

`GET /audit/operational-coverage` currently computes its report from the
process-local `AuditService` cache, while `GET /audit/events` reads the
persisted audit repository. A restart or a second API process can therefore
show committed events in the audit ledger while reporting lower operational
coverage, missing requirements and incorrect module/risk totals.

The existing `refreshFromDatabase` hook repairs cache state after selected
rollback paths, but it is not a startup or read-time source-of-truth
guarantee. The correction must make the report itself durable-state based in
repository mode and must fail closed when that source cannot be read.

## Frozen bounded contract

1. Change only the operational-coverage report source boundary, its route
   integration, the audit repository query needed for a complete account
   snapshot, focused tests and matching API documentation. In repository mode,
   `getOperationalCoverageReport(accountId, requirements)` derives every
   total, module/risk count and requirement evidence from the complete
   committed snapshot returned by `listForCacheRefresh(accountId)`; it must not
   use the process-local cache or a default 100-row page.
2. Preserve in-memory/no-repository behavior for local test doubles and the
   existing report JSON shape. The public report method may become async so the
   route can await the durable read; all in-repository callers and tests must
   be updated coherently.
3. If a configured repository cannot provide a complete snapshot or its read
   fails, raise a bounded `AuditCoverageUnavailableError` and map it at the
   HTTP boundary to a sanitized `503 AUDIT_COVERAGE_UNAVAILABLE`. Never return
   stale cache data or repository diagnostics to the caller.
4. Preserve authenticated principal-derived account scope, existing
   `audit.read` authorization, and the snapshot timing: compute the report
   before appending `operational_coverage_read`, so the read event is not part
   of the measured snapshot. Keep the successful audit write awaited and
   metadata-only.
5. Make the database snapshot query include the repository's existing legacy
   account identity representation where applicable, preserve deterministic
   newest-first ordering, and leave `/audit/events` pagination behavior
   compatible with the same committed rows.
6. Do not change the operational requirements catalog, report calculations,
   global audit cache recovery semantics, unrelated audit routes, mutation
   transactions, migrations, providers, credentials, target, production,
   deployment or release acceptance.

## TDD acceptance

### RED

- A module test seeds a committed repository event without populating the hot
  cache and requires the coverage report to count it.
- A module test creates a cache-only/rolled-back event while the repository
  snapshot is empty and requires the report to exclude it; a persisted account
  with more than 100 events must be counted completely.
- A repository-read failure or missing complete-snapshot capability must fail
  with the bounded unavailable error rather than returning cached coverage.
- A route test requires the asynchronous report read to preserve principal
  account scope, append the read audit only after a successful snapshot, and
  return sanitized 503 on source failure.
- These assertions must fail before implementation because the current report
  is synchronous and cache-only and the route has no unavailable mapping.

### GREEN

- Repository-backed coverage uses the complete committed account snapshot;
  no-cache mode remains compatible; stale cache and repository failures are
  handled as specified.
- The operational-coverage route awaits the report, preserves its 200 payload
  and audit ordering, and maps source failure to 503 without leaking details.
- Database legacy-account coverage and deterministic snapshot behavior are
  covered by focused repository/integration tests where the existing database
  harness permits.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-audit-operational-coverage-source-of-truth.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-AUDIT-OPERATIONAL-COVERAGE-SOURCE-OF-TRUTH-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-INTEGRATION-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-REGRESSION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-REVIEW-SECURITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-REVIEW-COMPAT-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-COVERAGE-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-OPERATIONAL-COVERAGE-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-003-audit-operational-coverage-source-of-truth.json`
- `.agent/artifacts/CVG-003-audit-operational-coverage-source-of-truth-2026-08-29.md`

## Explicit non-claims

This task does not certify replay authorization after revocation, reprocess
idempotency, durable atomicity between outbox mutation and audit persistence,
worker delivery, other audit/log/trace/export routes, systemic ABAC, global
Vetus parity, external provider homologation, target RLS/roles, remote CI,
backup/restore, production or release readiness.

## Decision

`COMPLETE_BOUNDED` under
`.agent/gates/verified-CVG-003-audit-operational-coverage-source-of-truth.json`,
with residual risk `HIGH`. The child tenant-safe legacy RLS dependency is
closed under its own verified bounded gate. Global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## Bounded completion — 2026-08-29

The repository source boundary, route contract, complete snapshot behavior,
runtime restart proof, restricted-role legacy coverage, module/API regressions,
quality gates and independent review are reconciled in the parent and child
artifacts. No production, target, provider, credential, deployment or release
action was taken. Fresh-scout the next repository-local gap under a new
implementation-ready authority.
