# CVG HIS v4 Premium Enterprise MVP — ExecPlan

## Purpose / Big Picture

Transform the current broad, partially implemented veterinary ERP into a behaviorally proven Premium Enterprise MVP. Success is observable through real, revision-bound flows rather than files, screenshots or self-reported scores: secure installation and identity, the veterinary encounter-to-receipt backbone, eleven Vetus parity domains, provider homologation, and target-environment operational certification.

## Progress

- [x] (2026-08-22T01:57:16-03:00) Classified the repository and recovered the active August documentation authority, dirty worktree and current verification failures.
- [x] (2026-08-22T02:12:00-03:00) Finished deterministic coverage of all 1,445 documentation artifacts and froze Quality Bar v1 without weakening a required criterion.
- [x] (2026-08-22T02:12:00-03:00) Bounded `CVG-001` from independent planning, TDD and security reviews; the implementation-ready decision is recorded separately and does not imply verification.
- [x] (2026-08-22T13:16:00-03:00) Delivered and independently approved `CVG-002A`, the atomic cash-receipt sub-slice, with PostgreSQL/RLS, API, SPA, coverage, security and concurrency evidence.
- [x] (2026-08-22T13:32:41-03:00) Mapped and froze `CVG-002B`; independent payment, inventory, SPA/E2E, documentation and transaction reviews reordered delivery behind a DB-first durable payment spine.
- [x] (2026-08-22T14:42:00-03:00) Executed and independently approved the `CVG-002B1` RED/GREEN loop for atomic confirmed-PIX settlement; the bounded DB core is verified while HTTP/provider/worker/SPA work remains deferred to `CVG-002B2`.
- [x] (2026-08-22T14:55:20-03:00) Froze `CVG-002B2` into non-overlapping `B2a` durable outbound, `B2b` signed inbound/worker/B1 and `B2c` SPA/E2E slices after five independent read-only reviews.
- [x] (2026-08-22T18:06:00-03:00) Executed and independently approved `CVG-002B2a`: durable exact-cents request, fenced synthetic dispatcher, opt-in worker and bearer polling API; signed callback, settlement worker and browser integration remain excluded.
- [x] (2026-08-22T18:50:00-03:00) Consolidated B2b code mapping, official-source research and independent architecture/security/TDD reviews into `.agent/tasks/CVG-002B2B.md` and a session handoff; no B2b implementation or gate PASS is claimed.
- [x] (2026-08-22T23:15:00-03:00) Executed and independently reviewed a bounded `CVG-002B2B` continuation: shared tenant UoW, explicit transient retry, audited redrive, actual read-only worker-role query and attempt-linked legacy `410`; implementation `46b84cb` and the continuation artifact/docs are recorded, while the B2b gate remains `IN_PROGRESS/PARTIAL`.
- [x] (2026-08-22T23:55:00-03:00) Executed the next bounded recovery/observability/compatibility loop: worker exhaustion promotions emit safe aggregate telemetry, two PostgreSQL pools prove lease-fenced takeover and one B1 application, HTTP→PostgreSQL proves the legacy `410`/foreign `404`/direct `200` matrix, service-principal backfill/RLS negatives are non-vacuous, and focused regressions are green. Implementation `fdb0995` and documentation `75bfa72` are pushed; the detailed checkpoint is `.agent/artifacts/CVG-002B2B-recovery-dlq-legacy-http-2026-08-22.md`; the B2b gate remains `IN_PROGRESS/PARTIAL` because the default database API-key pre-context path still needs a least-privilege RLS design.
- [x] (2026-08-23T00:20:00-03:00) Implemented and bounded the PostgreSQL API-key capability in `62db87e`: migration `0113`, strict JSONB mapper, tenantized usage/rate-limit tables, worker/API ACL separation, no-leak PIX ownership probe, mandatory helper rate limit and atomic consumption; real HTTP→PostgreSQL evidence is 4/4 including 2 accepted/6 `429` under concurrency. The B2b gate remains `IN_PROGRESS/PARTIAL`.
- [x] (2026-08-23T01:47:00-03:00) Implemented and independently re-reviewed the operator-facing PIX settlement DLQ slice: tenant-scoped sanitized list, audited atomic redrive through migration `0114`, API/worker ACL reconciliation, OpenAPI error envelopes with correlation IDs, DB-backed current-backlog gauge, Prometheus/Grafana/runbook and focused regressions. The B2b gate remains `IN_PROGRESS/PARTIAL`.
- [x] (2026-08-23T01:59:00-03:00) Corrected replicated-worker observability semantics: each worker recomputes the full known-account backlog and alert/dashboard use `max(...)` rather than `sum(...)`; static contract evidence is 5/5 and the B2b gate remains `IN_PROGRESS/PARTIAL`. Implementation `35f68fd` and correction `1217882` are pushed.
- [ ] Prove a real process crash/SIGKILL matrix, define and measure the multi-replica rate-limit policy, narrow the authenticated pre-context principal projection, then re-run the bounded B1/B2a/ingress/HTTP regressions; gate `B2c` separately for coherent SPA/restart E2E.
- [ ] Complete `CVG-001` through TDD, integrated runtime proof and independent critique.
- [ ] Execute the remaining backlog in dependency order, preserving fresh evidence and explicit human/external boundaries.

