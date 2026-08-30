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

Publication note, 2026-08-23: the controlled retest checkpoint and control
plane were published in `cef5d6392c82b60e9a13881fa1e8826c39accb7a` and pushed
to `origin/agent/sync-v4-full-program`; the design-system tsbuildinfo cache
remains outside the stage.

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

Plan revision note, 2026-08-23 (fixtures determinísticos e teardown): a
correção delimitada adicionou a migration 0123 para que o FK de paciente não
seja preemptado pelo guard de owner, fixtures transacionais próprios em
`fk.test.ts`/`integrity.test.ts`, tenant real no fixture PIX e
`fileParallelism=false` com `hookTimeout`/`teardownTimeout` de 120 s. O Lead
reexecutou FK/integrity em banco descartável com migration 0123: **63/63,
exit 0**; lint, Prettier e diff check passaram. O full critical ainda não foi
reexecutado após a correção e a crítica independente pós-fix ainda está
pendente; o plano mantém `CVG-002C6=IN_PROGRESS/PARTIAL` e exige 387/387 antes
de retomar child-process domain, failpoints, PIX PostgreSQL/RLS e webhook
retry/DLQ/fencing.

Publication note, 2026-08-24 (cross-instance hydration): implementation
commit 20cf9e666d20adeb5303f86cf32d0346e025898d
(fix: hydrate clinical reads across api instances) and pointer reconciliation
commit 9a0d7326704ee32dddc45fd72b52ba1efe5a550e were pushed and reconciled
with origin/agent/sync-v4-full-program. The plan stays IN_PROGRESS/PARTIAL;
the next short operation is failpoint expansion and the P2 in-flight
hydration follow-up. The user-owned tsbuildinfo cache remains outside scope.

Publication note, 2026-08-23: implementation and continuation evidence for the
deterministic fixture/teardown wave were published in `75a5ccd` (`fix: make
critical integration fixtures deterministic`) and pushed with upstream to
`origin/agent/sync-v4-full-program`. This publication does not promote the
critical harness: the post-fix full run and fresh independent critique remain
the next gate, and the user-owned design-system tsbuildinfo cache remains
outside scope.

Publication note, 2026-08-23: final pointer reconciliation for this checkpoint
is `dce9c36`, following implementation commit `75a5ccd`; the remote branch is
the canonical continuation source. The next gate remains the post-fix full
critical run and fresh independent critique, not a global readiness promotion.

Plan revision note, 2026-08-23 (full critical pós-fix): a execução integral
serial, sem cache, com `hookTimeout` e `teardownTimeout` de 120 s, aplicou as
migrations `0000`–`0123` em PostgreSQL descartável e terminou em **386/387
testes**, **27/28 arquivos**, `exit 1`, com teardown concluído. A única falha é
o backfill de `pix-service-principals.test.ts`, que encontra
`users_account_id_accounts_id_fk` apenas no contexto integral; PIX isolado é
5/5 e provider → PIX 11/11. A hipótese operacional é usuário órfão introduzido
por uma suite anterior, ainda sem prova mínima. O artefato
`.agent/artifacts/CVG-002C6-critical-retest-postfix-2026-08-23.md` preserva o
comando e o resultado. O plano continua `IN_PROGRESS/PARTIAL`: reproduzir a
menor sequência contaminante, corrigir apenas seu isolamento, repetir o full
critical e obter crítica independente fresca antes de retomar SIGKILL,
failpoints, PIX PostgreSQL/RLS ou webhook retry/DLQ/fencing.

Plan revision note, 2026-08-23 (critical harness green): the encounter cash
receipt cleanup was converted to one transaction with savepoints and final
rollback in implementation commit `76d94a3`; the minimal cash→PIX prefix passed
30/30. The controlled serial full critical command then passed **28/28 files
and 387/387 tests**, exit 0, on a fresh PostgreSQL database after migrations
0000–0123, with teardown complete. An independent critic returned ACCEPT for
the isolation fix and recorded only the missing valid-commit coverage in that
specific test. The plan remains `IN_PROGRESS/PARTIAL`: proceed to child-process
domain SIGKILL/takeover, complete failpoints, PIX PostgreSQL/RLS and webhook
HTTP retry/DLQ/lease fencing; keep the single clinical-financial journey and
all ERP/production/release gates open.

Plan revision note, 2026-08-23 22:10 BRT (child-process bounded): the new
fixture/test are published in local implementation commit `eccdacc` and the
role-hardened focused run passed **2/2** in 81.65 s. API and worker use distinct
`LOGIN NOSUPERUSER NOBYPASSRLS` roles; SQL evidence covers inventory, billing,
audit, derived outbox, idempotency response and original outbox completion. An
independent critic returned **ACCEPT bounded**. The plan remains
`IN_PROGRESS/PARTIAL`: next add stale-owner fencing with A alive, explicit
source/hash assertions, two-tenant/A-B and hydration evidence, then extend
discharge/close/receipt failpoints and keep PIX/RLS, webhook, product and
release gates open.

Plan revision note, 2026-08-23 22:34 BRT (auditoria documental global): todos
os 1.456 arquivos atuais sob `docs/` foram inventariados; os 1.200 arquivos
textuais foram varridos, os 129 JSON foram parseados e o manifesto ordenado tem
SHA-256 `5f16bfc916277a232726ea670e140c9b87c4da3e0c091e529d560b097679e546`.
O handoff operacional vigente é
`docs/2026-08-23-auditoria-documental-global-e-handoff.md`, seguido pelo
checkpoint curto. A pesquisa oficial foi reconciliada com ezyVet, Shepherd,
Digitail, Vetspire, Covetrus, Provet, Instinct, FHIR R5, DICOMweb, LGPD e
CFMV. A barra global permanece `IN_PROGRESS/PARTIAL`: a jornada vertical e o
child-process são evidências bounded, enquanto stale-owner A vivo, A/B,
hidratação, failpoints completos, PIX/RLS, webhook, paridade, UX, operações e
release permanecem abertos.

Plan revision note, 2026-08-24 (critical gates and deployment guardrails): o
`test:critical` foi separado em bancos efêmeros fisicamente distintos por PID
e passou com URL explícita: base **28/28 arquivos, 387/387 testes** e processo
inpatient/SIGKILL **1/1 arquivo, 2/2 testes**, ambos exit 0. Inventory focado
passou 3/3 e bootstrap production-like 6/6. `deploy:check` e o checker JSON
de cutover passaram 12/12; migration consistency, OpenAPI, RLS e
`security:secrets` passaram. O manifesto de migração v2 foi registrado como
`PLAN_ONLY`, sem claim de execução/cutover. A revisão independente não encontrou
P0; registrou como P1 futuro a prova de duas execuções críticas concorrentes e
backoff/jitter do retry de inventário. O plano segue `IN_PROGRESS/PARTIAL`: os
gates globais, paridade Vetus, providers, SPA/WCAG, operações e release não
foram promovidos.

Plan revision note, 2026-08-24 (stale-owner A-alive fencing): o RED novo falhou
2/2 porque o fixture não expunha a perda da lease no `completeClaim` tardio.
Após a implementação da barreira de teste `SIGUSR2` e do evento explícito
`leaseLost`, a suíte do processo passou **4/4 testes em 1 arquivo**, exit 0,
em PostgreSQL efêmero novo. Os quatro casos cobrem os dois SIGKILL anteriores e
os dois cenários em que A permanece vivo, B assume `leaseVersion=2`, B conclui,
e A é liberado e rejeitado pelo CAS stale. A reconciliação SQL confirma uma
única cadeia de consumo/billing/audit/outbox, stock 8, idempotência 1,
attempts 2 e `lease_version=2`; Prettier e ESLint passaram. Evidência:
`.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md`. A rodada ainda
exige crítica independente fresca e não fecha a jornada completa, A/B entre
tenants, hydration cross-instance, PIX/webhook ou os gates globais.

Plan revision note, 2026-08-24 (billing source/hash and divergent replay): o
process harness passou a verificar `billing_items.source_entity_id` contra o
ID do consumo, o tipo `inventory_consumption`, o hash SHA-256 exato do envelope
canônico `{path, query, body}` e o replay com payload divergente retornando
`409 IDEMPOTENCY_CONFLICT` sem efeitos extras. O RED inicial revelou que o
dispatcher inclui path/query no hash; a asserção foi alinhada ao
`hashIdempotencyPayload` compartilhado. Não houve mudança de runtime: a rota e
o UoW já estavam corretos. GREEN: **4/4 testes em 125,96 s**, exit 0, em banco
efêmero novo, com SIGKILL/stale-owner ainda verdes. Evidência:
`.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md`. A crítica
independente fresca foi `APPROVE bounded`, sem P0/P1; falta publicar esta
rodada e reconciliar o SHA. A jornada global, A/B/hydration, failpoints,
PIX/webhook e os gates de produto/release seguem `IN_PROGRESS/PARTIAL`.

Plan revision note, 2026-08-24 (cross-instance hydration): a regressão
vertical reproduziu cache stale real na API secundária (4 passed, 1 failed,
exit 1, 33,11 s) quando ela foi inicializada antes da mutação primária. O
runtime passou a refrescar a fatia do account a partir do PostgreSQL antes das
leituras públicas inpatient/discharge; a suíte GREEN passou 5/5 em 36,06 s e
as regressões close/receipt e discharge passaram 5/5. Typecheck 70/70,
security:secrets, Prettier, ESLint focado e diff check passaram. A/B foi
comprovado na segunda instância e a crítica independente retornou APPROVE
bounded sem P0/P1.

O plano continua IN_PROGRESS/PARTIAL. A prova é limitada a inpatient/discharge
e não cobre concorrência durante hydration in-flight (P2), Redis distribuído,
todos os domínios cacheados, failpoints admission→receipt, PIX/webhook ou
paridade/release. Próxima iteração: publicar este slice, expandir failpoints
de discharge/close/receipt e seguir para PIX PostgreSQL/RLS e webhook
retry/DLQ/fencing.

Plan revision note, 2026-08-24 (worker production-like account scope): o
`apps/worker` falha fechado sem `WORKER_ACCOUNT_IDS`, mas o Deployment Helm não
injetava a variável. O RED do validador foi reproduzido antes da mudança; o
GREEN adicionou `worker.accountIds`, Secrets de staging/prod, schema,
`secretKeyRef` obrigatório e asserções estáticas/renderizadas, mantendo dev sem
escopo fixo. `pnpm validate:helm`, `security:secrets`, schema parse, diff check
e typecheck 70/70 passaram. O runner não tem `helm`, portanto `helm lint` e
`helm template` continuam pendentes em CI/runner autorizado. Evidência em
`.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md` e handoff em
`docs/2026-08-24-handoff-worker-account-scope.md`. O plano permanece
`IN_PROGRESS/PARTIAL`; próximo gate é cash-receipt SIGKILL/restart/replay real.

Publication note, 2026-08-24: implementation and handoff commit
`c93d672a47ad1bdb391c4af8a8963c012fd4219b` (`fix: enforce worker account
scope in Helm`) was pushed and reconciled with origin. Rendered Helm checks
remain pending in a Helm-enabled runner; the plan stays `IN_PROGRESS/PARTIAL`
and the next behavioral gate is the real API cash-receipt SIGKILL/restart/
replay proof.

Plan revision note, 2026-08-24 (cash receipt SIGKILL/restart/replay): o novo
launcher/teste iniciou o entrypoint real da API em processo filho, preparou a
jornada pública de internação até fechamento e segurou a transação de receipt
em trigger PostgreSQL antes do `SIGKILL`. O RED encontrou apenas limites do
harness e do contrato observável (`/health` e operação HTTP de idempotência),
sem relaxar runtime de produção. GREEN em `receipt_kill_green6` passou 1/1 em
60,95 s; rerun independente `receipt_kill_green5` passou 1/1 em 81,96 s. A
prova exige rollback do grafo inteiro, replay único balanceado, conflito de
payload e isolamento cross-tenant. A revisão independente foi `APPROVE bounded`
sem CRITICAL/HIGH; PID distinto, cleanup seguro e contagens financeiras
explícitas foram incorporados. Evidência:
`.agent/artifacts/CVG-002C6-cash-receipt-sigkill-2026-08-24.md`; handoff:
`docs/2026-08-24-handoff-cash-receipt-sigkill.md`. O plano continua
`IN_PROGRESS/PARTIAL`; Helm renderizado, failpoints completos, concorrência,
PIX/RLS, webhook, paridade, UX, operações e release permanecem abertos.

Publication note, 2026-08-24: o commit de implementação/documentação
`7aeb81d4081e84080fc6cf83759a193dd04a27dd` foi enviado e reconciliado com
origin. O handoff de receipt SIGKILL e o artefato são os ponteiros da próxima
sessão; o plano segue `IN_PROGRESS/PARTIAL`, com Helm renderizado, failpoints,
concorrência, PIX/RLS, webhook, paridade, UX, operações e release abertos.

Documentation continuity note, 2026-08-24: os ponteiros de retomada foram
reconciliados e publicados em `937d8ed` (`docs: reconcile continuation
pointers`). `docs/README.md`, `430-fonte-de-verdade-documental.md`, o checkpoint
curto, `CI_GATES.md`, o handoff global e o backlog histórico agora apontam para
os handoffs de 24/08, qualificam claims históricos de segurança e deixam claro
que o resumo `release-ready` não é aprovação de produção. O active-surface
link-check encontrou 81 Markdown e zero links locais quebrados; JSON, Prettier e
diff-check passaram. O plano continua `IN_PROGRESS/PARTIAL`; esta publicação
apenas torna a continuidade rastreável e não fecha ERP, produção, paridade,
operações ou release.

Plan revision note, 2026-08-24 (cash-receipt concurrency): a nova prova
processual iniciou duas APIs reais em PIDs distintos, sincronizou a corrida por
um advisory lock PostgreSQL com um backend `granted` e outro `waiting`, exigiu
`201/409`, reconciliação financeira única e zero residue do tenant B. O primeiro
critic encontrou a barreira insuficiente; após a correção, a crítica final foi
`APPROVE` com confiança alta. Lead: concorrência 1/1 em 41,02 s e SIGKILL
regressão 1/1 em 61,96 s; typecheck 70/70 e secrets passaram. Evidência em
`.agent/artifacts/CVG-002C6-cash-receipt-concurrency-2026-08-24.md` e handoff em
`docs/2026-08-24-handoff-cash-receipt-concurrency.md`. O plano segue
`IN_PROGRESS/PARTIAL`; o próximo P1 é promover a matriz processual ao CI com
execução serializada, enquanto bootstrap simultâneo, Helm, PIX/RLS, webhook,
paridade, UX, operações e release continuam abertos.

Plan revision note, 2026-08-24 (serialized critical process suite): o RED
confirmou que `pnpm test:critical:process` não existia e que `test:critical`
continha somente o processo inpatient-domain após a fase de banco/setup.
Builder e critic independente fecharam `QB-CI-PROC-01..03` e `QB-CI-REG-01`:
manifesto explícito de seis arquivos, execução serial com suffix efêmero por
arquivo, `--no-file-parallelism`, hooks/teardowns de 120 s e fail-fast. A suíte
real passou 6/6, exit 0, com 78,28 s + 39,19 s + 60,26 s + 40,67 s + 117,31 s

- 55,20 s = 390,91 s. O runner depende do teardown dos testes e não encaminha
  sinais por conta própria; isso é residual P2. O top-level `test:critical` não
  foi repetido após o wiring; a fase base foi preservada textualmente e a fase
  processual foi executada integralmente. O plano segue `IN_PROGRESS/PARTIAL`;
  próximo gap é bootstrap laboratorial simultâneo, depois Helm renderizado,
  PIX/RLS e webhook.

