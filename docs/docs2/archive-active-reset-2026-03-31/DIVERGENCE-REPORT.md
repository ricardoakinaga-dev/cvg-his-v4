# CVG-HIS-V2 Divergence & Inconsistency Report

**Date:** 2026-03-31  
**Auditor:** Automated Code Audit (Subagent)  
**Scope:** Full codebase scan — TypeScript compilation, imports, wiring, migrations, dependencies, TODOs  

---

## Executive Summary

The codebase has **moderate health** with several critical and medium issues that block TypeScript compilation. The v2 monorepo is architecturally sound but shows signs of organic growth where newer modules (discharges, prescription-executions) were added without fully wiring all integration points. A legacy v1 package tree (`@cvg-his/*`) coexists with the v2 tree (`@cvg-his-v2/*`) and is mostly dead code.

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟡 Medium | 5 |
| 🟢 Low | 4 |

---

## 🔴 CRITICAL Issues

### C1. TypeScript Compilation Fails — `apps/api` (60+ errors)

**File:** `apps/api/src/bootstrap.ts`, `apps/api/src/db-persistence.test.ts`, `apps/api/src/runtime.test.ts`  
**Root cause:** The TypeScript compiler cannot resolve `@cvg-his-v2/module-*` package imports even though `pnpm-workspace.yaml` and `package.json` declare them. This is likely because `pnpm install` has not been run (or `node_modules` symlinks are broken), OR the module packages haven't been built (`dist/` missing) and `tsconfig.project references` are not configured.

**Errors observed:**
- `Cannot find module '@cvg-his-v2/module-auth'` (and all other module-* packages)
- `Parameter 'job' implicitly has an 'any' type` in test files (implicit `any` from unresolved imports)
- `Property 'status' does not exist on type '{}'` cascading through test assertions

**Impact:** Complete — `tsc --noEmit` fails, blocking `build`, `typecheck`, and CI pipelines.

**Fix suggestion:**
1. Run `pnpm install` to ensure workspace symlinks exist
2. Ensure all module packages have been built: `pnpm -r --filter @cvg-his-v2/* run build`
3. Consider adding TypeScript project references (`references` in `tsconfig.json`) for incremental builds
4. Add explicit `any` typing in test callbacks where inferred types fall through: `(job: any)` or use proper types

---

### C2. Missing Database Repositories for Discharges & Prescription-Executions in Bootstrap

**File:** `apps/api/src/bootstrap.ts`  
**Lines:** Database repository creation block (~line 540+)  
**Description:** When `bootstrapServices()` connects to the real database, it creates `Database*Repository` instances for most modules, but **omits**:
- `DatabaseDischargeRepository` (from `@cvg-his-v2/module-discharges`)
- `DatabasePrescriptionExecutionRepository` (from `@cvg-his-v2/module-prescription-executions`)
- `DatabaseAdministrationEventRepository` (from `@cvg-his-v2/module-prescription-executions`)

The in-memory fallback also lacks these repositories.

**Impact:** When running with a real database, the `discharges` and `prescriptionExecutions` services in `runtime.ts` receive `undefined` for their repository options, falling back to in-memory behavior even when a database is configured. Data loss on restart.

**Fix suggestion:**
```typescript
// Add to database repository creation block:
discharge: new DatabaseDischargeRepository(db),
prescriptionExecution: new DatabasePrescriptionExecutionRepository(db),
administrationEvent: new DatabaseAdministrationEventRepository(db),
```
Also add `InMemoryDischargeRepository`, `InMemoryPrescriptionExecutionRepository`, and `InMemoryAdministrationEventRepository` to the in-memory fallback block.

---

### C3. Missing `@cvg-his-v2/module-discharges` and `@cvg-his-v2/module-prescription-executions` in `apps/api/package.json`

**File:** `apps/api/package.json`  
**Description:** The `dependencies` block is missing:
- `@cvg-his-v2/module-discharges`
- `@cvg-his-v2/module-prescription-executions`

Yet `runtime.ts` imports from both packages. This works in pnpm workspaces because the symlinks resolve at runtime, but TypeScript may fail to resolve types during compilation if the dependency isn't declared.

**Fix suggestion:** Add both to `dependencies`:
```json
"@cvg-his-v2/module-discharges": "workspace:*",
"@cvg-his-v2/module-prescription-executions": "workspace:*",
```

---

## 🟡 MEDIUM Issues

### M1. Hardcoded Account ID in Database Patient Repository

