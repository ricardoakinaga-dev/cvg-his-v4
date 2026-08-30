# CVG-003 — master-search owner-read authorization boundary

**Status:** `COMPLETE_BOUNDED` — parent CVG-003 remains `IN_PROGRESS/PARTIAL`  
**Stage/activity:** `CLOSE` / `RECONCILED`  
**Priority:** `P1`  
**Owner:** root integrator with TDD and independent review  
**Parent:** CVG-003 access control, audit and tenant isolation  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `LOCAL_API_BOUNDARY`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-IR-001`

## Residual problem

`GET /master-search` currently requires only `patients.read` and returns the
full same-account owner result from `PatientsService.searchMaster`. The RBAC
catalog models `owners.read` separately, so a patient-only role such as the
inventory role can receive owner records without the owner-read permission.
This is a same-tenant confidentiality and authorization defect; it is not a
demonstrated cross-tenant leak.

## Frozen bounded contract

1. `GET /master-search` requires both `patients.read` and `owners.read` before
   returning any result.
2. Patient-only callers fail closed with the existing authorization error and
   do not receive the search payload or audit success event.
3. Callers with both permissions retain the existing account filtering,
   owner/patient/link response shape, search behavior and audit semantics.
4. No owner/patient CRUD, projection/redaction redesign, schema, provider,
   target, production, deployment, release or global ERP scope is authorized.

## TDD and quality bar

### RED

- Add a focused route test where `patients.read` succeeds but `owners.read`
  throws, proving `/master-search` is currently under-authorized.
- Add/retain a focused success test proving both permissions preserve the
  existing cross-registry result.
- Record the intentional RED before changing the route.

### GREEN

- Add the smallest second permission check in `apps/api/src/routes/patients-routes.ts`.
- Keep the existing principal, account filtering, payload and audit behavior.
- Run focused route/API tests, typecheck/build, coverage and targeted static/
  security checks.
- Obtain a fresh independent read-only review before bounded closure.

## Explicit non-claims

This slice proves only the `/master-search` owner-read permission composition.
It does not certify other owner/patient routes, data minimization, tenant RLS,
providers, target operations, production, deployment, release, Vetus parity or
global ERP readiness.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY.json`
- `.agent/gates/verified-CVG-003-patient-master-search-owner-read-boundary.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-PATIENT-MASTER-SEARCH-OWNER-READ-BOUNDARY-CONTROL-PLANE-001`
- `.agent/artifacts/CVG-003-patient-master-search-owner-read-boundary-2026-08-30.md`
- `apps/api/src/routes/patients-routes.ts`
- `apps/api/src/routes/patients-routes.test.ts`
- `packages/modules/patients/src/index.ts`
- `packages/rbac/src/access-control-catalog.ts`

## Decision boundary

Only the `/master-search` authorization composition and its direct tests were
authorized and are now closed as `PASS_BOUNDED` / `COMPLETE_BOUNDED`. Stop and
request fresh authority before changing owner/patient CRUD, response redaction,
schema, RLS, providers, target operations or any production/deployment/release/
global ERP behavior. Return to fresh residual scouting under a new authority.