Plan revision note, 2026-08-24 (laboratory bootstrap concurrency): a rodada
RED reproduziu a colisão `laboratory_equipment_pkey` entre duas APIs reais. A
correção removeu o sentinel parcial e tornou os três lotes account-scoped
idempotentes com `ON CONFLICT DO NOTHING`; o teste recompila o pacote
diagnostics antes de iniciar dois filhos, amarra a barreira advisory à conta A
e verifica IDs canônicos exatos, A/B, reparo e customização. A primeira crítica
rejeitou a barreira global; a segunda aprovou BOOT-01/02/03 após o ajuste. A
execução final passou 1/1 em 66,64 s e a suíte crítica fresca passou 6/6, exit
0 (82,41 + 39,48 + 60,57 + 40,54 + 117,19 + 55,11 = 395,30 s). A evidência
está em `.agent/artifacts/CVG-002C6-laboratory-bootstrap-concurrency-2026-08-24.md`
e `docs/2026-08-24-handoff-laboratory-bootstrap-concurrency.md`. O plano
continua `IN_PROGRESS/PARTIAL`; próximo passo é Helm renderizado em runner
autorizado, seguido de PIX/RLS e webhook retry/DLQ/fencing.

Plan revision note, 2026-08-24 (Helm render path + PIX runtime role): o
validador Helm corrigiu o escopo do overlay no caminho `lint/template`; a
validação real com Helm v3.15.4 passou dev/staging/prod, enquanto o fallback
estático e a ausência de cluster/Secrets reais permanecem explicitamente
limitados. O teste PIX deixou de usar `postgres`: roles descartáveis
`LOGIN NOINHERIT NOBYPASSRLS`, A/B, negativos worker/API, quatro checkpoints de
SIGKILL/replay e stale fencing passaram 8/8 em 142,33 s. A política incluiu o
helper non-cash e a migration 0124 fixou seu search_path. Evidências:
`.agent/artifacts/CVG-002C6-pix-runtime-role-2026-08-24.md` e
`docs/2026-08-24-handoff-pix-runtime-role.md`. O plano segue
`IN_PROGRESS/PARTIAL`; o próximo gap P0 é o executor HTTP durável de webhook
com claim/retry/DLQ/lease fencing, enquanto provider real, Redis, RLS global,
DR/RPO, paridade, UX, operações e release continuam abertos.

Plan revision note, 2026-08-24 (report retry lease/fencing): a migration
`0143_reports_delivery_leases.sql` e o repository PostgreSQL agora fazem claim
account-scoped com `FOR UPDATE SKIP LOCKED`, expiração e fence por token. O
worker one-shot passou a reivindicar a delivery antes do retry; migration 2/2,
module-reports 11/11, PostgreSQL reports 2/2 e processo real 5/5 passaram em
bancos efêmeros. O plano continua `IN_PROGRESS/PARTIAL`: esta é evidência
bounded do lease, não homologação do provider externo, produção, ERP, paridade,
operações ou release. O próximo P0 deve ser escolhido entre a cobertura
operacional/workbench de relatórios Vetus e a próxima lacuna da jornada
clínico-financeira.

Plan revision note, 2026-08-24 (reports workbench export): o workbench passou a
exportar CSV do recorte carregado nas trilhas de auditoria, financeiro e
atendimento com sanitização de fórmula, escape de planilha, download browser e
mensagem de sucesso. O RED/GREEN foi coberto por 3 testes do utilitário, suíte
do componente 30/30, build/typecheck da SPA e E2E direcionado 1/1. A paridade
estrutural de relatórios agora tem UI do workbench, utilitário, migration de
lease e provas unitária/componente/E2E, mas o relatório Vetus permanece
`BLOCKED` pelas trilhas sem fonte analítica/exportação completa e pela ausência
de contrato server-side auditável para esse snapshot. O próximo P0 continua
entre fechar o restante do workbench e avançar a jornada clínico-financeira.

Plan revision note, 2026-08-24 (reports workbench inventory export): os quatro
recortes de estoque que já possuem fonte local carregada — estoque, movimentos,
notas fiscais derivadas dos lotes e produtos — passaram a expor `Exportar CSV`
no workbench. O RED/GREEN reutilizou o contrato imutável do exportador: suíte do
componente 30/30, build da SPA exit 0 e E2E Chromium 2/2 para agenda e estoque.
Isso é exportação do snapshot carregado no cliente; não inventa saldo, não
transforma uma nota derivada em documento fiscal e não fecha transferências,
ajustes, inventário físico, custo médio ou trilhas server-side auditáveis. O
relatório Vetus segue parcial/bloqueado nas famílias financeiras e cadastrais
restantes. Stop decision remains `ACTIVE`.

Plan revision note, 2026-08-24 (reports workbench payable export): o workbench
passou a consumir o subledger autoritativo de `/financial/payables` para
Contas a Pagar e, com `status=paid`, Contas Pagas. O RED/GREEN foi coberto por
30/30 testes utilitário/componente, build da SPA e E2E Chromium 3/3 para
agenda, estoque e contas a pagar. A ação continua somente leitura; baixas,
cancelamentos e conciliação seguem nas telas financeiras com suas permissões.
O relatório Vetus permanece parcial/bloqueado nas famílias de cheques,
pagamento antecipado, cadastros e personalizados, além da ausência de export
server-side auditável. Stop decision remains `ACTIVE`.

Plan revision note, 2026-08-24 (server-side audited payable export): o motor
de reports agora conhece `financial-payables`, lê todas as páginas do
`FinancialPayablesService`, valida status/busca/período, persiste execução e
artefato pelo repository e registra auditoria na rota. O workbench de Contas a
Pagar e Contas Pagas baixa o artefato server-side; a suíte direcionada da API
passou 7/7, o módulo de reports 12/12, a página SPA 29/29, o build SPA e o
download Chromium 1/1. O CSV server-side também neutraliza fórmulas de
planilha. O incremento é `GREEN bounded` sob
`.agent/artifacts/CVG-002C6-server-audited-payables-export-quality-bar-2026-08-24.md`;
cheques, adiantamentos, cadastros/customizados, provider, produção, paridade,
operações e release continuam abertos. A auditoria independente não pôde ser
executada nesta conta; o veredito permanece condicional aos gates locais.

Final verification note, 2026-08-24: a rota server-side passou 7/7, o módulo
de reports 12/12, a página SPA 29/29, o gate Enterprise Chromium 5/5, o
typecheck monorepo 70/70, security:enterprise e o contrato de paridade 4/4.
O vertical clínico-financeiro PostgreSQL segue 5/5. A revisão temporal local
não encontrou gap crítico nesta fatia; sem revisor independente disponível, o
resultado permanece CONDITIONAL_PASS. O próximo P0 continua entre a jornada
clínico-financeira completa e uma fonte autoritativa para cheques,
adiantamentos, cadastros e relatórios customizados.

Plan revision note, 2026-08-24 (server-side audited receivables export): o
motor de reports passou a conhecer `financial-receivables`, lendo todas as
páginas de `EncounterFinancialService.listReceivables`, validando
`open|settled`, busca e período com datas semânticas de vencimento/liquidação,
e persistindo execução/artefato com auditoria. O workbench de Contas a Receber
e Contas Recebidas usa o artefato server-side, sem inventar cheques ou
adiantamentos. A nova barra passou API 10/10, reports 12/12, SPA 30/30,
Chromium 11/11 (Enterprise 6/6), typecheck 70/70, security sem advisories
critical/high/moderate, parity 4/4 e PostgreSQL clínico-financeiro 7/7.
O incremento é `GREEN bounded` sob
`.agent/artifacts/CVG-002C6-server-audited-receivables-quality-bar-2026-08-24.md`;
produção, providers, Redis, paridade completa, operações, WCAG e release
continuam abertos. Sem revisor independente disponível, o resultado é
`CONDITIONAL_PASS` baseado nos gates executáveis e revisão temporal local.

Plan revision note, 2026-08-24 (inpatient command idempotency): a admissão e a
criação de diária passaram a executar no `TenantUnitOfWork`, incluindo espera
de persistência e auditoria antes da conclusão. O RED de rota falhou nos dois
seams novos; o GREEN passou 16/16. O vertical HTTP/PostgreSQL com duas APIs e
roles `NOBYPASSRLS` passou 5/5, comprovando replay/conflict da admissão e da
diária, uma linha idempotente por comando e hidratação da API secundária para
o billing concorrente. O restart controlado passou 1/1 e o child-process
SIGKILL/takeover passou 4/4. Evidência: `.agent/artifacts/CVG-002C6-inpatient-command-idempotency-2026-08-24.md`
e `docs/2026-08-24-handoff-inpatient-command-idempotency.md`. O plano segue
`IN_PROGRESS/PARTIAL`: handoffs/progress/occurrences, failpoints cross-domain,
provider/Redis/produção, RLS/FORCE RLS global, paridade, WCAG, operações,
cobertura e release permanecem abertos; não há aprovação independente nesta
conta.

Plan revision note, 2026-08-24 (clinical handoff/progress/occurrence
idempotency): progress e occurrence passaram a usar explicitamente o
`TenantUnitOfWork`, com persistência, auditoria e recuperação de cache em caso
de falha. O callback de progress agora é awaitable e aguarda a projeção
`inpatient_progressed` no `clinical_timeline`. A vertical HTTP/PostgreSQL com
duas APIs passou 5/5, comprovando replay/conflict de handoff send/ack,
progress e occurrence, uma linha durável por comando e timeline clínica
persistida; a rota passou 19/19, restart 1/1 e child-process SIGKILL/takeover
4/4. Evidência: `.agent/artifacts/CVG-002C6-inpatient-clinical-notes-idempotency-2026-08-24.md`
e `docs/2026-08-24-handoff-inpatient-clinical-notes-idempotency.md`. O plano
segue `IN_PROGRESS/PARTIAL`: assignment/transfer/status inpatient, failpoints
cross-domain restantes, provider/Redis/produção, RLS/FORCE RLS global,
paridade, WCAG, operações, cobertura e release continuam abertos; não há
aprovação independente nesta conta.

Plan revision note, 2026-08-24 (inpatient bed/status idempotency): assignment,
transfer e update-status passaram a usar explicitamente o command seam
tenant-scoped, aguardando persistência, auditoria e a projeção clínica de
transferência antes da resposta. A vertical HTTP/PostgreSQL com duas APIs
passou 5/5, comprovando replay/conflict dos três comandos, uma linha durável
por chave, timeline `inpatient_transferred` e liberação dos três leitos após a
alta; a rota passou 22/22 e o failpoint unitário cobriu a recuperação de cache.
Evidência: `.agent/artifacts/CVG-002C6-inpatient-bed-status-idempotency-2026-08-24.md`
e `docs/2026-08-24-handoff-inpatient-bed-status-idempotency.md`. O plano segue
`IN_PROGRESS/PARTIAL`: failpoints cross-domain reais, restart/SIGKILL dos
endpoints, provider/Redis/produção, RLS/FORCE RLS global, paridade, WCAG,
operações, cobertura e release permanecem abertos; não há aprovação
independente nesta conta.

Plan revision note, 2026-08-24 (inpatient cross-domain failpoint/recovery): um
failpoint PostgreSQL real na projeção `clinical_timeline` confirmou rollback
conjunto de status, prontuário, auditoria e idempotência; a primeira tentativa
retornou 500 sem resíduo e o retry com a mesma chave retornou 200 com uma única
timeline/auditoria/idempotência. A correção adicionou
`MedicalRecordsService.refreshAccount(accountId)` e a recuperação tenant-scoped
do cache médico após rollback. O harness de processo também passou a exercitar
`inpatient.status.update`: SIGKILL/replay passou 2/2 nos checkpoints de claim e
pós-comando; a regressão vertical completa passou 6/6. Builds, medical-records
17/17 e inpatient routes 22/22 permanecem verdes. Evidência:
`.agent/artifacts/CVG-002C6-inpatient-cross-domain-failpoint-recovery-2026-08-24.md`
e `docs/2026-08-24-handoff-inpatient-bed-status-idempotency.md`. O plano segue
`IN_PROGRESS/PARTIAL`: failpoints específicos de leito/transfer/auditoria,
restart desses endpoints, provider/Redis/produção, RLS/FORCE RLS global,
paridade, WCAG, operações, cobertura e release permanecem abertos; não há
aprovação independente nesta conta.

Plan revision note, 2026-08-24 (inpatient bed/transfer/audit recovery): a
Quality Bar foi ampliada com failpoints PostgreSQL temporários para ocupação de
leito em assignment, ocupação do destino em transfer e persistência de
auditoria. Os cenários confirmaram rollback sem resíduo e retry same-key
idempotente; a matriz child-process passou a semear leitos no PostgreSQL,
usar `SectorBedService` com `DatabaseClient` e provar SIGKILL/replay de
assignment/transfer em 4/4. A regressão completa de processo passou 10/10 e a
matriz de failpoints passou 5/5. Evidência:
`.agent/artifacts/CVG-002C6-inpatient-cross-domain-failpoint-recovery-2026-08-24.md`,
`docs/2026-08-24-handoff-inpatient-bed-status-idempotency.md`,
`apps/worker/test-fixtures/inpatient-domain-process.ts` e
`tests/integration/process/inpatient-domain-sigkill.test.ts`. O plano segue
`IN_PROGRESS/PARTIAL`: produção/providers/Redis, RLS/FORCE RLS global, DR/RPO,
paridade Vetus, WCAG, operações, cobertura e release continuam abertos; sem
revisor independente e sem promoção do gate global.

Plan revision note, 2026-08-25 (API persistence/RLS fixture): a dívida de harness foi corrigida com uma fixture PostgreSQL UUID-backed, principals/roles/staff e contexto explícito de tenant. API `test:all` passou 371/371, incluindo database-persistence 17/17, após reset até migration 0143; notifications 10/10, medical-records 17/17, diagnostics 27 + 1 skip, inpatient 17/17, surgery 9/9, builds afetados, Prettier e diff-check passaram.

Os repositories inpatient, surgery, diagnostics e medical-records agora executam as operações de produção em transações tenant-scoped; o fallback fake de medical-records é limitado a NODE_ENV=test sem pool/contexto. A revisão independente pós-fix de Noether foi CONDITIONAL_PASS, sem blocker/HIGH, com MEDIUM de compatibilidade pelo DatabaseClient injetado mas não usado em diagnostics e LOWs de defesa em profundidade. O plano continua IN_PROGRESS/PARTIAL; catálogo RLS/FORCE RLS alvo, produção, providers, Redis, DR/RPO, paridade, WCAG, cobertura, operações e release permanecem abertos. Nenhum commit/push foi feito.

Plan revision note, 2026-08-25 (DB-001 migration source of truth): a TDD RED
guardrail foi criada para impedir uma segunda trilha de migration. O GREEN
mantém `packages/db/src/migrate.ts` e `src/seed.ts` como entrypoints oficiais,
remove `drizzle-kit` dos manifests alvo e faz `db:generate`, `db:push` e o
`db:migrate` histórico do shared-database falharem fechado com orientação
explícita. CI, Compose, Helm, cutover e bootstrap de testes foram verificados
contra a trilha canônica; o lockfile foi sincronizado e os dois pacotes ainda
compilam.

Evidência: `pnpm validate:migration-source`, 5/5 contratos focados, builds dos
dois pacotes, execução negativa dos comandos legados, `pnpm install
--offline --frozen-lockfile`, Prettier e `git diff --check`; Aristotle aprovou
read-only sem blocker/P0/P1. O plano permanece `IN_PROGRESS/PARTIAL`: migration
positiva nova, alvo RLS/FORCE RLS, restore/RTO-RPO, providers, Redis, parity,
WCAG, cobertura, operações e release continuam abertos. Não houve commit/push.

Plan revision note, 2026-08-25 (DB-002 stale migration artifacts): o RED
reproduziu a presença de `packages/db/src/migrate.js`. O scan de consumidores
confirmou que Compose/Helm executam somente `packages/db/dist/migrate.js`,
gerado pelo build do `migrate.ts`; não há consumidor ativo do JS fonte,
companions `.d.ts`/`.map` ou `drizzle.config.ts`. Um segundo RED, após a crítica
do scout, confirmou que os três companions source-level também eram stale. O
GREEN removeu a família completa de cinco artefatos, adicionou o teste/guardrail
de ausência e preservou migrations e SQL histórica.

