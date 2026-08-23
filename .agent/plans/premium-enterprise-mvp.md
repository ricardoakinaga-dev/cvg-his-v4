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
- [x] (2026-08-23T02:08:00-03:00) Saved the post-DLQ continuation state from published base `d525acc`: checkpoint, handoff, README, backlog, ExecPlan and Gauntlet pointers now capture the current checker result and exact next action; the documentation wave is published in `76f7ec5`, and the user-owned design-system cache remains outside scope.
- [x] (2026-08-23T02:53:06-03:00) Implemented the minimum authenticated API-key principal and fail-closed distributed rate-limit policy. The SQL capability/function now expose only eight authentication fields; two HTTP instances sharing PostgreSQL proved `2×201`/`6×429`; Redis failure/missing configuration is `fail-closed` with `productionReady=false`; fresh regressions passed module PIX `8/8`, B1 command `17/17`, B2a `33/33`, ingress `11/11` and callback HTTP `13/13`. Artifact: `.agent/artifacts/CVG-002B2B-api-key-principal-rate-limit-2026-08-23.md`.
- [x] (2026-08-23T03:02:07-03:00) Independent read-only review approved the bounded principal/rate-limit slice without CRITICAL/HIGH/MEDIUM blockers; implementation, tests and control plane were published in `099ac2a1ff5f1ed9f74812d2466dccb42681737d`. The two-listener same-process limitation and the remaining SIGKILL/Redis failover gaps are explicit.
- [x] (2026-08-23T04:02:31-03:00) Implemented the independent-process SIGKILL/restart matrix and hardened the synthetic fixture boundary. The four kill checkpoints passed, the fd 3 protocol is deterministic, and the fixture is test-only/outside the production worker tsconfig.
- [x] (2026-08-23T05:00:00-03:00) Proved the live stale-fence race with A held after lease expiry and B takeover, then implemented and verified the inpatient daily-charge → billing idempotency boundary, including first billing-record creation races and the Drizzle/migration/OpenAPI contract.
- [ ] Exercise Redis failover/clock-skew under the fail-closed policy; preserve the bounded 5/5 process evidence and expand the clinical journey with PostgreSQL/RLS REDs. Gate `B2c` separately for coherent SPA/restart E2E.
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
- Observation: The pre-context API-key path now has a separate eight-field authentication projection, and distributed rate-limit loss is explicitly fail-closed rather than silently per-process.
  Evidence: migration `0113_api_key_auth_boundary.sql`, `mapDatabaseApiKeyAuthRow`, `tests/unit/db/api-key-auth-boundary.test.ts`, two-instance HTTP `4/4`, chaos policy `22/22` and auth-helper `3/3`.
  Impact: This removes the local broad-row and silent-fallback hazards, but does not prove Redis failover/clock skew or process SIGKILL/restart; retain `IN_PROGRESS/PARTIAL`.

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
4. Completed locally: define the fail-closed rate-limit boundary, narrow the
   principal, add settlement checkpoints, execute the two-process SIGKILL
   matrix and prove the live stale-fence takeover. Preserve the 5/5 evidence.
5. Completed locally: implement the non-PIX inpatient daily-charge → billing
   idempotency boundary with source provenance, partial unique index, replay,
   divergent conflict and first-record race coverage.
6. Obtain a fresh independent adversarial review before any `VERIFIED` change;
   gate B2c/SPA, Vetus parity, WCAG, providers, target operations and release
   separately.

## Validation and Acceptance

