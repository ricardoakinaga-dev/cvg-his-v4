# CVG-004 — bounded scheduled owners registry report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.  
**Stage/activity:** `RECONCILE` / `VERIFIED_BOUNDED`  
**Owner:** root integrator with TDD and independent review  
**Parent:** CVG-004 Vetus parity journeys  
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-OWNERS-IR-001`

## Objective

Close only the missing scheduled-worker source for the existing read-only
`registration-owners` report. The owner registry on-demand/API contract is
already bounded separately; this slice adds a shared tenant-scoped persisted
source and the real worker run-once proof.

## Frozen contract

1. The schedule report id is `registration-owners`, and the worker returns
   exactly `documentId`, `fullName`, `primaryContact`, `city`,
   `financialResponsible`, `status` and `createdAt`. Optional document, city
   and contact values are blank when absent; the contact keeps the existing
   `label: value` representation.
2. The source is read-only and uses only the persisted `owners` table. The
   schedule account is the only tenant authority and is applied as explicit
   tenant database context and an account predicate. No patient join,
   patient/microchip field or client-provided account identifier is accepted.
3. Only the existing `dateFrom` and `dateTo` filters are accepted. Values are
   strict ISO calendar dates, inclusive against persisted `createdAt` in UTC;
   inverted ranges fail closed. Ordering is deterministic by `fullName ASC,
id ASC`.
4. The database source reads at most 10,001 rows and rejects more than 10,000.
   Foreign-account, missing, malformed or invalid metadata output fails closed
   before scheduled execution is persisted. The SQL projection contains only
   the owner columns and derived metadata fragments required for the frozen
   seven-field mapping; administrative notes, financial-profile details and
   row data are never logged.
5. Existing durable schedule execution/export audit, recipient handling,
   delivery and one-shot failure semantics remain unchanged. The continuous
   worker keeps its existing tick-and-continue path.
6. Existing owner schema/RLS migrations are reused. No migration, owner
   master/CRUD, patient expansion, provider, target, production, deployment,
   backfill, external action or release acceptance is authorized.

## TDD acceptance

### RED

- The owners-module source test rejects the missing source and freezes explicit
  tenant SQL, UTC date filters, deterministic order, exact projection and the
  10,001-row guard.
- The worker runner test rejects the absent `registration-owners` branch,
  invalid dates, foreign/malformed/oversized source output and any mapping
  outside the exact seven catalog fields.
- The real process test is extended before implementation for two-account
  schedules, date filtering, exact rows, inverse-account isolation, durable
  non-PII audit and one-shot failure behavior.

### GREEN

- The shared owners source, worker resolver/bootstrap wiring and exact
  seven-field mapping pass focused tests.
- Owners module and worker builds/typechecks and the full worker regression
  suite pass.
- Disposable PostgreSQL run-once evidence proves two-account isolation,
  inclusive UTC date bounds, deterministic order, metadata fallback,
  overflow/malformed fail-closed behavior and durable schedule audit.
- A fresh independent read-only review was attempted; the configured role was
  unavailable and the fallback returned no verdict. This remains a condition,
  not approval. Final hygiene and bounded reconciliation record the limitation.

## Bounded result

The scheduled `registration-owners` path is `PASS_BOUNDED` with `MEDIUM`
confidence and `HIGH` residual risk. Owners module tests passed `49/49`, the
configured worker suites passed runner `46/46`, bootstrap `20/20`, account
discovery `7/7`, consumer composition `2/2`, report identity `8/8`,
scheduled-job `3/3` and PIX settlement `17/17`, and the complete disposable
PostgreSQL process suite passed `22/22`.

The source uses the claimed schedule account as explicit tenant context and an
owners account predicate, an explicit owners-only projection, strict inclusive
UTC `createdAt` dates, deterministic `fullName ASC, id ASC` order, a 10,000-row
bound, metadata fallback and fail-closed malformed/foreign-row handling. The
worker maps exactly the seven catalog fields and preserves existing durable
non-PII audit, delivery and one-shot semantics. No patient join, microchip,
owner CRUD/master, migration, provider, target or production behavior was
added.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-owners.json`,
`.agent/artifacts/CVG-004-report-scheduled-owners-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-FINAL-001`.

## Explicit non-claims

This closes only the local scheduled `registration-owners` read path. It does
not establish complete Vetus owner parity, patient parity, owner CRUD/master
semantics, provider delivery, target authorization, distributed operations,
accessibility, operational LGPD, remote CI, backup/restore, coverage or
release readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-owners.json`
- `.agent/gates/verified-CVG-004-report-scheduled-owners.json`
- `.agent/artifacts/CVG-004-report-scheduled-owners-2026-08-28.md`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-OWNERS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-FINAL-001`

## Revalidation triggers

- Changes to the owners schema, metadata representation or account RLS/FORCE
  RLS policy.
- Changes to worker bootstrap, schedule claiming, report execution/export,
  delivery/audit or one-shot failure behavior.
- Any expansion to patient joins, owner lifecycle/CRUD, additional filters,
  other registry reports, provider delivery or target/production behavior.