Evidência: artifact test RED antes de cada remoção; depois, migration/CI/build
suite 15/15, `pnpm validate:migration-source`, builds dos dois pacotes,
`node --check` do dist runner, scan de consumidores e diff-check passaram.
Huygens aprovou independentemente o escopo DB-002-A–E anterior; a extensão
dos companions aguarda nova crítica. O gap P1 é que os novos
guardrails/docs/testes e a limpeza seguem untracked/unstaged até autorização
de publicação. O plano continua
`IN_PROGRESS/PARTIAL`; target RLS/DR, migration positiva, providers, Redis,
parity, WCAG, cobertura, operações e release permanecem abertos. Não houve
commit/push.

## Plan revision note, 2026-08-25 (CVG-001 setup-to-session process proof)

The final local setup slice is now reconciled with the source-backed evidence.
The real two-API process test initially failed with a 503 because a `NOINHERIT`
login role did not activate the installer membership; the implementation now
uses `SET LOCAL ROLE cvg_installer` only inside the atomic capability
transaction. The final process test passed 1/1 and proved status propagation,
single installation, cross-replica login/session, refresh rotation and stale
cookie rejection, logout revocation on both replicas and second-setup 409.

Focused setup tests passed 26/26, installation/ACL integration 9/9,
CI/runtime-role contracts 15/15, cleanup 5/5 and full typecheck 70/70. The
security/reliability review approved the bounded slice. This does not promote
the wider CVG-001 Quality Bar: wizard accessibility, invalid/oversize input,
target RLS/FORCE RLS, Redis/failover, coverage, production, operations and
release remain open. No staging, commit or push occurred.

## Plan revision note, 2026-08-25 (setup wizard accessible descriptions)

The setup wizard's visible token/password hints now have stable IDs and are
announced through `aria-describedby`; the same `DsInput` behavior applies to
input, textarea and select, while a visible error supersedes the hint target.
TDD RED/GREEN and review evidence are recorded in
`VFY-CVG-001-SETUP-A11Y-001`, `...REGRESSION-001` and `...REVIEW-001`.

The final focused component suite passed 9/9, the full design-system suite
passed 26/26, SetupPage passed 8/8, and design-system typecheck/SPA vue-tsc,
targeted lint, Prettier and diff-check passed. This is a local bounded DOM
semantic correction; browser Playwright/axe, invalid/oversize HTTP, target
operations, global coverage and release remain open.

## Plan revision note, 2026-08-25 (setup negative HTTP matrix)

The real setup process proof now rejects malformed JSON, non-object payloads,
invalid bootstrap tokens, invalid fields and bodies above
`SETUP_MAX_BODY_BYTES` before the valid installation. The final two-API
PostgreSQL run passed 1/1, kept `setupRequired=true` after all rejects, avoided
echoing the invalid token and then completed the existing setup/session,
refresh and logout assertions. An independent reviewer approved the matrix
against the route validation order. Browser Playwright/axe, target operations,
Redis, DR/RPO, global coverage and release remain open.

## Plan revision note, 2026-08-25 (setup wizard browser/axe checkpoint)

The built-SPA setup wizard now passes the official `pnpm test:e2e:spa:setup`
gate 4/4 in Chromium. After an independent review found a broad retry route and
partial success payload assertion, the spec uses one exact request contract for
status, success and retry: origin/URL, method, no cookie and complete payload.
The final suite covers keyboard/focus, form naming, `aria-describedby`,
`aria-invalid`, 390px layout, WCAG 2.1/2.2 axe tags and cleanup/retry recovery.

The axe RED found 3.96:1 light-theme auxiliary text and was fixed through the
shared token plus opaque setup-context text. SetupPage 8/8, DsInput 9/9 and SPA
typecheck/build passed; the spec is selected in the package script and CI
enterprise list. Kepler's final read-only review returned
`APPROVE_BOUNDED` with no HIGH/MEDIUM findings. The plan remains
`IN_PROGRESS/PARTIAL`; broader browser journeys, target RLS/DR/Redis, parity,
coverage, operations and release remain open, and no commit/push occurred.

## Plan revision note, 2026-08-25 (browser enterprise and clinical continuation)

The selected enterprise browser set passed 15/15, and the independent critical
Owner → Patient → Encounter → clinical entry → billing item → close journey
passed 1/1 with cleanup. Appointment and inpatient suites passed 2/2 each.

The adjacent billing suite is 5/6: the cash-settlement case cannot reach the
post-receipt assertion under the default local in-memory API because
`API_DISABLE_INCOMPATIBLE_DB_REPOS=1` omits the persistent cash-receipt route.
The `=0` retry failed at startup because the local database lacks the seeded
E2E `user_admin` session fixture. This remains an environment/harness gap and
does not promote the financial browser journey. Next action is the canonical
seeded Docker/CI E2E, followed by target RLS/restore/Redis evidence.

## Plan revision note, 2026-08-26 (CVG-003 transaction authorization linearization)

Continuation recovery reconciled the mission attachment, active plan, state,
backlog, ledgers, gates and mixed worktree. Feynman identified the stale
CVG-004 pointer and the missing transaction-level authorization boundary;
Herschel separately confirmed that reports/export parity remains an open P1.
The next authorized P0 slice was therefore frozen as CVG-003 transaction-level
authorization linearization for protected application writes.

The intentional RED unit test failed before the helper export existed, and the
disposable two-instance PostgreSQL/HTTP race demonstrated that the old
final-guard-only implementation allowed permission revocation to commit while
the protected write was paused. The implementation now acquires an
account-scoped `pg_advisory_xact_lock` inside the existing tenant unit of work
before the final fresh authorization read and holds it through commit or
rollback. The final unit, API regression and exact trigger/listener race are
green; Parfit's independent review returned PASS with no Critical, High or
Medium finding.

This is `PASS_BOUNDED` evidence for protected application writes that enter the
existing tenant command/UoW boundary. Read-only authorization, direct SQL or
admin writes, future bypass routes, target/provider behavior, full parity,
operations, coverage and release remain outside the claim. CVG-003 and the
overall program remain `IN_PROGRESS/PARTIAL`; the next action is ledger/state
reconciliation followed by the next explicitly testable open control.

## Plan revision note, 2026-08-26 (CVG-004 audited Cheques report correction)

The next bounded parity control was corrected after independent inspection
rejected the initial UI-only/N+1 projection. The authorized implementation now
registers `financial-cheques`, queries persisted `counter_sale_payments` through
the tenant-aware counter-sales repository, filters by payment `createdAt`, and
executes/exports through the existing audited ReportsService boundary. The SPA
renders only persisted payment and comanda facts and clears stale rows on a
failed refresh.

The query uses a half-open UTC date interval and a 10,000-row defensive bound
with a max+1 database read, so report execution cannot materialize an unbounded
snapshot. No schema migration, lifecycle mutation, bank/due/settlement/return
inference, provider, Paymento Antecipado behavior, target or release claim was
authorized. CVG-004 remains `IN_PROGRESS/PARTIAL`; only this local report
capability can be recorded as `PASS_BOUNDED` after the final independent review
and ledger reconciliation.

## Plan revision note, 2026-08-26 (CVG-004 scheduled Cheques worker source)

The next report gap was narrowed after discovery showed that the API/SPA
Cheques slice already had a persisted source while the scheduled worker
returned no rows for that report id. The bounded continuation adds a typed
`cheques` source to the worker resolver, reuses the existing tenant-aware
`CounterSalesService` in database bootstrap, forwards schedule date filters
and fails closed when the source is unavailable. It does not add provider,
credential, migration, target or production behavior.

The intentional RED failed at worker typecheck before the source was wired; a
follow-up RED caught a numeric schedule date before strict boundary validation.
Direct coverage then added impossible-calendar and inverted-interval cases.
The GREEN package suite passed 23 runner tests and the auxiliary worker
suites; the real PostgreSQL one-shot process suite passed 6/6 with a persisted
check payment and a persisted report execution assertion. The scheduled-job
failure path also no longer creates a delivery without `executionId` when the
source fails before execution; post-execution delivery failures retain the
retry identity. The independent review returned PASS with no
Critical/High/Medium finding; the one-tenant process fixture remains a
documented LOW limitation. The slice is `PASS_BOUNDED` only. Complete Vetus
report parity remains open for Pagamento Antecipado, cadastros/personalizados
and other families, as do provider, target, remote CI, restore/RTO-RPO,
coverage, accessibility, operations and release gates.

## Plan revision note, 2026-08-26 (fila de compras persistidas na SPA)

O próximo recorte local autorizado removeu a divergência entre a página de
Compras e o contrato persistido já existente. A fila agora consome
`GET /inventory/purchases` através do serviço account-scoped, preserva linhas,
status, fornecedor e totais persistidos, calcula o aberto com o recebimento
registrado, limpa estado stale em erro e não inventa previsão de entrega. A
rota de detalhe read-only mostra todas as linhas, auditoria, estado ausente e
retry sem adicionar mutações.

O TDD RED falhou antes da implementação porque a página não chamava
`listPurchases`. O GREEN passou 25 arquivos/103 testes da suíte de inventário,
typecheck/build da SPA e o E2E focado 1/1 da fila ao detalhe. A suíte do módulo
de inventário passou 24/24; OpenAPI, segurança, secrets, migration-source,
deploy-surface, Prettier e diff check também passaram. O browser E2E usa stub
de API e, portanto, prova o contrato visual/navegação, não uma escrita real em
PostgreSQL nem dois tenants em restart/concurrency/failure.

O resultado é `PASS_BOUNDED` apenas para esta integração local. CVG-004 segue
`IN_PROGRESS/PARTIAL`: paridade geral 98/100 com 4/11 áreas verificadas e
`NOT VERIFIED`, clínica 2/3, readiness 95/100 (42 PASS, 3 WARN, 1 FAIL),
Pagamento Antecipado, cadastros/personalizados, providers, target,
backup/restore, CI remoto, coverage, acessibilidade ampla, operações e
release permanecem abertos. Nenhum commit, push, staging, deploy, provider,
target ou produção foi tocado.

As duas revisões independentes do ciclo encontraram e motivaram correções de
KPI, navegação ao detalhe e estado de erro. Tentativas posteriores de parecer
final estreito não retornaram e foram encerradas; a aceitação bounded usa as
correções, a inspeção direta pós-correção e os testes locais, sem inventar um
parecer final de agente.

## Plan revision note, 2026-08-26 (exports auditados de cadastros)

O próximo recorte local autorizado conectou os cadastros persistidos de
Clientes e Animais ao caminho server-side auditado já existente. O catálogo
agora expõe `registration-owners` e `registration-patients`, a API filtra a
fonte existente por conta e por `createdAt` com datas ISO estritas, e a SPA
aciona a execução/exportação CSV auditada. Valores opcionais permanecem
vazios; nenhum fato Vetus ausente é inferido.

O RED falhou na ausência do botão de exportação SPA e na ausência da definição
API. O GREEN passou o módulo Reports 13/13, as rotas compiladas 12/12, o
workbench 35/35, builds/typechecks e o E2E browser de Clientes/Animais 2/2
com as requisições de execução e exportação verificadas. O limite bounded da
fonte é 10.000 linhas. O revisor especializado não iniciou por política de
modelo e a tentativa default expirou sem parecer; nenhuma aprovação de agente
é inferida.

Este resultado é `PASS_BOUNDED` apenas para os dois cadastros. Serviços,
fornecedores, Pagamento Antecipado, personalizados e demais famílias de
relatórios continuam abertos, assim como PostgreSQL browser real, dois
tenants/restart/concurrency/failure, providers, target, backup/restore, CI
remoto, coverage, acessibilidade, operações e release. Nenhuma mutação
externa, commit, push, staging, deploy ou produção foi feita.

## Plan revision note, 2026-08-26 (export auditado do cadastro de serviços)

O recorte local seguinte conectou o catálogo persistido de Serviços ao caminho
server-side auditado existente. `registration-services` exige `service.read`,
usa apenas fatos da conta autenticada hidratados pelo `ServicesService` em
modo database, valida períodos ISO estritos, preserva opcionais como células
vazias, limita 10.000 linhas e recusa o fallback em memória. A SPA mantém a
lista read-only e aciona execução/exportação CSV auditada.

O RED foi confirmado no catálogo, na rota compilada e na ação SPA. GREEN passou
17/17 no módulo Services, 14/14 no módulo Reports, 14/14 nas rotas compiladas,
56/56 nas suítes de Reports da SPA, build/typecheck e Playwright 3/3 após
reconstruir o `dist` servido; a falha anterior de browser foi corretamente
classificada como artefato stale. A revisão independente não iniciou por
incompatibilidade do modelo com a conta; nenhuma aprovação foi inferida.

O resultado é `PASS_BOUNDED` apenas para o export local de Serviços. Paridade
Vetus geral/clínica, worker público real, fornecedores, Pagamento Antecipado,
personalizados e demais relatórios, providers, target, dois tenants/restart/
concurrency/failure, backup/restore, CI remoto, coverage, acessibilidade,
operações e release continuam abertos. Não houve commit, push, staging,
deploy, provider, target ou produção.

## Plan revision note, 2026-08-26 (CVG-004 public API to worker chain)

The next open composition gap was narrowed to the existing
`billing.record.created` path. The authorized fixture calls the real
authenticated billing route with separate restricted API and worker roles,
observes the persisted pending outbox event, runs the real worker entrypoint,
checks consumer health and durable inbox claims, then restarts the worker to
verify no duplicate delivery. The local process proof is now `PASS_BOUNDED`.

The first attempt failed only because its polling helper used a placeholder
event ID; that harness failure is recorded without claiming a product RED. The
corrected formatted reruns passed. This does not close distributed worker
observability, retry/DLQ failure injection, external connectors, Vetus import,
full parity, provider, target or release gates. No migration, provider,
credential, deployment, production or external mutation was authorized.

## Plan revision note, 2026-08-26 (CVG-004 public laboratory structured-results process)

The bounded laboratory slice is complete at `PASS_BOUNDED`. The fresh
authenticated process proof covers order creation, collected/in-analysis/
reported/recollected transitions, server-derived signer identity, structured
ALT persistence and search projections, idempotent report replay, result and
signature clearing on recollection, restricted API/worker runtime roles, and
account isolation. Three disposable PostgreSQL runs passed 1/1, including the
runner-equivalent critical-process invocation.

The baseline test passed before any production-source change, so the honest
TDD result is `BASELINE_PASS_NO_PRODUCT_RED`; only the process test and
control-plane evidence were added. The critical serial-process manifest now
contains 9 entries. The independent reviewer timed out and no approval is
claimed. General and clinical Vetus parity remain `NOT VERIFIED`, enterprise
readiness remains 95/100, and provider/Live Lab, distributed worker failure
proof, import, release and other external gates remain open. No commit, push,
staging, deploy, provider, target, credential, migration or production
mutation was authorized.

## Plan revision note, 2026-08-26 (CVG-004 bounded supplier/expense report export)

The persisted finance expense catalog was connected to the existing audited
ReportsService as `registration-suppliers`. The bounded contract requires
`billing.read`, derives the account from the authenticated principal, applies
strict `createdAt` dates and existing catalog filters, drains deterministic
pages with a 10,000-row guard, and exports only persisted fields. Migration
0146 is additive and protects both finance catalog relations with tenant RLS
and FORCE RLS. The SPA uses the same server execution/export path and keeps
`description` explicitly labeled as `Descrição`.

The focused result is `PASS_BOUNDED`: Reports 15/15, API 382/382, SPA 36/36,
finance/global RLS 4/4, migration unit 1/1, canonical runtime 1/1, and official
coverage above the 80% threshold. An independent read-only critique found and
the implementation corrected seven concrete P1/P2 issues covering migration
policy safety, source injection, SPA/date alignment, ID scope, OpenAPI,
pagination/source bounds and RLS write coverage. No reviewer approval is
claimed. General Vetus parity (98/100, 4/11 verified), clinical parity
(100/100, 2/3 verified) and enterprise readiness (95/100, 42 PASS/3 WARN/1
FAIL) remain open, as do provider/Live Lab, distributed worker failure proof,
import, remaining reports, target, operations and release evidence. No commit,
push, staging, deploy, provider, target or production mutation occurred.

