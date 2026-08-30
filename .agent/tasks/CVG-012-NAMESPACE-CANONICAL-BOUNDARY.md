# CVG-012 — canonical namespace boundary guardrail

**Status:** `COMPLETE_BOUNDED`; global ERP remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with architecture and TDD review
**Parent:** CVG-HIS V4 consolidation guardrails
**Tier/risk/blast radius:** `T3_HIGH` / `HIGH` / workspace dependency graph
**Authority:** `.agent/authority.jsonl#AUTH-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-IR-001`

## Residual problem

At selection time, the active workspace allowed canonical V2 packages to cross
into the legacy `@cvg-his/*` namespace. The graph contained an unused
`@cvg-his/db` dependency in `@cvg-his-v2/module-fiscal`, and
`@cvg-his-v2/module-access-control` imported the RBAC catalog through
`@cvg-his/rbac`; CI had no blocking guard against a new crossing. This slice
corrects that bounded graph gap without claiming a global namespace retirement.

## Frozen bounded contract

1. The RBAC catalog package is owned by the canonical `@cvg-his-v2/rbac`
   namespace; all active V2 source, package manifests, Vitest aliases, API
   build filters and test harness filters use that name.
2. Canonical V2 packages under `apps` and `packages` (identified by a
   `@cvg-his-v2/*` manifest name) may not declare or import `@cvg-his/*`
   packages. The guardrail reports manifest and AST-detected source violations
   with file/package details and exits non-zero, including side-effect imports,
   exports, dynamic imports, `require`, `require.resolve`, templates and
   comments between tokens.
3. The legacy `@cvg-his/*` compatibility packages remain available where they
   are explicitly the legacy/control-plane owner; this slice does not rename
   `packages/db`, `packages/audit` or unrelated public package APIs.
4. The unused direct `@cvg-his/db` dependency is removed from module-fiscal.
   No database schema, migration, runtime API payload, fiscal behavior or
   provider behavior changes.
5. `validate:namespaces` is a blocking repository guard in the CI
   `repository-guards` job. The guard is covered by a fixture-based unit test
   and a clean-workspace assertion.

## TDD acceptance

### RED

- The namespace guard test fails against the current graph because V2
  access-control has legacy RBAC dependencies/imports and V2 fiscal declares a
  legacy database dependency.
- The CI contract assertion fails until `validate:namespaces` is present in
  the repository-guards job.

### GREEN

- `packages/rbac` is consumed as `@cvg-his-v2/rbac` by all active callers,
  while legacy-only packages remain untouched unless required for that rename.
- The guard returns no violations for the repository and detects legacy
  manifest/source edges in a temporary fixture across named, side-effect,
  export, dynamic/template import, `require`, `require.resolve` and
  `import = require` forms, while ignoring comments and ordinary strings.
- The canonical RBAC, fiscal, access-control and API build/test paths retain
  their existing behavior and public contracts.

### REGRESSION

- Namespace guard, CI contract tests, RBAC/access-control/fiscal module tests,
  API tests, typechecks, builds, OpenAPI, secrets, migration-source, RLS and
  targeted static checks remain green.
- Parent consolidation, global ERP, parity, target, providers, production,
  deployment, release and legacy package retirement remain open.

## Review boundary

This is a repository graph and guardrail correction only. It does not authorize
a global namespace rewrite, removal of legacy packages, migration changes,
runtime API changes or external deployment. Independent review must inspect the
manifest/source allowlist and CI guard; unavailable review is recorded as a
limitation rather than approval.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-012-namespace-canonical-boundary.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-REVIEW-FINDING-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-FIX-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-GLOBAL-NON-PROMOTION-001`
- `.agent/gates/verified-CVG-012-namespace-canonical-boundary.json`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-CONTROL-PLANE-001`

## Verification outcome — 2026-08-30

The first independent review returned `FAIL_BOUNDED` with two HIGH findings:
the lexical guard missed template/comment forms and task/state/gate evidence was
not yet reconciled. The guard was replaced with TypeScript AST traversal,
permanent fixtures were expanded, and the control-plane closure below is being
written before commit. The corrected focused suite passed 10/10 and the clean
repository graph passed `pnpm validate:namespaces`.

The bounded result is `PASS_BOUNDED` / `COMPLETE_BOUNDED` with MEDIUM
confidence. No post-fix independent approval is inferred; module specifiers
that are fully computed at runtime remain outside static detection. The full
workspace lint baseline still reports the unrelated
`packages/contracts/src/counterSales.ts:38,77` `no-control-regex` findings.
