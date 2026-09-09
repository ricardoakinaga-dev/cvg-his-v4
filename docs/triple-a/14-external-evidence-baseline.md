# Triple-A External Assurance — Baseline 2026-09-09

**Snapshot:** `2026-09-09T11:30:00-03:00` (America/Sao_Paulo)  
**Repository:** `ricardoakinaga-dev/cvg-his-v4`  
**Observed candidate:** `b5ac8bf994000994a8bbcc7208433772122fa3db`  
**Closure prompt:** [`MASTER_PROMPT_EXTERNAL_CLOSURE.md`](./MASTER_PROMPT_EXTERNAL_CLOSURE.md)  
**Closure prompt SHA-256:** `d89a249f9b0b13e0da6fb9e4ee3c0e4728c11760fd435d325d48a9b8d1b5ed59`

This is a fresh external-assurance baseline for the new closure prompt. The
historical [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) and frozen
[`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json) remain unchanged and retain their
original provenance. Evidence from the historical candidate is not reused as
proof for this candidate.

## Candidate integrity

| Probe | Result | Evidence |
|---|---|---|
| `git rev-parse HEAD` | PASS | `b5ac8bf994000994a8bbcc7208433772122fa3db` |
| `git status --short --untracked-files=all` | PASS at the initial snapshot | Clean before this baseline was written; the new prompt and baseline files are intentionally pending commit. |
| Local strict release gate | BLOCKED / NOT PROVEN | `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`: `score=38`, `critical_score=25`, `open_p0=21`, `publication_allowed=false`. |
| Prompt byte identity | PASS | `cmp` and SHA-256 against the supplied attachment. |

## Remote GitHub state

The public GitHub API was queried without credentials. The repository is public,
the default branch is `main`, and Actions is active. The latest push for the
observed candidate created no executable jobs:

| Workflow | Run | Result | Public evidence |
|---|---:|---|---|
| CI | `34363819676` / run 19 | `failure` before job planning | [run](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34363819676) |
| Usability Certification | `34363823720` / run 10 | `failure` before job planning | [run](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34363823720) |

The public run annotations identify the concrete defect:

```text
Invalid workflow file: .github/workflows/ci.yml#L1
Unrecognized named-value: 'runner' in jobs.<job>.env at lines 515, 841 and 1065.
```

The usability workflow has the same defect at its job-level `runner.tool_cache`
expressions (lines 33 and 130). The API returned `check-runs=0` for the
candidate and both check suites reported `completed/failure` with
`latest_check_runs_count=0`. Therefore `main` is not green and no required
check can be considered satisfied.

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

1. Commit and push the workflow-context correction and the prompt/baseline.
2. Observe a fresh GitHub Actions run; do not call it green until jobs/checks
   have completed successfully on the exact new SHA.
3. Reconcile branch governance with authenticated evidence or retain
   `NOT PROVEN`.
4. Execute the disposable PostgreSQL/runtime assurance lanes and bind every
   result to the final candidate SHA.
5. Re-run the strict gate and fresh final critics. A missing external proof is
   a blocker, never a warning or an inferred PASS.

**Baseline verdict:** `BLOCKED / NOT PROVEN`.  
**Claim permitted:** none. `TRIPLE-A VERIFIED` is not asserted.