## Plan revision note, 2026-08-26 (CVG-004 inventory transaction-context repair)

During the fresh critical regression, Flow 7 exposed a real composition defect:
the no-idempotency tenant-command fallback opened a database transaction but
did not install the canonical `TenantTransactionContext`; the route failed
closed with `503 TRANSACTION_REQUIRED`. The TDD RED was preserved before the
metadata contract and implementation were extended.

The bounded GREEN forwards actor/correlation metadata through the API
composition root into `runInTenantTransactionContext`, with no schema or
migration change. The helper test passed 8/8, the API 383/383, Flow 7 1/1, the
critical HTTP file 11/11 and the full PostgreSQL/Redis SPA suite 64/64. Global
parity/readiness, target, provider, access-profile, operations and release
gates remain open. The fresh reviewer was unavailable; no reviewer approval is
claimed.

## Plan revision note, 2026-08-26 (CVG-003 canonical seven-profile access matrix)

The local access-governance gap is now a bounded `PASS_BOUNDED` slice. A
dependency-free v2 catalog contains 64 permission seeds and seven exact role
projections; the access-control module, setup projection and database seed use
that source. Migration 0147 idempotently aligns only the seven named system
roles, and dedicated route contracts now protect prescription executions,
discharges and LGPD requests with their own permission codes.

The fresh disposable PostgreSQL/Redis matrix passed 1/1 across all seven
profiles, representative allow/deny boundaries, governance restrictions and
cross-account access-subject isolation. The full API passed 385/385, catalog
contracts 4/4, and typecheck/lint/security/structural controls passed. The
full SPA aggregate had one queue visual `networkidle` timeout among 65 tests;
the same test passed on the immediate deterministic rerun, so the aggregate
is recorded honestly as a transient flake rather than 65/65.

The independent reviewer was unavailable and no approval is inferred. Parent
CVG-003 and global parity/readiness remain `IN_PROGRESS/PARTIAL`; target,
provider, external LGPD retention/masking and operational acceptance,
distributed worker failure evidence, remaining parity, accessibility,
operations and release gates remain open. No commit, push, staging, deploy,
provider, target, credential or production action occurred.

## Plan revision note, 2026-08-26 (CVG-004 bounded advance-payment report)

The bounded `Pagamento Antecipado` read path is now `PASS_BOUNDED`. An
additive canonical `0148` migration provides immutable issuance facts and
append-only compensation allocations in BRL minor units, with composite
tenant foreign keys, account-scoped idempotency, derived balance protection and
RLS/FORCE RLS. The audited ReportsService definition, authenticated API source
and SPA workbench now use only persisted facts; owner search and compensation
status are real server filters, and CSV export remains formula-neutralized.

Fresh evidence passed Reports/migration `17/17`, API `389/389`, SPA `38/38`,
disposable PostgreSQL `5/5`, canonical runtime `1/1`, full typecheck/lint,
coverage `1,954` passed/`1` skipped at 82.09% statements, 80.10% branches,
88.53% functions and 82.09% lines, plus OpenAPI, RLS, secrets,
migration-source, deploy-surface, static Helm, dependency security and parity
contract controls. The independent critique initially found missing SPA
filters and incomplete table-only composition; both were corrected and
rechecked. No reviewer approval is inferred.

This is local read-only evidence only. Advance generation/compensation,
cancellation/refund, cash/journal integration, providers, Vetus import,
target behavior, complete parity, accessibility, operations, backup/restore,
remote CI and release remain open. No commit, push, staging, deploy, provider,
target, credential or production mutation occurred.

## Plan revision note, 2026-08-26 (CVG-004 bounded advance-payment write lifecycle)

The separately authorized bounded write slice is now `PASS_BOUNDED`. Manual
issuance and append-only compensation use the existing immutable 0148 ledger,
`billing.manage`, exact BRL cents, server-derived tenant/actor identity,
idempotent tenant UoW commands, transaction-scoped audit/outbox records and
the database over-allocation guard. The Finance page consumes persisted
summaries and exposes explicit loading, empty, error, retry and success states;
synthetic owner credit balance state is no longer the financial source.

Fresh evidence passed API 5/5 and 394/394, focused SPA/service 7/7 and full SPA
1,036/1,036, disposable PostgreSQL 7/7, full typecheck/lint/build, official
coverage 1,954 passed/1 skipped at 82.09% statements, 80.07% branches, 88.53%
functions and 82.09% lines, plus OpenAPI, RLS, migration-source,
deploy-surface, static Helm, secrets, enterprise security and parity-contract
controls. TDD reproduced and corrected malformed encoded UUID handling and
unsafe persisted bigint conversion. The independent explorer was unavailable
because of its model usage limit; no reviewer approval is inferred.

This closes only manual issuance and compensation. Cancellation/refund/reversal,
cash/bank/PIX, accounting journal, receivable settlement, providers, import,
target, production, accessibility, operations, remote CI and release evidence
remain open. The readiness command remains intentionally non-zero at 95/100 and
the parent/global program remains `IN_PROGRESS/PARTIAL`. No commit, push,
staging, deploy, provider, target, credential or production mutation occurred.

## Plan revision note, 2026-08-26 (CVG-002B2B bounded signed PIX composition)

The bounded local signed synthetic PIX composition reached `PASS_BOUNDED` with
`HIGH` confidence and `HIGH` residual risk. Fresh evidence covers raw-body
HMAC ingress, durable receipt/delivery replay, tenant-B spoof rejection,
retry-before-correlation, actual worker settlement through shared B1,
service-principal revocation linearization, graceful restart and an
independent-process SIGKILL/fencing matrix. API passed `401/401`, worker
`71/71`, the focused suites passed `80/80`, `11/11`, `14/14`, `2/2`, `1/1`,
`7/7` and `8/8`, and official coverage passed `1,956/1 skip` at 81.98%
statements, 80.08% branches, 88.56% functions and 81.98% lines.

The implementation also closes the reviewed staging/stage synthetic guard,
API-role row-lock privilege, service-principal revocation race, worker
schema/ACL readiness, fixture transaction and destructive teardown findings.
The final global setup/db-admin correction preserves an explicitly non-
ephemeral database without reset, creation, migrations, seed, grants or drop,
and the process suites/hooks skip safely in that mode. The independent review
returned `PASS_BOUNDED` with no Critical, High or remaining Medium finding;
the final control-plane reconciliation is recorded in the bounded gate and
artifact. A privileged SQL writer outside runtime roles can still bypass the
advisory lock and must be governed before production.

This does not close the complete B2B contract: every failpoint dedicated seam,
two-live-worker composition, full principal login/cache/MFA matrix, real
provider, target, parity, accessibility, operations or release evidence remain
open. General parity remains `98/100` with `4/11` verified, clinical parity
`100/100` with `2/3`, and enterprise readiness `95/100` with `42 PASS / 3 WARN /
1 FAIL`. The parent and global program remain `IN_PROGRESS/PARTIAL`. No
commit, push, staging, deploy, provider, target, credential or external
mutation occurred.

## Plan revision note, 2026-08-26 (CVG-004 bounded Vetus import integrity)

The bounded Vetus import control-plane slice is now `PASS_BOUNDED`. Canonical
migration `0149` adds nullable internal SHA-256 fingerprints to the existing
0098/0102 import facts; normalized source replays remain idempotent, divergent
single/batch/item references return `409`, and source-reference acquisition is
serialized inside the tenant PostgreSQL transaction. Batch dry-run, rejected
row persistence, immutable resume identity, rollback and response-size
protection are covered by a fresh authenticated HTTP→PostgreSQL run across two
API instances.

The owner/patient/audit cache recovery path now reconciles after commit or
rollback, serializes refreshes per account, and waits for all sibling snapshots
to settle after a failure. The focused route/cache/UoW suite passed `25/25`,
HTTP→PostgreSQL passed `7/7`, full API passed `401/401`, typecheck/lint passed
across 70 projects, and official coverage passed at `81.98%` statements,
`80.08%` branches, `88.56%` functions and `81.98%` lines. The final independent
review returned `PASS_BOUNDED` with no current High/Medium findings.

This does not close the eleven Vetus journeys or global readiness. General
parity remains `98/100` with `4/11` verified, clinical parity `100/100` with
`2/3` verified, and enterprise readiness `95/100` with `42 PASS`, `3 WARN` and
`1 FAIL`. Browser E2E, external Vetus/Live Pet/Live Lab, providers, target
behavior, distributed worker failure evidence, backup/restore, remote CI,
accessibility, operations and release acceptance remain open. No commit, push,
staging, deploy, provider, target, credential or production mutation occurred.

## Plan revision note, 2026-08-26 (CVG-003 bounded prescription collection tenant isolation)

The separately authorized prescription collection isolation slice is now
`PASS_BOUNDED`. The service-level encounter/patient queries require the
authenticated `AccountId`, the HTTP route forwards principal-derived tenant
context, and empty filters fail closed. TDD reproduced the cross-tenant leak
with shared identifiers before GREEN; two-account hydration now returns only
the caller's record. Focused evidence passed 37/37, service unit 32/32, full
API 401/401, typechecks, lint, formatting and diff hygiene; official coverage
passed 1,959/1 skip at 81.98% statements, 80.08% branches, 88.56% functions
and 81.98% lines. Independent review returned `PASS_BOUNDED` with no current
blocker finding.

This closes only the local application service/HTTP boundary. PostgreSQL proof
for this specific query, all clinical routes, target RLS, direct SQL writers,
providers, accessibility, operations, parity and release remain open. Parent
CVG-003 and the global program remain `IN_PROGRESS/PARTIAL`; no external
mutation occurred.

## Plan revision note, 2026-08-26 (CVG-003 bounded prescription-execution collection tenant isolation)

The separately authorized prescription-execution collection slice is now
`PASS_BOUNDED`. The service requires `AccountId` for encounter/patient
queries, rejects missing runtime context, and the authenticated route rejects
empty filters before falling back to the account list. TDD reproduced both
unsafe paths before GREEN; a hydrated two-account fixture and HTTP-shaped
integration prove non-disclosure. Focused evidence passed module 15/15, route
2/2, integration 1/1, full API 402/402, typechecks, lint, formatting and diff
hygiene; official coverage passed 1,960/1 skip at 81.98% statements, 80.08%
branches, 88.56% functions and 81.98% lines. Independent review returned
`PASS_BOUNDED` without current blocker findings.

This closes only the local collection boundary. Administration-event detail
ownership, PostgreSQL-specific proof, all clinical routes, target RLS,
providers, accessibility, operations, parity and release remain open. Parent
CVG-003 and the global program remain `IN_PROGRESS/PARTIAL`; no external
mutation occurred.

## Plan revision note, 2026-08-26 (CVG-003 bounded triage tenant isolation)

The separately authorized triage collection, detail, history, creation and
update boundary reached `PASS_BOUNDED` with `HIGH` residual risk. The service
and repository now require account context and apply account predicates; the
authenticated route rejects empty encounter filters; defensive copies, cache
rollback and create-before-transition ordering are covered. Fresh evidence
passed module `10/10`, focused service `3/3`, full API `405/405`, PostgreSQL
`17/17`, typechecks, scoped lint, formatting, diff hygiene and official
coverage `1,964/1 skip` at `82.03%` statements, `80.20%` branches, `88.59%`
functions and `82.03%` lines. The independent review returned
`PASS_BOUNDED` with zero Critical/High findings.

This closes only the local triage application boundary. Sequential repository
writes still depend on an outer tenant transaction for atomicity; local HTTP
fixtures do not certify target TCP/RLS; aggregate lint retains 45 unrelated
diagnostics; and the global program remains `IN_PROGRESS/PARTIAL` at general
parity `98/100` (`4/11`), clinical parity `100/100` (`2/3`) and enterprise
readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Other clinical routes,
providers, accessibility, operations, target, parity and release remain open.

## Plan revision note, 2026-08-26 (CVG-003 bounded discharge tenant isolation)

The separately authorized discharge collection/detail/update boundary reached
`PASS_BOUNDED`. The service and repositories require account context and
defensive copies; PostgreSQL predicates include the explicit account and
active-tenant check; optimistic update versions are matched atomically; and
PATCH refreshes a stale account cache before detail/update. Failed queued
writes and tenant command commit/rollback cache recovery are covered.

Post-fix evidence passed module `17/17`, route `2/2`, disposable PostgreSQL
HTTP/persistence `6/6`, API `406/406`, typechecks/builds, scoped lint,
Prettier, secrets, diff hygiene and official coverage `1,970/1 skipped` at
`82.03%` statements, `80.22%` branches, `88.59%` functions and `82.03%`
lines. The initial independent review's three Medium findings were corrected;
the follow-up review found no technical Critical/High/Medium/Low finding.

This is a local bounded result only. Target TCP/RLS, a separately connected
NOBYPASSRLS runtime role, browser/accessibility, other clinical routes,
providers, remote CI, operations, backup/restore, remaining Vetus parity and
release remain open. Global parity/readiness stays `98/100` (`4/11`),
clinical `100/100` (`2/3`) and readiness `95/100` (`42 PASS / 3 WARN / 1
FAIL`); CVG-003 remains `IN_PROGRESS/PARTIAL`. No external mutation occurred.

## Plan update — CVG-004 bounded financial cash-receipt reversal — 2026-08-27

The separately authorized CVG-004 financial gap was implemented and verified
as `PASS_BOUNDED`. The append-only full-BRL cash-receipt reversal now has a
fresh additive migration, transactional command/API path, compensating cash
and journal proof, projection recovery, active-receipt replacement guard,
runtime ACL reconciliation, strict OpenAPI validation and audit/outbox
evidence. TDD, disposable PostgreSQL, runtime-role, full API, quality,
coverage and independent review evidence is linked from the task and verified
gate.

The next execution item remains a separately authorized implementation-ready
gap. Provider refunds/chargebacks, bank and non-cash settlement, target
environment, browser/accessibility, distributed worker, operations,
backup/restore, remote CI, remaining Vetus parity and release acceptance stay
open. Do not interpret this bounded checkpoint as a Premium Enterprise MVP or
production-ready verdict.

## Plan update — CVG-004 bounded scheduled financial-payables report — 2026-08-27

The separately authorized scheduled-payables worker gap reached
`PASS_BOUNDED` with `HIGH` residual risk. The real worker now composes the
tenant-scoped `DatabaseFinancialPayablesRepository`, validates strict status,
search and inclusive due-date filters, defensively retains account/status
scope and emits exactly the eleven existing catalog columns. Missing payables
sources, the cataloged unsupported advance-payment report and unknown report
ids fail closed without creating an execution, export or delivery substitute.

TDD RED is retained. Fresh evidence passed worker `74/74`, reports module
`16/16`, the real run-once disposable PostgreSQL process `9/9`, compiled API
`408/408`, global typecheck across 70 projects, worker build, official
coverage `1,982 passed / 1 skipped` at `80.72%` statements, `80.23%` branches,
`88.05%` functions and `80.72%` lines, enterprise security, OpenAPI,
migration-source, RLS, deploy-surface, Helm static, Prettier and diff hygiene.

Ramanujan's independent review found no Critical or High issue but was
conditional before the final negative-fixture/defensive-filter remediation.
The requested post-fix reviewer was unavailable because of account model
policy and usage limits, so no independent post-fix approval is inferred; a
fresh independent review is a condition before broadening this worker scope.
The pre-existing administrative-executive diagnostic fallback is explicitly
outside this slice. Other scheduled report families, providers, target
runtime, browser/accessibility, distributed worker operations, remote CI,
backup/restore, remaining parity and release remain open.

