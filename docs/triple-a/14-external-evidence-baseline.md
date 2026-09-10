# Triple-A External Assurance — Baseline 2026-09-09

**Snapshot histórico:** `2026-09-09T20:48:09-03:00` (America/Sao_Paulo)
**Repository:** `ricardoakinaga-dev/cvg-his-v4`  
**Observed candidate histórico:** `dcb731a196b499db246c5c53884c40547ec9e028`
**Closure prompt:** [`MASTER_PROMPT_EXTERNAL_CLOSURE.md`](./MASTER_PROMPT_EXTERNAL_CLOSURE.md)  
**Closure prompt SHA-256:** `d89a249f9b0b13e0da6fb9e4ee3c0e4728c11760fd435d325d48a9b8d1b5ed59`

This is a fresh external-assurance baseline for the new closure prompt. The
historical [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) and frozen
[`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json) remain unchanged and retain their
original provenance. Evidence from the historical candidate is not reused as
proof for this candidate.

## Current candidate reconciliation — 2026-09-10T00:35:15-03:00

The current candidate is `cd7399f91bf3c3eda53e4598443acdbc9ff6d3b1`, with a
clean worktree and matching `origin/main`. CI run #49 terminated with failures;
therefore `main` is not green. Prior runs #46 through #48 and every artifact
bound to an earlier SHA are historical for this candidate. The local gate is
fresh but returns `PASS_WITH_CONDITIONS`, not release authorization.

## Latest candidate reconciliation — 2026-09-10T08:23:05Z

The latest candidate is `a4a5658aa66200a70be709e986152fe61ffc0fe5`, with a
clean worktree and matching `origin/main`. The candidate contains the Windows
package-manager invocation fix from commit `a4a5658a`; the Linux contract
suite and repository lint were re-run locally with exit 0.

CI run #58 is currently executing for this SHA:
[`34454422885`](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885).
Run #57 was cancelled by GitHub when this newer push superseded it; its
partially executed failures are not evidence for the new candidate. Until run
#58 reaches a terminal green state, `main` remains `NOT GREEN / NOT PROVEN`.

The strict local aggregation was intentionally run with external execution
skipped and returned `BLOCKED`, `score=43`, `critical_score=23`,
`open_p0=27`, `claim=NOT PROVEN`, `publication_allowed=false`. This is a
fail-closed observation, not release authorization.

## Candidate integrity

| Probe | Result | Evidence |
|---|---|---|
| Code candidate SHA | PASS | `cd7399f91bf3c3eda53e4598443acdbc9ff6d3b1` |
| Evidence/control-plane reconciliation | PASS | Files are bound to the candidate and validated by `.agent/verification.jsonl#VER-TRIPLE-A-BASELINE-20260910-CURRENT-CD7399-FINAL`. |
| Local strict release gate | PASS_WITH_CONDITIONS / NOT AUTHORIZED | `TRIPLE_A_RELEASE_EVIDENCE.json`: `score=43`, `critical_score=23`, `open_p0=27`, `publication_allowed=false`. |
| Prompt byte identity | PASS | `cmp` and SHA-256 against the supplied attachment. |

## Remote GitHub state

The repository is public, the default branch is `main`, and Actions is active.
The latest code-candidate push created executable jobs. The public run page was
observed without authenticated logs:

| Workflow | Run | Result | Public evidence |
|---|---:|---|---|
| CI | `34431492523` / run 49 | `FAILURE`; Unit, Performance, Visual, E2E SPA and Windows contract failed; Integration passed | [run](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34431492523) |

The earlier pre-fix run identified a concrete defect, which is now addressed by
the current candidate:

```text
Invalid workflow file: .github/workflows/ci.yml#L1
Unrecognized named-value: 'runner' in jobs.<job>.env at lines 515, 841 and 1065.
```

The terminal run is not green. Public logs are unavailable without
authentication; failed job names and check annotations are recorded in the
current verification record, and must be reproduced before release evaluation.

## Branch governance probe

| Probe | HTTP/result | Classification |
|---|---|---|
| `GET /branches/main/protection` | `401 Requires authentication` | `NOT PROVEN` |
| `GET /rulesets` | `200`, empty public response | `NOT PROVEN`; absence of a visible ruleset is not proof of complete governance. |
| Authenticated owner/admin configuration | Not available in this workspace | `BLOCKED` |

Required checks, review requirements, stale-branch policy, force-push policy,
and bypass ownership therefore remain external obligations. The release gate
must fail closed until an authenticated, SHA-bound governance artifact exists.

## Local implementation baseline

The repository already contains the durable clinical workflow control plane,
static migration/RLS/OpenAPI/supply-chain validators, local API/SPA/worker test
suites and a strict release gate. These are implementation evidence only. At
this snapshot the following required runtime/external proofs remain open:

- GitHub Actions green on the candidate and branch protection;
- PostgreSQL workflow integration and runtime RLS/role probes;
- concurrent create/claim/lease/fencing/acknowledgement/completion tests;
- worker crash recovery and idempotency matrix execution;
- one complete clinical critical path plus negative paths and safety invariants;
- authenticated current-HEAD browser/usability/accessibility certification and
  human clinical UAT;
- performance/load/24h/72h soak evidence;
- backup/restore/corruption/RPO/RTO and infrastructure game-day evidence;
- target deploy/rollback, image attestations, release authority and final
  evidence package.

## Ordered next action

1. Reproduce and correct the five failing CI #49 jobs before another release decision.
2. Reconcile branch governance with authenticated evidence or retain
   `NOT PROVEN`.
3. Execute the disposable PostgreSQL/runtime assurance lanes and bind every
   result to the final candidate SHA.
4. Re-run the strict gate and fresh final critics. A missing external proof is
   a blocker, never a warning or an inferred PASS.

**Baseline verdict:** `BLOCKED / NOT PROVEN`.  
**Claim permitted:** none. `TRIPLE-A VERIFIED` is not asserted.

## Terminal reconciliation — CI #58 / local candidate

Run [34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885) reached a terminal `failure` for head SHA `a4a5658aa66200a70be709e986152fe61ffc0fe5`. The ten foundational jobs passed, while Unit Tests, E2E SPA, Visual Regression, Integration Tests, the Windows critical-process runner, and Performance failed.

The E2E job produced 422 tests with `387 passed` and `35 failed`: five functional failures (three hospital-persona controls/forms, one effective diagnostics permission, the master audit receiving 401 for `/api-keys` and `/api-client`, and the operational `Fechamento` control) plus 29 visual snapshot mismatches. The visual job's actual screenshots were inspected from the real artifact and promoted as local baselines; the functional fixes and all claims still require a fresh remote run.

The local candidate `0dc4809b3e06c8334667f39bf51c33e33c3c0f9` also contains the timezone, concurrent billing, Windows argument-boundary, and performance-capacity corrections. Its strict local gate is `BLOCKED`, score `68`, critical score `54`, `open_p0=16`, `claim=NOT PROVEN`, and `publication_allowed=false`. These local changes are not external proof until a new SHA-bound CI run executes them.

**Updated external baseline verdict:** `BLOCKED / NOT PROVEN`. No `TRIPLE-A VERIFIED` claim is permitted.
