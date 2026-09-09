# ExecPlan — External Assurance Closure (2026-09-09)

## Purpose

Execute the new external-assurance closure prompt in
`docs/triple-a/MASTER_PROMPT_EXTERNAL_CLOSURE.md` against the existing modular
monolith. Preserve the canonical API/SPA/worker topology, produce evidence
bound to the final candidate SHA, and fail closed whenever runtime, external,
target, or human proof is unavailable.

## Reconciled starting point

- Historical prompt and frozen quality bar remain immutable:
  `docs/triple-a/MASTER_PROMPT.md` and `docs/triple-a/QUALITY_BAR_V1.json`.
- New prompt is byte-identical to the supplied attachment;
  SHA-256 `d89a249f9b0b13e0da6fb9e4ee3c0e4728c11760fd435d325d48a9b8d1b5ed59`.
- Fresh baseline observed `b5ac8bf994000994a8bbcc7208433772122fa3db`.
- Workflow-context repair was committed and pushed as
  `0e8fd5d1325c419eaffedc98cfa1952c5b2779a5`; remote CI observation is pending.
- Initial strict local gate remains historical evidence only:
  `BLOCKED`, score 38, critical 25, open P0 21.
- Branch protection is not observable without authenticated owner/admin access.

## Operating protocol

The lead owns all writes and integration. Read-only scouts/critics use fresh
context, no descendant spawning, sealed task packets, and return exact paths,
commands, evidence and limitations. Every material change follows:

`BUILD → focused verification → fresh critique → FIX → regression → integrate`.

Generated evidence is SHA-bound, timestamped, environment-labelled and ignored
unless intentionally versioned as a small contract. Historical evidence never
becomes current proof by citation alone.

## Workstreams and order

1. Baseline and prompt persistence; reconcile `.agent` state/backlog/ledgers.
2. Green Main: repair workflow planning, observe a fresh remote run, add an
   aggregate release-ready contract, and document exact required job names.
3. Branch governance: add policy/evidence contract; authenticate only if the
   owner supplies authority, otherwise keep `BLOCKED / NOT PROVEN`.
4. Clinical workflow runtime: disposable PostgreSQL integration, RLS/role
   probes, concurrency, lease/fencing, crash recovery and idempotency matrix.
5. Clinical assurance: critical path E2E, negative paths, safety invariants,
   audit immutability, event/timeline governance and API authorization.
6. UX assurance: current-SHA browser runs, private-route evidence, responsive,
   accessibility and visual QA; no visual PASS without an inspected artifact.
7. Operations: performance/load/worker backlog, soak where time/target permit,
   backup/restore/corruption/RPO-RTO and disposable game-day lanes.
8. Supply chain/release: scan/manifest/attestation/deploy rehearsal contracts;
   never claim registry/target proof without external outputs.
9. Gate and critics: strengthen the strict release gate, produce final evidence
   package and report, then run fresh security/clinical/operations/UX critics.

## Safety and authority boundaries

No production deploy, branch-rule mutation, real PHI/provider/PIX/webhook use,
destructive shared-infrastructure drill, secret rotation, or final release
approval is implied. Such work requires an explicit `.agent/authority.jsonl`
record and an approved target. Disposable local resources may be used only with
explicit isolation and cleanup.

## Acceptance

The claim `TRIPLE-A VERIFIED` is legal only when the strict gate records the
exact final SHA, `score >= 97`, `critical_score >= 95`, `open_p0 == 0`, main and
required checks are green, all external artifacts are independently verified,
and the release authority is represented. Otherwise the honest terminal state
is `BLOCKED / NOT PROVEN`, with every missing proof listed.

## Recovery checkpoint

After any interruption, read in order: `.agent/state.json`, this plan,
`.agent/backlog.json`, the append-only execution/verification ledgers, the
fresh baseline, and the current strict-gate artifact. Recompute `git status`,
`git rev-parse HEAD`, and prompt SHA before resuming. Never trust an old
candidate identity or silently rewrite a prior outcome.
