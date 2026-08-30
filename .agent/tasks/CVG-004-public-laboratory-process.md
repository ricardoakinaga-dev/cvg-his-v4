# CVG-004 — public laboratory structured-results process

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and direct process verification
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-PUBLIC-LABORATORY-PROCESS-IR-001`

## Problem

The laboratory module, persistence migration, route contract and analytical SPA
surfaces already have focused evidence for structured result values. The
remaining local evidence gap is one behavior-level composition proof: an
authenticated public request must create and advance a real laboratory order
through PostgreSQL, persist structured analytical values with a server-derived
professional signature, expose those values through the specialized result
read/search surface, preserve idempotency, and clear them on recollection.

## Frozen contract

1. A disposable PostgreSQL fixture runs the real API against a generated
   login-capable role that is non-superuser, non-`BYPASSRLS`, non-inheriting,
   non-replicating and unable to create roles/databases. The fixture seeds two
   accounts, an admin user for each account, and an enabled professional/staff
   principal for the laboratory signer.
2. The test calls authenticated `POST /laboratory/orders` for account A. It
   must observe the real account-scoped order response and must not seed the
   diagnostic order through the service or database as the behavior under test.
3. The test advances the order through `collected`, `in_analysis` and
   `reported` using the public result endpoint and printable idempotency keys.
   The reported payload contains structured values such as ALT, U/L and a
   reference range. The API must reject forged signer/signature fields and the
   stored result must identify the authenticated enabled staff user.
4. Replaying the reported request with the same idempotency key must not append
   another workflow event or duplicate the structured result. Account-scoped
   `GET /laboratory/biochemistry?body=ALT` and `GET /laboratory/results?body=ALT`
   must return the released order with the structured value intact.
5. A public recollection request must create the next collection attempt,
   preserve the recollection reason and clear the old analytical values. A
   fresh account-B read must not see account-A's order or result.
6. This slice proves only the local public API-to-PostgreSQL laboratory path.
   External provider/homologation, Live Lab connectors, target behavior,
   production, deployment, import reconciliation, migration changes, release
   acceptance and global parity closure remain excluded.

## TDD acceptance

### RED

- The new process contract is written before any implementation or evidence
  update and must fail if the public route, restricted principal, workflow,
  result projection, idempotency or recollection boundary is absent.
- A fixture-only failure must be recorded as such and must not be described as
  a product RED.

### GREEN

- The real authenticated public API creates the order and persists the full
  lifecycle through PostgreSQL under the restricted API role.
- Structured values, server-generated signer identity, replay idempotency,
  specialized search/projection, recollection clearing and account isolation
  pass in one focused process test.
- Existing diagnostics/API, migration-source, OpenAPI, security and typecheck
  controls remain green.

## Bounded result

The contract passed 1/1 on three fresh disposable PostgreSQL databases,
including a runner-equivalent invocation with no cache and no file
parallelism. The API and companion worker roles passed explicit
`pg_roles` restrictions. The real authenticated API created the BIO order;
the public lifecycle persisted `collected`, `in_analysis`, `reported` and
`recollected`; ALT structured values were projected through both specialized
and generic result reads; the forged signer was rejected; the replay added no
second report event; recollection moved to attempt 2 and cleared result and
signature fields; and the second account saw no foreign result and received
an opaque 404 for the foreign order.

No production source change was necessary: the first RED-first execution
passed because the existing implementation already met the contract. This is
recorded as `BASELINE_PASS_NO_PRODUCT_RED`, not as an invented RED/GREEN
implementation cycle. The bounded local result is `PASS_BOUNDED` only.

Diagnostics/API/SPA regressions and typechecks remained green, the full API
suite passed 378/378, the critical process manifest now contains 9 serial
entries, and the Vetus contract records the process evidence. The independent
review attempt timed out and was shut down; no reviewer PASS is inferred.

The global gates remain open: general Vetus parity 98/100 with 4/11 verified,
clinical parity 100/100 with 2/3 verified, and enterprise readiness 95/100
with 42 PASS, 3 WARN and 1 FAIL.

## Review and non-claims

Independent reviewer availability may be limited; an unavailable reviewer is
recorded as a limitation, never inferred as approval. This task does not claim
external laboratory parity or full clinical/release readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-public-laboratory-process.json`
- `tests/integration/process/public-laboratory-structured-results.test.ts`
- `.agent/artifacts/CVG-004-public-laboratory-process-2026-08-26.md`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-LABORATORY-PROCESS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-LABORATORY-PROCESS-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-LABORATORY-PROCESS-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-LABORATORY-PROCESS-MANIFEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-LABORATORY-PROCESS-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-LABORATORY-PROCESS-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-PUBLIC-LABORATORY-PROCESS-FINAL-001`
