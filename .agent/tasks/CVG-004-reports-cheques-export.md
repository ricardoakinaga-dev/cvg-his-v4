# CVG-004 — audited report workbench for cheque payments

**Status:** `PASS_BOUNDED`; bounded repository implementation and process evidence
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator, with TDD and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-CHEQUES-IR-002`

## Problem

The Vetus Reports > Cheques route is present in the SPA navigation and the
finance page already derives cheque rows from persisted counter-sale payment
records, but the Reports workbench still renders a structural placeholder and
disables export. This leaves a known report-parity gap even though an existing
application source can provide the read-only rows.

## Frozen contract

1. The report catalog exposes `financial-cheques` and the API builds its rows
   through an account-scoped counter-sale payment query; the browser does not
   hydrate every sale/detail pair for the report.
2. Each row contains only persisted facts: payment id, sale id/number, sale
   status, reference, amount, installments, payment recorded time and notes.
   No due date, bank, settlement, return or issued/received status is inferred
   from free-text notes.
3. The report validates date filters against payment `createdAt`, persists the
   report execution/export through the existing audited server-side report
   path, and renders the returned rows without synthetic data.
4. The report remains read-only. Creating, settling, returning or batch-updating
   cheques stays disabled or owned by the finance workflow.
5. Errors from report execution remain visible and replace any previous cheque
   rows; unrelated report keys retain their current loading and export paths.
6. No new provider, credential, migration, database write beyond persisted
   report execution/export artifacts, deployment, target,
   production or external-system behavior is authorized by this task.

## TDD acceptance

### RED

- A report/API test fails because `financial-cheques` is absent from the report
  catalog/source and the workbench calls the generic administrative hub instead
  of the report execution path.
- The fixture contains one check payment and one non-check payment so the test
  rejects structural rows and proves method filtering at the authoritative
  source boundary.

### GREEN

- The `financial-cheques` definition is catalogued with a stable persisted-fact
  column contract and the API report source returns only account-matching check
  payments in the requested payment-date range.
- Workbench execution renders the persisted cheque reference, sale number,
  amount, recorded time and notes; server-side CSV export is audited and
  produces only those rows.
- Date filtering uses payment `createdAt`, and a failed refresh clears previous
  rows while showing the report error.
- Existing reports, the finance Cheques page, counter-sales/reports module
  tests, API route tests, SPA typecheck/build and focused report tests remain
  green.

## Explicit non-claims

- This does not implement cheque creation, settlement, return, batch download,
  bank reconciliation, due-date derivation or a dedicated cheque database
  table.
- It does not prove the complete Vetus Cheques journey, external provider
  behavior, target operations, global parity, coverage, accessibility or
  release readiness.
- It does not close the separate Paymento Antecipado report gap or the
  remaining report families (cadastros, personalizados and scheduled delivery).

## Revalidation triggers

- Changes to counter-sale payment persistence, payment-method enums or the
  finance Cheques derivation rules.
- Changes to report CSV/download semantics, tenant-scoped list/detail APIs or
  report authorization.
- Expansion from read-only reporting into cheque lifecycle mutations,
  server-side audited artifacts, provider integration or target operations.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-cheques-v2.json`
- `.agent/artifacts/CVG-004-reports-cheques-export-2026-08-26.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-MODULE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-API-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-SPA-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-FINAL-001`

## Continuation — scheduled worker source for Cheques — 2026-08-26

The bounded continuation closes the repository-local worker source gap for
`financial-cheques`. It keeps the original read-only contract: the worker
calls a tenant-aware persisted counter-sale payment source, forwards the
schedule date filters, maps only the catalog columns and fails closed when no
source is configured. The database bootstrap reuses the existing
`CounterSalesService`; no provider, credential, migration, target or
production action is introduced.

The schedule boundary also rejects non-string/non-calendar `dateFrom` and
`dateTo` values and inverted intervals before calling the persisted source.