General parity remains `98/100` with `4/11` verified, clinical parity remains
`100/100` with `2/3` verified, and enterprise readiness remains `95/100` with
`42 PASS / 3 WARN / 1 FAIL`. Parent CVG-004 and the global program remain
`IN_PROGRESS/PARTIAL`; no commit, push, deploy, provider, credential or
external mutation occurred.

## Plan update — CVG-004 bounded scheduled financial-advance-payments report — 2026-08-27

The separately authorized `CVG-004-REPORT-SCHEDULED-ADVANCE-PAYMENTS` slice is
reconciled as `PASS_BOUNDED` with `HIGH` residual risk. A canonical
financial-module source now serves the worker's tenant-scoped persisted
advance facts and append-only allocation-derived balances. The worker applies
strict status/search/date filters, inclusive `dateTo`, exact ten-column
mapping, a 10,000-row bound and fail-closed missing/unsupported/unknown-source
behavior; bootstrap checks the required schema/RLS/policy/trigger invariants.

Fresh evidence passed worker `77/77`, financial module `16/16`, real one-shot
PostgreSQL `10/10`, canonical-source RLS `9/9`, API `408/408`, global
typecheck across 70 projects, official coverage `1,983 passed / 1 skipped` at
`80.42%` statements, `80.21%` branches, `87.74%` functions and `80.42%`
lines, security, OpenAPI, migration-source, RLS, deploy-surface, Helm static,
Prettier and diff hygiene.

Hubble's independent post-implementation review is `CONDITIONAL` without a
Critical finding, not unconditional production approval. Actor fallback,
scheduled audit semantics, duplicate API read projection, full bootstrap
ACL/function/runtime-role assertions, wildcard/timezone semantics and a few
edge tests remain explicit follow-up items. Other scheduled reports, target,
providers, browser/accessibility, distributed operations, remote CI,
backup/restore, parity, readiness and release remain open. Parent CVG-004 and
the global program remain `IN_PROGRESS/PARTIAL`; no external mutation occurred.

## Plan update — CVG-002 bounded active-encounter uniqueness — 2026-08-27

The separately authorized `CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS` slice is
reconciled as `PASS_BOUNDED` with `HIGH` residual risk. Canonical migration
0151 now refuses historical active duplicates, rejects incompatible same-name
indexes and enforces one non-closed encounter per `(account_id, patient_id)`.
The repository maps only the named PostgreSQL `23505` to the stable domain
conflict across create/update/reopen; the service and API restore speculative
timeline/queue state on persistence failure.

Fresh evidence passed repository `5/5`, disposable PostgreSQL `7/7`, encounters
module `32/32`, database package `22/22`, compiled API `410/410`, full workspace
test/build/typecheck and official coverage at `80.45%` statements/lines,
`80.20%` branches and `87.75%` functions. Security, migration source,
RLS/OpenAPI/deploy/Helm static and diff hygiene also passed. Lovelace's
independent review found no Critical/High issue; its Medium findings were
remediated and the separate unavailable reviewer role is not treated as
approval.

The migration remains intentionally fail-closed for historical remediation,
and local disposable PostgreSQL does not certify target roles/RLS, distributed
cache/replicas, providers, operations, remote CI or release. General parity
remains `98/100` (`4/11`), clinical parity `100/100` (`2/3`) and enterprise
readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Parent `CVG-002` and the
global program remain `IN_PROGRESS/PARTIAL`; no commit, push, deploy,
credential/provider action or external mutation occurred.

Evidence: `.agent/tasks/CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.md`,
`.agent/gates/verified-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.json`,
`.agent/artifacts/CVG-002-encounter-active-uniqueness-2026-08-27.md` and
`.agent/verification.jsonl#VFY-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS-FINAL-001`.

## Plan update — CVG-004 bounded worker report service identity — 2026-08-27

The separately authorized actor-hardening slice is ready for bounded
reconciliation. A single tested resolver now accepts only an explicit,
non-nil RFC 4122 UUID, shared worker config trims and validates the same
contract, and production-like environments require the field. Continuous and
run-once scheduled-report paths use the resolved actor; the old account-id
cast/fallback is absent. Compose and staging/prod Helm overlays load the value
from operator-managed required Secret configuration.

TDD RED is retained. Fresh focused evidence passed shared-config `42/42`,
worker `75/75`, real one-shot PostgreSQL `12/12` and Helm contract `6/6`,
followed by workspace test/build/typecheck/lint and security/static rails.
The independent rereview was conditional with no Critical/High finding; it
identified the still-open per-account service-principal mapping as a bounded
residual. The global program remains `IN_PROGRESS/PARTIAL`: parity `98/100`
(`4/11`), clinical parity `100/100` (`2/3`) and readiness `95/100`
(`42 PASS / 3 WARN / 1 FAIL`). No target, provider, production, credential,
deployment, commit, push, external mutation or release acceptance occurred.

Evidence: `.agent/tasks/CVG-004-WORKER-REPORT-SERVICE-IDENTITY.md`,
`.agent/gates/verified-CVG-004-WORKER-REPORT-SERVICE-IDENTITY.json`,
`.agent/artifacts/CVG-004-worker-report-service-identity-2026-08-27.md` and
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-SERVICE-IDENTITY-FINAL-001`.

## Plan update — CVG-004 bounded tenant-aware worker report principal — 2026-08-27

The separately authorized `CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL`
slice is reconciled as `PASS_BOUNDED` with `HIGH` residual risk. Migration
0152 extends the existing service-principal purpose allowlist without
provisioning, adds account-composite FKs for report execution/export/schedule
actors and rechecks active report-service membership at persistence time. The
shared resolver and continuous/run-once paths now accept only a current-account
active non-interactive service principal; missing, foreign, human, inactive or
unmapped actors fail closed.

Fresh evidence passed schema `4/4`, resolver/trigger PostgreSQL `9/9`, FKs
`6/6`, real run-once process `13/13`, process fixture regressions, full
workspace tests, coverage `80.45%` statements/lines, `80.19%` branches and
`87.74%` functions, typecheck, build, lint, security and static contract rails.
The independent review remains conditional. The supported topology is one
valid principal mapping per worker/account; a future multi-account mapping
design needs separate authority.

Global parity remains `98/100` (`4/11`), clinical parity `100/100` (`2/3`)
and enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Parent
CVG-004 and the global program remain `IN_PROGRESS/PARTIAL`; target,
providers, distributed operations, remote CI, restore, accessibility and
release are open. No external mutation occurred.

Evidence: `.agent/tasks/CVG-004-worker-report-tenant-aware-principal.md`,
`.agent/gates/verified-CVG-004-worker-report-tenant-aware-principal.json`,
`.agent/artifacts/CVG-004-worker-report-tenant-aware-principal-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-FINAL-001`.

## 2026-08-27 — bounded Redis distributed readiness

The authorized `CVG-001-REDIS-DISTRIBUTED-READINESS` slice is reconciled as
`PASS_BOUNDED` with residual risk `HIGH`. The shared rate limiter now
distinguishes Redis from in-memory, performs a real bounded `PING`, closes
connections idempotently and fails closed on backend outage. API readiness
aggregates auth/PIX/webhook limiter health; `/live` remains liveness-only;
health details are generic; and authentication returns stable `503` without a
local fallback or session creation when Redis is unavailable.

Fresh disposable evidence passed the two-API PostgreSQL/Redis setup/session
proof, including cross-replica login/refresh/revocation, physical restart,
shared rate limiting, Redis outage/recovery, metrics and cleanup. The critical
process runner verified `9/9` non-skipped entries with zero failed, pending or
todo tests. Full workspace tests, coverage `80.46%` statements, `80.21%`
branches and `87.75%` functions, typecheck, build, security, static validators,
Compose and distributed CI readiness contracts passed locally.

Global promotion remains blocked: Vetus parity `98/100` (`4/11` verified),
clinical parity `100/100` (`2/3` verified) and enterprise readiness `95/100`
(`42 PASS / 3 WARN / 1 FAIL`). Managed Redis/HA, target roles/RLS, providers,
remote CI, backup/restore, RTO/RPO, accessibility and release acceptance are
not proven. No target/provider/credential/production/deployment/commit/push or
external mutation occurred.

Evidence: `.agent/tasks/CVG-001-REDIS-DISTRIBUTED-READINESS.md`,
`.agent/gates/verified-CVG-001-redis-distributed-readiness.json`,
`.agent/artifacts/CVG-001-redis-distributed-readiness-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-001-REDIS-DISTRIBUTED-READINESS-FINAL-001`.

## Plan update — CVG-006 bounded database-chaos fail-closed — 2026-08-27

The authorized `CVG-006-DATABASE-CHAOS-FAIL-CLOSED` slice is reconciled as
`PASS_BOUNDED` with `HIGH` residual risk. A configured database runtime now
projects `unavailable` during `database-failure`, closes readiness without an
in-memory outage fallback, rejects authenticated tenant mutations and durable
public webhooks before their handlers, and blocks HTTP chaos start/stop in
production-like environments. Health, liveness, metrics, OpenAPI, alerts and
runbooks are aligned with the fail-closed contract.

Fresh evidence passed the focused `77/77` contract suite, API `414/414`, full
workspace `pnpm test`, official coverage `80.48%` statements, `80.23%`
branches and `87.76%` functions, typecheck, build, lint, security, OpenAPI,
RLS, migration-source, deploy-surface and static Helm validation. The
independent review was conditional with no Critical/High finding; it is not
production approval.

Global promotion remains blocked: Vetus parity is `98/100` (`4/11` verified),
clinical parity is `100/100` (`2/3` verified), and enterprise readiness is
`95/100` (`42 PASS / 3 WARN / 1 FAIL`). Real database failure/failover,
target/RLS, providers, restore/RTO-RPO, distributed worker operations,
accessibility, remote CI and release acceptance remain open. No external
mutation occurred.

Evidence: `.agent/tasks/CVG-006-DATABASE-CHAOS-FAIL-CLOSED.md`,
`.agent/gates/verified-CVG-006-database-chaos-fail-closed.json`,
`.agent/artifacts/CVG-006-database-chaos-fail-closed-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-006-DATABASE-CHAOS-FAIL-CLOSED-FINAL-001`.

## Plan update — CVG-002B2B legacy PIX settlement barrier — 2026-08-27

The authorized `CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER` slice is reconciled
as `PASS_BOUNDED` with residual risk `HIGH`. The shared
`payment.pix.confirmed` consumer now requires an authoritative no-attempt PIX
transaction, rejects unknown/attempt-linked or incoherent events before any
write, and preserves the dedicated `pix.payment.confirmed.v1` B1 path.

Fresh evidence passed intentional RED (13 tests, 9 pass / 4 expected fail),
GREEN consumer `14/14`, module `2/2`, disposable PostgreSQL worker `6/6`,
official API `428/428`, full workspace tests with SPA `1036/1036`, coverage
`80.50%` statements/lines, `80.19%` branches and `87.76%` functions,
typecheck, build, lint, security and static rails. The focused test is now
part of the API package command. Independent review found no Critical, High or
Medium functional finding; its low-level harness condition was cleared.

Global promotion remains blocked: Vetus parity `98/100` (`4/11` verified),
clinical parity `100/100` (`2/3` verified) and enterprise readiness `95/100`
(`42 PASS / 3 WARN / 1 FAIL`). Providers/homologation, target RLS,
restore/RTO-RPO, distributed worker failpoints, remote CI, accessibility,
operational LGPD and release acceptance remain open. No external mutation,
provider, target, deployment, commit or push occurred.

Evidence: `.agent/tasks/CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER.md`,
`.agent/gates/verified-CVG-002B2B-legacy-pix-settlement-barrier.json`,
`.agent/artifacts/CVG-002B2B-legacy-pix-settlement-barrier-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER-FINAL-001`.

## Plan update — CVG-003 bounded prescription-execution clinical integrity — 2026-08-27

The separately authorized `CVG-003-PRESCRIPTION-EXECUTION-INTEGRITY` slice is
reconciled as `PASS_BOUNDED` with residual risk `HIGH`. Creation now requires
an account-scoped active signed prescription and persists canonical medication,
dosage, route and frequency. Execute/suspend/resume use optimistic CAS, while
the PostgreSQL repository writes execution and administration event together in
one tenant transaction; the in-memory repository has equivalent serialized
rollback behavior. Exact HTTP paths and identifiers/date-times are validated,
authorization is checked before idempotency replay, and commit/rollback cache
refresh prevents stale local state after a durable outcome.

Fresh evidence passed the intentional RED, module `27/27`, route `5/5`, API
integration `1/1`, disposable PostgreSQL integrity/RLS/FK `5/5`, compiled API
server `45/45` including permission-revoked replay rejection, and workspace
`pnpm test` exit `0`. Coverage is `80.51%` statements/lines, `80.22%`
branches and `87.70%` functions; the global configuration excludes the primary
files in this slice, so changed-code coverage is not inferred. Builds,
security, OpenAPI, RLS, migration-source and diff checks passed. The
independent read-only review found no technical Critical or High finding; the
only governance condition was reconciled in the final gate and ledgers.

Global promotion remains blocked: Vetus general parity is `98/100` (`4/11`),
clinical parity is `100/100` (`2/3`, laboratory provider/homologation open),
and enterprise readiness is `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`). Target
roles/RLS, providers, restore/RTO-RPO, distributed worker recovery, remote CI,
accessibility, operational LGPD, remaining parity and release acceptance stay
open. No provider, target, credential, staging, production, deployment,
commit, push or external mutation occurred.

Evidence: `.agent/tasks/CVG-003-PRESCRIPTION-EXECUTION-INTEGRITY.md`,
`.agent/gates/verified-CVG-003-prescription-execution-integrity.json`,
`.agent/artifacts/CVG-003-prescription-execution-integrity-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-INTEGRITY-FINAL-001`.

## Plan update — CVG-002B2B two-live-worker contention — 2026-08-27

Fresh scouting selected the remaining local concurrency-evidence gap in the
already-authorized synthetic PIX B2B slice. The process test was extended with
a deterministic case in which worker A holds a valid delivery lease while a
second real worker B is alive and attempts the same delivery. B returns `idle`,
A completes the fenced settlement, and PostgreSQL contains one receipt and one
financial effect.

The complete independent-process file passed `9/9` in a fresh disposable
PostgreSQL database with migrations `0000`–`0153`, two distinct PIDs and the
reconciled worker role. No production source, migration or provider code was
changed. The bounded gate is
`.agent/gates/verified-CVG-002B2B-live-worker-contention.json` and the artifact
is `.agent/artifacts/CVG-002B2B-live-worker-concurrency-2026-08-27.md`.

The specialized reviewer role was unavailable because the account does not
support `gpt-5.3-codex`; no independent approval is claimed. B2B/global status
remains `IN_PROGRESS/PARTIAL` with promotion blocked. The remaining B2B
failpoint/principal matrix and all target/provider/restore/accessibility/
operations/parity/CI/release gates remain separate work.

## Plan update — CVG-002B2B B1 SIGKILL failpoint matrix — 2026-08-27

The authorized next gap was the missing process-level evidence for every
internal checkpoint in the shared B1 transaction. The process fixture now
propagates a fail-closed, explicitly selected B1 checkpoint from the worker's
default PostgreSQL repository, while the integration test covers all sixteen
points with real-process `SIGKILL`, lease expiry, takeover and intermediate
rollback assertions. No migration, schema, provider or production behavior
was changed.

The intentional RED caught the absent propagation at `after_inbox_claim`.
The latest focused GREEN passed `16/16` in fresh disposable PostgreSQL with
the expected no-partial-state intermediate graph and one final settlement;
worker typecheck/unit suites, root `pnpm test` and coverage also passed. The
full process file had passed `25/25` before the final test-only intermediate
assertion. The bounded gate is
`.agent/gates/verified-CVG-002B2B-b1-sigkill-failpoints.json` and the artifact
is `.agent/artifacts/CVG-002B2B-b1-sigkill-failpoints-2026-08-27.md`.

The specialized reviewer could not start because the active account does not
support `gpt-5.3-codex`; no independent approval is claimed. B2B/global status
remains `IN_PROGRESS/PARTIAL` and promotion remains blocked. Principal
login/cache/MFA, privileged writers, providers, target, restore/RTO-RPO,
distributed operations, accessibility, LGPD, parity, remote CI and release
evidence remain open.

## Plan update — CVG-004 two-tenant scheduled Cheques worker — 2026-08-27

The authorized next gap was a missing process-level two-tenant proof for the
already implemented `financial-cheques` scheduled report. The existing test
fixture now persists an account-B check payment/schedule and starts two real
one-shot worker processes concurrently with account-specific principals. The
schedule joins and inverse-payment assertion passed, and the complete process
boundary remained green at `14/14`.

The bounded gate is
`.agent/gates/verified-CVG-004-report-cheques-worker-tenant-scope.json`; the
artifact is
`.agent/artifacts/CVG-004-reports-cheques-worker-tenant-scope-2026-08-27.md`.
Independent review returned `APPROVE_BOUNDED` with no technical finding. No
production source or external state changed. The global ERP remains
`IN_PROGRESS/PARTIAL` with promotion blocked; the next local candidate is the
two remaining Reports workbench placeholders, subject to a fresh
implementation-ready contract and confirmed authority.

## Plan update — CVG-004 Vetus assisted-import browser E2E — 2026-08-27

The authorized Vetus import-integrity slice closed its remaining local browser
coverage gap. The new `e2e/spa/vetus-import-flow.spec.ts` uses the shared real
browser login fixture and exercises validation, durable dry-run, import,
participant reads and UI rollback against the canonical local runner. The
final corrected run passed `1/1` after migrations `0000`–`0153`, two-tenant
seed and a database-backed API; it also reads the created owner and patient
after rollback and requires both persisted statuses to be `inactive`.

The independent review first identified the missing domain-state assertion and
a weak textarea selector. Both were corrected, the runner was rerun, and the
review returned `APPROVE_BOUNDED` with no remaining finding. The bounded gate
is `.agent/gates/verified-CVG-004-vetus-import-integrity.json`; the dedicated
artifact is `.agent/artifacts/CVG-004-vetus-import-browser-e2e-2026-08-27.md`.

External Vetus/Live Pet/Live Lab connectors, provider and target homologation,
distributed worker operations, backup/restore, operational LGPD, remote CI,
accessibility, remaining parity and release acceptance remain open. The global
ERP remains `IN_PROGRESS/PARTIAL` and promotion remains blocked.

## Plan update — CVG-004 deleted-sales report snapshot/export — 2026-08-27

The next authorized Reports Workbench gap was implemented as a bounded
persisted snapshot of currently cancelled counter-sales. The source is the
tenant-scoped database repository, with strict search/opening-date filters,
parameterized deterministic SQL, a bounded read and audited server-side CSV
export. The SPA remains read-only and explicitly does not claim cancellation
history, actor, reason or cancellation timestamp.

Focused tests, disposable PostgreSQL, the official authenticated SPA runner,
workspace regression, coverage and deterministic validators passed. The
independent reviewer returned `APPROVE_BOUNDED`; the gate is
`.agent/gates/verified-CVG-004-report-deleted-sales-snapshot.json` and the
artifact is
`.agent/artifacts/CVG-004-report-deleted-sales-snapshot-2026-08-27.md`.

The global ERP and CVG-004 remain `IN_PROGRESS/PARTIAL`: service-invoices and
fiscal wiring, cancellation history, external Vetus/provider/target behavior,
production, deployment, restore/RTO-RPO, accessibility, LGPD operations,
remote CI, remaining parity and release acceptance are still open. The next
gap must be selected through fresh scouting and a new implementation-ready
authority; no scope is inferred from this gate.

## Plan update — CVG-004 NFS-e service-invoice report/export — 2026-08-27

The next Reports Workbench gap was implemented as a bounded read-only report
over persisted fiscal_nfse_documents. The catalog, API, SPA and scheduled
worker use the same one-row-per-persisted-document contract, with strict
competence/status/search filters, literal wildcard escaping, deterministic
ordering and bounded reads. ReportsService remains the execution, audit and
export boundary.

Reports/Fiscal module tests, compiled API routes, SPA tests and worker suites
passed. Disposable PostgreSQL proved competence/order/search/limit and a real
restricted-role cross-tenant RLS negative; the selected worker process proof
passed; the official authenticated browser flow passed 1/1; coverage remained
above the 80% bar. The independent reviewer returned APPROVE_BOUNDED after the
five remediation findings were closed.

The global ERP and CVG-004 remain IN_PROGRESS/PARTIAL and promotion remains
blocked. Exact Vetus dynamic-executor parity, fiscal provider/municipality
homologation, fiscal writes, commercial reconciliation, target operations,
restore/RTO-RPO, distributed worker operations, accessibility, LGPD, remote
CI, remaining report families and release acceptance remain open. The next
gap requires fresh scouting, a new implementation-ready authority and no
scope inference from this bounded gate.

## Checkpoint 2026-08-27 — CVG-004 scheduled deleted-sales source

The bounded worker gap is reconciled as `PASS_BOUNDED` with `HIGH` residual
risk. `commercial-deleted-sales` now reads only the persisted current
cancelled counter-sale snapshot through the database-backed
`CounterSalesService.listPersisted` source, validates search/date/row bounds,
rechecks tenant semantics and uses the existing ReportsService execution.
Unit/package regression, disposable PostgreSQL two-account one-shot proof,
coverage, static/security validators and independent re-review passed. The
global ERP, exact Vetus parity, providers, target/production operations,
remaining reports and release remain `IN_PROGRESS/PARTIAL`; promotion is
blocked. Evidence: `.agent/gates/verified-CVG-004-report-scheduled-deleted-sales.json`.

## Implementation-ready checkpoint — CVG-004 inventory-products server-backed report — 2026-08-27

Fresh local scouting selected the next smallest Reports Workbench gap: the
inventory-products screen still reconstructs rows from local inventory items
and lots, while the durable `inventory_items` source already supports a safe
tenant-scoped base report. The new authority freezes an on-demand-only report
with exactly eight persisted fields, inclusive `createdAt` period filters,
case-insensitive bounded SKU/name search, deterministic database ordering and
a 10,000-row limit with overflow detection.

The implementation-ready gate is
`.agent/gates/implementation-ready-CVG-004-report-inventory-products.json`.
TDD RED, catalog/API/SPA implementation, disposable PostgreSQL isolation and
ordering proof, independent review, regression and final reconciliation are
pending. Scheduled worker resolution, lots/movements, historical/as-of stock,
derived valuation, providers, target, production and release acceptance stay
outside this authority.

## Final checkpoint — CVG-004 inventory-products server-backed report — 2026-08-27

The bounded on-demand inventory-products slice reached `PASS_BOUNDED` after
intentional RED/GREEN, focused regressions, 3/3 disposable PostgreSQL proof,
authenticated browser E2E 1/1, coverage, validators, independent
`APPROVE_BOUNDED` re-review and control-plane hygiene. It reads only persisted
`inventory_items`, uses the exact eight-field contract, strict filters,
deterministic order, overflow guard and audited ReportsService export. Global
CVG-004/ERP remains `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`;
Vetus/clinical parity, providers, target operations, remaining reports,
distributed worker, accessibility, LGPD, remote CI and release remain open.
Evidence: `.agent/gates/verified-CVG-004-report-inventory-products.json`.

## Implementation-ready checkpoint — CVG-004 inventory-stock server-backed report — 2026-08-27

Fresh local scouting selected the next actionable Reports Workbench gap: the
Vetus `Estoque` surface exists in the reference corpus, while the current SPA
reconstructs the screen from local inventory items and lots. The new authority
freezes an on-demand, tenant-scoped report over persisted `inventory_items`
with exactly ten fields, inclusive `createdAt` filters, bounded SKU/name
search, deterministic ordering, current stock-value/reorder derivation and a
10,000-row overflow guard.

The implementation-ready gate is
`.agent/gates/implementation-ready-CVG-004-report-inventory-stock.json`.
The next action is intentional TDD RED followed by the additive catalog/API/
SPA path and disposable PostgreSQL proof. Lots, movements, NF entry,
historical/as-of stock, historical valuation, scheduled delivery, providers,
target, production and release acceptance remain outside this authority.

## Restart checkpoint — CVG-004 inventory-stock — 2026-08-28

The inventory-stock implementation and technical verification are complete,
but this checkpoint intentionally stops before formal closure so the machine
can be restarted safely. Reports passed 20/20, compiled API focus 33/33, full
API 446/446, SPA Workbench 44/44 and the production SPA build. Disposable
PostgreSQL passed 2/2 with the exact ten-field contract, two-account isolation,
strict filters, current stock derivation, export/audit and real overflow; the
official authenticated browser flow passed 1/1 through `/reports/inventory`
with no local inventory request. Coverage is 80.67% statements, 80.15%
branches, 87.67% functions and 80.67% lines.

The first independent post-remediation review found no functional
CRITICAL/HIGH/MEDIUM finding and requested only stale control-plane
reconciliation. `.agent/state.json` is now `VERIFY / RECONCILE`, the task is
in verification, the verified gate draft is marked
`PENDING_RECONCILIATION`, and the restart instructions are in
`.agent/artifacts/CVG-004-report-inventory-stock-2026-08-28.md`. After
restart, complete final re-review, final verification/hygiene records and
state/backlog/gauntlet reconciliation before changing the gate to
`PASS_BOUNDED`. Global Vetus parity 4/11, clinical parity 2/3 and enterprise
readiness 95/100 (42 PASS, 3 WARN, 1 FAIL) remain open; no global promotion is
authorized.

## Final bounded reconciliation — CVG-004 inventory-stock — 2026-08-28

The inventory-stock slice is now reconciled as `PASS_BOUNDED` with `HIGH`
residual risk. The first fresh independent reviewer confirmed the
implementation and current technical evidence with no functional
CRITICAL/HIGH/MEDIUM issue, while its `BLOCKED` result applied only to the
intentionally stale pre-closure control-plane records. After those records
were reconciled, a second fresh read-only review returned `APPROVE` for all
V-001 through V-008. The final gate, task/backlog state and hygiene records
close the procedural gap.

The authority remains limited to the authenticated, tenant-scoped, on-demand
`inventory_items` projection with the exact ten-field current-stock contract,
strict filters, deterministic order, overflow guard and audited export. No
scheduled worker, lot/movement/NF/history/valuation semantics, provider,
target, production, deployment or release authority is inferred. Global
CVG-004/ERP remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`;
the next gap requires fresh scouting and a new implementation-ready authority.