## Surprises & Discoveries

- Observation: The repository's `readiness:enterprise` score is 95/100 while its strict Vetus audit reports 0/11 general and 0/3 clinical areas verified.
  Evidence: `pnpm readiness:enterprise` and `pnpm vetus:parity:audit` executed on the current worktree.
  Impact: Existence-based scores are not acceptance evidence; the Quality Bar must use rejecting behavioral checks.
- Observation: The historical audit claimed that first access generated/logged a raw bootstrap token when configuration was absent; the current setup helper fails closed and does not fabricate or log one.
  Evidence: `apps/api/src/index.ts`, `apps/api/src/setup-token.ts`, current secret scan and setup-focused tests.
  Impact: `CVG-001` remains PARTIAL until every setup/install/session entry point is proven against real PostgreSQL/Redis; the historical raw-token claim must not remain as current-state evidence.
- Observation: The documented Game Day recommends in-memory writes during database failure, contradicting the active production fail-closed policy.
  Evidence: `docs/game-day/README.md` compared with the active August 7 report/backlog.
  Impact: The runbook must not be executed unchanged and operational certification remains open.
- Observation: The setup predicate queries tenant-scoped `users` before tenant context exists, while production runtime is `NOBYPASSRLS`; the same empty observation can recur after successful setup.
  Evidence: `apps/api/src/setup-provisioning.ts`, the user RLS migration and independent security/TDD reviews.
  Impact: Installation completion needs a durable global singleton exposed only through narrow privileged functions; deleting the last user cannot reopen setup.
- Observation: The current in-memory session/user cache cannot make an already-running second API instance aware of setup or later revocation, and refresh rotation is not compare-and-swap.
  Evidence: current auth/users/session repository call graph and independent security review.
  Impact: PostgreSQL/Redis state must be authoritative on miss/refresh/request; cache-only green tests are insufficient.
- Observation: Recovery after commit `0fa3ac4` found the runtime repository pointer and gate pointer stale while code, upstream and verification consistently show `CVG-002A` complete.
  Evidence: `git rev-parse HEAD`, `git rev-parse @{u}`, `.agent/state.json`, `.agent/execution-log.jsonl` and `VFY-CVG-002A-CASH-001` on 2026-08-22.
  Impact: Reconcile the controller before new work, clear the mismatched `CVG-001` gate pointer and require a scoped implementation-ready gate for `CVG-002B`.