| Criterion      | Required | Procedure/environment                                            | Expected observation                                                                         | Evidence destination        |
| -------------- | -------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| `QB-SEC-01`    | yes      | static/log capture plus unit/startup test                        | no secret is hardcoded, returned or logged; absent required setup configuration fails closed | `.agent/verification.jsonl` |
| `QB-SEC-02`    | yes      | HTTP + PostgreSQL concurrency and cross-tenant tests             | exactly one admin; unauthorized and cross-tenant attempts are denied and audited             | `.agent/verification.jsonl` |
| `QB-DATA-01`   | yes      | empty migration plus setup failure injection/retry               | atomic consistent tenant/account/unit/role/user state; no partial install                    | `.agent/verification.jsonl` |
| `QB-AUTH-01`   | yes      | login/MFA/refresh/revocation across restart/two instances        | session lifecycle remains authoritative and replay resistant                                 | `.agent/verification.jsonl` |
| `QB-CORE-01`   | yes      | PostgreSQL-backed SPA/API encounter-to-receipt E2E               | one coherent clinical-to-financial result and rollback/replay safety                         | `.agent/verification.jsonl` |
| `QB-PARITY-01` | yes      | strict Vetus behavioral audit                                    | 11/11 general and 3/3 clinical with no skips/retries                                         | `.agent/verification.jsonl` |
| `QB-REL-01`    | yes      | project build/typecheck/lint/unit/integration/E2E/coverage gates | all required checks pass with meaningful global and changed-code coverage >=80%              | `.agent/verification.jsonl` |
| `QB-OPS-01`    | yes      | authorized target deploy/rollback/restore/failover/SLO checks    | reproducible recovery and operational thresholds pass                                        | `.agent/verification.jsonl` |

## Risks and Human Decisions

| Risk/decision                    | Evidence/confidence                                                                                                                       | Controls                                                                | Residual/authority                                                            | Trigger                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| Bootstrap secret exposure        | Historical audit reported raw-token risk; current setup path fails closed, but the complete install/session criterion is still unverified | explicit secret, redaction tests, fail-closed startup/setup             | CRITICAL until the full lifecycle evidence is current; no acceptance inferred | any setup deployment                 |
| Cross-tenant or privilege bypass | Broad multi-tenant surface; partial current evidence                                                                                      | server RBAC, PostgreSQL RLS, negative tests, audit                      | HIGH until integrated proof                                                   | identity/data changes                |
| Clinical/financial partial write | active backlog explicitly reports missing UoW/reconciliation                                                                              | transaction/saga, idempotency, rollback/failure tests                   | CRITICAL for go-live                                                          | encounter-to-receipt implementation  |
| External provider behavior       | sandbox/contracts/credentials absent or unverified                                                                                        | human selection, contract tests, signed webhooks, replay/reconciliation | BLOCKED only for dependent provider work                                      | provider implementation/homologation |
| Production recovery              | RTO/RPO/Game Day evidence absent and current runbook unsafe                                                                               | target restore/failover drill with approved authority                   | CRITICAL for release                                                          | production-readiness claim           |

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

Plan revision note, 2026-08-23 (restart/product handoff): A read-only worker
audit confirmed that the existing two-pool takeover test is not a real process
`SIGKILL` proof. The next bounded slice is an injectable settlement checkpoint
contract plus an independent-process harness. The benchmark-to-product audit
also preserved `internação -> handoff/permanência -> diária -> item cobrável`
as the first clinical-financial slice after the operational gate; it remains
planning only and does not authorize provider, production, SPA, parity, WCAG or
release claims.

Plan revision note, 2026-08-23 (SIGKILL/restart evidence): The consumer
checkpoint contract and two-process harness are now GREEN across all four kill
boundaries. PostgreSQL state queries prove takeover/fence and exactly one
financial receipt; readiness/metrics are observed in both processes. The
Quality Bar remains bounded to disposable PostgreSQL and `local-pix`; Redis
failover/clock-skew, provider, SPA/B2c, parity, WCAG, target operations and
release remain separate gates. The next actionable product slice is the
non-PIX `internação -> handoff/permanência -> diária -> item cobrável` journey.

Review correction, 2026-08-23: The process stale-fence race with A alive after
B takeover is not yet proven, detailed journal/outbox/inbox counts are not part
of the matrix, and the minimal fixture probes do not certify the main worker's
full readiness semantics. The synthetic fixture was moved outside the worker
production tsconfig and now fails closed without explicit test markers; fd 3 is
the machine-readable control channel. Preserve these limits in every checkpoint.

