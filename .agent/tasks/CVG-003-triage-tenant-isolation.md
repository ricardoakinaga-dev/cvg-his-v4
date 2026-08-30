# CVG-003 — triage collection, history and update tenant isolation

**Status:** `PASS_BOUNDED` — bounded implementation and independent review complete
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and security review
**Parent:** CVG-003 behavioral verification spine
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical cross-tenant read and update
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-TRIAGE-TENANT-ISOLATION-IR-001`

## Problem

`TriageService` hydrates account records and version history into process-wide
maps, but its public list, detail, history and update methods do not require an
account. The HTTP route performs a filter after reading the collection, and an
explicit empty `encounterId` query is treated like no filter. The repository
also exposes optional account arguments that can select all triage rows.

## Frozen bounded contract

1. Triage hydration and repository account collection queries require a valid
   `AccountId` and fail closed when runtime context is missing.
2. `list`, `getOrThrow`, `listVersions` and `updateTriage` require the
   authenticated account; records and versions from another account are not
   returned or mutated.
3. `GET /triage?encounterId=...` forwards the principal account, and an
   explicit empty filter is rejected rather than broadening to all records.
4. Unit and HTTP-shaped/server regressions cover two accounts sharing clinical
   identifiers, hydrated history, cross-account detail/update denial and empty
   query rejection.
5. Preserve the existing Vue/PostgreSQL monolith. No migration, provider,
   credential, target, production, deployment, external-mutation or release
   claim is included.

## TDD acceptance

### RED

- A service regression fails before the fix because a caller without account
  context can list or resolve another account's hydrated triage record/history.
- A route regression fails before the fix because `encounterId=` is treated as
  an unfiltered triage collection.

### GREEN

- Account A receives only account A triage and history for shared identifiers;
  cross-account detail and update operations fail closed.
- Focused module/server or HTTP-shaped regressions, typechecks, formatting and
  lint pass.
- Global security, parity, target, provider and release states remain
  `IN_PROGRESS`/`PARTIAL` or `BLOCKED`.

## Bounded implementation result

The service now validates `AccountId` before hydration, requires it for
collection, detail, history, creation and update, and applies the account
predicate before returning or mutating records. Repository reads and the
`UPDATE` predicate include `account_id`; the authenticated route forwards the
principal account and rejects an explicitly empty `encounterId`.

Fresh final evidence passed the triage module suite `10/10`, the focused service
suite `3/3`, the compiled API suite `405/405`, the PostgreSQL persistence suite
`17/17`, module/API typechecks, Prettier, scoped ESLint and `git diff --check`.
Official repository coverage passed `1,964 tests / 1 skip` at `82.03%` statements,
`80.20%` branches, `88.59%` functions and `82.03%` lines. The global re-audit
remains open at general parity `98/100` with `4/11` verified, clinical parity
`100/100` with `2/3` verified and enterprise readiness `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`).

## Independent review

The fresh read-only review returned `PASS_BOUNDED` with zero Critical or High
findings. It confirmed the account predicates, defensive copies, rollback
behavior, principal-derived HTTP scope, empty-filter rejection, two-account
HTTP fixture and post-persistence POST ordering.

Residual Medium findings are explicitly retained: the repository's `update`
and `createVersion` calls are sequential outside the tenant transaction
wrapper; HTTP evidence uses the local dispatcher plus fake repositories rather
than a TCP target/RLS run; and the aggregate lint command still reports 45
unused-symbol diagnostics in unrelated dirty files. A Low observation remains
that the persisted snapshot mutation probe is not a separate test case. These
do not block the bounded application boundary, but prevent a production or
global readiness claim.

## Explicit non-claims

This slice proves only the local triage service/repository/HTTP application
boundary. It does not certify every clinical route, direct privileged SQL,
target RLS, migration rollout, external providers, accessibility, operations,
Vetus parity or production/release readiness.

## Revalidation triggers

- Any new triage collection, detail, version-history or update path.
- Changes to runtime hydration, tenant context, encounter authorization or
  triage persistence.
- Any expansion to migrations, target, provider, credential, production,
  deployment or release acceptance.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-triage-tenant-isolation.json`
- `.agent/artifacts/CVG-003-triage-tenant-isolation-2026-08-26.md`
- `.agent/gates/verified-CVG-003-triage-tenant-isolation.json`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-TENANT-ISOLATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-TENANT-ISOLATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-TENANT-ISOLATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-TENANT-ISOLATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-TENANT-ISOLATION-FINAL-001`

## Final decision

`PASS_BOUNDED` with residual risk `HIGH`. This closes only the local
triage service/repository/authenticated HTTP boundary. It does not close
CVG-003, other clinical routes, target RLS, providers, accessibility,
operations, Vetus parity, enterprise readiness or release acceptance.