**File:** `packages/modules/patients/src/repositories/database-patient.repository.ts`  
**Line:** 189  
**Description:** `accountId: 'acc_cvg_demo' as AccountId` — the `accountId` is hardcoded as a demo value instead of being passed from the caller or extracted from context.

**Fix suggestion:** Accept `accountId` as a parameter in the repository method or derive it from the authenticated principal.

---

### M2. Legacy v1 Packages Coexist with v2 (Dead Code Risk)

**Path:** `packages/contracts`, `packages/config`, `packages/db`, `packages/audit`, `packages/events`, `packages/rbac`  
**Description:** These are `@cvg-his/*` (v1) packages that are NOT referenced by any `@cvg-his-v2/*` code. The `pnpm-workspace.yaml` glob `packages/*` picks them up, installing their dependencies unnecessarily. Key differences:
- `@cvg-his/contracts` uses Zod validation; `@cvg-his-v2/shared-contracts` uses plain TypeScript interfaces
- `@cvg-his/db` has Drizzle with its own schema; `@cvg-his-v2/shared-database` has a separate schema
- `@cvg-his/rbac` has its own permission system; v2 uses `@cvg-his-v2/module-access-control`

**Fix suggestion:** Either remove the v1 packages or rename the workspace glob to exclude them (e.g., `packages/shared/*` and `packages/modules/*` only, removing `packages/*`).

---

### M3. Duplicate `@cvg-his/config` and `@cvg-his-v2/shared-config`

**Path:** `packages/config` vs `packages/shared/config`  
**Description:** Both exist as separate packages. The v1 `@cvg-his/config` has no `exports` field and uses a different structure. No code in v2 imports from it.

**Fix suggestion:** Remove `packages/config` if no longer needed, or add a deprecation note.

---

### M4. `server.ts` Imports Many Types from `@cvg-his-v2/shared-contracts` That May Not All Be Exported

**File:** `apps/api/src/server.ts` (lines 10-48)  
**Description:** `server.ts` imports ~40 types from `@cvg-his-v2/shared-contracts`. While the contracts file does export them, this creates a tight coupling. More importantly, `server.ts` uses `as never` casts extensively (e.g., `encounterId as never`, `principal.user.accountId as never`) which suggests the branded types from `shared-types` don't align with the plain `string` types in `shared-contracts`.

**Fix suggestion:** Update `shared-contracts` to use branded types from `shared-types` instead of plain `string`, eliminating the need for `as never` casts.

---

### M5. Excessive `as never` Type Casts Throughout `server.ts`

**File:** `apps/api/src/server.ts`  
**Count:** ~30+ occurrences  
**Description:** The route handlers cast plain strings to branded types using `as never`, e.g.:
```typescript
const record = await medicalRecords.getRecordByEncounterOrThrowAsync(encounterId as never);
```
This defeats TypeScript's type safety. The contract types use `string` but domain services expect branded types like `EncounterId`.

**Fix suggestion:** Either:
1. Make `shared-contracts` request types use branded types, or
2. Create explicit type-guard/mapper functions that validate and cast at the boundary

---

## 🟢 LOW Issues

### L1. 7 TODO Comments (PR-SEC-03 Tenant Isolation)

**Files:**
- `packages/db/src/schema/encounter_documents.ts:7`
- `packages/db/src/schema/encounter_documents.js:5`
- `packages/db/src/schema/clinical_notes.ts:9`
- `packages/db/src/schema/clinical_notes.js:6`
- `packages/db/src/schema/clinical_note_versions.ts:15`
- `packages/db/src/schema/clinical_note_versions.js:4`
- `packages/modules/patients/src/repositories/database-patient.repository.ts:189`

**Description:** All reference `PR-SEC-03` — adding `account_id` for tenant isolation to `encounter_documents` and `clinical_note_versions` tables. The patient repository also has a hardcoded demo account ID.

**Fix suggestion:** Address PR-SEC-03 as a security hardening task.

---

### L2. `apps/web` TypeScript Compilation Passes Cleanly ✅

No errors. The web app is minimal (3 imports) and compiles successfully.

---

### L3. `pnpm-workspace.yaml` Coverage

**File:** `pnpm-workspace.yaml`
```yaml
packages:
  - apps/*
  - packages/*
  - packages/modules/*
  - packages/shared/*
```

All needed packages are included. The `packages/*` glob also picks up legacy v1 packages (see M2), but this doesn't break anything functionally.

---

### L4. Migration Files — Foreign Key Integrity