- Observation: The current payment composition cannot provide durable non-cash settlement: provider calls precede local durability, card state is in memory, production consumers are registered in the API while only the worker processes the guarded outbox, and the SPA PIX contract cannot authenticate or decode the API response.
  Evidence: `apps/api/src/routes/payments-routes.ts`, `apps/api/src/consumers/payments.consumer.ts`, `apps/api/src/runtime.ts`, `apps/worker/src/runner.ts`, `apps/spa/src/services/pix.ts` and five independent read-only mapping/review lanes on 2026-08-22.
  Impact: Freeze a transaction-local settlement command and durable saga boundaries before connecting charge/inventory or writing browser happy paths; do not place provider network calls inside the tenant UoW.
- Observation: The prior HTTP→PostgreSQL API-key harness needed an adapter because JSONB permissions arrive from `pg` as an array and prefix lookup required tenant context before the account was known; the current local path uses a narrow capability and a strict mapper instead.
  Evidence: migration `0113_api_key_auth_boundary.sql`, `DatabaseApiKeyRepository`, `tests/integration/pix-legacy-confirmation-http-postgres.test.ts` and the 4/4 real-repository run.
  Impact: The local boundary is now behaviorally exercised, but production readiness still needs multi-replica rate-limit policy, minimal-principal narrowing and target-environment evidence; do not promote the B2b gate.

## Decision Log

- Decision: Treat the August 7 report, plan and backlog as the active documentation layer; treat July and `docs/docs2` as historical discovery input, and the untracked August 10 setup/security documents as a provisional overlay requiring governance.
  Context: The corpus contains contradictory 42–96 scores and superseded “DONE” claims.
  Alternatives: Continue the July backlog; average historical scores; trust the newest filename without checking governance.
  Reason: `docs/README.md` names the August trio first, while archive manifests explicitly deny current authority.
  Consequences: Current runtime/code evidence may still supersede documentation; the August 10 changes remain unverified.
  Date/Author: 2026-08-22 / root integrator.
- Decision: Sequence secure installation-to-session before encounter-to-receipt.
  Context: A first admin, tenant boundary and shared session are prerequisites for faithful multi-tenant product journeys.
  Alternatives: Start with cosmetic SPA parity or isolated domain pages.
  Reason: The active audit and independent root-document review identify identity/tenant lifecycle as the highest-impact critical gap.
  Consequences: External provider and broad UI work do not block the first slice.
  Date/Author: 2026-08-22 / root integrator.
- Decision: Require an explicit configured bootstrap secret and keep the status route readable while mutation fails closed when setup is disabled.
  Context: Automatically generated credentials create an unrecoverable disclosure/logging dilemma and multi-instance drift.
  Alternatives: Generate and print a token; hide the entire route; start the API only when the token exists.
  Reason: A non-secret status permits a recoverable operator/UI state, while POST remains impossible without deliberate configuration.
  Consequences: API/UI/OpenAPI distinguish `setupRequired` from `setupAvailable`; production configuration remains an operator responsibility.
  Date/Author: 2026-08-22 / root integrator.
- Decision: Use a durable installation singleton and a narrow database bootstrap capability rather than inferring installation from tenant-scoped users or granting global CRUD to the API role.
  Context: RLS, user deletion, Compose/Helm grant drift and post-commit audit make the current transaction unsafe.
  Alternatives: Count users with bypass RLS; use an account sentinel; grant the runtime broad global CRUD.
  Reason: A one-way sentinel preserves the invariant across deletion/restart and a `SECURITY DEFINER` function can own one atomic, audited transaction with least privilege.
  Consequences: Migration/grants require real PostgreSQL proof and explicit safe `search_path`; rollback must preserve already-completed installations.
  Date/Author: 2026-08-22 / root integrator.
- Decision: Treat database/session state as authoritative and process-local caches as disposable optimizations.
  Context: Setup on instance A leaves hot instance B unable to login/authenticate reliably; non-CAS refresh admits races.
  Alternatives: restart every replica; publish cache invalidations only; retain cache authority.
  Reason: Correctness must not depend on delivery of an invalidation event.
  Consequences: request/refresh paths perform bounded repository synchronization and refresh nonce changes use compare-and-swap; performance is measured later.
  Date/Author: 2026-08-22 / root integrator.