The intentional RED failed at worker typecheck before the `cheques` source was
added; a follow-up RED then rejected a numeric schedule date filter. GREEN
passed the complete worker package suite (23 runner tests plus
the package's bootstrap, account-discovery, consumer-composition,
scheduled-report-job and settlement suites) and the real PostgreSQL one-shot
worker process suite 6/6, including a persisted check payment and execution
row assertion.

The scheduled-job failure path was also corrected: source resolution failures
before `reports.execute` do not create an unretryable delivery without an
`executionId`; export/provider failures after execution keep the stable
execution identity and remain on the existing retry path.

The independent follow-up review returned PASS with no Critical, High or Medium
finding. Direct unit coverage now includes impossible calendar dates and
inverted intervals. The process fixture remains intentionally one-tenant; the
counter-sales module/account-isolation evidence and explicit repository
`account_id` predicate cover the bounded local tenant-scope claim, while a
two-tenant one-shot proof remains open.

This continuation does not close scheduled delivery for the remaining Vetus
report families, nor does it claim a real external email-provider delivery for
Cheques. The original limits around lifecycle, bank/maturity/return,
Pagamento Antecipado, target operations, complete parity, coverage and release
remain in force.

Additional evidence:

- `.agent/artifacts/CVG-004-reports-cheques-worker-2026-08-26.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-UNIT-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-GLOBAL-RETEST-001`

## Continuation — two-tenant scheduled Cheques worker scope — 2026-08-27

The remaining local process-proof gap is now closed within the existing
authority. The fixture creates a distinct account-B check payment and
`financial-cheques` schedule, then starts two independent real
`apps/worker/src/run-once.ts` processes concurrently with account-specific
service principals. Each persisted `last_execution_id` contains exactly the
payment belonging to its schedule account; an inverse-payment query returns
zero rows.

Fresh evidence:

- focused disposable PostgreSQL run: `1/1` new test, exit `0`, using
  `cheques_two_tenant_20260827b`;
- full run-once report boundary: `14/14`, exit `0`, migrations `0000`–`0153`,
  using `cheques_full_20260827`;
- Prettier check and `git diff --check`: exit `0`.

No production source, migration, credential, provider, target or external
resource was changed. Because the existing tenant-aware source already passed
the new behavior, this was a `BASELINE_PASS_EVIDENCE_GAP`, not an invented
product RED. Detailed evidence is in
`.agent/artifacts/CVG-004-reports-cheques-worker-tenant-scope-2026-08-27.md`.

The bounded result does not close continuous multi-account worker operations,
provider delivery, target RLS, restore/RTO-RPO, remote CI, the remaining report
families, global parity or release acceptance. The next local candidate is the
two remaining Reports workbench placeholders, after a fresh implementation-
ready contract.

## Reconciliation — two-tenant scheduled Cheques worker scope — 2026-08-27

The bounded gate is recorded as `PASS_BOUNDED` with HIGH residual risk under
`AUTH-CVG-004-REPORT-CHEQUES-IR-002`. The independent read-only review returned
`APPROVE_BOUNDED` with no technical finding. The gate and review do not expand
the authority to continuous workers, providers, target operations or release.

Evidence is linked in:

- `.agent/gates/verified-CVG-004-report-cheques-worker-tenant-scope.json`
- `.agent/artifacts/CVG-004-reports-cheques-worker-tenant-scope-2026-08-27.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-TENANT-SCOPE-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-TENANT-SCOPE-GLOBAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-TENANT-SCOPE-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-TENANT-SCOPE-HYGIENE-001`

The global non-promotion retest remains open: strict parity tests pass, but
report-only Vetus parity is `98/100` with `4/11` verified, clinical parity is
`100/100` with `2/3` verified, and enterprise readiness is `95/100` with
`42 PASS`, `3 WARN` and `1 FAIL`. CVG-004 and the global ERP remain
`IN_PROGRESS/PARTIAL`.
