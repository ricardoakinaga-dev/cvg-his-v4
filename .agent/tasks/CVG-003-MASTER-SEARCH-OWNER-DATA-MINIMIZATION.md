# CVG-003 — master-search owner-result data minimization

**Status:** `COMPLETE_BOUNDED` — parent CVG-003 remains `IN_PROGRESS/PARTIAL`  
**Stage/activity:** `CLOSE` / `RECONCILED`  
**Priority:** `P1`  
**Owner:** root integrator with TDD and independent review  
**Parent:** CVG-003 access control, audit and tenant isolation  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `LOCAL_API_BOUNDARY`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-IR-001`

## Residual problem

The corrected `GET /master-search` now requires both `patients.read` and
`owners.read`, but its owner collection still forwards raw `OwnerSummary`
objects. That projection contains account identifiers, contacts, document
identity, address, profile, financial profile, administrative notes, legacy
identifiers and lifecycle timestamps that are not needed to identify a search
result or navigate to the owner record.

This is an excess-disclosure/data-minimization defect in an already authorized
same-account response. It is not evidence of a cross-tenant leak.

## Frozen bounded contract

1. Each owner item returned by `GET /master-search` contains exactly the
   navigation/operational fields `id`, `fullName` and `status`.
2. The route continues to require `patients.read` and `owners.read` before
   searching, and owner search still accepts the existing query inputs without
   echoing document, contact or address data.
3. Patient and relationship results, same-account filtering, result ordering,
   query behavior, response envelope and audit semantics remain unchanged.
4. The shared API response types identify the reduced owner projection so a
   client cannot type the endpoint as a full `OwnerSummary`.
5. No owner CRUD/detail response, patient/link projection, schema/RLS,
   provider, target, production, deployment, release or global ERP behavior is
   authorized.

## TDD and quality bar

### RED

- Add a focused route test that passes a fully populated owner and proves the
  current raw projection fails the exact-key allowlist assertion.
- Preserve the existing owner-read denial and both-permission success tests.
- Record the intentional RED before changing production or shared contract
  code.

### GREEN

- Add a small `MasterSearchOwnerResult` shared type and use it in the shared
  response contract and SPA service type.
- Map the account-filtered owner results to a fresh allowlisted object at the
  route boundary; do not mutate `OwnerSummary` values.
- Run focused route tests, compiled API regression, workspace typecheck/build,
  official coverage and targeted static/security checks.
- Obtain a fresh independent read-only review before bounded closure.

## Explicit non-claims

This slice proves only owner-result minimization for `/master-search`. It does
not certify patient or relationship-data minimization, other owner/patient
routes, tenant RLS, providers, target operations, production, deployment,
release, Vetus parity or global ERP readiness.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION.json`
- `.agent/gates/verified-CVG-003-master-search-owner-data-minimization.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-CONTROL-PLANE-001`
- `.agent/artifacts/CVG-003-MASTER-SEARCH-OWNER-DATA-MINIMIZATION-2026-08-30.md`
- `apps/api/src/routes/patients-routes.ts`
- `apps/api/src/routes/patients-routes.test.ts`
- `packages/shared/types/src/index.ts`
- `packages/shared/contracts/src/index.ts`
- `apps/spa/src/services/masterSearch.ts`

## Decision boundary

Only the owner projection returned by `/master-search`, its shared response
types and its direct tests were authorized and are now closed as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`. Stop and request fresh authority before
changing owner CRUD/detail responses, patient/link projections, schema, RLS,
providers, target operations or any production/deployment/release/global ERP
behavior. Return to fresh residual scouting under a new authority.
