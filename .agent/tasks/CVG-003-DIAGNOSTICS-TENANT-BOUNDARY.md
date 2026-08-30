# CVG-003 — diagnostics and laboratory tenant boundary

## Contrato

- Status: `COMPLETE_BOUNDED` / `PASS_BOUNDED`
- Estágio/atividade: `CLOSE` / `RECONCILE`
- Responsável: root integrator with TDD and local adversarial verification
- Tier/risco/raio: `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`
- Dependência: CVG-003 behavioral security spine; no migration, provider or target dependency
- Authority: `.agent/authority.jsonl#AUTH-CVG-003-DIAGNOSTICS-TENANT-BOUNDARY-IR-001`

## Finding confirmado

`DiagnosticsService` still exposes create, list, detail and legacy result
mutation methods without an explicit `AccountId`. The account-aware workflow
variants already exist, but the legacy methods are still used by the
`LaboratoryService` adapter, attachment validation and the encounter summary
path. A direct caller can therefore resolve a diagnostic order by ID before an
account check, and an encounter-filtered list can be requested without tenant
scope.

Fresh local evidence:

- `packages/modules/diagnostics/src/index.ts:365-473` creates/lists/resolves
  orders without caller account context, while `listByAccount` and selected
  workflow methods already carry `AccountId`.
- `packages/modules/diagnostics/src/index.ts:482-604,1028-1089` resolves
  orders by ID for legacy result and laboratory transition builders.
- `packages/modules/diagnostics/src/laboratory.ts:343-488` calls those
  unscoped gateway methods from order listing/detail and compatibility proxies.
- `apps/api/src/server.ts:5135,6027,8030` calls diagnostic detail/list paths
  after authentication but without passing the principal account to the
  diagnostic service.
- `packages/modules/attachments/src/index.ts:281-298` validates a diagnostic
  attachment target through an unscoped diagnostic lookup; its upload boundary
  currently receives no account context.

The public authenticated laboratory workflow already has account-aware route
methods and the database repository is tenant-aware. This slice closes the
remaining in-process service/adapter boundary without changing that workflow,
the repository SQL or the database schema.

## RED registrado — 2026-08-30

The focused contracts failed before implementation as expected:

- the direct account-aware `DiagnosticsService.createOrder` call reached the
  legacy one-argument signature;
- `LaboratoryService.listOrders` forwarded only `encounterId` to its gateway;
- `AttachmentsService.upload` treated the proposed account argument as the
  payload and rejected `linkedEntityId`.

Diagnostics reported two contract failures while the existing module tests
remained green; attachments reported one contract failure with its other tests
green. Evidence:
`.agent/verification.jsonl#VFY-CVG-003-DIAGNOSTICS-TENANT-BOUNDARY-RED-001`.

## Escopo autorizado

1. Require an explicit `AccountId` for `DiagnosticsService` create, list,
   detail and legacy result APIs, including durable create/result wrappers.
2. Check the account before state mutation, persistence enqueue or result
   disclosure; return opaque `NotFoundError` semantics for foreign orders and
   encounters.
3. Migrate `LaboratoryService` gateway/proxy calls to the explicit account
   contract while preserving its existing account-aware workflow APIs.
4. Pass the authenticated account through the server encounter-summary and
   attachment diagnostic paths, and through `AttachmentsService.upload`.
5. Add focused direct-service, adapter and first-party caller tests, then run
   module/API regressions and bounded security/static checks.

## Fora de escopo

No migration, schema or repository SQL redesign; no provider, credential,
target, production, deployment, external mutation, accessibility, parity,
release or global ERP promotion. Existing account-aware laboratory workflow,
idempotency, signer and persistence semantics remain unchanged.

## TDD e aceitação

### RED

- Add a direct-service contract that creates an order in account A and proves
  account B cannot list, read, create from A's encounter or record a result.
- Add a laboratory-adapter contract proving the principal account is forwarded
  to the diagnostics gateway.
- Add an attachment contract proving the account is forwarded and a foreign
  diagnostic target fails closed.
- Run the focused module/attachment contracts before implementation and record
  the expected signature/behavior failure.

### GREEN

- Implement the smallest explicit account-aware signatures and private raw
  lookups needed by internal workflow builders.
