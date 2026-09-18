# Main unification and current CI remediation

<!-- engineering-framework: active_action_id=UNIFY-MAIN:VERIFY-CANDIDATE -->

## Purpose / Big Picture

Preserve valuable changes from every local and remote branch in one `main`, repair the observed automated quality failures, publish the verified candidate, and remove redundant branches. User authorization on 2026-09-18 explicitly includes repository publication and leaving only main. Production deployment and external certification remain separate evidence requirements.

## Progress

- [x] (2026-09-18) Inspected all branch tips and CI 35311529944 at remote main `97d22de0`.
- [x] (2026-09-18) Created and verified a complete pre-change Git bundle outside the repository; isolated candidate worktree starts from remote main.
- [x] (2026-09-18) Downloaded exact failing-job logs and coverage/performance artifacts.
- [x] (2026-09-18) Repaired OpenAPI fixtures, gateway branch cases and deterministic WebAuthn signature corruption; cached immutable OpenAPI serialization after CPU profiling.
- [x] (2026-09-18) Local critical unit 2965/2965, native API 679/679, build/typecheck/lint/secrets and focused independent reviews passed; unchanged unprofiled 60-VU benchmark passed 9/9 SLOs (query p95 79ms).
- [ ] Inspect exact remote CI and remove reconciled branches after publication.

## Surprises & Discoveries

Local main `b7e10072` diverges by 38 commits from remote main, which has 82 additional commits. Three remote branches are already ancestors. The remaining branch contains alternative ACL migrations as well as changes already imported. CI baseline: global branch coverage 81.97% versus 82%; two OpenAPI fallback tests fail under the critical Node environment; query latency p95 202ms versus 150ms.

## Decision Log

- Start from current remote main; decide exclusive patches by behavior and direct comparison.
- Preserve existing `QUALITY_BAR_V1.json`, coverage scopes, thresholds, benchmark workload, authentication freshness and tenant isolation.
- Keep the earlier `.gauntlet/` run as historical evidence; this run's decisions and current evidence are owned by this plan and the verification ledger.
- Use up to four concurrent agents, depth one. Branch and failure scouts are read-only; builders own disjoint files. Final criticism uses a new identity and no inherited context.

## Outcomes & Retrospective

Work in progress. Git consolidation and automated acceptance are independently reportable. Do not claim Triplo AAA certification without every mandatory criterion and external evidence in the existing quality bar.

## Context and Orientation

Repository: `ricardoakinaga-dev/cvg-his-v4`; candidate worktree `/tmp/cvg-his-v4-unify-20260918`. The pnpm monorepo contains API, worker, Vue SPA, PostgreSQL migrations, Redis runtime and quality evidence tooling. No applicable AGENTS.md was found. Profile BROWNFIELD, work modes AUDIT/REFACTOR, tier T4, activity VERIFY; source changes require failure-first tests and independent review.

## Scope and Constraints

User-authorized scope: audit branch deltas, integrate important improvements, fix demonstrated regressions, run checks, commit, push main, delete reconciled branches. Preserve all preexisting worktree changes and commit history in a verified bundle. No deployment, real patient data, external provider calls, changed business decisions or invented production acceptance.

## Architecture and Interfaces

Keep canonical ACL migrations 0175/0176 unless evidence requires a compatible follow-up. Public API, OpenAPI fallback, session revocation, access-control freshness and benchmark contracts stay authoritative. Tests must exercise production code without weakening the judged boundary.

## Milestones

### 1. Reconcile history

Classify every remote branch and local main by ancestor, equivalent, superseded or retained delta. Preserve tip SHAs and recovery instructions.

### 2. Repair current failures

Coverage builder owns three API test files. Performance investigation reads k6 metrics and database diagnostics before proposing code changes. Lead owns contracts, manifests, documents, Git and integration.

### 3. Verify and publish

Run focused tests, build/typecheck/lint, relevant coverage and integration, then a fresh independent review. Push a descendant of remote main and inspect its CI. Delete reconciled remote branches only after the retained outcome is published; recheck that only main remains.

## Plan of Work

Branch inventory and coverage/performance diagnosis run independently. Implementation is bounded by the observed failures. Integrated evidence is collected after source inputs are frozen. Historical release blockers remain explicit instead of being reset by branch consolidation.

## Concrete Steps

1. [UNIFY-MAIN:VERIFY-CANDIDATE] Repair and verify the observed CI failures against the frozen acceptance table below.
2. Inspect the integrated diff with a fresh read-only critic.
3. Publish main, inspect current CI, prune reconciled branches, and synchronize the clean local main.

## Validation and Acceptance

| ID | Source | Required target | Evidence |
| --- | --- | --- | --- |
| UNIFY-01 | USER | All branch deltas explicitly classified; valuable behavior retained | Git ancestry, patch comparison, branch report, tests |
| UNIFY-02 | USER | Only main remains remotely and locally; history recoverable | Remote branch enumeration, local branch list, verified Git bundle |
| MAIN-001 | REPO | Current required CI jobs green | Exact SHA/run and job results |
| COV-01 | REPO | Global metrics >=82%, critical metrics >=85%; frozen scope | Actual coverage reports and critical checker |
| PERF-01 | REPO | Frozen operational-minimum-v1 SLOs, including query p95 <=150ms | Unmodified k6 workload and parser, recorded provenance |
| REG-01 | REPO | Relevant tests, build, types and lint pass | Executed commands and raw logs |
| SAFE-01 | DERIVED | Auth revocation, tenant authority, migrations and history preserved | Targeted regressions, integration and independent review |
| FINAL-001 | REPO | No unsupported certification claim | Existing quality bar, honest final report and fresh critic |

Baseline is the exact remote run above. Known-bad cases include missing OpenAPI YAML, changed session authority and unmet SLOs. Local performance cannot certify the hosted runner or production target. Human UAT, target restore/soak, signatures and release authority need their own evidence.

## Risks and Human Decisions

Branch deletion is explicitly authorized by the current user request and becomes recoverable through the bundle. No additional approval is needed for this consolidation. Existing external clinical/operational/release decisions cannot be manufactured through code or a green CI.

## Idempotence and Recovery

Backup: `/home/ricardo/cvg-his-v4-backups/20260918-unification/before-unification.bundle`, verified with `git bundle verify`. Raw evidence is in the same directory. Before any repeated push/deletion, inspect remote refs. Preserve dirty linked worktrees; detach clean ones before deleting their branch. Restore a needed historical ref from the bundle rather than rewriting main.

## Artifacts and Evidence

Raw logs: `job-105495607465.log`, `job-105494644029.log`, `job-105496836005.log`; downloaded `coverage-baseline/` and `performance-baseline/`; branch scout report `branch-review.md`. Checks and final verdict will be appended to `.agent/verification.jsonl` and the current unification report.
