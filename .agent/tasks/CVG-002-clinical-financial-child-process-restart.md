# CVG-002 — real child-process clinical-financial restart/replay proof

**Status:** `PASS_BOUNDED`; parent `CVG-002` remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`.
**Owner:** root integrator with TDD, security review and independent review.
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`.
**Authority:** `.agent/authority.jsonl#AUTH-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-IR-001`.
**Gate:** `.agent/gates/verified-CVG-002-clinical-financial-child-process-restart.json`.

## Objective

Close only the residual process-boundary evidence gap in the existing public
clinical-financial journey. The current restart test reboots the API in the
same Vitest process; this slice adds a named child launcher and a disposable
PostgreSQL proof that kills the real API process during an in-flight inventory
charge transaction, restarts it with a different PID and replays the command.

## Frozen contract

1. The child launcher may run only with `NODE_ENV=test` and the dedicated
   `INPATIENT_CLINICAL_FINANCIAL_PROCESS_FIXTURE=1` guard. It delegates to the
   real API entrypoint, so the killed PID owns the HTTP listener and database
   pool.
2. The child starts under separately created `LOGIN NOSUPERUSER NOBYPASSRLS`
   API and worker roles reconciled by the runtime-role policy. The test uses no
   production credentials, provider, deployment or external system.
3. The first child must complete admission and clinical handoff, then receive
   a consumption request held by a temporary PostgreSQL trigger after the
   inventory billing item is inserted. At that point inventory state,
   consumption, stock movement, lot and billing-item writes have occurred in
   one transaction while later audit/outbox writes have not; `SIGKILL` must
   leave zero consumption, billing-item, stock-movement, audit, outbox or
   idempotency residue and must restore the item stock and lot.
4. A second child must have a distinct PID, become database-ready, replay the
   exact consumption key once, reject a divergent same-key payload with the
   safe idempotency conflict, and reject a foreign-account write/read against
   tenant A.
5. After replay, the second child must complete daily-charge billing, billing
   open, discharge, encounter close and BRL cash receipt. Receipt replay must
   return the same response. SQL reconciliation must prove exact
   tenant/account/encounter/patient/owner identity, inventory
   quantity/cost/price/stock/lot/movement values, one inventory charge item,
   one daily charge/item, one settled billing record, financial account and
   receivable, one receipt/payment/cash movement, two balanced journal lines
   with the expected account codes, completed idempotency payload identity
   for consumption and receipt, six audit events, three outbox payloads and
   closed/discharged lifecycle state.
6. The trigger is test-only and disposable. No failpoint, migration, API
   contract, financial semantics, provider integration, SPA behavior, target
   RLS claim, production readiness or release authorization is added.

## TDD and verification

### RED

The new process test was written first and failed because the dedicated child
launcher did not exist. This is recorded as
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-RED-001`.

### GREEN

The named launcher was added and the first focused disposable process passed
`1/1`: real child PID, deterministic inventory pause, `SIGKILL` rollback,
restart with a new PID, exact replay, divergent conflict, two-account negative
checks, full clinical-financial continuation and SQL reconciliation. That
pre-hardening record is retained as historical evidence and superseded by the
hardened runs below:
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-GREEN-001`.

The focused proof was then hardened after independent review feedback: the
pause witness now matches the exact advisory lock, the failpoint occurs after
the billing-item write, runtime-role flags and effective table privileges are
asserted, the test rejects non-ephemeral execution, cleanup errors are
aggregated and surfaced, and persisted idempotency envelopes are decoded and
checked against their complete stable domain identity. The hardened run is
recorded as
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-HARDENED-GREEN-001`.

The preliminary `GREEN-001` and the first hardened `HARDENED-GREEN-001` are
retained as historical runs; both are superseded as the current checkpoint by
the post-correction `HARDENED-GREEN-002` below.

The hardened proof was rerun after the review corrections. It now seeds a
valid tenant-B item and lot, submits the foreign request with tenant-A
encounter/stay identifiers, asserts zero tenant-B mutations, and sends a
second identical inventory replay before the divergent payload. The cleanup
handle is retained until the child stop succeeds. This is recorded as
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-HARDENED-GREEN-002`.

The first post-hardening independent review found no code, security or
isolation defect; it found only stale control-plane pointers to the superseded
pre-hardening record. That finding is recorded as
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-REVIEW-001`
and was closed by the append-only evidence-pointer reconciliation.

The final independent pointer review returned `APPROVE_BOUNDED`, confirming
that `HARDENED-GREEN-002` is current, the two earlier GREEN runs are
historical/superseded, and the PIX runner timeout remains disclosed. This is
recorded as
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-REVIEW-002`.

The critical-process manifest regression reached the new child-process entry
and passed it, and the preceding six entries passed, but the existing
`pix-provider-settlement-sigkill.test.ts` entry stopped at `15/25` with
`spawnSync pnpm ETIMEDOUT`; the runner exited `1` before later entries. The
focused slice therefore remains bounded and does not inherit a full-suite
green claim. Global non-promotion remains open by design; the bounded gate is
reconciled as `PASS_BOUNDED` with the PIX timeout retained as an unrelated
critical-runner residual.

## Evidence

- `apps/api/test-fixtures/inpatient-clinical-financial-process.ts`
- `tests/integration/process/inpatient-clinical-financial-child-process.test.ts`
- `infra/scripts/run-critical-process-suite.mjs`
- `.agent/gates/implementation-ready-CVG-002-clinical-financial-child-process-restart.json`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-RED-001`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-HARDENED-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-HARDENED-GREEN-002`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-EVIDENCE-POINTER-RECONCILIATION-001`
- `.agent/artifacts/CVG-002-clinical-financial-child-process-restart-2026-08-28.md`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-CRITICAL-PROCESS-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-GLOBAL-NON-PROMOTION-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-HYGIENE-002`
- `.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-FINAL-001`

## Non-claims

This is bounded local process evidence, not completion of `CVG-002` or the
ERP. Target runtime RLS/FORCE-RLS, backup/restore and RTO/RPO, Redis failover,
PIX/provider, distributed worker operations, external Vetus acceptance,
accessibility, operational LGPD, remote CI, remaining parity, production and
release acceptance remain open.
