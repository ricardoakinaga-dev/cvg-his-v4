# CVG-003 — billing tenant boundary

## Contrato

- Status: `COMPLETE_BOUNDED` / `PASS_BOUNDED`
- Estágio/atividade: `CLOSE` / `RECONCILE`
- Responsável: root integrator with TDD and independent read-only review
- Tier/risco/raio: 'T4_CRITICAL' / 'CRITICAL' / 'CROSS_SYSTEM'
- Dependência: CVG-003 behavioral security spine; no schema/provider dependency
- Authority: .agent/authority.jsonl#AUTH-CVG-003-BILLING-TENANT-BOUNDARY-IR-001

## Finding confirmado

BillingService resolves encounter-backed records and items through an
EncountersService lookup but does not require the caller's AccountId on
findByEncounter, getByEncounterOrThrow, ensureRecord, createEstimate, addItem,
listItems or updateStatus. Its cached getOrThrow and settleByRecordId paths
also have no account boundary. The billing routes authenticate the principal
but call those methods without forwarding the principal account on detail,
items, estimate, item and status paths.

Fresh local and delegated scout evidence:

- packages/modules/billing/src/index.ts:136-257,265-441 contains the
  encounter/record lookups and mutations without explicit account scope;
- apps/api/src/routes/billing-routes.ts:94-281 forwards no account to those
  service methods on authenticated requests;
- packages/modules/billing/src/repositories/database-billing.repository.ts
  already accepts accountId for durable record/item queries, so this slice
  does not require a repository SQL or schema change;
- first-party financial, payment, event-consumer and inpatient callers also
  use the unscoped service surface and must be migrated with the contract.

This is a financial-data confidentiality and integrity boundary. Foreign
encounter/record access must fail closed before disclosure, cache publication,
status mutation or item persistence.

## Escopo autorizado

1. Require AccountId on BillingService encounter/record reads, listing,
   lazy-record creation, item creation, status updates and record settlement;
   make the in-memory list contract account-scoped as well.
2. Check encounter/record ownership before disclosure, cache mutation,
   repository calls that can create/update, callback invocation or status/item
   mutation. Use opaque not-found semantics for foreign resources.
3. Forward the authenticated account through billing HTTP routes and migrate
   only the first-party financial, payment, event-consumer and inpatient
   callers needed by the explicit service contract.
4. Add focused direct-service and HTTP two-account tests for detail, items,
   estimate, item creation, status update and settlement isolation while
   preserving same-account billing lifecycle and source-item idempotency.

## Fora de escopo

No schema, migration or repository SQL redesign; no cash/settlement redesign,
financial-ledger semantics, provider, credential, target, production,
deployment, external mutation, accessibility, parity, release or global ERP
promotion. Existing payment-in-progress guards, billing status transitions,
source-item uniqueness and repository predicates remain unchanged.

## TDD e aceitação

### RED — executado

- Add a direct two-account BillingService contract proving account A can create
  and read its record/items while account B cannot read, list, create from A's
  encounter, add an item, update status or settle A's record, with state
  unchanged after each denial.
- Add an authenticated billing-route contract proving same-account detail,
  items and commands remain compatible and foreign encounter IDs return the
  existing sanitized not-found behavior.
- Run the focused contracts before implementation and record the expected
  legacy-signature/forwarding failures.

The direct two-account contract was added and intentionally failed before
implementation with the legacy `createEstimate(payload)` signature. The
authenticated route propagation contract is also the required next RED rail;
no implementation approval is inferred from these failures.

The RED was executed locally: the direct BillingService suite reported 17/18
passing with one expected account-aware signature failure, and the compiled
authenticated route suite reported 13/14 passing with one expected omission of
the principal account. API compilation passed. Proceed to GREEN with the
existing repository predicates and global promotion block unchanged.

### GREEN

- Implement the smallest explicit account-aware BillingService signatures and
  private encounter/record guards; preserve repository calls, source-item
  replay, callbacks and status rules.
- Update authenticated routes and first-party callers without retaining an
  unscoped public billing read/mutation path in this slice.

## GREEN registrado — 2026-08-30