Plan revision note, 2026-08-23 (stale-fence and clinical-financial slice): The
live A-vivo/B-takeover case now passes with A returning `lease_lost` before
`before_b1` and B applying once; total process evidence is 5/5. The first
non-PIX clinical-financial boundary is implemented as an idempotent
`inpatient_daily_charge` source item, including the race where the billing
record itself does not yet exist. Migration, Drizzle schema, OpenAPI and
PostgreSQL integration are aligned. This does not promote the Quality Bar;
Redis failover/clock-skew, the full admission/handoff/discharge journey,
journal/outbox/inbox detail, worker target readiness, SPA, provider, parity,
WCAG, operations and release remain open.

Plan revision note, 2026-08-23 (discharge cutoff): Redis local evidence passed
21/21, including Redis time under application clock skew and bounded recovery
after a failed client. A new RED exposed that direct PostgreSQL writes could
append inpatient children after discharge; migration `0116` now rejects
progress, occurrences, daily charges and inpatient-stay inventory consumption
with tenant-scoped `SECURITY DEFINER` triggers. The disposable PostgreSQL
proof passed 2/2, the HTTP auth fail-closed proof passed 1/1, and API/DB/chaos
builds plus secret scanning passed. The shared test container entered recovery
after repeated ephemeral DB creation; no global gate is promoted. The next
implementation must prove rollback/atomicity across billing item and daily
charge state before expanding to receipt/ledger/outbox.

Publication note, 2026-08-23: implementation and continuity checkpoint
`2b33aea` (`feat: enforce inpatient discharge cutoff`) and pointer
reconciliation `432887f` (`docs: publish discharge cutoff checkpoint`) are on
the branch and origin. Continue with the billing-item/daily-charge rollback
RED and the clinical-financial UoW/saga. Global and external gates remain open.

Plan revision note, 2026-08-23 (integral continuation audit): The complete
current `docs/` corpus was enumerated and read at 1,449 files, with manifest
`d23f84a7000e42943093090e706db12e01a6e4189f61f5bd833f67b5e92ea2db`. Official
market research was refreshed for Shepherd, ezyVet/IDEXX, Digitail, Vetspire,
Covetrus, Provet, Oracle and SAP; it reinforces the encounter spine, clinical
autosave/versioning, 24h flowboard, automatic charge capture, lot-aware stock,
portal, sandboxed APIs and governed assistive AI. The Quality Bar is unchanged:
write the rollback RED, then implement the PostgreSQL/RLS clinical-financial
UoW or explicit saga. No provider, production, SPA, Vetus, WCAG, operations or
release gate is promoted.

Plan revision note, 2026-08-23 (cash-receipt HTTP/UoW): The public cash-receipt
route now executes through the tenant command runner, and response buffering is
JSON-safe for idempotency snapshots. Fresh evidence is route+buffer 10/10,
HTTP helpers 6/6, direct PostgreSQL command 8/8, published HTTP/PostgreSQL
1/1, API typecheck PASS and diff check PASS. The independent critic approved
without P0/P1; the remaining local P2 is an HTTP two-tenant A/B case. The plan
still does not promote the ERP or any provider/production/parity/WCAG/release
gate.
Plan revision note, 2026-08-23 (HTTP tenant isolation): The cash-receipt
boundary now has a second-tenant/token integration proof. GET and POST attempts
against tenant A from tenant B return opaque 404 responses and persist no
foreign receipt/idempotency row; the focused PostgreSQL test passed 2/2. The
P2 is closed, while the full clinical-financial journey and external gates
remain open.
Plan revision note, 2026-08-23 (inpatient daily-charge HTTP/UoW): The published
daily-charge route now keeps billed replays inside the tenant command runner and
defers cache rehydration until an outer HTTP rollback releases its aborted
transaction. The focused evidence is API build PASS, route 13/13,
module-inpatient 17/17, module-billing 16/16 and HTTP/PostgreSQL 3/3 covering
commit, replay, conflict, rollback and same-key concurrency. This closes only
the bounded HTTP/UoW slice; inpatient HTTP A/B, late audit-cache behavior and
the full admission-to-receipt journey remain the next local work, with Redis,
provider, SPA/B2c, parity, WCAG, operations, coverage and release gates open.