Evidence: `.agent/gates/verified-CVG-004-report-inventory-stock.json`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-FINAL-001`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-FINAL-002`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-REVIEW-FINAL-002`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-HYGIENE-001`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-HYGIENE-002`.

## Implementation-ready checkpoint — CVG-004 inventory-movements ledger report — 2026-08-28

Fresh independent scouting confirmed that the two remaining Reports Workbench
placeholders are `inventory-movements` and `inventory-invoices`. It ranked
`inventory-movements` first because `inventory_stock_movements` is an existing
tenant-scoped ledger with raw movement type, signed delta, balances, cost,
reason, reference and actor, while the current Workbench still combines local
lots and consumptions. `inventory-invoices` remains outside this checkpoint:
its safe source/document semantics require a separate authority decision.

The new authority freezes a raw, on-demand, server-backed
`inventory-movements` report with one row per persisted ledger movement, a
thirteen-field contract, strict occurredAt/search filters, deterministic order,
10,000-row bound, disabled-source fail-closed behavior, `billing.read` plus
`inventory.read`, audited ReportsService execution/export and SPA server-only
consumption. No lot/consumption reconstruction, invoice/NF semantics, worker,
provider, target, production or release work is authorized.

Evidence: `.agent/authority.jsonl#AUTH-CVG-004-REPORT-INVENTORY-MOVEMENTS-IR-001`,
`.agent/gates/implementation-ready-CVG-004-report-inventory-movements.json`,
`.agent/tasks/CVG-004-report-inventory-movements.md`. The next action is TDD
RED; CVG-004/global ERP remain `IN_PROGRESS/PARTIAL` with promotion blocked.

## Bounded closure — CVG-004 inventory-movements — 2026-08-28

The raw persisted inventory movement ledger report/export reached
`PASS_BOUNDED` after intentional RED, source-bounded implementation, focused
and full regression, disposable PostgreSQL proof, final independent
`APPROVE`, and control-plane reconciliation. The implementation has exactly
thirteen raw movement/item fields, strict inclusive date/search filters,
deterministic `occurredAt DESC, movementId ASC` ordering, a database-side
10,001-row read bound, same-account item joins, fail-closed disabled/malformed
sources, `billing.read` plus `inventory.read`, durable ReportsService
execution/export/audit and a server-only SPA path.

The current evidence is reports 21/21, inventory 30/30, compiled API focus
37/37, full API 450/450, SPA Workbench 44/44, PostgreSQL 4/4, authenticated
browser E2E 1/1, SPA build, coverage above 80% in all reported dimensions,
secrets, formatting, diff and empty-index hygiene.
The specific movement browser evidence is recorded in
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-E2E-001`.

This closes only the bounded raw ledger projection. Exact Vetus dynamic
executor parity, lots/consumptions reconstruction, invoice/NF semantics,
historical valuation, worker delivery, providers, target operations,
backup/restore/RTO-RPO, accessibility, operational LGPD, remote CI and release
acceptance remain open. Global CVG-004/ERP stays `IN_PROGRESS/PARTIAL` and
promotion stays `BLOCKED`; `inventory-invoices` requires a new authority.

Evidence: `.agent/gates/verified-CVG-004-report-inventory-movements.json`,
`.agent/artifacts/CVG-004-report-inventory-movements-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-REVIEW-FINAL-001`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-FINAL-001`.

## Bounded closure — CVG-004 inventory-invoices — 2026-08-28

The inventory purchase-entry slice is reconciled as `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. It is limited to authenticated,
tenant-scoped, on-demand reads of persisted `inventory_purchases` headers with
non-empty stored invoice references, the exact twelve-field operational
contract, strict filters, deterministic order, bounded reads and durable
ReportsService execution/export/audit. The reference is explicitly
operational, not a fiscal NF document; no fiscal write, tax/CFOP, provider,
lot/item reconstruction, worker, target or release behavior is included.

Reports 22/22, inventory 33/33, compiled API 39/39, SPA 174 files/1,042
tests, PostgreSQL 5/5, official authenticated browser E2E 1/1, typecheck,
coverage, secrets, formatting, diff and empty-index checks passed. Independent
post-remediation approval was not available: the reviewer role was rejected by
account policy and two compatible default attempts timed out. The limitation
is recorded and not represented as approval. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-inventory-invoices.json`,
`.agent/artifacts/CVG-004-report-inventory-invoices-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled financial-receivables — 2026-08-28

Fresh independent scouting selected the next bounded gap: the existing
`financial-receivables` report is available on-demand, but the real worker
resolver has no scheduled source branch. The new authority freezes a shared
financial-module, tenant-scoped persisted join over receivables, financial
accounts, encounters, patients, owners and payment counts; it preserves the
existing sixteen-column catalog contract, strict filters, deterministic order,
10,000-row bound and explicit no-empty-success behavior.

PII handling is part of the bar: the worker may return only the catalog fields,
must not log names/notes/payment details, and must prove two-account isolation
with disposable PostgreSQL and a real one-shot worker. Settlement, cash/bank/
PIX, journal, providers, target, production, deployment, external Vetus,
accessibility and release acceptance remain excluded.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-receivables.json`,
`.agent/tasks/CVG-004-report-scheduled-receivables.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-RECEIVABLES-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-RECEIVABLES-001`.

## Bounded closure — CVG-004 scheduled financial-receivables — 2026-08-28

The authorized scheduled `financial-receivables` worker slice is reconciled as
`PASS_BOUNDED` with `MEDIUM` confidence and `HIGH` residual risk. The shared
financial-module source is tenant-scoped and read-only, preserves the exact
sixteen-column catalog contract, validates filters, fixes report-date
semantics to UTC with an `issuedAt` fallback, rejects the 10,001st row and
emits durable non-PII schedule execution/export audit records. One-shot
failures now return non-zero while continuous worker behavior remains
tick-and-continue.

