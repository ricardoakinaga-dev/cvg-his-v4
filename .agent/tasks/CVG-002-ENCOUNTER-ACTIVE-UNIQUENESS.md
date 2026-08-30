# CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS — Enforce one active encounter per patient

## Contract

- Status: `PASS_BOUNDED`; stage `VERIFY` / activity `RECONCILE`.
- Parent: `CVG-002`; priority `P0`; tier `T4_CRITICAL`; risk `CRITICAL`; blast radius `CROSS_SYSTEM`.
- Owner: root integrator. A worker cannot approve its own implementation.
- Authority: `.agent/authority.jsonl#AUTH-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS-IR-001`.
- Implementation-ready gate: `.agent/gates/implementation-ready-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.json`.

## Problem

`EncountersService.openEncounter()` rejects duplicates only from its process-local
map. Two API replicas can therefore both pass the check and enqueue inserts for
the same `(account_id, patient_id)`. The canonical `encounters` table has no
database invariant for this clinical rule, and reopening a closed encounter is
also unprotected against a concurrent open encounter.

## Frozen bounded scope

1. Add one canonical, additive `packages/db` migration. Before creating the
   index, fail closed if any account has more than one non-closed encounter for
   a patient. Do not delete, close, merge, or otherwise rewrite existing rows.
2. Enforce a partial unique index on `(account_id, patient_id)` for every
   `status <> 'closed'` row. The invariant must remain tenant-scoped and allow
   a new encounter after the previous one is closed.
3. Translate only the named PostgreSQL unique-violation constraint into the
   existing `ConflictError('Patient already has an active encounter', ...)`.
   Preserve unrelated database errors and tenant checks.
4. Add RED/GREEN unit and disposable-PostgreSQL integration evidence using two
   independent database-backed runtimes, including a concurrent open race,
   account-scoped patient records, close-then-open, and reopen conflict. The
   existing composite patient/account foreign-key model intentionally rejects
   reusing one global patient UUID across accounts; the invariant itself remains
   keyed by `(account_id, patient_id)`.
5. Keep API behavior fail-closed and stable at HTTP 409 through the existing
   error envelope; no provider, target, production, deployment, credential,
   external mutation, or release claim is included.

## Acceptance criteria

- The migration source is ordered, checksums clean, additive, and refuses to
  apply when pre-existing active duplicates require human remediation.
- Exactly one concurrent insert wins for a patient in an account; the loser is
  a domain conflict and its speculative in-memory encounter is rolled back.
- Separate patient records in two accounts remain independently eligible for an
  active encounter; the same global patient UUID cannot cross the existing
  composite tenant foreign-key boundary.
- A closed encounter releases the invariant; reopening cannot create a second
  active encounter.
- Focused module/repository tests, fresh disposable PostgreSQL integration,
  workspace typecheck/build, official coverage, migration/RLS/security/static
  checks, independent read-only review, and global non-promotion retests are
  recorded before bounded reconciliation.

## Risks and exclusions

- Migration application is intentionally blocked by unresolved historical
  duplicates; production remediation requires a separate human-approved task.
- The local process map remains an optimization, not the authority. PostgreSQL
  is the authority for concurrent persistence.
- This slice does not claim full encounter transaction atomicity, distributed
  cache invalidation, target-role behavior, or global ERP/Vetus readiness.

## Next action

Revalidate the bounded gate before changing encounter status semantics,
patient/account foreign keys, queue association ordering, repository error
mapping, target role/RLS configuration, or any production/deployment/release
surface. Keep parent `CVG-002` and the global program `IN_PROGRESS/PARTIAL`.

## Post-review hardening and evidence — 2026-08-27

The intentional RED was preserved in the ledger, then the minimal bounded
implementation reached GREEN. Migration `0151` performs a fail-closed
historical-duplicate preflight, validates any existing same-name index for
uniqueness, key order, predicate, `indisvalid` and `indisready`, and creates
the canonical partial unique index. The database repository maps only the
named `23505` violation for create, update and reopen; unrelated errors remain
unchanged. The local active preflight is account-scoped, reopen restores its
prior timeline on persistence failure, and the API restores queue state when
authoritative persistence or attachment fails.

Fresh evidence passed repository unit `5/5`, disposable PostgreSQL integration
`7/7`, encounters module `32/32`, database package `22/22`, compiled API
`410/410`, full workspace `pnpm test`, build, typecheck, official coverage at
80.45% statements/lines, 80.20% branches and 87.75% functions, plus security,
migration, RLS, OpenAPI, deploy-surface, Helm-static and diff-hygiene rails.
The database proof includes independent concurrent inserts, close/reopen,
account-scoped records, committed migration rerun, incompatible index refusal,
forced-RLS visibility and HTTP 409 mapping with queue rollback.

Lovelace's independent read-only review found no Critical or High issue. Its
Medium findings on index validity, queue cache rollback and database-origin
HTTP evidence were remediated. A separate reviewer-role attempt was
unavailable because of account model policy and is not treated as approval.
The bounded result is documented in
`.agent/artifacts/CVG-002-encounter-active-uniqueness-2026-08-27.md` and
`.agent/gates/verified-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.json`.

Residual risk remains `HIGH`: historical duplicates still require an approved
human remediation, the existing composite patient/account foreign key
prevents reusing one global patient UUID across accounts, and target,
provider, distributed-runtime, remote-CI, accessibility, operations and
release evidence remain outside this bounded gate. Global metrics remain
general parity `98/100` (`4/11`), clinical parity `100/100` (`2/3`) and
enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`).