Plan revision note, 2026-08-23 (inpatient HTTP isolation and audit cache): The
next RED/GREEN slice is now published in `c647db1`. A two-tenant PostgreSQL HTTP
matrix passed 4/4 using real bearer tokens and spoofed headers: token B can
operate only on B, while A read/write attempts return opaque 404 responses and
leave no billing/idempotency effects. The late-audit-cache RED is closed with a
tenant-scoped `AuditService.refreshFromDatabase` and a transaction-scope escape
for deferred post-rollback queries; route 14/14 and AuditService 19/19 pass,
along with inpatient 17/17, billing 16/16 and the prior rollback/idempotency
regressions 3/3. The repository's default 100-row audit limit remains a bounded
follow-up. The next plan step is the complete admission → handoff/permanence →
inventory → discharge → billing → receipt/ledger/audit/outbox journey; Redis
process failover, provider, SPA/B2c, parity, WCAG, target operations, coverage
and release remain separate gates.

Plan revision note, 2026-08-23 (CVG-002C5 discharge HTTP): The next bounded
clinical-financial gap is now closed locally. A fresh two-instance
PostgreSQL-backed integration passed 5/5: inpatient discharge closes the active
stay, replay is stable, rollback removes discharge/stay/audit/idempotency/cache
effects, bearer authority defeats spoofed tenant headers for inpatient and
non-inpatient paths, and distinct-key races return one 201 plus one 409. The
runner now has an explicit SQL transaction fallback without `unitOfWork`; audit
rehydration bypasses the legacy 100-row limit and remains tenant-filtered; the
OpenAPI discharge/PATCH contract is aligned. Audit/discharges passed 31/31,
daily-charge plus cash HTTP regressions 6/6, tenant-command 5/5, and API/module
build/typechecks passed. The complete admission → handoff/permanence →
inventory → discharge → billing → receipt/ledger/audit/outbox journey remains
the next product gate; cursor pagination for very large audit histories, Redis
failover, provider, SPA/B2c, Vetus parity, WCAG, target operations, coverage
and release remain open.

Plan revision note, 2026-08-23 (clinical-financial continuation audit): The
full current documentation corpus was re-enumerated before this handoff and
the independent review rejected the claim that the complete journey is proven.
The bounded discharge slice remains DONE, but inventory consumption still does
not create a billing item with deterministic source, and no single public
HTTP/PostgreSQL test covers admission -> inventory -> discharge -> receipt /
ledger / audit / outbox with replay, concurrency and failpoints. The next
bounded action is the RED named in `CVG-002C6`; no global or external gate is
promoted.

Plan revision note, 2026-08-23 (CVG-002C6 bounded GREEN): The rejecting RED was
executed, then implementation `ef4ee2d` added a separate nullable-positive
inventory charge price, source-idempotent `inventory_consumption` billing,
structured CAS retry and database stay/encounter/tenant integrity. Fresh HTTP /
PostgreSQL evidence is 3/3 for charge capture, 4/4 for discharge cutoff,
inventory 21/21, billing 16/16, OpenAPI 337/390, typechecks PASS and audit has
no known high vulnerabilities. The independent final review approved the
bounded slice without Critical/High/Medium findings. The parent plan remains
IN_PROGRESS/PARTIAL: discharge, receipt, journal and outbox are not yet one
public journey, and payload-conflict, failpoint, price-CRUD and audit-cursor
follow-ups remain open.

Plan revision note, 2026-08-23 (CVG-002C6 restricted runtime/restart): The
single clinical-financial vertical now runs with a real API LOGIN role marked
`NOSUPERUSER NOBYPASSRLS` and passes 5/5, including per-record stock/billing/
receivable/payment/cash/journal reconciliation, bearer/header isolation and a
`pg_temp` shadowing test. A controlled same-process restart/rebootstrap with
idempotent inventory replay passes 1/1 and leaves one financial graph. The
independent review found a HIGH invoker `search_path` issue; migration 0120
pins `pg_catalog, public, app, pg_temp`, and the pre-fix RED plus post-fix GREEN
are preserved in the runtime-role artifact. Commits `ee126a6` and `67bfe2d`
publish this bounded slice. The plan remains IN_PROGRESS/PARTIAL: real
child-process SIGKILL, complete per-boundary failpoints, independent worker
execution, Helm equivalence, global RLS/FORCE RLS and all external
product/operations/release gates remain open.

