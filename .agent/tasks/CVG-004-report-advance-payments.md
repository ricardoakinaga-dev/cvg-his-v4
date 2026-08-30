# CVG-004 — audited report for advance payments

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-ADVANCE-PAYMENTS-IR-001`

## Problem

The SPA exposes the Vetus Paymento Antecipado route, but the report workbench
still renders a structural placeholder and disables export. The current
`OwnerSummary.financialProfile.creditBalance` is owner metadata and is not an
authoritative financial transaction source; using it for a report would
fabricate issuance, compensation and origin facts.

## Frozen bounded contract

1. Add an additive canonical persisted source made of immutable
   `advance_payments` records and append-only `advance_payment_allocations`
   records. Both relations are account-scoped, use integer minor units
   (`amount_cents`), BRL checks, composite tenant foreign keys, idempotency
   hashes and RLS/FORCE RLS.
2. Add a read-only report source that joins owners and aggregates persisted
   compensation allocations. It accepts the authenticated account only,
   supports strict `dateFrom`/`dateTo` bounds against persisted
   `issued_at`, optional owner search/status filters and a bounded 10,000-row
   result. It must fail closed when the database source is not composed.
3. Add the `financial-advance-payments` ReportsService definition with stable
   persisted-fact columns: payment id, owner, document, issued date, original
   amount, compensated amount, balance, origin, status and notes.
4. Route execution and CSV export through the existing audited
   `ReportsService` path. The SPA workbench invokes that server report and
   renders returned rows. It does not call owner metadata, derive an issue date
   from `updatedAt`, or silently render a placeholder.
5. This slice is read-only at the application boundary. It does not authorize
   generating an advance, compensating a credit, cancelling/refunding a credit,
   opening/closing cash, payment-provider integration, accounting posting,
   migration backfill, target/provider/production/deployment mutation or full
   Vetus parity.
6. Existing finance, owner, report, API, SPA, OpenAPI, migration-source,
   security, RLS and diff-hygiene controls must remain green. A disposable
   PostgreSQL test must prove the new migration's table/RLS/account boundary;
   it must not be described as a target or production proof.

## TDD acceptance

### RED

- The reports catalog test rejects the absent
  `financial-advance-payments` definition and exact columns.
- The API report-route test rejects the absent source branch, account-scoped
  mapping, strict dates, status/search filtering and fail-closed behavior.
- The SPA workbench test rejects the disabled `Solicitar Excel` placeholder and
  requires execution/export through the server report.
- The database migration/RLS contract test rejects absent tables, minor-unit
  checks, composite ownership, idempotency and tenant policy.

### GREEN

- Catalog, API source/route, SPA workbench and migration/RLS tests pass.
- A focused browser contract, if available, asserts the read-only report action
  and server execution/export request.
- API/SPA typechecks and builds pass, with formula-neutralized CSV export
  retained by the existing exporter.
- No owner metadata is used as a report source.

## Explicit non-claims

This closes only the repository-local audited report read path for persisted
advance-payment facts. It does not populate legacy data, implement payment
creation/compensation/refund, prove cash/journal integration, external
providers, target operations, browser PostgreSQL persistence, complete Vetus
parity, coverage, accessibility, remote CI or release readiness.

## Revalidation triggers

- Any change to advance-payment persistence, allocation semantics, owner
  identity or financial subledger rules.
- Any write endpoint, cash/journal integration, refund/cancellation or provider
  addition.
- Any expansion of report columns beyond persisted facts or any target/production
  operation.

## Bounded verification checkpoint — 2026-08-26

The authorized repository-local slice reached `PASS_BOUNDED`. The Reports
module plus migration unit passed `17/17`, the full API package passed `389/389`,
and the focused SPA workbench passed `38/38`. A fresh disposable PostgreSQL
run passed `5/5`, proving account isolation, derived balances, the
over-allocation guard and rejection of update/delete attempts against the
ledger facts. A fresh canonical PostgreSQL runtime passed `1/1` and composed
the report source only after migrations through `0148` satisfied the required
schema, tenant-policy and trigger invariant.

Full workspace typecheck and lint passed. Official coverage passed `1,954`
tests with one skip at 82.09% statements, 80.10% branches, 88.53% functions
and 82.09% lines. OpenAPI, migration-source, RLS (`162/163`, one documented
exception), deploy-surface, static Helm, secrets, dependency security and
the parity contract passed.

The independent read-only critique initially returned `FAIL_BOUNDED` because
the SPA did not expose/forward owner search and compensation status and the
bootstrap composed from table existence alone. The controls, forwarding test,
schema-invariant check and append-only triggers were added and rechecked. This
is engineering evidence, not reviewer approval.

The verified gate and artifact are
`.agent/gates/verified-CVG-004-report-advance-payments.json` and
`.agent/artifacts/CVG-004-report-advance-payments-2026-08-26.md`.

This checkpoint does not claim advance-payment generation, compensation
commands, cancellation/refund, cash or journal posting, migration backfill,
providers, Vetus import, target behavior, complete Vetus parity, accessibility,
operations, backup/restore, remote CI, production readiness or release
acceptance. No commit, push, staging, deployment, provider, credential, target
or production mutation occurred.
