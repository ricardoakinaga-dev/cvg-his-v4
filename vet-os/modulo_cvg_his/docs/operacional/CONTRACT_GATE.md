# Contract Gate Implementation

This document describes the Contract Gate implementation to prevent drift between his-web and his-api.

## Overview

The Contract Gate consolidates all Zod schemas (request/response) into a single shared package (`@cvg-his/contracts`), ensuring both the frontend and backend use the same type definitions.

## Architecture

```
packages/contracts/           # Single source of truth for API contracts
├── src/
│   ├── common.ts            # Shared utilities and base schemas
│   ├── owners.ts            # Owner domain contracts
│   ├── patients.ts          # Patient domain contracts
│   ├── encounters.ts        # Encounter domain contracts
│   ├── index.ts             # Main export file
│   └── __tests__/
│       └── contracts.test.ts # Contract tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md

apps/his-api/                 # Backend - consumes contracts
├── src/modules/
│   ├── owners/types.ts       # Re-exports from @cvg-his/contracts
│   ├── patients/types.ts     # Re-exports from @cvg-his/contracts
│   └── encounters/routes.ts  # Uses contracts directly

apps/his-web/                 # Frontend - consumes contracts
└── src/contracts/
    └── openapi-lite.ts       # Re-exports from @cvg-his/contracts
```

## Test Commands

### Run all contract tests
```bash
# From root directory
pnpm --filter @cvg-his/contracts test

# Or from packages/contracts
cd packages/contracts && pnpm test
```

### Run tests in watch mode
```bash
pnpm --filter @cvg-his/contracts test:watch
```

### Run contract tests in his-api
```bash
pnpm --filter @cvg-his/his-api test:contracts
```

### Run contract tests in his-web
```bash
pnpm --filter @cvg-his/his-web test:contracts
```

### Run all tests across the monorepo
```bash
pnpm -r test
```

## Covered Endpoints

### Owners (5 endpoints)

| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | /owners | create | Create a new owner |
| GET | /owners/:id | getById | Get owner by ID |
| GET | /owners | list | List owners with pagination |
| PATCH | /owners/:id | update | Update owner by ID |
| GET | /owners/:id/summary | getSummary | Get owner summary with patients and stats |

### Patients (5 endpoints)

| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | /patients | create | Create a new patient |
| GET | /patients/:id | getById | Get patient by ID |
| GET | /patients | list | List patients with pagination and filters |
| PATCH | /patients/:id | update | Update patient by ID |
| GET | /patients/:id/summary | getSummary | Get patient summary with owner and stats |

### Encounters (5 endpoints)

| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | /encounters | create | Create a new encounter |
| GET | /encounters/:id | getById | Get encounter by ID |
| GET | /encounters | list | List encounters with pagination |
| POST | /encounters/:id/close | close | Close an open encounter |
| GET | /encounters/:id/timeline | getTimeline | Get encounter timeline with notes and documents |

**Total: 15 endpoints covered**

## Schema Exports

### From @cvg-his/contracts

```typescript
// Common utilities
export { uuidSchema, requiredString, optionalString, paginationQuerySchema, idParamSchema }

// Owners
export { createOwnerBodySchema, updateOwnerBodySchema, ownerIdParamSchema, listOwnersQuerySchema, ownerResponseSchema }
export type { CreateOwnerBody, UpdateOwnerBody, OwnerIdParam, ListOwnersQuery, OwnerResponse }

// Patients
export { createPatientBodySchema, updatePatientBodySchema, patientIdParamSchema, listPatientsQuerySchema, patientResponseSchema, alertSchema }
export type { CreatePatientBody, UpdatePatientBody, PatientIdParam, ListPatientsQuery, PatientResponse, AlertDto }

// Encounters
export { createEncounterBodySchema, closeEncounterBodySchema, encounterIdParamSchema, listEncountersQuerySchema, encounterResponseSchema, encounterStatusSchema }
export type { CreateEncounterBody, CloseEncounterBody, EncounterIdParam, ListEncountersQuery, EncounterResponse, EncounterStatus }
```

## Usage Examples

### In his-api (Backend)

```typescript
// apps/his-api/src/modules/owners/routes.ts
import { createOwnerBodySchema, ownerIdParamSchema, listOwnersQuerySchema } from '@cvg-his/contracts';

app.post('/owners', async (request, reply) => {
  const body = createOwnerBodySchema.parse(request.body);
  // ... business logic
});
```

### In his-web (Frontend)

```typescript
// apps/his-web/src/lib/api.ts
import { ownerResponseSchema, type OwnerResponse } from '@cvg-his/contracts';

async function getOwner(id: string): Promise<OwnerResponse> {
  return apiFetch<OwnerResponse>(`/owners/${id}`);
}
```

## Contract Test Examples

```typescript
describe('Owners Contract', () => {
  it('should validate a valid owner create body', () => {
    const validInput = {
      fullName: 'John Doe',
      email: 'john@example.com'
    };
    const result = createOwnerBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject owner without fullName', () => {
    const invalidInput = { email: 'john@example.com' };
    const result = createOwnerBodySchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});
```

## Preventing Drift

The Contract Gate prevents drift through:

1. **Single Source of Truth**: All schemas defined in `packages/contracts`
2. **Type Safety**: Both frontend and backend import from the same package
3. **Contract Tests**: Validate schema behavior matches expectations
4. **CI Integration**: Tests run on every PR to catch breaking changes

## Patch File

The changes are available in `artifacts/patches/contract-gate.patch`:

```bash
# Apply the patch
git apply artifacts/patches/contract-gate.patch

# Or view the changes
git diff --no-color > artifacts/patches/contract-gate.patch
```

## Installation

After applying the patch, install dependencies:

```bash
pnpm install
```

This will link the `@cvg-his/contracts` workspace package to both `his-api` and `his-web`.