- Update all first-party production and test callers without retaining an
  unscoped public diagnostics mutation/read surface.
- Preserve same-account lifecycle, result normalization, persistence ordering,
  idempotency and attachment behavior.

### Bounded closure

Close only as `PASS_BOUNDED` if focused module/attachment tests, API regressions,
typecheck/build, focused coverage at or above 80%, security/static controls,
formatting and diff hygiene pass. An independent review is required for
higher-confidence use; if unavailable, record the limitation explicitly and do
not infer approval.

The result must keep CVG-003/global ERP `IN_PROGRESS/PARTIAL` and promotion
`BLOCKED`.

## GREEN registrado — 2026-08-30

The account-aware service, adapter and first-party HTTP contracts now pass.
`DiagnosticsService` checks account scope before order disclosure, cache/result
mutation and persistence wrappers; `LaboratoryService` forwards the account
through its compatibility gateway; and diagnostic attachment upload resolves
its target within the authenticated account. Same-account lifecycle behavior
and existing account-aware laboratory workflows remain intact.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-DIAGNOSTICS-TENANT-BOUNDARY-GREEN-001`.

## Remediação da revisão independente — 2026-08-30

The first independent review returned `CONDITIONAL` with no Critical or High
finding. It identified two Medium findings: focused branch coverage was below
the required `80%`, and first-party HTTP tests did not cover encounter-summary
and diagnostic-attachment account forwarding/cross-account failure. The
coverage gap was closed with behavior-focused module tests, and server tests
now cover same-account and cross-account list, detail, create, summary and
attachment paths. The focused V8 run now passes `50/50` tests at `91.05%`
statements, `84.71%` branches and `93.91%` functions.

The review also recorded one Low residual: direct
`AttachmentsService.getById`, `getFileContent` and `listByLinkedEntity` reads
remain unscoped at the in-process service surface. The authenticated server
paths retain target/account checks; expanding those read APIs is outside this
upload-focused slice and is not inferred as solved.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-DIAGNOSTICS-TENANT-BOUNDARY-REVIEW-001`
and `.agent/verification.jsonl#VFY-CVG-003-DIAGNOSTICS-TENANT-BOUNDARY-REVIEW-REMEDIATION-001`.

## Regressão e qualidade — 2026-08-30

- diagnostics module: `32/32`;
- attachments module: `14/14`;
- complete API package: `528/528`;
- official workspace coverage: `2189 passed`, `1 skipped`, with `80.63%`
  statements, `81.13%` branches and `87.17%` functions;
- workspace typecheck and build: pass;
- security, secret scan, OpenAPI, namespaces, migration-source, RLS,
  deploy-surface, targeted lint, Prettier and `git diff --check`: pass.

Workspace lint retains only the unrelated pre-existing
`packages/contracts/src/counterSales.ts:38,77` `no-control-regex` baseline.
No migration, schema, provider, target, production, deployment, release or
external mutation was performed.

## Revisão independente

The first review's two Medium findings are remediated and the Low attachment
read residual is explicitly bounded. The fresh post-remediation independent
review returned `APPROVE_BOUNDED` with no Critical, High or Medium findings.
It confirmed the account checks, adapter forwarding and HTTP coverage while
retaining the Low direct attachment read-surface residual.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-DIAGNOSTICS-TENANT-BOUNDARY-REVIEW-REMEDIATED-001`.

## Fechamento limitado

Close this task as `COMPLETE_BOUNDED` / `PASS_BOUNDED`. The child result
does not promote CVG-003/global ERP: Vetus remains `100/100` evidence with
`4/11` functionally verified, clinical parity remains `2/3`, enterprise
readiness remains `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion
remains `BLOCKED`. The pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo` cache must remain outside
the explicit commit.

## Checkpoint pós-commit — 2026-08-30

The bounded correction was committed locally as `8ffafa9b` with the explicit
24-path source, test and control-plane set. The exact commit file list was
verified and the only remaining worktree change is the pre-existing
`packages/design-system/tsconfig.vue.tsbuildinfo`, intentionally unstaged.
The next lifecycle state is fresh `SCOUT` under a new authority; global ERP
remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

Evidence:
`.agent/verification.jsonl#VFY-CVG-003-DIAGNOSTICS-TENANT-BOUNDARY-COMMIT-001`.
