# CONTRACT DRIFT Map

## Current Sources Of Truth

| Domain | Backend Validation Source | Frontend Validation Source | Status |
|---|---|---|---|
| Owners (core CRUD) | `@cvg-his/contracts` via `apps/his-api/src/modules/owners/types.ts:7` and routes `apps/his-api/src/modules/owners/routes.ts:6` | `@cvg-his/contracts` re-export via `apps/his-web/src/contracts/openapi-lite.ts:12` and use in `apps/his-web/src/lib/api.ts:5` | Shared (good) |
| Patients (core CRUD) | `@cvg-his/contracts` via `apps/his-api/src/modules/patients/types.ts:7` and routes `apps/his-api/src/modules/patients/routes.ts:6` | `@cvg-his/contracts` re-export via `apps/his-web/src/contracts/openapi-lite.ts:12` and use in `apps/his-web/src/lib/api.ts:7` | Shared (good) |
| Encounters (core CRUD/timeline) | Direct `@cvg-his/contracts` import in `apps/his-api/src/modules/encounters/routes.ts:2` | `@cvg-his/contracts` re-export + typed client in `apps/his-web/src/lib/api.ts:11` | Shared (good) |
| Inpatient/MAR/Protocols/Handover/Notes/Documents | Mostly `@cvg-his/domain` and local Zod in each module, e.g. `apps/his-api/src/modules/inpatient/routes.ts`, `apps/his-api/src/modules/clinicalNotes/routes.ts:2`, `apps/his-api/src/modules/protocolVersions/routes.ts` | Local schemas in `apps/his-web/src/contracts/openapi-lite.ts:219`+ and local TS types in `apps/his-web/src/lib/api.ts` | Duplicated (drift risk) |

## Verified Drifts

### 1) Summary contracts are inconsistent with live API responses

- Shared contract (`packages/contracts`) for owner summary expects `{ owner, patients, stats }` (`packages/contracts/src/owners.ts:131`).
- Backend returns `{ owner, auditTrail, encounters, documents }` (`apps/his-api/src/modules/owners/summary.ts:17`, `apps/his-api/src/modules/owners/summary.ts:89`).
- Shared contract for patient summary expects `{ patient, owner, stats, recentEncounters }` (`packages/contracts/src/patients.ts:124`).
- Backend returns `{ patient, auditTrail, encounters, documents }` (`apps/his-api/src/modules/patients/summary.ts:27`, `apps/his-api/src/modules/patients/summary.ts:110`).

Impact: any consumer using `packages/contracts` for these endpoints will fail validation.

### 2) `openapi-lite` note create body requires `encounterId`, backend does not

- Frontend schema requires `encounterId` in body (`apps/his-web/src/contracts/openapi-lite.ts:248`).
- Backend route receives encounter id in path and validates body as only `{ soap, reason? }` (`apps/his-api/src/modules/clinicalNotes/routes.ts:22`, `apps/his-api/src/modules/clinicalNotes/routes.ts:42`).

Impact: duplicated schema diverges from actual HTTP contract.

### 3) BedMap schema in `openapi-lite` diverges from backend payload shape and enum

- Frontend local schema expects `status` in `['available','occupied','blocked','cleaning']` and response-like `wards[]` shape (`apps/his-web/src/contracts/openapi-lite.ts:276`, `apps/his-web/src/contracts/openapi-lite.ts:371`).
- Backend returns `{ ward, beds }` and status only `'free' | 'occupied'` (`apps/his-api/src/modules/bedmap/service.ts:17`, `apps/his-api/src/modules/bedmap/service.ts:88`).

Impact: schema-level drift and runtime confusion in consumers mixing old/new shapes.

### 4) Medication route enum is narrower in frontend local schema

- Domain/backend accepts additional routes (`INH`, `SL`, `RECTAL`, `OTIC`, `OPHTHALMIC`) (`packages/domain/src/medication.ts:45`).
- Frontend local schema only allows `IV|IM|VO|SC|TOP|OTHER` (`apps/his-web/src/contracts/openapi-lite.ts:319`).

Impact: frontend validation can reject values valid on backend.

### 5) Encounter list response typing in web is narrowed vs shared contract

- Shared contract list response is paginated (`packages/contracts/src/encounters.ts:95`).
- Web API type for `listEncounters` only returns `{ data: EncounterRecord[] }` (`apps/his-web/src/lib/api.ts:852`).

Impact: page metadata can be silently ignored or lost in UI-level types.

## Coverage Gaps (No Shared Contract Yet)

These route groups are active in API but not represented in `packages/contracts` as first-class domains:

- `/inpatient/*`, `/medication-orders*`, `/medication-administrations*`, `/medication-doses/*`, `/medication-logs/*`
- `/handovers/*`
- `/protocols/*`, `/protocol-versions/*`, `/protocol-diff/*`
- `/alerts/*`, `/patient-context/*`, `/wards/*`, `/beds/*`

Evidence: route list in `docs/integration/ROUTES_API.md`, while `packages/contracts/src` only contains `owners.ts`, `patients.ts`, `encounters.ts`.