Evidence passed financial module `20/20`, worker package suites, builds and
typechecks, disposable PostgreSQL one-shot process `19/19`, secrets,
formatting and diff hygiene. Darwin's final independent static review returned
`PASS` with no scoped Critical/High/Medium finding. Keep the parent CVG-004,
global ERP, parity, readiness and release states open/non-promoted; any next
slice requires fresh scouting and a new implementation-ready authority.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-receivables.json`,
`.agent/artifacts/CVG-004-report-scheduled-receivables-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-REVIEW-001` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-services — 2026-08-28

A fresh local inspection selected the missing scheduled `registration-services`
worker source as the next bounded gap after scheduled financial-receivables.
The existing catalog/API contract exposes exactly six persisted service fields,
and the `services` relation/repository/RLS provide a credential-free local
source; the worker resolver and database source composition do not yet cover
this report id.

The new authority and implementation-ready gate freeze only a shared
tenant-scoped read source, strict inclusive UTC `createdAt` date filters,
deterministic ordering, a 10,000-row fail-closed bound, malformed/foreign-row
rejection, exact catalog mapping, existing PII-safe schedule audit and the
real two-account one-shot proof. No migration, CRUD, supplier/owner/patient
expansion, provider, target, production, deployment or release behavior is
authorized.

Delegated fresh explorer attempts were unavailable and are not represented as
consensus or approval. The parent CVG-004/global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-services.json`,
`.agent/tasks/CVG-004-report-scheduled-services.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-SERVICES-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-SERVICES-001`.

## Bounded closure — CVG-004 scheduled registration-services — 2026-08-28

The scheduled `registration-services` worker gap is closed as
`PASS_BOUNDED`, with `MEDIUM` confidence and `HIGH` residual risk. The shared
services-module source uses explicit tenant context plus an account predicate,
an explicit projection, strict inclusive UTC `createdAt` filters,
deterministic order and a 10,000-row fail-closed bound. The worker maps only
the existing six catalog fields and preserves durable non-PII audit,
one-shot failure semantics and continuous tick-and-continue behavior.

Fresh evidence passed services module `21/21`, worker regression `97/97`,
module/worker build and typecheck, and disposable PostgreSQL process `20/20`
with two-account isolation. Secrets, formatting, diff and control-plane
hygiene passed. Independent review was attempted but unavailable and remains
a condition, never approval; obtain a fresh verdict before higher-confidence
use or scope expansion.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`:
general parity is `4/11`, clinical parity `2/3`, and enterprise readiness is
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`). Providers, target operations,
distributed workers, accessibility, operational LGPD, remote CI, remaining
parity and release acceptance remain open.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-services.json`,
`.agent/artifacts/CVG-004-report-scheduled-services-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-suppliers — 2026-08-28

Fresh scouting found two viable registry gaps and disagreed on patients versus
suppliers. Local repository ranking selected the existing persisted finance
catalog contract for `registration-suppliers`, preserving a smaller PII blast
radius and avoiding schema work. The implementation-ready authority froze the
shared tenant-scoped read source, exact nine-field mapping, existing filters,
UTC bounds, deterministic order, 10,000-row guard, audit semantics and real
two-account process proof. Global promotion stayed blocked.

## Bounded closure — CVG-004 scheduled registration-suppliers — 2026-08-28

The scheduled suppliers worker path is `PASS_BOUNDED` with `MEDIUM` confidence
and `HIGH` residual risk. Financial module `24/24`, configured worker suites
(runner `43/43`, bootstrap `20/20`, account discovery `7/7`, consumer
composition `2/2`, report identity `8/8`, scheduled-job `3/3`, PIX settlement
`17/17`) and the post-format disposable PostgreSQL process `21/21` passed.

The source and resolver retain explicit tenant context/predicate, strict
filters, inclusive UTC dates, deterministic ordering, fail-closed overflow and
malformed/foreign-row handling, exact nine-field output and non-PII audit.
Independent review was unavailable and is not approval. CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, global parity `4/11`, clinical parity `2/3`, readiness
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion `BLOCKED`; providers,
target, distributed operations, accessibility, LGPD, remote CI, parity
completion and release remain open. Any next slice requires fresh scouting and
a new authority.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-suppliers.json`,
`.agent/artifacts/CVG-004-report-scheduled-suppliers-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-owners — 2026-08-28

After scheduled registration-suppliers was reconciled, local repository
scouting ranked the missing scheduled `registration-owners` source as the next
bounded gap. The existing seven-field on-demand/API contract and persisted
owners table/RLS allow a tenant-safe source without patient joins or microchip
exposure. Both delegated scout attempts errored before execution because the
gpt-5.3-codex-spark usage limit was reached; this is a local ranking only.

The confirmed authority freezes explicit tenant context/predicate, strict
inclusive UTC `createdAt` dates, deterministic `fullName ASC, id ASC` order, a
10,000-row bound, validated metadata fallback and exact seven-field mapping.
Existing scheduled audit and one-shot semantics remain unchanged. No migration,
patient expansion, owner lifecycle, provider, target, production or release
behavior is authorized. RED is the next action.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-owners.json`,
`.agent/tasks/CVG-004-report-scheduled-owners.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-OWNERS-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-OWNERS-001`.

## Bounded closure — CVG-004 scheduled registration-owners — 2026-08-28

The scheduled owners worker path is `PASS_BOUNDED` with `MEDIUM` confidence
and `HIGH` residual risk. It uses an explicit tenant-safe owners projection,
strict inclusive UTC `createdAt` filters, deterministic `fullName ASC, id ASC`
order, metadata fallback, a 10,000-row fail-closed bound and exact seven-field
output. The existing durable schedule/audit and one-shot behavior remains
unchanged; patient joins, microchip, owner lifecycle, migrations, providers,
target and production remain excluded.

Owners module `49/49`, worker configured suites and process `22/22` passed.
Independent review was attempted but unavailable and is not approval. Global
CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, parity remains `4/11` general and
`2/3` clinical, readiness `95/100` and promotion `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-owners.json`,
`.agent/artifacts/CVG-004-report-scheduled-owners-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-patients — 2026-08-28

After the bounded scheduled registration-owners closure, local fresh scouting
selected the missing scheduled `registration-patients` worker source. The
existing eight-field catalog/API contract, persisted `patients` table and
RLS/FORCE-RLS rails provide a repository-local source without migration. The
microchip field remains within the pre-existing contract but is bounded to the
report payload and excluded from logs/audit; no owner join or clinical/lifecycle
expansion is authorized.

The confirmed authority freezes only explicit tenant context/predicate, strict
inclusive UTC `createdAt` dates, deterministic `name ASC, id ASC` order, a
10,000-row fail-closed bound, legacy/status/sex fallback and exact eight-field
worker mapping. Delegated scouts were unavailable and are not represented as
consensus or approval. RED was recorded before implementation.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-patients.json`,
`.agent/tasks/CVG-004-report-scheduled-patients.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-PATIENTS-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-PATIENTS-001`.

## Bounded closure — CVG-004 scheduled registration-patients — 2026-08-28

The scheduled patients worker path is `PASS_BOUNDED` with `MEDIUM` confidence
and `HIGH` residual risk. The shared source uses explicit tenant context and
predicate, an explicit patients-only projection, strict inclusive UTC dates,
deterministic `name ASC, id ASC` ordering, legacy-code/status/sex fallback and
a 10,000-row fail-closed bound. The worker emits exactly the eight catalog
fields and preserves existing durable non-PII audit and one-shot semantics.

Patients module tests passed `55/55`; the new source coverage was `94.07%`
statements/lines, `90.41%` branches and `100%` functions. Configured worker
suites passed runner `49/49`, bootstrap `20/20`, account discovery `7/7`,
consumer composition `2/2`, report identity `8/8`, scheduled-job `3/3` and
PIX settlement `17/17`. The disposable PostgreSQL process passed `23/23`
with two-account isolation, exact rows, legacy-code and nullable-field
fallbacks, inclusive UTC dates, durable execution and no patient PII in worker
output or schedule audit.

The independent reviewer timed out and was shut down without a verdict; this
is a condition, not approval. Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`,
general parity `4/11`, clinical parity `2/3`, readiness `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`) and promotion `BLOCKED`; target, providers, distributed
operations, accessibility, LGPD, remote CI, remaining parity and release
acceptance remain open.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-patients.json`,
`.agent/artifacts/CVG-004-report-scheduled-patients-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-FINAL-001`.

## Bounded closure — CVG-004 scheduled commission-calculations — 2026-08-28

The scheduled `commission-calculations` worker path is closed as
`PASS_BOUNDED` with `MEDIUM` confidence and `HIGH` residual risk. The new
shared source reads only persisted `commission_calculations` headers and
same-account `commission_lines`, applies explicit tenant context/predicates,
strict status and period-overlap filters, deterministic `created_at DESC,
id DESC` order and a 10,000-row fail-closed bound. The worker maps exactly the
existing six catalog fields and preserves durable schedule execution/export
audit and one-shot semantics.

Commissions tests passed `18/18`; focused source coverage passed `94.02%`
statements/lines, `88%` branches and `100%` functions. Configured worker
suites passed runner `51/51`, bootstrap `20/20`, account discovery `7/7`,
consumer composition `2/2`, report identity `8/8`, scheduled-job `3/3` and
PIX settlement `17/17`; the disposable PostgreSQL process passed `24/24`
with two-account isolation, filters, line counts, exact rows, durable
execution and non-PII report payloads. The independent review was unavailable
and remains a condition, not approval.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, general parity `4/11`,
clinical parity `2/3`, readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and
promotion `BLOCKED`. Commission lifecycle, rules, payment behavior, providers,
target operations, distributed workers, accessibility, operational LGPD,
remote CI, remaining parity, backup/restore and release acceptance remain
open. No commit, push, deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-commissions.json`,
`.agent/artifacts/CVG-004-report-scheduled-commissions-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-FINAL-001`.

## 2026-08-28 — bounded closure: scheduled inventory-products

The next bounded scheduled-report gap selected after commission-calculations
was `CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS`. Its authority froze the
existing eight-field `inventory-products` catalog over persisted
`inventory_items`, explicit tenant context/predicate, literal case-insensitive
SKU/name search, inclusive UTC `createdAt` dates, deterministic order, a
10,000-row guard and unchanged durable schedule/audit behavior. No lots,
movements, invoices, valuation, CRUD, migration, provider, target or release
scope was authorized.

The slice is `PASS_BOUNDED` with `HIGH` local confidence and `HIGH` residual
risk. TDD RED preceded implementation. Inventory module passed `37/37`,
focused source coverage passed `92.07%` statements/lines, `89.85%` branches
and `100%` functions, module typecheck/build passed, configured worker suites
passed runner `53/53` plus all companion suites, and the disposable PostgreSQL
process passed `25/25`. The process included two-account isolation, lower and
upper inclusive UTC dates, a literal `%` search against an in-window
false-positive row, exact rows, durable execution and non-PII audit. The
independent reviewer returned `APPROVE_BOUNDED` with no CRITICAL/HIGH/MEDIUM
finding; its LOW test-coverage observation was closed by the strengthened
process assertion.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, general parity remains
`4/11`, clinical parity `2/3`, enterprise readiness `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`. Any next work requires
fresh scouting and a new implementation-ready authority. No commit, push,
deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-products.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-products-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-FINAL-001`.

## 2026-08-28 — scheduled inventory-stock bounded closure

The scheduled `inventory-stock` worker path is closed as `PASS_BOUNDED` with
`HIGH` confidence for this local bounded slice and `HIGH` residual risk. The
source composes the existing explicit tenant-safe persisted `inventory_items`
projection and derives only current `stockValue` and `reorderStatus`. The
worker validates filters, account ownership, canonical timestamps, numeric
facts and derived fields, then emits exactly the ten catalog fields. Durable
schedule execution/export audit and one-shot semantics remain unchanged; lots,
movements, invoices, historical valuation, CRUD, migrations, providers,
target and production remain excluded.

TDD RED preceded implementation. Inventory module tests passed `43/43`,
focused source coverage passed `96.15%` statements/lines, `91.42%` branches
and `100%` functions, module build/typecheck passed, configured worker suites
passed runner `55/55` plus all companion suites, and the focused disposable
PostgreSQL process passed with concurrent two-account isolation, exact rows,
current value/status derivation, inclusive filters, durable execution and
non-PII audit/log assertions. Independent review returned `APPROVE_BOUNDED`
with no CRITICAL/HIGH/MEDIUM/LOW finding.

The global retest remains non-promoting: general parity is `4/11` verified,
clinical parity is `2/3` verified, enterprise readiness is `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`) and promotion is `BLOCKED`. No commit, push, deploy or
external mutation occurred. Any next work requires fresh scouting and a new
implementation-ready authority.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-stock.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-stock-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-FINAL-001`.

## 2026-08-28 — bounded clinical-financial child-process closure

The selected `CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART` slice is
reconciled as `PASS_BOUNDED` under a verified bounded gate. The guarded named
launcher delegates to the real API entrypoint in a disposable PostgreSQL
environment under restricted API/worker roles. The focused test passed `1/1`
with a real `SIGKILL` after the exact `billing_items` pause, zero rollback
residue, distinct-PID restart, two identical inventory replays, divergent
idempotency conflict, valid tenant-B/A-encounter isolation with zero B
mutations, full clinical-financial continuation and exact SQL graph checks.

The final independent read-only review returned `APPROVE_BOUNDED`. The serial
critical runner passed entries `1–7`, including this child process at entry 5,
then the existing PIX entry 8 stopped at `15/25` with
`spawnSync pnpm ETIMEDOUT`; later entries were not run and the manifest is not
claimed green. Global parity remains `4/11` general and `2/3` clinical,
readiness remains `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion stays
`BLOCKED`. No production source, migration, provider, deployment, commit,
push or external mutation was performed; further work requires fresh scouting
and a new implementation-ready authority.

Evidence: `.agent/gates/verified-CVG-002-clinical-financial-child-process-restart.json`,
`.agent/artifacts/CVG-002-clinical-financial-child-process-restart-2026-08-28.md`,
`.agent/tasks/CVG-002-clinical-financial-child-process-restart.md` and
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-FINAL-001`.

## 2026-08-28 — bounded scheduled inventory-movements closure

The scheduled `inventory-movements` worker path is reconciled as
`PASS_BOUNDED` with `HIGH` local confidence and `HIGH` residual risk.
The source reads the existing persisted `inventory_stock_movements` ledger
with same-account `inventory_items` labels under explicit tenant context. It
preserves the exact thirteen catalog fields, signed deltas, nullable-reference
normalization, literal search, inclusive UTC dates, deterministic ordering and
the 10,000-row export bound. The worker revalidates source facts and
bootstrap composes the database-backed source; durable schedule execution,
export/audit, recipients and one-shot failure behavior remain unchanged.

TDD RED preceded implementation. The source passed `4/4` with focused
coverage of `96.38%` statements/lines, `82.47%` branches and `100%`
functions. Inventory module build and tests passed `47/47`; configured
worker suites passed runner `57/57`, bootstrap `20/20`, account discovery
`7/7`, consumer composition `2/2`, worker identity `8/8`,
scheduled-report `3/3` and PIX settlement `17/17`. The full disposable
PostgreSQL report process passed `27/27`, including concurrent two-account
movement execution, exact rows, filters, durable execution and non-PII audit.

A fresh compatible independent read-only review returned
`APPROVE_BOUNDED` with no CRITICAL/HIGH/MEDIUM/LOW finding. The first
configured reviewer attempt was unavailable because its fixed model was not
supported by the current account and is recorded as unavailable, never as
approval. Final hygiene passed formatting, secret scan, diff/index checks and
control-plane JSON/JSONL parsing with zero duplicate stable IDs.

