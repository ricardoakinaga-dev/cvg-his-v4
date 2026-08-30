# CVG-003 — closed-encounter triage atomicity

## Bounded outcome

`TriageService.createTriage` now rejects an authorized encounter whose status
is `closed` before patient validation, duplicate detection, repository
persistence or in-memory cache mutation. The existing HTTP route and valid
open-encounter behavior remain unchanged. No migration, provider, target,
production, deployment, release or global parity scope was opened.

## TDD evidence

- RED: `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-RED-001` — module `10/11`; targeted compiled HTTP `0/1`, with the pre-fix request returning `400` after the illegal transition and leaving a speculative triage in the collection.
- GREEN: `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-GREEN-001` — module `11/11`; targeted compiled HTTP `1/1`, returning `409 CONFLICT` with an empty triage collection and no `triage_recorded` timeline event.

## Files in scope

- `packages/modules/triage/src/index.ts`
- `packages/modules/triage/src/triage.test.ts`
- `apps/api/src/server.test.ts`
- `.agent/tasks/CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY.md`
- `.agent/gates/implementation-ready-CVG-003-triage-closed-encounter-atomicity.json`
- `.agent/gates/verified-CVG-003-triage-closed-encounter-atomicity.json`
- `.agent/authority.jsonl`, `.agent/backlog.json`, `.agent/state.json`, `.agent/verification.jsonl`, `.agent/execution-log.jsonl`

## Regression and quality

- API/server rail: `520/520` passed.
- Workspace typecheck: `70/70` projects passed.
- Workspace build: `70/70` projects passed.
- Official coverage: `2,178` passed, `1` skipped; `80.18%` statements/lines, `80.73%` branches, `86.66%` functions.
- Targeted triage/API lint, secret scan, OpenAPI (`354` paths, `40` tags, `413` schemas), migration-source, RLS (`165/166` tenant tables plus one documented exception), namespace and diff checks: passed.
- Full workspace lint remains non-zero only for the unrelated pre-existing `packages/contracts/src/counterSales.ts:38,77` `no-control-regex` findings.

Evidence: `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-REGRESSION-001` and `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-QUALITY-001`.

## Review and promotion boundary

The specialized reviewer could not start because its fixed model is not
supported by this account. A compatible fallback reviewer timed out in two
bounded windows and was shut down while still running. No approval is
inferred. This slice is therefore `PASS_BOUNDED` with medium confidence and
high residual risk; higher-confidence use or scope expansion requires a fresh
compatible independent review.

Global status remains `IN_PROGRESS/PARTIAL`: Vetus evidence `100/100` with
`4/11` areas functionally verified, clinical parity `2/3`, and enterprise
readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`). Promotion remains
`BLOCKED`.

Evidence: `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-REVIEW-001` and `.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-GLOBAL-NON-PROMOTION-001`.
