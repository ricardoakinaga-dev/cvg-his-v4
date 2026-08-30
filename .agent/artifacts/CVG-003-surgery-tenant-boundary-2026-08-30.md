# CVG-003 — surgery service tenant boundary — 2026-08-30

## Resultado

The SurgeryService now requires an explicit `AccountId` for case creation,
listing, detail lookup and status updates. Foreign-account encounter/case
operations return the existing not-found domain error before cache mutation or
persistence enqueue. The authenticated HTTP adapter forwards the principal
account for all four operations. The slice is `COMPLETE_BOUNDED` /
`PASS_BOUNDED`; global ERP remains `IN_PROGRESS/PARTIAL` and promotion remains
`BLOCKED`.

## Implementação

- `packages/modules/surgery/src/index.ts` adds account-aware encounter and case
  guards, filters in-memory listings by account and resolves updates through the
  same guard.
- `apps/api/src/routes/surgery-routes.ts` forwards `principal.user.accountId`
  to list/create/detail/status service calls and retains encounter checks.
- `packages/modules/surgery/src/surgery.test.ts` covers same-account lifecycle,
  foreign-account list/read/update/create denial and state preservation.
- `apps/api/src/routes/surgery-routes.test.ts` verifies the authenticated
  account crosses the POST route/service boundary.
- Existing runtime persistence callers were migrated to the explicit contract
  in `apps/api/src/runtime.test.ts`, `apps/api/src/db-persistence.test.ts` and
  `apps/api/src/canonical-db-runtime.test.ts`.

No migration, schema, repository SQL, provider, credential, target,
production, deployment, release or external mutation was performed.

## TDD e regressão

- RED: the new service and route contracts were added first. The module suite
  failed as expected at `1/10` because the legacy `requestCase` signature
  received the account as the payload; the compiled route contract failed
  because POST `/surgeries` omitted `accountId`. The API build passed.
- GREEN: module Surgery passed `10/10`, the compiled route contract passed
  `1/1`, and the API build passed.
- Regression: the complete API rail passed `526/526`; module Surgery typecheck
  and API lint passed.
- Focused V8 coverage of `packages/modules/surgery/src/index.ts` passed the
  80% thresholds with `96.09%` statements/lines, `87.8%` branches and `100%`
  functions.

## Qualidade e segurança

Enterprise security reported zero critical, high or moderate dependency
advisories. Secretlint, OpenAPI (`354` paths, `40` tags, `413` schemas), RLS
(`165/166` tenant tables protected with one documented exception), namespace
validation, migration-source validation, Prettier and `git diff --check`
passed. Workspace lint retains only the unrelated pre-existing
`packages/contracts/src/counterSales.ts:38,77` `no-control-regex` baseline.

## Revisão e limitações

Two delegated explorer attempts were unavailable because the account reached
the `gpt-5.3-codex-spark` usage limit. No independent review verdict or approval
is inferred. A local adversarial audit confirmed that the service checks the
account before cache/persistence mutation, list is account-filtered, all four
route calls forward the principal account and first-party callers compile and
pass regression. The verified gate therefore retains a
`CONDITIONAL`/`LOW` independent-review limitation.

This artifact does not certify surgery schema/migrations, other clinical
modules, target RLS/roles, provider/homologation, production, deployment,
remote CI, accessibility, backup/restore, release or global ERP readiness.

## Reconciliação pré-commit

The bounded child gate is verified as `PASS_BOUNDED` and is ready for an
explicit local commit. The pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo` cache remains outside scope
and must not be staged. After commit, verify the exact commit file list and
preserve the global non-promotion condition before starting a new residual
scout.