- Decision: Implement non-cash settlement as transaction-local commands plus an outbox saga, beginning with an atomic confirmed-PIX application command.
  Context: A single PostgreSQL transaction cannot roll back a provider call, and current PIX/card consumers, persistence and worker registration admit loss, duplication and restart drift.
  Alternatives: Keep direct provider calls inside the request UoW; connect inventory to current consumers; implement UI paths before durability.
  Reason: DB-first commands provide rejecting atomicity/idempotency evidence while outbound dispatch can use stable provider keys outside locks and reconcile after failure.
  Consequences: `CVG-002B1` is authorized first; PIX dispatch/callback, card durability, inventory charge capture and browser E2E remain explicit later milestones and cannot inherit a PASS.
  Date/Author: 2026-08-22 / root integrator.

## Outcomes & Retrospective

Work remains active. No Premium Enterprise, parity, security or release verdict has been earned. Update this section only with observed outcomes, limitations and lessons from completed milestones.

## Context and Orientation

The repository is a pnpm monorepo. `apps/api` is the canonical HTTP composition root, `apps/spa` is the Vue frontend, `apps/worker` handles asynchronous work, `packages/db` owns Drizzle schema/migrations, and `packages/modules/*` owns domain behavior. PostgreSQL and Redis are required for production-like verification. The current worktree already contains substantial uncommitted setup/auth/tenant/metrics changes; they belong to the user or prior work and must be preserved and reviewed as a candidate, not rewritten blindly.

The current documentation authority is summarized by `docs/README.md` and the August 7 report/plan/backlog. `docs/vetus` is reference evidence for the legacy/product target. Archived documents are discovery evidence only. Runtime behavior and current tests outrank documentary completion claims.

## Scope and Constraints

- In scope: all implementation and verification needed to close the active Premium Enterprise MVP backlog, starting with `CVG-001`; current documentation reconciliation; real test/build/runtime evidence; independent reviews.
- Out of scope without new authority: production mutation, credential rotation or disclosure, irreversible migration, provider/vendor commitments, fiscal/regulatory acceptance, production go-live and residual HIGH/CRITICAL risk acceptance.
- Applicable instructions: user-supplied repository `AGENTS.md`; the named gauntlet, engineering-framework and orchestrate skills; ECC conventions; TDD, security-review and market-research skills.
- Requirements/decisions: active August 7 report/plan/backlog; architecture docs `112`–`116`; ADRs subject to recorded drift; Vetus reference corpus; frozen Gauntlet Quality Bar.
- Tier/risk/blast radius: `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM` because identity, sensitive veterinary data, financial state, tenancy, integrations, deployment and recovery all participate.
- Authorization constraints: repository-local reversible implementation and synthetic test environments are authorized; external systems and destructive/production decisions require humans.

## Architecture and Interfaces

The required backbone is `client/owner -> animal/patient -> appointment/queue -> encounter/clinical state -> command/charges -> inventory/ledger/cash/payment -> audit/outbox`. Identity is `explicit bootstrap secret -> atomic tenant/account/unit/admin -> login/MFA -> HTTP-only refresh cookie -> shared authoritative session -> tenant/RBAC/RLS enforcement`. Every write must have an owning transaction or explicit idempotent saga, and every public route must validate input and enforce actor/action/resource/tenant at the server/database boundary.

## Milestones

### Milestone 1 — Secure installation-to-session

- Outcome: An empty database can be provisioned exactly once and the resulting administrator remains authenticated safely across restart and two API instances.
- Scope/dependencies: API setup/auth, PostgreSQL transaction/RLS, Redis/shared sessions, SPA wizard and Playwright; no external provider.
- Demonstration: Start disposable PostgreSQL/Redis, migrate from empty, exercise setup through HTTP/SPA, race two valid setup calls, restart/switch API instance, refresh/login, and query tenant/role/audit state.
- Acceptance/evidence: `QB-SEC-*`, `QB-DATA-*`, `QB-UX-*` and `QB-REL-*` criteria in `.gauntlet/state.md`, plus current verification ledger records.

### Milestone 2 — Atomic encounter-to-receipt

