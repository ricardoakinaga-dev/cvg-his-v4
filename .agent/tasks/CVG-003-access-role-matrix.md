# CVG-003 — canonical seven-profile access matrix

**Status:** `PASS_BOUNDED`; bounded repository implementation and local verification only  
**Stage/activity:** `VERIFY` / `CHECKPOINT`  
**Owner:** root integrator, with TDD, security review and independent critique  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` residual / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-ACCESS-ROLE-MATRIX-IR-001`

## Problem

The runtime access-control catalog and the PostgreSQL seed/migration rail are
not the same policy. The API also protects MFA and feature-flag routes with
permission codes that are absent from the persisted seed catalog. Because
database hydration prefers non-empty persisted roles and permissions, a fresh
or migrated installation can authorize a different set of operations from the
catalog used by setup provisioning and in-memory enforcement.

This task closes the canonical seven-profile baseline for the local
application boundary. It does not claim that arbitrary direct SQL, privileged
maintenance, target infrastructure or production operations obey the policy.

## Frozen contract

1. The seven supported interactive profiles are `admin`, `veterinarian`,
   `nurse`, `reception`, `finance`, `inventory` and `auditor`.
2. One dependency-free canonical catalog owns permission metadata and the
   baseline role-to-permission map. Runtime access control, setup provisioning
   and the PostgreSQL seed consume that catalog rather than maintaining
   independent role lists.
3. `auth.mfa.read` and `auth.mfa.manage` are self-service permissions: every
   interactive profile may inspect and manage its own MFA state. The API route
   remains principal-scoped and does not grant cross-user MFA administration.
4. `flags.read`, `flags.admin`, `payments.manage`, integration administration,
   user/staff administration and other governance permissions remain limited
   to the baseline roles explicitly listed by the canonical map; no wildcard
   grant is introduced.
5. Migration `0147` is idempotent. For the seven system roles only, it
   reconciles `role_permissions` to the canonical baseline. It does not touch
   `user_roles`, user/team/sector assignments, tenant data, credentials or
   custom subjects. Fresh installations still receive the same map through
   seed/provisioning after migrations.
6. Tests use explicit expected permissions and representative API operations;
   they must not derive expected authorization from the implementation under
   test. PostgreSQL/Redis E2E runs are disposable and local only.
7. No provider, credential, target, production, deployment, external
   mutation, release or global readiness acceptance is included.

## TDD acceptance

### RED

- The catalog contract test fails because the shared canonical catalog and
  database projection do not yet exist.
- The migration contract test fails because the additive role-catalog
  migration does not yet exist.
- The seven-profile PostgreSQL/SPA test fails before implementation because
  persisted seed roles do not contain the canonical route permissions.

### GREEN

- The shared catalog contains all active route permission codes, including
  MFA and feature-flag boundaries, with unique keys and seven exact role
  projections.
- `packages/modules/access-control`, setup provisioning and `packages/db`
  consume the same catalog; the seed no longer silently drops permissions.
- Migration `0147_access_role_catalog_alignment.sql` is idempotent, aligns the
  existing seven system roles and is safe for installations with user/team/
  sector assignments.
- Disposable E2E creates one user for each non-admin role in account A, logs in
  all seven profiles, proves representative allow/deny boundaries for
  governance, Owner/Patient/Encounter, clinical, billing/inventory/fiscal,
  flags, MFA and LGPD, and proves account B cannot read or mutate account A
  access subjects.
- Unit, API, typecheck, lint, migration, critical HTTP and existing SPA
  regressions remain green; coverage remains at or above the repository bar.

## Bounded result

The local implementation and verification gate passed for the canonical
seven-profile application boundary. The shared v2 catalog now contains 64
permission seeds, including dedicated `lgpd.requests.read` and
`lgpd.requests.manage` codes; the access-control module, setup projection and
database seed consume that source, and migration `0147` reconciles only the
seven named system roles. Dedicated prescription-execution and discharge
route guards were corrected, and the disposable PostgreSQL/Redis E2E proved
the seven-profile allow/deny matrix plus account isolation.

The detailed evidence is recorded in
`.agent/artifacts/CVG-003-access-role-matrix-2026-08-26.md` and
`.agent/gates/verified-CVG-003-access-role-matrix.json`. This bounded result
does not promote parent CVG-003 or the global program.

## Explicit non-claims

- This task does not verify every route or every Vetus workflow.
- Dedicated `lgpd.requests.read`/`lgpd.requests.manage` guards are now part of
  the canonical catalog and the local matrix proves the admin/auditor read and
  request boundaries. External LGPD operational acceptance, retention,
  masking and target-policy evidence remain open.
- Direct SQL, maintenance roles, target RLS, restore/RTO/RPO, providers,
  remote CI, accessibility and release readiness remain open.

## Revalidation triggers

- Any new protected route permission or role added to the API.
- Changes to access-control hydration, setup provisioning, seed/migration
  ordering or role mutation semantics.
- A security review finding involving MFA, feature flags, LGPD, tenant
  isolation or custom access assignments.
- Expansion to target, production, provider, direct SQL or release claims.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-access-role-matrix.json`
- `.agent/gates/verified-CVG-003-access-role-matrix.json`
- `.agent/artifacts/CVG-003-access-role-matrix-2026-08-26.md`
- `packages/rbac/src/access-control-catalog.ts`
- `packages/modules/access-control/src/access-catalog.contract.test.ts`
- `packages/db/migrations/0147_access_role_catalog_alignment.sql`
- `packages/db/src/access-control-catalog.test.ts`
- `apps/api/src/routes/prescription-executions-routes.test.ts`
- `apps/api/src/routes/discharges-routes.test.ts`
- `apps/api/src/routes/lgpd-routes.test.ts`
- `e2e/spa/access-role-matrix-db.spec.ts`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-UNIT-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-API-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-E2E-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-GLOBAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-ACCESS-ROLE-MATRIX-FINAL-001`
