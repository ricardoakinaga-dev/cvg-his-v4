# CVG-004 — public API to durable outbox to real worker chain

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and direct process verification
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-IR-001`

## Problem

The API already publishes `billing.record.created` into the durable outbox and
the worker already registers the `payments`, `billing` and `webhooks` domain
consumers. Existing evidence proves those pieces separately or uses synthetic
events; it does not prove the public authenticated HTTP mutation, persisted
outbox row, independent worker process, durable consumer guard and restart/
idempotency behavior as one chain.

## Frozen contract

1. A disposable PostgreSQL fixture runs the API with a restricted
   non-superuser/non-`BYPASSRLS` role and calls the real authenticated
   `POST /billing/estimate` endpoint. The billing record and request identity
   are persisted through the public route; the test does not insert the target
   outbox event directly.
2. The public mutation creates exactly one account-scoped
   `billing.record.created` outbox event with canonical account metadata and a
   correlation id. The event is initially pending and is inspected only with
   account-scoped database reads.
3. A real `apps/worker/src/index.ts` child process runs against the same
   disposable database under a separate restricted worker role. Its health
   boundary must report the required `payments`, `billing` and `webhooks`
   consumers, durable consumer guard readiness and database persistence.
4. The worker consumes the event through the real event-bus loop. The outbox
   reaches `completed`, the durable inbox contains one claim per registered
   consumer, and a subsequent tick/restart does not duplicate those inbox
   claims or the billing record.
5. The assertions remain account-scoped and verify that no second fixture
   account receives or processes the event. Retry/DLQ mechanics remain covered
   by existing event-bus tests; this slice proves the successful public chain
   and restart/idempotency boundary.
6. No provider, credential, target, production, deployment, migration,
   external webhook delivery or long-lived missing-consumer policy change is
   authorized. A controlled local worker process and disposable PostgreSQL are
   the only runtime boundaries.

## TDD acceptance

### RED

- The new process test must fail before implementation/fixture completion if
  the public API-to-worker chain contract is not wired as asserted.
- The test must reject synthetic direct outbox insertion as its source and
  require the authenticated HTTP route, persisted pending event and real
  worker process.

### GREEN

- API, database and worker roles are restricted and account-scoped.
- The public billing mutation, outbox row, worker health contract, completed
  event and three durable inbox claims are observed in one process test.
- Worker restart preserves completion and does not duplicate consumer claims.
- Existing event-bus, API, worker, RLS and process suites remain green.

The bounded process checkpoint passed twice on fresh ephemeral PostgreSQL
databases. The final formatted run passed 1/1 test: the authenticated API
mutation persisted one pending account-scoped `billing.record.created` event;
the restricted real worker reported all three consumers and durable guards,
completed the event with one inbox claim per consumer, and after restart the
outbox, inbox and billing-record counts remained `completed`, `3`, `1` and `1`.
The second fixture account received zero matching events. Runtime role flags
were asserted as login-capable but non-superuser, non-`BYPASSRLS`, non-inheriting,
non-replication and unable to create roles/databases.

The first attempted run failed only because the test helper queried a freshly
generated placeholder UUID instead of the persisted event ID. That is recorded
as `FAIL_FIXTURE_HARNESS`; it is not a product RED result and no product source
change was inferred from it. The corrected and formatted reruns are the
bounded GREEN/process evidence.

## Review and non-claims

This is a local proof of one existing billing event path, not complete
distributed-worker certification. It does not prove external providers,
cross-region delivery, target deployment, two-tenant production operations,
every event type, retry/DLQ failure injection, Live Pet/Lab connectors or full
Vetus integrations parity. The independent reviewer may be unavailable; if so,
the limitation must be recorded rather than treated as approval.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-public-worker-event-chain.json`
- `.agent/artifacts/CVG-004-public-worker-event-chain-2026-08-26.md`
- `tests/integration/process/public-api-worker-event-chain.test.ts`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-PROCESS-002`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-WORKER-EVENT-CHAIN-FINAL-001`
