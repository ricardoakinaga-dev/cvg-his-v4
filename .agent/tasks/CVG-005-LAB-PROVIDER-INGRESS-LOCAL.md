# CVG-005 — local hardening of laboratory provider result ingress

**Status:** `PASS_BOUNDED`; parent CVG-005 remains `IN_PROGRESS`.
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`.
**Owner:** root integrator with TDD, security checks and independent review.
**Parent:** CVG-005 external provider chains.
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`.
**Authority:** `.agent/authority.jsonl#AUTH-CVG-005-LAB-PROVIDER-INGRESS-LOCAL-IR-001`.

## Objective

Harden the existing equipment-result HTTP ingress so a locally configured
provider can submit an authenticated, versioned result that is durably and
atomically recorded for human review without mutating the clinical order or
claiming that an external provider is homologated.

## Frozen contract

1. The existing `POST
   /integrations/laboratory/equipment-results/imports` path remains the
   ingress boundary. It requires the dedicated API-key permission
   `laboratory.results.write` and the exact `application/json` content type.
2. The body is a strict object with exactly these string fields:
   `schemaVersion: "1"`, `provider: "equipment-bridge"`, `externalResultId`,
   `orderId`, `equipmentId`, `resultSummary` and canonical UTC `observedAt`.
   Unknown fields, duplicate fields, malformed UTF-8/JSON, non-canonical
   timestamps and unsafe lengths fail closed.
3. The request also requires one each of `x-lab-provider-key-id`,
   `x-lab-timestamp` (ten-digit Unix seconds) and `x-lab-signature`
   (`v1=<64 lowercase hex>`). The signature is HMAC-SHA-256 over
   `v1.<timestamp>.<raw-body>`, with an account-bound operator keyring and a
   five-minute freshness window. Missing or duplicate security headers are
   rejected before persistence.
4. A configured verifier and the durable database ledger are both required;
   the server returns unavailable/fails closed when either is absent. An
   in-memory repository is never an accepted production ingress store.
5. The ledger is tenant-scoped and records the provider, schema version,
   signature key id, canonical payload fingerprint, observed time and the
   original correlation fields. A first accepted event is
   `pending_human_review` and returns `202`; it never calls
   `recordResultAndPersist`, never changes the diagnostic order and never
   invents a collector/releaser/signer.
6. The database primary key `(account_id, external_result_id)` is the atomic
   replay boundary. The same account/provider/fingerprint/correlation is a
   replay and returns the committed record with `replayed: true` (`200`),
   without mutation. A different payload/provider/correlation for the same
   account and external id is a stable `409` conflict. Concurrent submissions
   use the database conflict boundary, not only a process-local lock.
7. Accepted and replayed events use awaited, redacted audit entries. Audit
   metadata contains only provider/schema/status/replay and the SHA-256
   fingerprint; it never contains result text, order ids, equipment ids,
   external ids, signatures or key material. The report exposes the new
   pending-review count while preserving historical imported/failed rows.
8. The existing retry endpoint may read a tenant-local record but must not
   auto-release or auto-sign a clinical order. Pending/imported records replay
   safely; failed legacy records return a stable human-review conflict.

## TDD acceptance

### RED

- New provider-payload/verifier tests fail before the strict parser, HMAC
  verifier and canonical fingerprint exist.
- Route tests fail before the signed contract, dedicated permission,
  durable-store gate, pending-review status and replay/conflict behavior are
  implemented.
- Repository tests fail before the atomic provider-ingress method and ledger
  columns/migration exist.

### GREEN

- Strict raw-body parsing rejects duplicate/unknown/non-string fields,
  non-canonical dates, stale/future headers, bad signatures and cross-account
  key use.
- In-memory tests prove the same atomic decision surface used by the database;
  disposable PostgreSQL proves two-account RLS, concurrent same-key replay,
  conflict without mutation and durable pending-review rows.
- The route proves the old unsigned/legacy payload is not accepted, valid
  ingress does not call the clinical mutator, awaited audit is redacted and
  production-like server wiring fails closed without durable storage/keyring.

## Regression and review

- API route/server/config tests, repository tests, migration/RLS checks and
  the bounded workspace build/typecheck/lint gates are green. The focused API
  suite passed 474/474; the isolated PostgreSQL setup/laboratory/runtime-ACL
  slice passed 15/15; aggregate coverage passed 80.16% statements, 81.08%
  branches and 88.31% functions.
- OpenAPI, secret/dependency scan, diff/index hygiene and global
  `vetus:parity`, `vetus:clinical-parity` and readiness retests are recorded
  without global promotion.
- The first independent review found two issues: clean-install permission
  catalog drift and runtime DELETE/TRUNCATE privilege on the ledger. Both were
  corrected and covered by the real first-run catalog test plus serial
  PostgreSQL runtime-ACL evidence. A fresh read-only review of those corrections
  is recorded separately before this gate is treated as independently approved.

## Verification evidence — 2026-08-29

- RED/GREEN implementation evidence is complete for the strict parser/verifier,
  route, durable atomic repository, migration/RLS, startup/config wiring and
  no-clinical-mutation boundary.
- `pnpm --filter @cvg-his-v2/api test` passed `474/474`, including the clean
  first-run permission-catalog regression and raw HTTP signed-body test.
- Serial disposable PostgreSQL verification passed `3 files / 15 tests`:
  installation-state permission provisioning, laboratory ingress concurrency /
  tenant isolation / immutability, and runtime-role ACL reconciliation.
- `pnpm test:coverage` passed with aggregate `80.16%` statements, `81.08%`
  branches and `88.31%` functions. `pnpm typecheck`, `pnpm lint` and `pnpm
  build` passed across the workspace; existing Vite dynamic-import notices are
  non-blocking.
- OpenAPI (`348` paths, `40` tags, `405` schemas), secrets/dependency audit,
  RLS validation (`163/164`, one documented exception), migration-source,
  deploy-surface and `vetus:parity:test` all passed.
- Fresh global retests remain intentionally non-promoting: general parity
  exited `1` at `4/11`, clinical parity exited `1` at `2/3`, and enterprise
  readiness exited `1` at `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) because
  external provider/target/homologation evidence is still absent.
- A pre-fix recursive `pnpm test` run was interrupted with exit `130` after
  concurrent database suites saturated local resources; it is not reported as
  a pass or as a code-quality failure. The serial PostgreSQL and full API
  evidence above are the accepted bounded regression evidence.

## Bounded closure

This task closes as `PASS_BOUNDED` only for the repository-local authenticated
equipment-result ingress and its durable pending-human-review ledger. It does
not close parent CVG-005, global ERP parity or release readiness. The next
step is fresh scouting under a new authority; provider homologation,
credentials, target, production and release work remain explicitly open.

## Explicit exclusions and non-claims

This authority excludes Live Lab/provider selection or homologation, external
credentials and target configuration, outbound provider calls, result mapping
to analyzer-specific parameters, attachment/HL7/ASTM transport, clinical
review UI, automatic collection/release/signature, production deployment,
backfill, distributed target certification, backup/restore, accessibility,
LGPD acceptance, complete Vetus parity and release approval. Local HMAC tests
are protocol evidence only and do not prove a real provider contract.

## Revalidation triggers

Revalidate before changing the payload fields or signing scheme, accepting
another provider, writing diagnostic orders/workflows, adding clinical review
automation, replacing the ledger key, introducing external credentials or
claiming provider/target/production/homologation readiness.
