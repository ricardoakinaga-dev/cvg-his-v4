# CVG-003 — billing tenant boundary — 2026-08-30

## Resultado

The bounded BillingService, authenticated billing HTTP routes and first-party
financial/payment/event/inpatient/inventory/worker callers now carry explicit
account scope. Encounter and record ownership is checked before disclosure,
cache publication, repository mutation or callbacks; foreign resources fail
closed with opaque not-found behavior. The slice is
`COMPLETE_BOUNDED` / `PASS_BOUNDED`. Global ERP remains `IN_PROGRESS/PARTIAL`
and promotion remains `BLOCKED`.

## Escopo e implementação

- `packages/modules/billing/src/index.ts` requires `AccountId` for encounter
  and record reads, lazy record creation, item creation/listing, status
  updates and record settlement.
- Hydration, authoritative listing, encounter lookup and item lookup filter
  record/item account and billing-record/encounter linkage before cache
  publication. Repository-backed `listItems` replaces the cache with the
  authoritative result, including an empty result after rollback.
- `apps/api/src/routes/billing-routes.ts` forwards the authenticated account
  for billing list, detail, items, estimate, item and status paths.
- Financial, payment, event-consumer, inpatient, inventory and worker
  first-party callers were migrated to the explicit account contract.
- Existing status transitions, source-item idempotency, repository predicates,
  callbacks and payment guards remain unchanged.

No migration, schema, repository SQL redesign, settlement/cash redesign,
provider, credential, target, production, deployment, release or external
mutation was performed.

## TDD, revisão e regressão

- RED: the direct two-account service contract passed `17/18`, with the
  expected legacy `createEstimate(payload)` signature failure; the compiled
  authenticated billing-route contract passed `13/14`, with the expected
  missing-account forwarding failure. API compilation passed.
- GREEN: BillingService tests passed `20/20`; compiled authenticated billing
  route tests passed `15/15`.
- First independent review returned `CONDITIONAL` with no Critical or High
  defect. It identified one High cache-resurrection risk, one Medium
  ownership-filtering gap and one Low missing authenticated foreign-route
  test. The cache behavior, record/item filtering and route contract were
  remediated with behavior-focused tests.
- The rollback assertion initially needed tenant context; after correction,
  the focused rollback integration passed `1/1` and the bounded integration
  rail passed `5` files / `21/21` tests.
- Fresh independent review returned `APPROVE` with no actionable correctness
  or security findings within the bounded scope. It confirmed account guards,
  repository predicates, cache invalidation, first-party propagation and
  sanitized foreign-route behavior.
- Focused BillingService V8 coverage passed `83.68%` statements, `81.48%`
  branches and `87.50%` functions.
- Complete API regression passed `530/530`; worker test/typecheck/build rail
  passed; official workspace V8 coverage passed at `80.63%` statements,
  `81.14%` branches and `87.18%` functions.

Evidence:

- `.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-REGRESSION-001`

## Qualidade e segurança

Enterprise dependency security reported zero critical, high or moderate
advisories; secret scanning, OpenAPI validation (`354` paths, `40` tags,
`413` schemas), namespace validation, migration-source validation, RLS
validation (`165/166` protected tenant tables with one documented exception),
deploy-surface validation, static Helm validation, targeted package/API/worker
lint, Prettier and `git diff --check` passed. Workspace typecheck and full
workspace build passed.

Workspace lint retains only the unrelated pre-existing
`packages/contracts/src/counterSales.ts:38,77` `no-control-regex` baseline.

Evidence:

- `.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-QUALITY-001`
- `.agent/artifacts/CVG-003-billing-tenant-boundary-2026-08-30.md`

## Limitações e não promoção

`BillingItem.sourceEntityType/sourceEntityId` remains a polymorphic reference;
BillingService does not independently resolve the source entity. The reviewed
first-party callers are account-scoped, and source-entity resolver/schema
redesign is outside this bounded authority. This is an explicit residual, not
a claim of universal protection for arbitrary future in-process callers.

This artifact proves only the repository-local BillingService/HTTP/first-party
caller boundary. It does not certify provider/homologation, target operations,
production, deployment, remote CI, accessibility, LGPD, backup/restore,
distributed operation, release or global ERP readiness. Vetus evidence remains
`100/100` with `4/11` functionally verified; clinical parity remains `2/3`;
enterprise readiness remains `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`).

The pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo` cache remains outside the
explicit commit set and must not be staged.

## Reconciliação pré-commit

The bounded child gate is verified as `PASS_BOUNDED` with a fresh independent
`APPROVE` review. After control-plane reconciliation, commit only the explicit
Billing source, test and evidence paths, verify the exact commit file list and
preserve global non-promotion before starting a new residual scout under a
fresh authority.