Publication addendum, 2026-08-23: the worker ACL/SIGKILL bounded slice and all
continuation ledgers were published in `adde66b7a1b33333126f4832b3c728abb2db8500`
and reconciled to `origin/agent/sync-v4-full-program`. The next session starts
at the explicit worker consumer/readiness residual; the user-owned tsbuildinfo
cache remains outside the commit.

Plan revision note, 2026-08-23 (worker child-process ACL/SIGKILL): The real
`apps/worker/src/index.ts` now has a bounded process proof under a disposable
PostgreSQL LOGIN `NOSUPERUSER/NOBYPASSRLS` role. The RED exposed six forbidden
worker table privileges, then two residual privileges after a partial revoke;
the final policy revokes all worker DML/TRUNCATE on installer/governance tables
after the broad RLS grant in reconciler, init and Helm. Fresh evidence is
`worker-runtime-entrypoint.test.ts` **1/1**, with positive empty privilege
assertions before/after restart, `/live`, real loop ticks, `/ready` HTTP 503,
SIGKILL, same-port restart and clean SIGTERM; runtime grant contract is
**11/11**. Independent review is APPROVE bounded with no Critical/High. The
worker consumers `payments`, `billing` and `webhooks` remain unregistered, so
readiness and domain-event processing are intentionally not promoted. Next:
compose/review real handlers, then execute the complete failpoint matrix and
applied Helm equivalence; all product, global RLS and release gates remain
IN_PROGRESS/PARTIAL.

Plan revision note, 2026-08-23 (auditoria integral e retomada): o corpus atual
de docs foi enumerado e lido integralmente como bytes antes desta inclusão;
readiness estrutural permanece 95/100, paridade estrita 0/11 geral e 0/3
clínica, RLS 154/155 e OpenAPI 337 paths/390 schemas. O test:critical terminou
com exit 1 (385/387 testes em 28 arquivos), com um fixture de rollback usando
texto em coluna UUID e uma asserção de grants Helm incompatível com a forma
renderizada por SELECT format. Esses dois pontos são o próximo RED/GREEN; o
ERP e a Quality Bar continuam IN_PROGRESS/PARTIAL. O checkpoint executável é
docs/2026-08-23-checkpoint-retomada-integral.md e o artefato é
.agent/artifacts/erp-audit-2026-08-23.md.

Plan revision note, 2026-08-23 (reteste crítico pós-fix): o template Helm agora
explicita `REVOKE cvg_installer FROM :"worker_user";` no commit `6afd1d9`;
installation-state passou 8/8 e runtime-role-grants 11/11. O daily-charge
passou 4/4 e FK/integrity/PIX passaram 68/68 isoladamente. A repetição integral
continua parcial em 382/387 (23/28): o full run ainda materializa
`stayday_<token>`, há fixtures preemptados por validação/NOT NULL e um teardown
production-like excede 30s. A próxima ação é reproduzir a divergência com
cache/paralelismo controlados sem relaxar contratos, mantendo
CVG-002C6/Quality Bar/ERP IN_PROGRESS/PARTIAL; só depois retomar
SIGKILL/takeover, failpoints e webhook HTTP retry/DLQ/fence.

Plan revision note, 2026-08-23 (reteste controlado): a execução serial
`REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/database
tests/integration/setup tests/integration/foundational.test.ts --config
vitest.integration.config.ts --reporter=dot --no-cache
--no-file-parallelism --teardownTimeout=120000` eliminou a materialização
`stayday_<token>` e fechou o full run em 383/387 (23/28), mas ainda com quatro
fixtures que não alcançam a constraint pretendida e dois `afterAll` limitados
por `hookTimeout` de 30 s. O próximo RED/GREEN deve corrigir os fixtures para
alcançar FK/unique/backfill e tornar o teardown determinístico; não relaxar
asserções nem promover o gate. CVG-002C6, a Quality Bar e o ERP global seguem
IN_PROGRESS/PARTIAL.