- Outcome: One scheduled or walk-in clinical visit reaches manual/cash settlement without inconsistent clinical, inventory or financial state.
- Scope/dependencies: patient/owner, agenda/queue/encounter, command/billing, inventory, ledger/cash/payment, audit and outbox.
- Demonstration: PostgreSQL-backed UI/API journey with rollback at each boundary, duplicate/replay, restart and cross-tenant deny cases.
- Acceptance/evidence: the corresponding frozen core, data, security and regression criteria.

### Milestone 3 — Vetus functional parity

- Outcome: The eleven general and three clinical parity areas have self-contained, behaviorally rejecting journeys with no skips/retries.
- Scope/dependencies: `CVG-002` plus domain state machines and evidence spine.
- Demonstration: the active Vetus audit becomes 11/11 and 3/3 from runtime artifacts, not file existence.
- Acceptance/evidence: durable PostgreSQL-backed E2E artifacts and domain reconciliation.

### Milestone 4 — Providers and operational certification

- Outcome: Selected provider chains and the authorized target environment meet integration, accessibility, performance, deploy, recovery and observability contracts.
- Scope/dependencies: human provider/sandbox/topology/RTO/RPO decisions.
- Demonstration: signed sandbox callbacks, reconciliation, Helm/Compose deployment as applicable, WCAG audit, SLO workload, backup/restore/failover and Game Day.
- Acceptance/evidence: external records plus current runtime verification; release authority remains human.

## Plan of Work

For each milestone, freeze one bounded task contract and Quality Bar subset; obtain the required stage gate; write a rejecting test before the smallest coherent vertical implementation; run the real boundary; inspect persisted state, logs and side effects; request a fresh independent critique; fix the largest blocking gap; rerun the affected regression surface; and only then transition the backlog item from `IN_PROGRESS` to `VERIFY` and possibly `DONE`. Keep external/human blockers explicit while continuing safe local work on independent items.

## Concrete Steps

From `/home/ricardo/cvg-his-v4`:

1. Completed on 2026-08-23: preserve the complete documentation-corpus audit
   with counts, hashes, authority classification, requirements, contradictions
   and open gates in `.agent/artifacts/document-corpus-audit.md` and
   `docs/2026-08-23-checkpoint-continuacao.md`.
2. Keep `.gauntlet/state.md` v1 and `.agent/tasks/CVG-001.md` as the secure
   installation contract, but do not let their historical first-step wording
   override the active `CVG-002B2B` continuation pointer.
3. Completed on 2026-08-23: close the bounded B2b operational gap with RED
   tests first: operator-facing PIX settlement DLQ query/redrive, runbook,
   current-backlog gauge, alerts and dashboard, without mutating financial
   artifacts outside the existing repository contract.
4. Define and test the multi-replica rate-limit policy and narrow the
   authenticated pre-context principal projection; then execute the real
   SIGKILL/restart matrix and rerun B1/B2a/ingress/HTTP regressions.
5. Obtain a fresh independent adversarial review before any `VERIFIED` change;
   gate B2c/SPA, Vetus parity, WCAG, providers, target operations and release
   separately.

## Validation and Acceptance

| Criterion | Required | Procedure/environment | Expected observation | Evidence destination |
| --- | --- | --- | --- | --- |
| `QB-SEC-01` | yes | static/log capture plus unit/startup test | no secret is hardcoded, returned or logged; absent required setup configuration fails closed | `.agent/verification.jsonl` |
| `QB-SEC-02` | yes | HTTP + PostgreSQL concurrency and cross-tenant tests | exactly one admin; unauthorized and cross-tenant attempts are denied and audited | `.agent/verification.jsonl` |
| `QB-DATA-01` | yes | empty migration plus setup failure injection/retry | atomic consistent tenant/account/unit/role/user state; no partial install | `.agent/verification.jsonl` |
| `QB-AUTH-01` | yes | login/MFA/refresh/revocation across restart/two instances | session lifecycle remains authoritative and replay resistant | `.agent/verification.jsonl` |
| `QB-CORE-01` | yes | PostgreSQL-backed SPA/API encounter-to-receipt E2E | one coherent clinical-to-financial result and rollback/replay safety | `.agent/verification.jsonl` |
| `QB-PARITY-01` | yes | strict Vetus behavioral audit | 11/11 general and 3/3 clinical with no skips/retries | `.agent/verification.jsonl` |
| `QB-REL-01` | yes | project build/typecheck/lint/unit/integration/E2E/coverage gates | all required checks pass with meaningful global and changed-code coverage >=80% | `.agent/verification.jsonl` |
| `QB-OPS-01` | yes | authorized target deploy/rollback/restore/failover/SLO checks | reproducible recovery and operational thresholds pass | `.agent/verification.jsonl` |