The global retest remains non-promoting: general parity is `4/11` verified,
clinical parity `2/3` verified, enterprise readiness `95/100`
(`42 PASS`, `3 WARN`, `1 FAIL`) and promotion is `BLOCKED`. The bounded
authority excludes dynamic Vetus event interpretation, lots/consumption
reconstruction, invoice/NF, fiscal/historical valuation, providers, target,
production, deployment, accessibility, operational LGPD, remote CI,
backup/restore and release acceptance. CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`; no commit, push, deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-movements.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-movements-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-FINAL-001`.

## 2026-08-28 — bounded process-runner reconciliation

The critical-process runner authority is now reconciled as `PASS_BOUNDED`.
The implementation retained the ten-entry manifest and added bounded
asynchronous shell-free execution, typed outcomes, sanitized retained failure
evidence, POSIX group ownership, Windows Job Object ownership/identity checks,
and finite disposable PostgreSQL cleanup. The final4 local process matrix
passed `10/10`, including PIX `25/25`; focused runner/CI contracts passed
`31/31`; the final compatible review returned `APPROVE_BOUNDED` with no P0/P1/P2
finding.

This is a bounded regression checkpoint, not a global ERP or release verdict.
Keep global ERP `IN_PROGRESS/PARTIAL`, general parity `4/11`, clinical parity
`2/3`, readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion
`BLOCKED`. Any next implementation must begin with fresh scouting and a new
implementation-ready authority; no commit, push, deploy or external mutation
was performed.

Evidence: `.agent/gates/verified-CVG-OPS-CRITICAL-PROCESS-RUNNER-001.json`,
`.agent/artifacts/CVG-OPS-CRITICAL-PROCESS-RUNNER-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-OPS-CRITICAL-PROCESS-RUNNER-FINAL-001`.

## 2026-08-29 — scheduled inventory-invoices closure

The current bounded `CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES` execution
passed RED/GREEN, source/module/worker regressions, focused coverage, the full
local test suite, disposable PostgreSQL process proof, independent review and
hygiene. Close it only as `PASS_BOUNDED` under its verified gate. Keep global
ERP `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`; proceed to fresh scouting
for the next repository-local blocker and issue a new authority before code.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-invoices.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-invoices-2026-08-29.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-FINAL-001`.

## 2026-08-29 — bounded persisted appointments report closure

The Reports Workbench `appointments` path is now closed locally as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`. It reads the persisted,
tenant-scoped `scheduling-appointments` source with exactly thirteen raw
fields, strict normalized status/search/inclusive UTC filters, deterministic
ordering, database-only fail-closed behavior and a 10,001-row overflow bound.
The API uses the existing ReportsService execution/export/audit boundary and
the SPA delegates loading/export to the server path; `professional-care` and
all local name joins remain separate.

TDD RED preceded implementation. Focused scheduling/reports tests passed
`81/81`, compiled API report routes `42/42`, SPA Workbench `45/45`, disposable
PostgreSQL `3/3`, full API `509/509`, and the production SPA build transformed
`773` modules. Official coverage passed `2,156` tests with one explicit skip at
`80.08%` statements/lines, `80.65%` branches and `86.55%` functions; RLS,
migration-source, OpenAPI, secret, formatting and diff checks passed.

No fresh independent approval was obtained in the current execution context,
so the bounded gate carries medium confidence and makes no reviewer approval
claim. Parent CVG-004/global ERP remains `IN_PROGRESS/PARTIAL` and promotion
remains `BLOCKED`; professional-care, Vetus behavior parity, target,
production, deployment, accessibility, backup/restore and release evidence
remain open.

Evidence: `.agent/gates/verified-CVG-004-report-appointments-persisted.json`,
`.agent/artifacts/CVG-004-report-appointments-persisted-2026-08-29.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-APPOINTMENTS-PERSISTED-QUALITY-001`.

## 2026-08-30 — InpatientService stay tenant boundary

The fresh residual CVG-003 stay-service boundary is now locally reconciled as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`. AccountId is explicit at
`InpatientService` stay identifier operations and is forwarded by authenticated
inpatient, discharge and inventory callers. The disposable PostgreSQL proof
passed `2/2` across two accounts without a schema change; module `19/19`,
compiled routes `26/26` and full API `519/519` also passed.

Official coverage passed `2,174` tests with one skip at `80.17%`
statements/lines, `80.74%` branches and `86.66%` functions. Migration-source,
RLS, OpenAPI, secrets, targeted ESLint/Prettier and diff checks passed. No
independent review verdict was available, and the PostgreSQL pre-fix RED is not
claimed after the initial fixture UUID mismatch. Keep parent CVG-003/global ERP
`IN_PROGRESS/PARTIAL` and promotion `BLOCKED`; return to fresh scouting under a
new authority.

Evidence: `.agent/gates/verified-CVG-003-inpatient-stay-service-tenant-boundary.json`,
`.agent/artifacts/CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-2026-08-30.md`,
`.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-FINAL-001`.

## 2026-08-30 — recovery reconciliation: namespace and triage bounded closures

Continuation recovery found that this active plan ended at the inpatient-stay
checkpoint while the current `.agent` state and append-only ledgers had already
advanced through the CVG-012 namespace boundary and the closed-encounter
triage slice. The plan pointer was retained; the missing history is repaired
here without rewriting prior entries or changing product scope.

`CVG-012-NAMESPACE-CANONICAL-BOUNDARY` is locally reconciled as
`PASS_BOUNDED` / `COMPLETE_BOUNDED` after AST guard hardening and regression.
`CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY` is locally reconciled as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`: `createTriage` rejects closed encounters
before persistence/cache mutation, API `520/520`, workspace typecheck/build
`70/70`, and official coverage `2,178 passed / 1 skipped` at `80.18%`
statements/lines, `80.73%` branches and `86.66%` functions. The current
triage review criterion remains conditional because compatible independent
review was unavailable; no approval is inferred.

Global ERP remains `IN_PROGRESS/PARTIAL`, Vetus evidence remains `100/100`
with `4/11` areas functionally verified, clinical parity remains `2/3`,
enterprise readiness remains `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and
promotion remains `BLOCKED`. The generated design-system tsbuildinfo cache is
preserved outside scope. The next action is fresh residual scouting under a
new authority.

Evidence: `.agent/gates/verified-CVG-012-namespace-canonical-boundary.json`,
`.agent/gates/verified-CVG-003-triage-closed-encounter-atomicity.json`,
`.agent/artifacts/CVG-012-NAMESPACE-CANONICAL-BOUNDARY-2026-08-30.md`,
`.agent/artifacts/CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-2026-08-30.md`,
`.agent/verification.jsonl#VFY-CVG-003-TRIAGE-CLOSED-ENCOUNTER-ATOMICITY-CONTROL-PLANE-001`.

## 2026-08-30 — bounded semantic PIX replay convergence

`CVG-002B2B-SEMANTIC-PIX-REPLAY` is locally reconciled as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`. The dedicated signed PIX worker now
transports `claims_fingerprint` to B1; equivalent distinct provider event IDs
converge after billing serialization to one financial effect and two applied
deliveries, while divergent claims remain terminal and append-only receipts
remain observable. Same-event replay remains idempotent and direct legacy
callers without a fingerprint remain compatible.

TDD RED reproduced the provider_event_id-only gap. GREEN and regression passed
the disposable PostgreSQL consumer suite `11/11`, confirmed-settlement
integration `19/19`, module PIX `9/9`, worker `17/17`, workspace typecheck,
module/worker builds and the full financial-effect concurrency matrix. OpenAPI,
RLS, namespace, secrets, targeted ESLint and diff checks passed. The full lint
baseline still contains only the unrelated `no-control-regex` findings in
`packages/contracts/src/counterSales.ts:38,77`. A compatible independent
re-review confirmed the previous findings were resolved with no material
remaining issue.

The verified child gate has high local confidence and high residual risk. It
does not promote global ERP readiness, Vetus/clinical parity, provider,
target, production, deployment, backup/restore or release acceptance. Global
ERP remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`; continue
with fresh scouting under a new authority after the local commit.

Evidence: `.agent/gates/verified-CVG-002B2B-semantic-pix-replay.json`,
`.agent/artifacts/CVG-002B2B-semantic-pix-replay-2026-08-30.md`,
`.agent/tasks/CVG-002B2B-SEMANTIC-PIX-REPLAY.md`,
`.agent/verification.jsonl#VFY-CVG-002B2B-SEMANTIC-PIX-REPLAY-FINAL-001`.

## 2026-08-30 — bounded auth login input boundary

`CVG-002B2B-AUTH-LOGIN-INPUT-BOUNDARY` is locally reconciled as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`. The `POST /auth/login` route now guards
the top-level JSON shape, extracts only safe fields for the existing IP and
identity rate-limit buckets, and validates non-empty username/password values
at most 128 characters plus optional accountId at most 255 characters before
calling `AuthService.login`. Invalid input returns the existing sanitized 400
envelope without creating a session or echoing raw credential markers.

TDD RED reproduced the null dereference (`25/26` before implementation).
The expanded route suite passed `27/27`, including missing/blank/null/wrong
types, oversized values, inclusive maximums, explicit rate-limit ordering and
log/response marker assertions. The dedicated command
`pnpm --filter @cvg-his-v2/api test:auth-route` passed `27/27`; complete API
passed `522/522`, module-auth `46/46`, API build and workspace typecheck
passed. Security enterprise audit, OpenAPI, RLS, namespace, targeted lint,
Prettier and diff checks passed. Full lint retains only the unrelated
`packages/contracts/src/counterSales.ts:38,77` no-control-regex baseline.

An initial independent review found no Critical/High code defect and asked for
broader contract coverage and an explicit route command. Those findings were
remediated; the fresh independent review returned `APPROVE_BOUNDED`.

The child gate does not promote global ERP readiness, principal/MFA/session
policy, providers, target, production, deployment, remote CI, parity,
accessibility, backup/restore or release acceptance. Global ERP remains
`IN_PROGRESS/PARTIAL`, Vetus evidence remains `100/100` with `4/11`
functionally verified, clinical parity remains `2/3`, readiness remains
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`.
The implementation was committed as `01a7d677`; the next action is fresh
residual scouting under a new authority.

Evidence: `.agent/gates/verified-CVG-002B2B-auth-login-input-boundary.json`,
`.agent/artifacts/CVG-002B2B-auth-login-input-boundary-2026-08-30.md`,
`.agent/tasks/CVG-002B2B-AUTH-LOGIN-INPUT-BOUNDARY.md`,
`.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-LOGIN-INPUT-BOUNDARY-FINAL-001`.

## 2026-08-30 — bounded MFA login input boundary

`CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY` is locally reconciled as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`. The `POST /auth/login/mfa` route now
guards arbitrary JSON, validates non-empty bounded `userId`, `token` and
`challengeId` values at 128, 128 and 512 characters, projects a new immutable
payload and returns a sanitized 400 before `AuthService.completeMfaLogin` for
invalid input. Existing IP/identity rate-limit ordering, challenge, lockout,
TOTP, session and cookie semantics remain unchanged; token, challenge and full
body values do not enter rate-limit inputs or logs.

The intentional RED reproduced the null dereference (`28/29` before
implementation). The source and official compiled auth-route suites passed
`30/30`, the complete API passed `525/525`, module-auth passed `46/46` with
ephemeral database cleanup, workspace typecheck passed across `70/71` projects,
and V8 route coverage was `83.91%` lines, `70.76%` branches and `88.24%`
functions. Enterprise security/secretlint, OpenAPI (`354` paths), RLS
(`165/166` with documented exception), namespaces, targeted lint, Prettier and
diff checks passed. Full lint retains only the unrelated
`packages/contracts/src/counterSales.ts:38,77` no-control-regex baseline.

The local adversarial audit found no additional bounded defect. A compatible
independent agent verdict was unavailable because the reviewer model was
rejected, the default attempt timed out and the explorer reached the account
usage limit; no `APPROVE_BOUNDED` is inferred. This limitation is recorded as
conditional/low confidence in the verified gate. The separate inventory-
invoices sidecar review found a future persisted-status remediation candidate
and does not alter this MFA scope.

The child gate does not promote full MFA policy, global ERP, providers, target,
production, deployment, remote CI, parity, accessibility, LGPD, backup/restore
or release acceptance. Global ERP remains `IN_PROGRESS/PARTIAL`, Vetus remains
`4/11` functionally verified, clinical parity remains `2/3`, readiness remains
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`.
The explicit bounded slice was committed locally as `233d3ed9`; resume fresh
residual scouting under a new authority.

Evidence: `.agent/gates/verified-CVG-002B2B-auth-mfa-login-input-boundary.json`,
`.agent/artifacts/CVG-002B2B-auth-mfa-login-input-boundary-2026-08-30.md`,
`.agent/tasks/CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY.md`,
`.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-FINAL-001`.

## 2026-08-30 — persisted inventory-invoices status boundary

The fresh post-commit scout selected
`CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY` after
the sidecar review found that persisted `null`, empty and whitespace status
filters were converted to no filter by the worker. The worker-local parser now
rejects those defined malformed values before `source.list`, while preserving
`undefined`, valid normalized statuses and all other report behavior. No
migration, backfill, fiscal semantics or other report family was changed.

TDD RED reproduced `58/59` with `Missing expected rejection`. GREEN and
regression passed worker suites `59/59`, `20/20`, `7/7`, `2/2`, `8/8`, `11/11`
and `17/17`, inventory module `51/51`, worker/inventory typecheck/build and
V8 runner coverage `89.59%` lines, `79.33%` branches and `98.62%` functions.
Security/secretlint, OpenAPI (`354` paths), RLS (`165/166` with documented
exception), namespaces, Prettier and diff checks passed. Full lint retains
only the unrelated `packages/contracts/src/counterSales.ts:38,77`
no-control-regex baseline.

The local adversarial audit found no additional bounded defect. Independent
review was unavailable because the account/model limits persisted; no
`APPROVE_BOUNDED` is inferred. The former Medium behavior finding is remediated;
the stale historical line citation remains a separate Low documentation debt.
Global ERP remains `IN_PROGRESS/PARTIAL`, Vetus remains `4/11` functionally
verified, clinical parity remains `2/3`, readiness remains `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-invoices-persisted-status-boundary.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-invoices-persisted-status-boundary-2026-08-30.md`,
`.agent/tasks/CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-FINAL-001`.

The bounded worker correction was committed locally as `f14bf7a4`; the
pre-existing design-system `tsbuildinfo` cache remained outside the commit.
Resume fresh residual scouting under a new authority while global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## 2026-08-30 — implementation-ready surgery tenant boundary

Fresh local scouting after `f14bf7a4` selected
`CVG-003-SURGERY-TENANT-BOUNDARY`: `SurgeryService` currently lacks explicit
account scope on case create/list/read/update while the HTTP adapter owns the
only account checks. The database repository is already tenant-scoped, so the
authorized slice is limited to service signatures, route forwarding, focused
tests and first-party caller updates. Two explorer delegations were unavailable
because the account reached the `gpt-5.3-codex-spark` usage limit; this is local
evidence, not scout consensus or approval.

Evidence: `.agent/gates/implementation-ready-CVG-003-surgery-tenant-boundary.json`,
`.agent/tasks/CVG-003-SURGERY-TENANT-BOUNDARY.md`,
`.agent/authority.jsonl#AUTH-CVG-003-SURGERY-TENANT-BOUNDARY-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-003-SURGERY-TENANT-BOUNDARY-001`.

The intentional RED is recorded in
`.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-RED-001`;
GREEN, regression and quality are recorded in
`.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-GREEN-001`,
`.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-REGRESSION-001`
and `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-QUALITY-001`.
The bounded child gate is now `PASS_BOUNDED` / `COMPLETE_BOUNDED` with an
explicit `CONDITIONAL`/`LOW` independent-review limitation; the next action is
an explicit commit followed by post-commit reconciliation and fresh residual
scouting. Global ERP remains `IN_PROGRESS/PARTIAL` and promotion remains
`BLOCKED`.
