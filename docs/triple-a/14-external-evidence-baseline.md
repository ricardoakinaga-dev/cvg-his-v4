# Triple-A External Assurance — Current Reconciliation

**Current candidate:** "4ca6e79364d892444dc29d9f2b1a2004300b6ab6" ("main" / "origin/main")
**Current CI:** [#34560856450](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34560856450) — 15/16, Performance failure
**Current status:** **BLOCKED / NOT PROVEN**
**Observation:** 2026-09-11T04:37:28Z

The previous external-assurance sections below are historical snapshots. Their SHAs, run numbers, artifact IDs and scores are not transferred to the current candidate. The current run confirms the same performance gate failure; thresholds remain unchanged. Branch governance, target runtime, recovery, soak, UAT and release authority remain unproven.

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

## Historical candidate reconciliation — 2026-09-10T00:35:15-03:00

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

## 2026-09-10 — Candidate `1434514c` / current release-control round

- `HEAD` and `origin/main` coincide at `1434514c4e0ce88bc29d0feda28b09a61a08670f`; the worktree is clean. Commits `c375b72b` (accessible filename selector) and `1434514c` (typed CI evidence and release-manifest provenance) were pushed to `main`.
- The focused SPA hospital-persona suite passed `5/5` in `35.2s`, including the previously hanging ultrasonographer upload path. The release-control unit set passed `20/20`; static validators and the complete workspace test command completed without a failure observed in the local session. These are local implementation evidence, not external release proof.
- CI #70 ([run 34490757429](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34490757429)) is still `in_progress` for the exact candidate SHA. At the observation point, Secret Scan and Dependency Audit were successful; Typecheck and SAST were still running and dependent jobs had not all started. `Release Artifacts` #50 ([run 34490858211](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34490858211)) was skipped because its `workflow_run` condition requires successful CI.
- `TRIPLE_A_SKIP_EXECUTION=1 pnpm release:triple-a` remains fail-closed with `BLOCKED`, `score=42`, `critical_score=20`, `open_p0=28`, `claim=NOT PROVEN` and `publication_allowed=false`. The generated ignored artifact is diagnostic only and is not a certification package.
- A disposable PostgreSQL cluster used for the targeted E2E was stopped after verification. No production database, real patient/PHI data, external provider credential or shared destructive drill was used.

The current external baseline therefore remains `BLOCKED / NOT PROVEN`. The next observation must replace the in-progress CI record with a terminal, exact-SHA job inventory before any release decision. Independent runtime clinical, worker crash, RLS, recovery, performance/soak, UAT, branch-governance, image-attestation and authority evidence remain open.

## Terminal reconciliation — CI #58 / local candidate

Run [34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885) reached a terminal `failure` for head SHA `a4a5658aa66200a70be709e986152fe61ffc0fe5`. The ten foundational jobs passed, while Unit Tests, E2E SPA, Visual Regression, Integration Tests, the Windows critical-process runner, and Performance failed.

The E2E job produced 422 tests with `387 passed` and `35 failed`: five functional failures (three hospital-persona controls/forms, one effective diagnostics permission, the master audit receiving 401 for `/api-keys` and `/api-client`, and the operational `Fechamento` control) plus 29 visual snapshot mismatches. The visual job's actual screenshots were inspected from the real artifact and promoted as local baselines; the functional fixes and all claims still require a fresh remote run.

The local candidate `0dc4809b3e06c8334667f39bf51c33e33c3c0f9` also contains the timezone, concurrent billing, Windows argument-boundary, and performance-capacity corrections. Its strict local gate is `BLOCKED`, score `68`, critical score `54`, `open_p0=16`, `claim=NOT PROVEN`, and `publication_allowed=false`. These local changes are not external proof until a new SHA-bound CI run executes them.

**Updated external baseline verdict:** `BLOCKED / NOT PROVEN`. No `TRIPLE-A VERIFIED` claim is permitted.

## Terminal reconciliation — candidate `5470b4f5` / CI run `34542095726`

The current branch candidate is the exact source SHA
`5470b4f5891da6bbf3d80e03bc736f40c88c2895` (`perf(inventory): avoid global lot
scan for new items`). `origin/main` remains
`b85b03ea029b9ffe2186dc0021ddf7f6c65e37f3`; this branch has not been merged to
main. GitHub Actions run
[`34542095726`](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34542095726)
reached a terminal `failure` with 15/16 jobs successful. The failure is the
Performance (k6 SLOs) job; Typecheck, SAST, Secret Scan, Dependency Audit, Lint,
OpenAPI, Repository Guards, Coverage, Build, API Contract, Unit, Windows,
Integration, E2E SPA and Visual Regression all completed successfully.

The public job records for this run are:

| Job | GitHub job ID | Result |
| --- | ---: | --- |
| Typecheck | 103087020407 | success |
| SAST | 103087020668 | success |
| Secret Scan | 103087020616 | success |
| Dependency Audit | 103087020625 | success |
| Lint | 103088449974 | success |
| Validate OpenAPI | 103088449972 | success |
| Repository Guards | 103088450037 | success |
| Coverage | 103088449975 | success |
| Build | 103089362590 | success |
| API Contract Tests | 103089953995 | success |
| Unit Tests | 103089954012 | success |
| Critical Process Runner (Windows) | 103089953911 | success |
| Integration Tests | 103089953936 | success |
| Performance (k6 SLOs) | 103089953902 | failure |
| E2E Tests (SPA) | 103089954107 | success |
| Visual Regression | 103089954022 | success |

The performance artifact is `performance-k6-report`, ID `10178201156`, with
download digest
`sha256:09dbb0ff889fffd5b224e6292bc66532b7896e2a1e196d99c819378ec45a0762`.
The 60-VU profile produced 5/9 SLOs: API p95 215.98 ms (target <200), query
p95 231 ms (<150), write p95 273.25 ms (<300), billing p95 259 ms (<250),
inventory p95 245.30 ms (<200), auth p95 26.02 ms (<300), API errors 0 and
availability 100%. Endpoint diagnostics recorded inventory create/read p95
272.63/184.34 ms and patient list/detail p95 193.25/187.25 ms. The aggregate
metrics and thresholds were retained; no SLO threshold or load profile was
relaxed.

The E2E artifact is `e2e-spa-ed9592d6eb6595c3f8925fddde637184af718ad0`, ID
`10178424097`, digest
`sha256:4fcfd0c156c7ecce3846f66e59841d1f24268c2755144def446b899dc39a5add`.
Its metadata records merge-context SHA
`ed9592d6eb6595c3f8925fddde637184af718ad0` for source SHA
`5470b4f5891da6bbf3d80e03bc736f40c88c2895`, run `ci-34542095726`, environment
`ci-postgresql`, Chromium `145.0.7632.6`, Playwright `1.58.2`, locale `pt-BR`,
timezone `America/Sao_Paulo`, 422 expected tests, zero skipped, zero unexpected,
zero flaky, 151 routes and 302 navigations. The inventory digest in the E2E
metadata is `f6be367578dba828d11e3366d5262f0b2d7168f797d3682239a66215f82558df`.

The E2E enterprise report is explicitly advisory: `PASS: 10 | WARN: 2 | FAIL:
2`. Readiness is 92/100 and Vetus parity is not verified. The real backup and
real deploy rows remain WARN because no external evidence was supplied. The
advisory command now exits zero for collection while retaining these FAIL rows;
the strict command remains fail-closed. This CI run therefore binds execution
evidence to the candidate, but it does not prove the 97/95/zero-P0 quality bar,
runtime RLS, worker crash/recovery, clinical golden path, soak, human UAT,
restore, target deploy, image attestation, branch governance or release
authority.

**Terminal verdict for this candidate:** `BLOCKED / NOT PROVEN`.

## Terminal reconciliation — candidate `ef30673f` / CI run `34546979414`

The Windows bootstrap correction is the exact source SHA
`ef30673f871b29638c2bab9b6ede90776cf59e10` (`fix(ci): allow cold Windows
supervisor bootstrap`). The docs reconciliation that follows is documentation
only; the executable candidate and its remote proof remain bound to this SHA.
`origin/main` is still `b85b03ea029b9ffe2186dc0021ddf7f6c65e37f3`.

GitHub Actions run
[`34546979414`](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34546979414)
reached a terminal `failure` with 15/16 jobs successful. Typecheck, SAST,
Secret Scan, Dependency Audit, Lint, OpenAPI, Repository Guards, Coverage,
Build, API Contract, Unit, Windows, Integration, E2E SPA and Visual Regression
passed. Performance (k6 SLOs) is the only failure. The public job records are:

| Job | GitHub job ID | Result |
| --- | ---: | --- |
| Typecheck | 103101620881 | success |
| SAST | 103101620961 | success |
| Secret Scan | 103101621132 | success |
| Dependency Audit | 103101621103 | success |
| Repository Guards | 103102976205 | success |
| Lint | 103102976236 | success |
| Coverage | 103102976250 | success |
| Validate OpenAPI | 103102976265 | success |
| Build | 103103844770 | success |
| E2E Tests (SPA) | 103104313730 | success |
| API Contract Tests | 103104313786 | success |
| Integration Tests | 103104313793 | success |
| Critical Process Runner (Windows) | 103104313798 | success |
| Performance (k6 SLOs) | 103104313847 | failure |
| Unit Tests | 103104313869 | success |
| Visual Regression | 103104313894 | success |

The Windows contract passed after the startup budget was raised from 30s to a
finite 60s. The preceding run had measured a legitimate cold start of 34.435s
and terminated with `SIGTERM`; its diagnostic reported
`cleanupComplete: true` and an empty cleanup error. The new run validates the
headroom on the hosted Windows runner without changing the child execution or
cleanup budgets.

The performance artifact is `performance-k6-report`, ID `10179866930`, with
download digest
`sha256:5cad7f84f2930d9cc3d85b59501e97963750719c6353ea76feb3117503131ec2`.
The unchanged 60-VU profile produced 4/9 SLOs: API p95 270.80 ms (target
<200), query p95 285 ms (<150), write p95 351.85 ms (<300), billing p95 332 ms
(<250), inventory p95 315.35 ms (<200), auth p95 27.91 ms (<300), API errors 0
and availability 100%. Endpoint diagnostics recorded inventory create/read p95
351.47/249.56 ms and patient list/detail p95 240.85/248.85 ms. A directly
preceding run passed 9/9 under the same thresholds; both reports are retained
and no threshold or load profile was relaxed.

The E2E artifact is `e2e-spa-29e5c32b6f2904525b40859d7a404e5fa0fba0a1`, ID
`10180087681`, digest
`sha256:ddd6dd04e6d3a9095856fdac5dffd26f2b505919289ebcfa17f68ff30e9a7ab0`.
Its metadata records merge-context SHA
`29e5c32b6f2904525b40859d7a404e5fa0fba0a1` for source SHA
`ef30673f871b29638c2bab9b6ede90776cf59e10`, run `ci-34546979414`, environment
`ci-postgresql`, Chromium `145.0.7632.6`, Playwright `1.58.2`, locale `pt-BR`,
timezone `America/Sao_Paulo`, 422 expected tests, zero skipped, zero unexpected,
zero flaky, 151 routes and 302 navigations. The inventory digest is
`d2ca0efa69c4261a9854d2f1bd111d2f3c881fc839ab6faa9efa79dae1122872`.

The E2E enterprise report remains explicitly advisory: `PASS: 10 | WARN: 2 |
FAIL: 2`. Readiness is 92/100 and Vetus parity is not verified. The real backup
and deploy rows remain WARN because no external evidence was supplied. The
advisory collector exits zero while retaining these FAIL rows; the strict
collector remains fail-closed. The candidate therefore has a verified Windows
contract and complete CI/E2E execution evidence, but not the 97/95/zero-P0
quality bar or the external runtime, clinical, soak, UAT, restore, deploy,
attestation, governance and authority proofs.

**Terminal verdict for `ef30673f`:** `BLOCKED / NOT PROVEN`.

## Terminal reconciliation — final documented checkout `8360a615` / CI run `34551458338`

The documentation revision is
`8360a61536155bf5c44eb8f24896bb32c966cb7a`; it contains the unchanged
behavioral candidate `ef30673f871b29638c2bab9b6ede90776cf59e10`. GitHub Actions
run [`34551458338`](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338)
reached terminal `success` with all 16 jobs green, including the Windows
contract and Performance (k6 SLOs).

The final run's jobs were:

| Job | GitHub job ID | Result |
| --- | ---: | --- |
| Typecheck | 103115063370 | success |
| SAST | 103115063431 | success |
| Secret Scan | 103115063379 | success |
| Dependency Audit | 103115063264 | success |
| Validate OpenAPI | 103116303506 | success |
| Coverage | 103116303518 | success |
| Lint | 103116303522 | success |
| Repository Guards | 103116303542 | success |
| Build | 103117125070 | success |
| Critical Process Runner (Windows) | 103117672515 | success |
| Integration Tests | 103117672520 | success |
| Unit Tests | 103117672525 | success |
| API Contract Tests | 103117672533 | success |
| E2E Tests (SPA) | 103117672562 | success |
| Visual Regression | 103117672569 | success |
| Performance (k6 SLOs) | 103117672669 | success |

The `performance-k6-report` artifact is ID `10181401056`, digest
`sha256:b772a7a377be6c14eb407561ba74e226b7ad88aed6e5f45c5f85d4040384c926`.
Its 60-VU profile passed all 9 SLOs: API p95 140.41 ms, query 133 ms, write
234.70 ms, billing 248.70 ms, inventory 197.62 ms, auth 26.65 ms, API errors 0
and availability 100%; thresholds and load profile were unchanged.

The E2E artifact is `e2e-spa-74c7bbbe076c90d2f6a0a11dd60715f9c406ba5b`, ID
`10181554140`, digest
`sha256:c5784d41ea92cf94bd9a83cf8413ddd5bb9b89959e2a6b7a5644f047322e7978`.
Metadata binds it to run `ci-34551458338`, merge-context SHA
`74c7bbbe076c90d2f6a0a11dd60715f9c406ba5b`, environment `ci-postgresql`,
Chromium `145.0.7632.6`, Playwright `1.58.2`, locale `pt-BR`, timezone
`America/Sao_Paulo`, 422 expected tests, zero skipped, zero unexpected, zero
flaky, 151 routes and 302 navigations. The inventory digest is
`d1d4b7dea08ef141ef504a99cc46486e671a3845f6760ae265f46792079e2a03`.

The associated enterprise report is advisory `PASS: 10 | WARN: 2 | FAIL: 2`.
Readiness remains 92/100 and Vetus parity remains unverified; real backup and
target deploy evidence are still absent. Green CI and 9/9 k6 SLOs therefore
strengthen the candidate evidence but do not prove the 97/95/zero-P0 quality
bar, authenticated branch governance, runtime RLS, worker crash/recovery,
clinical golden path, soak, human UAT, restore, target deploy, attestation or
release authority.

**Terminal verdict for the final documented checkout:** `BLOCKED / NOT PROVEN`.
