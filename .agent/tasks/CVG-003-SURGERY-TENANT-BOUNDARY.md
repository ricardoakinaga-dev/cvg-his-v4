# CVG-003 — surgery service tenant boundary

## Contrato

- Status: `COMPLETE_BOUNDED` / `CLOSE`
- Estágio/atividade: `CLOSE` / `RECONCILE`
- Responsável: root integrator
- Tier/risco/raio: `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`
- Dependência: CVG-003 behavioral security spine; no target, provider or migration dependency

## Finding confirmado

`apps/api/src/routes/surgery-routes.ts` currently checks the authenticated
account before returning or mutating a case, but `SurgeryService` itself has
no account argument on `requestCase`, `list`, `getOrThrow` or `updateStatus`.
The in-memory service therefore trusts the encounter/case ID for any direct
caller, unlike the already tenant-scoped database repository. A future service
consumer could bypass the HTTP guard and read or mutate another account's
surgery case, or create a case from another account's encounter.

Evidence from the fresh local scout:

- `packages/modules/surgery/src/index.ts:75-124` derives the new case account
  from the encounter and resolves/updates cases by ID without caller account.
- `apps/api/src/routes/surgery-routes.ts:39-126` performs the account checks
  only in the HTTP adapter and invokes the unscoped service methods.
- `packages/modules/surgery/src/repositories/database-surgery.repository.ts:28-115`
  already enforces tenant context and account predicates for persistence.
- `packages/modules/surgery/src/surgery.test.ts` covers lifecycle and rollback,
  but has no negative direct-service cross-account assertion.
- Runtime persistence callers in `apps/api/src/runtime.test.ts`,
  `apps/api/src/db-persistence.test.ts` and
  `apps/api/src/canonical-db-runtime.test.ts` use the unscoped signatures.

Two delegated explorer attempts were unavailable because the account reached
the `gpt-5.3-codex-spark` usage limit. The selection is therefore local
repository evidence, not scout consensus or independent approval.

## RED registrado — 2026-08-30

The direct-service contract failed `1/10` because the desired account-aware
`requestCase` call reached the legacy signature and observed an undefined
encounter ID. The API build passed, and the compiled route contract failed
because POST `/surgeries` still forwarded only the payload. Evidence:

- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-RED-001`
- `.agent/execution-log.jsonl#EVT-1280`

## Escopo autorizado

1. Require an explicit `accountId` in the surgery service methods that resolve,
   create, list or update cases.
2. Reject cross-account encounter/case access as not found before mutation or
   persistence, while preserving immutable state transitions and rollback.
3. Pass the authenticated principal account from the surgery HTTP route.
4. Add focused service and route tests, and update existing first-party test
   callers to the explicit account contract.

## Fora de escopo

No migration, schema, repository SQL redesign, new surgery workflow, provider,
credential, target, production, deployment, release or global ERP promotion.
The database repository's existing tenant predicates remain unchanged.

## TDD e aceitação

### RED

- Add a direct-service negative test proving an account cannot list, read,
  update or create surgery data through another account's encounter/case.
- Add a route contract test proving the principal account is forwarded to the
  service boundary.
- Run the focused surgery suite and record the expected compile/test failure
  before changing the service implementation.

### GREEN

- Implement the smallest account-aware service signatures and route forwarding.
- Prove same-account lifecycle and persistence callers remain compatible.
- Prove cross-account operations fail before cache mutation, persistence or
  response disclosure.

### Bounded closure

Close only as `PASS_BOUNDED` if focused service/route tests, API regressions,
typecheck/build, security/static checks, formatting and diff hygiene pass. An
independent reviewer is required for higher-confidence use; unavailable review
must remain an explicit condition and must not be represented as approval.

The result must keep CVG-003/global ERP `IN_PROGRESS/PARTIAL` and promotion
`BLOCKED`.

## GREEN registrado — 2026-08-30

The account-aware service boundary is implemented. `requestCase` validates the
caller account against the encounter before creating or enqueueing persistence;
`list` filters by account and optional encounter; `getOrThrow` and
`updateStatus` resolve the case through the same account guard before any state
transition or persistence enqueue. The route forwards the authenticated account
for list, create, detail and status operations, while retaining its existing
encounter defense-in-depth checks.

Evidence:

- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-GREEN-001`
- `packages/modules/surgery/src/index.ts:54-155`
- `apps/api/src/routes/surgery-routes.ts:36-126`
- `packages/modules/surgery/src/surgery.test.ts:189-215`
- `apps/api/src/routes/surgery-routes.test.ts:7-66`

The focused module suite passed `10/10`, the compiled route contract passed
`1/1`, and the API build passed.

## Regression and quality — 2026-08-30

The complete API rail passed `526/526`; module Surgery typecheck and API lint
passed. Focused V8 coverage for `packages/modules/surgery/src/index.ts` passed
the 80% thresholds with `96.09%` statements/lines, `87.8%` branches and
`100%` functions. Enterprise security reported zero critical, high or moderate
dependency advisories; secretlint, OpenAPI (`354` paths, `40` tags, `413`
schemas), RLS (`165/166` protected tenant tables with one documented
exception), namespace validation, migration-source validation, Prettier and
diff hygiene passed.

The workspace lint command retains only the unrelated pre-existing
`packages/contracts/src/counterSales.ts:38,77` `no-control-regex` baseline.
No migration, schema, repository SQL, provider, credential, target, production,
deployment, release or external mutation was performed.

Evidence:

- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-QUALITY-001`
- `.agent/artifacts/CVG-003-surgery-tenant-boundary-2026-08-30.md`

## Review limitation and bounded closure — 2026-08-30

Two fresh delegated explorer attempts were unavailable because the account
reached the `gpt-5.3-codex-spark` usage limit. No independent post-implementation
review verdict or approval is inferred. A local adversarial audit confirmed
that cross-account create/read/update paths fail before cache mutation or
persistence enqueue, list is account-filtered, all four route calls forward the
principal account, and same-account lifecycle/persistence callers remain
compatible. The verified gate retains `CONDITIONAL`/`LOW` review confidence.

The child result is closed only as `PASS_BOUNDED` / `COMPLETE_BOUNDED` for the
service/HTTP boundary. Global ERP remains `IN_PROGRESS/PARTIAL`, Vetus evidence
remains `100/100` with `4/11` functionally verified, clinical parity remains
`2/3`, enterprise readiness remains `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`),
and promotion remains `BLOCKED`.

Evidence:

- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-FINAL-001`

## Reconciliação pós-commit — 2026-08-30

The bounded correction was committed locally as `19de7ff0` (`fix: enforce
surgery service tenant boundary`). The commit contains the 18 expected source,
test, task, gate, artifact, plan and control-plane paths. The only remaining
worktree change is the pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo` cache, which was not staged.

Evidence:

- `.agent/verification.jsonl#VFY-CVG-003-SURGERY-TENANT-BOUNDARY-COMMIT-001`
- `.agent/execution-log.jsonl#EVT-1288`

This task is complete as `COMPLETE_BOUNDED` / `PASS_BOUNDED`. The next action
is fresh residual scouting under a new authority; global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.
