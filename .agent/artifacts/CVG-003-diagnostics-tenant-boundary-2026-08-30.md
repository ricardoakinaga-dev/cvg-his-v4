# CVG-003 — diagnostics, laboratory and attachment tenant boundary — 2026-08-30

## Resultado

The bounded DiagnosticsService/LaboratoryService/AttachmentsService and
authenticated first-party HTTP boundary now carries an explicit `AccountId`.
Diagnostic order create, list, detail and legacy result paths check the account
before disclosure or mutation; laboratory compatibility calls forward the
account; diagnostic attachment upload validates the account-scoped target.
The slice is `COMPLETE_BOUNDED` / `PASS_BOUNDED`. Global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## Implementação

- `packages/modules/diagnostics/src/index.ts` requires account scope for
  create/list/detail/result compatibility methods, filters encounter lists,
  and keeps raw order lookup private for internal workflow builders.
- `packages/modules/diagnostics/src/laboratory.ts` forwards account scope
  through list/create/get/record gateway methods and compatibility fallbacks.
- `packages/modules/attachments/src/index.ts` requires actor and account
  context for upload, resolves diagnostic targets within that account and
  rejects foreign targets with opaque not-found semantics.
- `apps/api/src/server.ts` forwards the authenticated account through
  encounter summaries, diagnostic attachment validation and upload.
- First-party runtime/database/integration/unit callers and focused tests were
  migrated to the explicit contract.

No migration, schema, repository SQL redesign, provider, credential, target,
production, deployment, release or external mutation was performed.

## TDD, revisão e regressão

- RED: the new direct service, laboratory gateway and attachment contracts
  failed against the old signatures (`2` diagnostics contract failures and
  `1` attachment contract failure), with existing behavior green.
- GREEN: diagnostics module tests passed `32/32`; attachments module tests
  passed `14/14`.
- First independent review returned `CONDITIONAL` with two Medium findings:
  focused branch coverage was initially below `80%`, and first-party HTTP
  tests did not cover encounter summaries/diagnostic attachments across
  accounts. Both were remediated with behavior-focused tests. The review also
  recorded one Low residual: direct `getById`, `getFileContent` and
  `listByLinkedEntity` attachment reads remain unscoped at the service surface;
  authenticated server paths retain target/account checks, and the read-surface
  expansion remains outside this upload-focused slice.
- A fresh independent post-remediation review returned `APPROVE_BOUNDED` with
  no Critical, High or Medium finding. It confirmed the account checks,
  laboratory forwarding, HTTP coverage and the Low attachment read residual.
- Focused V8 coverage passed `50/50` tests at `91.05%` statements,
  `84.71%` branches and `93.91%` functions.
- Complete API regression passed `528/528`; official workspace coverage passed
  `2189` tests with `1` expected skip at `80.63%` statements, `81.13%`
  branches and `87.17%` functions.

## Qualidade e segurança

Workspace typecheck and build passed. Enterprise dependency security reported
zero critical, high or moderate advisories; secret scanning, OpenAPI
validation (`354` paths, `40` tags, `413` schemas), namespace validation,
migration-source validation, RLS validation (`165/166` protected tenant tables
with one documented exception), deploy-surface validation, Prettier and
`git diff --check` passed. Workspace lint retains only the unrelated
pre-existing `packages/contracts/src/counterSales.ts:38,77`
`no-control-regex` baseline.

## Limitações e não promoção

This artifact proves only the repository-local diagnostics/laboratory/attachment
boundary and its authenticated first-party callers. It does not certify
attachment read APIs outside the upload path, every future external consumer,
provider/homologation, target operations, production, deployment, remote CI,
accessibility, LGPD, backup/restore, distributed operation, release or global
ERP readiness. Vetus evidence remains `100/100` with `4/11` functionally
verified; clinical parity remains `2/3`; enterprise readiness remains `95/100`
(`42 PASS`, `3 WARN`, `1 FAIL`).

The pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo` cache remains outside the
explicit commit set and must not be staged.

## Reconciliação pré-commit

The bounded child gate is verified as `PASS_BOUNDED` with the independent
review approved within scope and is ready for an explicit local commit. After
the commit, inspect the exact committed file list and preserve the global
non-promotion condition before starting a new residual scout under a fresh
authority.
