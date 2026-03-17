# @cvg-his/contracts

Shared API contracts for CVG HIS - Contract Gate to prevent drift between his-web and his-api.

## Overview

This package serves as the **single source of truth** for all API schemas, including:

- Request body schemas
- Response schemas
- Query parameter schemas
- Path parameter schemas

## Purpose

The contracts package prevents "schema drift" between the frontend (`his-web`) and backend (`his-api`) by:

1. **Centralizing schema definitions** - All Zod schemas are defined in one place
2. **Providing type safety** - Both frontend and backend use the same types
3. **Enabling contract testing** - Tests validate that both sides honor the same contracts

## Installation

```bash
pnpm install
```

## Usage

### In his-api (Backend)

```typescript
import {
  createOwnerBodySchema,
  ownerIdParamSchema,
  listOwnersQuerySchema,
  ownerResponseSchema
} from '@cvg-his/contracts';

// Use in routes for validation
app.post('/owners', async (request, reply) => {
  const body = createOwnerBodySchema.parse(request.body);
  // ... business logic
  return reply.status(201).send(owner);
});
```

### In his-web (Frontend)

```typescript
import {
  ownerResponseSchema,
  type OwnerResponse,
  ownersContract
} from '@cvg-his/contracts';

// Use for type-safe API client
const owner: OwnerResponse = await fetchOwner(id);
```

## Contract Structure

```
packages/contracts/
├── src/
│   ├── common.ts       # Shared utilities and base schemas
│   ├── owners.ts       # Owner domain contracts
│   ├── patients.ts     # Patient domain contracts
│   ├── encounters.ts   # Encounter domain contracts
│   ├── index.ts        # Main export file
│   └── __tests__/
│       └── contracts.test.ts  # Contract tests
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Covered Endpoints

### Owners
| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | /owners | create | Create a new owner |
| GET | /owners/:id | getById | Get owner by ID |
| GET | /owners | list | List owners with pagination |
| PATCH | /owners/:id | update | Update owner by ID |
| GET | /owners/:id/summary | getSummary | Get owner summary |

### Patients
| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | /patients | create | Create a new patient |
| GET | /patients/:id | getById | Get patient by ID |
| GET | /patients | list | List patients with pagination |
| PATCH | /patients/:id | update | Update patient by ID |
| GET | /patients/:id/summary | getSummary | Get patient summary |

### Encounters
| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | /encounters | create | Create a new encounter |
| GET | /encounters/:id | getById | Get encounter by ID |
| GET | /encounters | list | List encounters with pagination |
| POST | /encounters/:id/close | close | Close an open encounter |
| GET | /encounters/:id/timeline | getTimeline | Get encounter timeline |

## Testing

### Run all tests
```bash
pnpm test
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Run contract tests only
```bash
pnpm test -- --testNamePattern="Contract"
```

## Building

```bash
pnpm build
```

## Adding New Contracts

1. Create a new file in `src/` for the domain (e.g., `medications.ts`)
2. Define request schemas (body, query, params)
3. Define response schemas
4. Create a contract object with method, path, and schemas
5. Export from `index.ts`
6. Add tests in `__tests__/contracts.test.ts`
7. Update this README with new endpoints

## Contract Testing Strategy

Contract tests validate:

1. **Schema validity** - All schemas parse correctly
2. **Field consistency** - Request and response schemas share field names where applicable
3. **Contract completeness** - All endpoints have required schemas defined
4. **Cross-validation** - his-api and his-web use the same schemas

## Versioning

When breaking changes are made to contracts:

1. Update the version in `package.json`
2. Document the changes in CHANGELOG
3. Update both his-api and his-web to use the new version
4. Run contract tests to ensure compatibility