**Files:** `packages/shared/database/src/migrations/001-016`  
**FK references found:**
- `005`: `beds.sector_id → sectors(id)` ✅ (both created in same migration)
- `009`: `encounters.patient_id → patients(id)`, `encounters.owner_id → owners(id)` ✅
- `010`: `discharges.encounter_id → encounters(id)` ✅
- `012`: `prescription_executions.clinical_entry_id → clinical_entries(id)`, `.patient_id → patients(id)`, `.encounter_id → encounters(id)` ✅; `administration_events.execution_id → prescription_executions(id)` ✅
- `015`: `user_roles.user_id → users(id)`, `.role_id → roles(id)`, `role_permissions.role_id → roles(id)`, `.permission_id → permissions(id)` ✅
- `016`: Additional constraints referencing `owners`, `patients`, `encounters`, `medical_records`, `clinical_entries`, `inpatient_stays` ✅

**All FK references resolve to existing tables.** No broken references found.

---

## Shared Packages Health Check

| Package | Status | Notes |
|---------|--------|-------|
| `@cvg-his-v2/shared-types` | ✅ OK | 77 exports, all branded types present (DischargeId, PrescriptionExecutionId, AdministrationEventId, etc.) |
| `@cvg-his-v2/shared-contracts` | ✅ OK | ~40 request/response interfaces, imports from shared-types |
| `@cvg-his-v2/shared-errors` | ✅ OK | No deps, clean |
| `@cvg-his-v2/shared-utils` | ✅ OK | No deps, clean |
| `@cvg-his-v2/shared-validation` | ✅ OK | Depends on shared-errors |
| `@cvg-his-v2/shared-logging` | ✅ OK | Depends on shared-utils |
| `@cvg-his-v2/shared-config` | ✅ OK | Depends on shared-validation |
| `@cvg-his-v2/shared-auth-sdk` | ✅ OK | No deps, clean |
| `@cvg-his-v2/shared-database` | ✅ OK | Drizzle + pg |

---

## Runtime ↔ Server Wiring Verification

| Service | Imported in `runtime.ts` | Destructured in `server.ts` | Used in Routes |
|---------|-------------------------|---------------------------|----------------|
| accessControl | ✅ | ✅ | ✅ |
| users | ✅ | ✅ | ✅ |
| staff | ✅ | ✅ | ✅ |
| owners | ✅ | ✅ | ✅ |
| patients | ✅ | ✅ | ✅ |
| encounters | ✅ | ✅ | ✅ |
| scheduling | ✅ | ✅ | ✅ |
| triage | ✅ | ✅ | ✅ |
| medicalRecords | ✅ | ✅ | ✅ |
| attachments | ✅ | ✅ | ✅ |
| inpatient | ✅ | ✅ | ✅ |
| sectorBedService | ✅ | ✅ | ✅ |
| surgery | ✅ | ✅ | ✅ |
| diagnostics | ✅ | ✅ | ✅ |
| billing | ✅ | ✅ | ✅ |
| inventory | ✅ | ✅ | ✅ |
| notifications | ✅ | ✅ | ✅ |
| audit | ✅ | ✅ | ✅ |
| discharges | ✅ | ✅ | ✅ |
| prescriptionExecutions | ✅ | ✅ | ✅ |
| auth | ✅ | ✅ | ✅ |

**All 21 services are properly wired.** ✅

---

## Summary

| Category | Status |
|----------|--------|
| TypeScript Compilation (api) | 🔴 Fails — 60+ errors from unresolved module imports |
| TypeScript Compilation (web) | ✅ Passes |
| Module Import Resolution | 🟡 Works at runtime via pnpm symlinks, but tsc can't resolve without build artifacts |
| Runtime ↔ Server Wiring | ✅ All services match |
| Bootstrap ↔ Database Repos | 🔴 Missing 3 repositories (discharges, prescription-executions) |
| package.json Dependencies | 🟡 Missing 2 deps in api/package.json |
| pnpm-workspace.yaml | ✅ All packages included |
| Migration FK Integrity | ✅ All references valid |
| shared-contracts ↔ Modules | ✅ All exports match |
| shared-types ↔ Modules | ✅ All branded types present |
| Legacy v1 Packages | 🟡 Dead code, 6 packages unused |
| TODO/FIXME/HACK | 🟢 7 TODOs (all PR-SEC-03 tenant isolation) |
| Type Safety (as never casts) | 🟡 ~30+ casts in server.ts |

**Overall Health: MODERATE — functional but needs cleanup before production.**

The codebase is architecturally sound with good module separation. The primary blockers are TypeScript compilation (fixable with a proper build pipeline) and the missing database repositories for newer modules. The `as never` casts and legacy v1 packages are technical debt that should be addressed in a cleanup sprint.
