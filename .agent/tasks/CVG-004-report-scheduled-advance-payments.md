# CVG-004 — scheduled advance-payment report in the worker

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-ADVANCE-PAYMENTS-IR-001`

## Objective

Close the repository-local worker gap for the already audited
`financial-advance-payments` report. The catalog, authenticated API route and
database-backed on-demand source already exist, but a scheduled report reaches
the worker resolver without a persisted source and is intentionally rejected.

## Frozen bounded contract

1. Share the existing read-only advance-payment report source through the
   financial module boundary so API and worker do not depend on one another or
   maintain divergent SQL semantics. Preserve the existing API-local exports
   as compatibility shims where needed.
2. Add a worker source that calls the authenticated schedule account against
   the persisted `advance_payments` and append-only allocation projection. It
   forwards optional `search`, `status`, `dateFrom` and `dateTo` filters and
   returns only the ten columns already declared by the ReportsService catalog:
   `paymentId`, `ownerName`, `documentId`, `issuedAt`, `originalAmount`,
   `compensatedAmount`, `balance`, `origin`, `status` and `notes`.
3. Validate schedule filters before querying: status is exactly
   `available`, `partially_compensated` or `compensated`; search is a trimmed
   string of at most 200 characters; dates are strict ISO calendar dates with
   an inclusive, non-inverted `issuedAt` window. A source result above 10,000
   rows fails closed before report execution persistence.
4. Missing source composition, invalid filters, an unavailable canonical
   source and unknown report ids must fail closed. No empty-success substitute,
   owner metadata fallback or inferred financial fact is permitted.
5. The real one-shot worker proof uses disposable PostgreSQL with two accounts,
   persisted owner/advance/allocation facts and negative status/search/date
   cases. It proves local process execution, account-scoped source predicates,
   derived balances and report persistence only; it is not target or production
   evidence.
6. This slice is read-only at the scheduled report boundary. It does not
   authorize advance issuance/compensation/refund, cancellation, cash or
   journal posting, provider delivery, migration changes, backfill, target,
   credentials, deployment, production or full Vetus parity.

## TDD acceptance

### RED

- Worker resolver tests reject the absent advance-payment source branch and
  require the exact catalog column mapping, forwarded filters and fail-closed
  behavior.
- Worker tests reject invalid status/search/date/inverted-range filters before
  querying and reject a result over 10,000 rows.
- The process test rejects the current empty/unsupported scheduled result and
  requires a real persisted advance-payment execution with allocation-derived
  amounts and account/negative-fixture coverage.
- The module/API compatibility tests reject a source implementation that would
  force the worker to import the API app or duplicate the SQL projection.

### GREEN

- Financial-module source, API compatibility exports, worker resolver and
  bootstrap composition pass focused tests.
- A fresh disposable PostgreSQL run executes the scheduled report in a real
  one-shot worker and persists the exact matching ten-column row.
- API, financial module, worker, typecheck, build, security, OpenAPI,
  migration-source, RLS, formatting and diff-hygiene regressions remain green.

## Verification checkpoint — 2026-08-27

The bounded implementation is reconciled as `PASS_BOUNDED` with residual risk
`HIGH`. The financial module exports the canonical persisted source, the API
keeps its compatibility surface, and the worker/bootstrap compose the source
without an API-to-worker dependency. The worker validates the frozen filters,
uses the inclusive `dateTo` window, maps exactly the ten catalog columns,
rejects more than 10,000 rows and fails closed for missing/unsupported/unknown
sources. Bootstrap checks the required tables, columns, FORCE RLS, tenant
policies and immutability/over-allocation triggers before composition.

Fresh evidence passed worker `77/77`, financial module `16/16`, compiled API
`408/408`, real one-shot PostgreSQL process `10/10`, canonical-source RLS
`9/9`, global typecheck across 70 projects, official coverage `1,983 passed /
1 skipped` at `80.42%` statements, `80.21%` branches, `87.74%` functions and
`80.42%` lines, enterprise security, secrets, OpenAPI, migration-source,
RLS, deploy-surface, Helm static, Prettier and diff hygiene.

Hubble's independent post-implementation review returned a conditional
bounded result without a Critical finding. The gate therefore remains
conditional: the pre-existing worker actor fallback, scheduled audit call,
duplicate API read projection, complete bootstrap ACL/function/runtime-role
assertions, wildcard/timezone semantics and a few edge-test cases remain
explicit residuals. They are not silently promoted to production claims.

Global retests remain open: general parity `98/100` (`4/11` verified), clinical
parity `100/100` (`2/3` verified) and enterprise readiness `95/100` (`42 PASS /
3 WARN / 1 FAIL`). No provider, target, credential, production, deployment,
commit, push or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-advance-payments.json`,
`.agent/artifacts/CVG-004-report-scheduled-advance-payments-2026-08-27.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-ADVANCE-PAYMENTS-FINAL-001`.

## Explicit non-claims

This closes only the local scheduled read path for persisted advance-payment
facts. It does not certify on-demand/API or write behavior beyond regression,
the complete advance-payment lifecycle, target RLS/runtime roles, provider
delivery, distributed worker operations, browser persistence, Vetus parity,
coverage, accessibility, backup/restore, remote CI or release readiness.

## Revalidation triggers

- Any change to advance-payment schema, allocation semantics, balance derivation
  or API source filters.
- Any worker schedule-claim/delivery change or addition of another report
  family.
- Any write endpoint, cash/journal integration, provider, target or production
  action.
