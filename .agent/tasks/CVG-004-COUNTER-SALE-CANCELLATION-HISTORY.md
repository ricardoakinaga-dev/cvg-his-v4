# CVG-004 — durable counter-sale cancellation provenance

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with TDD and security review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / counter-sale state, audit and reports
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-COUNTER-SALE-CANCELLATION-HISTORY-IR-001`

## Objective

Make new counter-sale cancellations auditable and durable. The current flow
changes only `counter_sales.status`, then fires a best-effort audit write after
the command. A current cancelled-sales snapshot therefore cannot prove who
cancelled a sale, why or when, and a failure after the status update can leave
the state and audit trail inconsistent.

## Frozen bounded contract

1. Scope only `POST /counter-sales/{counterSaleId}/cancel`. The request body is
   exactly `{ "reason": string }`; the reason is trimmed, required, free of
   control characters, and capped at 500 characters. The authenticated
   principal supplies the actor; the client cannot supply actor or account.
2. The database path must execute inside the existing tenant unit of work. It
   locks the tenant-scoped sale row, accepts only an open sale, updates the
   status with an explicit `account_id` predicate and verified row count, and
   persists one `audit_events` row in the same transaction. The event uses
   `entity_type = counter-sale`, `action = cancelled`, principal actor,
   correlation id, validated reason, and safe before/after status snapshots.
3. A repeated cancellation is idempotent at the command boundary: a completed
   idempotency-key replay returns the stored response without another event;
   an already-cancelled sale does not create a second provenance event. Closed
   sales remain rejected. Concurrent callers cannot both transition an open
   sale or append duplicate history.
4. Expose a tenant-scoped `cancellationHistory` collection on the existing
   counter-sale detail response, ordered newest first, sourced from committed
   `audit_events` rows. Local/test in-memory mode keeps an explicit immutable
   history double. Existing cancelled-sales snapshot semantics remain based on
   the current status/opening date and are not relabelled as cancellation time.
5. The service refreshes the authoritative sale before the transition so a
   process with a stale or empty projection cannot cancel a different tenant's
   row. Database repository updates and history reads include account scope;
   cross-tenant IDs fail closed without disclosing existence.
6. Keep the existing API/SPA surface compatible except for the required
   cancellation reason: the two sales workbenches collect a reason before
   issuing the command. No historical backfill is attempted; old cancelled
   rows remain without fabricated provenance.

## Explicit non-scope

This task does not redesign audit storage or global ABAC, add fiscal/invoice
semantics, change payments/refunds/chargebacks, reopen/close workflows,
external providers, target deployment, production rollout, FIDO2, global ERP
parity, backfill or release acceptance. Tamper-evident/legal retention of
`audit_events` remains a separate residual if required by deployment policy.

## TDD acceptance

### RED

- Service tests fail until cancellation requires a validated reason for the
  bounded input, records in-memory history, avoids duplicate history and
  restores its projection when the transaction/audit callback fails.
- Route tests fail until the request rejects missing/unknown/oversized/control
  character reasons, passes principal actor plus reason into the command,
  avoids the post-command fire-and-forget audit path and returns history on
  detail reads.
- Repository/integration tests fail until the update is account-scoped and
  the committed status transition and `audit_events` row are atomic, durable
  across repository/runtime instances, concurrency-safe and RLS-isolated.
- Contract/OpenAPI and SPA tests fail until the reason body and returned
  `cancellationHistory` are documented and both workbenches send a user reason.

### GREEN

- Counter-sales module tests prove reason validation, immutable history,
  closed/already-cancelled behavior and rollback restoration.
- API route tests prove actor/account are principal-derived, audit is inside
  the command boundary, invalid bodies fail before mutation and detail history
  is tenant-scoped.
- Disposable PostgreSQL tests prove row locking, account-scoped row counts,
  one audit event with actor/reason/before/after/correlation, rollback when
  audit persistence fails, repository-instance durability, concurrent
  cancellation and cross-account exclusion under a restricted role.
- Contract/OpenAPI and focused SPA tests prove the required reason is sent and
  the snapshot report remains unchanged.

### REGRESSION

- Module/API/SPA builds, focused tests, full API/workspace tests and official
  coverage remain green at or above 80%.
- OpenAPI, RLS, migration-source, secret, formatting, typecheck and diff
  hygiene validators remain green. No migration is expected for this slice;
  the existing `audit_events` and `counter_sales` schema are reused.
- Global Vetus/clinical parity, target operations, providers, accessibility,
  LGPD operations, remote CI, backup/restore and release gates remain open;
  global ERP stays `IN_PROGRESS/PARTIAL` and promotion stays `BLOCKED`.

## Evidence and review boundary

Fresh independent scouts converged on this P1 residual after excluding all
`VERIFIED_BOUNDED` work. The implementation-ready gate freezes the route,
service/repository transaction seam, audit provenance and detail-history
contract. A fresh independent review must inspect the final diff and all
atomicity/isolation evidence before local closure as `PASS_BOUNDED`.

## Implementation and review closure — 2026-08-29

The bounded implementation is complete. The service now validates and trims
the reason, derives account/actor/correlation from the authenticated command,
refreshes the authoritative sale inside the transaction, restores its
projection on failure, and records an immutable in-memory history double only
after the audit callback succeeds. The database repository uses tenant-scoped
`FOR UPDATE`, account-scoped update plus row-count verification, and reads
committed `action = cancelled` audit events newest first. The runtime appends
the actor/reason/before/after/correlation audit event in the same tenant
transaction, including the non-idempotent transaction fallback. The route,
OpenAPI contract and both SPA sales workbenches now require/send the reason;
detail reads use an account-scoped cold-projection path and expose history.

The first independent review returned `REQUEST_CHANGES`; its P1/P2 findings
were corrected and covered by focused or PostgreSQL regression tests,
including control-character rejection, runtime fallback without the
idempotency UoW, cold projection routing, in-memory rollback, account-scoped
locking, distinct-key concurrency, the required idempotency header and
per-event audit persistence failure isolation. A fresh final read-only review
was attempted after those fixes, but timed out twice and was closed without a
verdict; no reviewer approval is inferred. The direct post-fix regression
evidence is therefore the closure basis with medium confidence, while all
production and global ERP boundaries remain explicit.

## Decision

`COMPLETE_BOUNDED` under
`.agent/gates/verified-CVG-004-counter-sale-cancellation-history.json`.
Keep old cancellations unbackfilled, do not infer cancellation facts from
`updatedAt`, and do not promote the parent CVG-004 or global ERP.