## Risks and Human Decisions

| Risk/decision | Evidence/confidence | Controls | Residual/authority | Trigger |
| --- | --- | --- | --- | --- |
| Bootstrap secret exposure | Raw token currently logged; high confidence | explicit secret, redaction tests, fail-closed startup/setup | CRITICAL until corrected; no acceptance inferred | any setup deployment |
| Cross-tenant or privilege bypass | Broad multi-tenant surface; partial current evidence | server RBAC, PostgreSQL RLS, negative tests, audit | HIGH until integrated proof | identity/data changes |
| Clinical/financial partial write | active backlog explicitly reports missing UoW/reconciliation | transaction/saga, idempotency, rollback/failure tests | CRITICAL for go-live | encounter-to-receipt implementation |
| External provider behavior | sandbox/contracts/credentials absent or unverified | human selection, contract tests, signed webhooks, replay/reconciliation | BLOCKED only for dependent provider work | provider implementation/homologation |
| Production recovery | RTO/RPO/Game Day evidence absent and current runbook unsafe | target restore/failover drill with approved authority | CRITICAL for release | production-readiness claim |

## Idempotence and Recovery

Control-plane files have one writer: the root integrator. Workers return read-only findings or disjoint implementation evidence. On continuation, inspect user instructions, `.agent/state.json`, the latest execution and verification records, backlog, this plan, current Git status and active task before acting. If a write or test stops mid-step, preserve the partial artifact, append a recovery/failure event and rerun only after reconciling code, persisted state and evidence freshness. Never reset the dirty worktree or execute the stale Game Day runbook.

## Artifacts and Evidence

- `docs/README.md` plus the August 7 trio: current documentary authority, subject to runtime evidence.
- `docs/vetus`: target product/reference evidence, not current implementation proof.
- `pnpm readiness:enterprise`: current 95/100 structural score; explicitly insufficient because strict parity fails.
- `pnpm vetus:parity:audit`: current strict parity blocker list; report-only exit code does not mean parity PASS.
- Targeted auth/tenant/metrics tests: 54/54 passed in the current dirty worktree; database-dependent global setup was unavailable.
- API package suite: 276/277 passed; one Redis-dependent chaos test failed and remains a baseline limitation.

Plan revision note, 2026-08-22: Initial T4 plan created from active-document discovery, current worktree inspection and current local baseline. Quality Bar v1 and the `CVG-001` task contract were frozen after all corpus, planning, TDD and security reviews returned; implementation evidence remains absent until Round 1 tests execute.

Plan revision note, 2026-08-23: The complete corpus inventory was reaudited at
1.447 files and the active execution moved to the published `CVG-002B2B`
API-key boundary checkpoint. The concrete steps were reconciled so a resumed
agent starts from the operational DLQ/rate-limit/principal gaps instead of
repeating the already completed corpus audit. This revision does not change the
Quality Bar or promote any gate.

Plan revision note, 2026-08-23 (DLQ slice): The operator-facing settlement DLQ
surface is now implemented and independently re-reviewed. The current backlog
signal is DB-backed and aggregate-only; the remaining local work is the
multi-replica rate-limit policy, minimum principal projection and real
SIGKILL/restart evidence. No quality-bar or ERP gate was promoted.