The explicit account boundary is implemented across BillingService encounter
and record reads, lazy record creation, item creation/listing, status updates
and settlement. Encounter and record ownership is checked before disclosure,
cache publication, repository mutation or callbacks; foreign resources use
opaque not-found behavior. Hydration, authoritative listing and repository
item reads now filter record/item account and linkage, and an authoritative
empty item read clears the hot cache instead of resurrecting rolled-back data.

Authenticated billing routes forward the principal account for list, detail,
items, estimate, item and status paths. Financial, payment, event-consumer,
inpatient, inventory and worker first-party callers were migrated to the same
contract. Existing billing status transitions, source-item idempotency,
repository predicates and callback semantics remain unchanged.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-GREEN-001`.

## Revisão independente e remediação — 2026-08-30

The first independent review returned `CONDITIONAL` without Critical or High
findings, identifying one High cache-resurrection risk, one Medium ownership
filtering gap and one Low missing authenticated foreign-route test. The High
finding was remediated by making repository-backed `listItems` authoritative
even when it returns an empty list; the Medium finding was remediated by
filtering hydrated/listed records and items by account, billing-record and
encounter linkage; and the Low finding was covered by the authenticated route
contract with sanitized foreign-resource `404` behavior.

The fresh independent review returned `APPROVE` with no actionable
correctness or security findings within the bounded scope. It confirmed
account checks before disclosure/mutation, repository predicates, cache
invalidation, caller propagation and route non-disclosure.

The remaining bounded limitation is explicit: `sourceEntityType` /
`sourceEntityId` is a polymorphic BillingItem reference and BillingService
does not independently resolve the source entity. First-party callers are
account-scoped; source-entity resolver/schema redesign is outside this gate.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-REVIEW-001`.

## Regressão e qualidade — 2026-08-30

- BillingService module: `20/20`;
- compiled authenticated billing routes: `15/15`;
- focused rollback integration: `1/1`;
- bounded billing/integration rail: `5` files, `21/21` tests;
- focused BillingService V8 coverage: `83.68%` statements, `81.48%`
  branches and `87.50%` functions;
- complete API package: `530/530`;
- worker test rail: pass;
- official workspace V8 coverage: `80.63%` statements, `81.14%` branches,
  `87.18%` functions;
- workspace typecheck and build: pass;
- enterprise security, secret scan, OpenAPI (`354` paths, `40` tags, `413`
  schemas), namespaces, migration-source, RLS (`165/166` protected tenant
  tables with one documented exception), deploy-surface, Helm static
  validation, targeted lint, Prettier and `git diff --check`: pass.

Workspace lint retains only the unrelated pre-existing
`packages/contracts/src/counterSales.ts:38,77` `no-control-regex` baseline.
No migration, schema, repository SQL redesign, settlement/cash redesign,
provider, credential, target, production, deployment, release or external
mutation was performed.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-REGRESSION-001`
and `.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-QUALITY-001`.

## Fechamento limitado

Close this task as `COMPLETE_BOUNDED` / `PASS_BOUNDED`. The child result does
not promote CVG-003/global ERP: Vetus remains `100/100` evidence with `4/11`
functionally verified, clinical parity remains `2/3`, enterprise readiness
remains `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains
`BLOCKED`. The pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo` cache remains outside the
explicit commit.

### Bounded closure

Close only as 'PASS_BOUNDED' if focused billing/route contracts, API
regression, typecheck/build, focused coverage at or above 80%, security/static
controls, formatting, diff hygiene and an independent review pass. Record any
review limitation explicitly and never infer global promotion.

The result must keep CVG-003/global ERP 'IN_PROGRESS/PARTIAL' and promotion
'BLOCKED'.

## Reconciliação pós-commit — 2026-08-30

The bounded correction was committed locally as `c7eb4a00` (`fix: enforce
billing tenant boundary`) with the explicit 38-path source, test and
control-plane set. The exact commit file list was verified and the only
remaining worktree change is the pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo` cache, intentionally
unstaged. This task is complete as `COMPLETE_BOUNDED` / `PASS_BOUNDED`; resume
fresh residual scouting under a new authority while global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-BILLING-TENANT-BOUNDARY-COMMIT-001`.
