# CVG-003 — reject triage creation for closed encounters before mutation

**Status:** `COMPLETE_BOUNDED`; parent CVG-003/global ERP remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `CLOSE` / `RECONCILED`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-003 behavioral verification spine
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical data integrity
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-IR-001`

## Residual problem

`TriageService.createTriage` validates account ownership and duplicate state,
then persists and caches a new triage without rejecting a closed encounter.
The HTTP route subsequently appends a timeline event and attempts the
encounter destination transition; a closed encounter has no legal transition.
In an in-memory or partially transactional runtime this can leave a phantom
triage in the process cache after the request fails, and a retry can be
incorrectly rejected as a duplicate.

## Frozen bounded contract

1. `TriageService.createTriage` rejects an authorized closed encounter with
   the existing sanitized `ConflictError` convention before repository writes
   or cache mutation.
2. The check occurs after the encounter account boundary is established and
   before duplicate detection, record construction, persistence or cache
   mutation. Foreign encounters remain opaque `NotFoundError` results.
3. The existing HTTP route, response envelope, audit behavior for successful
   creation, encounter transitions and tenant transaction runner remain
   unchanged for valid open encounters.
4. A focused HTTP regression proves a closed-encounter POST fails without a
   triage collection entry or `triage_recorded` timeline residue. A module
   regression proves the repository is not called and the local cache remains
   empty.
5. No migration, schema/RLS redesign, provider, target, production,
   deployment, release or global parity change is authorized by this slice.

## TDD acceptance

### RED

- The module regression fails before the correction because a closed encounter
  is accepted and the repository/cache are mutated.
- The HTTP regression fails before the correction because the route reaches the
  illegal closed-encounter transition after creating triage state.

Captured in `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-RED-001`:
the module failed `10/11`, and the targeted compiled server regression failed
`0/1` after observing the speculative triage in the collection.

### GREEN

- The service rejects closed encounters before persistence and cache mutation.
- The HTTP request returns the existing conflict response and subsequent list
  and timeline reads contain no speculative triage artifacts.
- Valid open/reception/in-triage creation behavior remains unchanged.

Captured in `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-GREEN-001`:
the module suite passed `11/11`, and the targeted compiled HTTP regression passed
`1/1` with `409 CONFLICT`, an empty triage list and no `triage_recorded`
timeline event after explicit module/API rebuilds.

### REGRESSION

- Triage module, focused API/server, complete API, workspace typecheck/build,
  official coverage and targeted static/security checks pass.
- Parent CVG-003, clinical/Vetus parity, target RLS/roles, providers,
  accessibility, operations, remote CI and release acceptance remain open.

Captured in `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-REGRESSION-001`
and `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-QUALITY-001`:
API `520/520`, workspace typecheck/build `70/70`, official coverage
`2,178 passed / 1 skipped` at `80.18%` statements/lines, `80.73%` branches
and `86.66%` functions. The unrelated full-lint baseline remains explicit.

## Review boundary

The implementation is limited to the closed-encounter creation precondition
and its direct service/HTTP regressions. A fresh compatible independent review
must inspect the final diff, failure ordering and no-residue evidence before
higher-confidence use; unavailable review is recorded as a limitation, never
as approval.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-003-triage-closed-encounter-atomicity.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-003-triage-closed-encounter-atomicity.json`

## Bounded closure

The verified bounded gate is `PASS_BOUNDED` / `COMPLETE_BOUNDED` with medium
confidence and high residual risk. The independent review criterion remains
conditional because the compatible reviewer was unavailable; no approval is
inferred. Global ERP remains `IN_PROGRESS/PARTIAL` and promotion remains
`BLOCKED`.

Final evidence: `.agent/gates/verified-CVG-003-triage-closed-encounter-atomicity.json`,
`.agent/artifacts/CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-2026-08-30.md`.
