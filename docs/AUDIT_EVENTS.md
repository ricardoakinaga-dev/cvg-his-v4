# Audit Events Pattern

This document describes the standard pattern for recording audit events in the cvg-his monorepo.

## Overview

Audit events are recorded using the `@cvg-his/audit` package, which provides a standardized way to track changes to entities across the system. All audit events are stored in the `audit_events` table with tenant scoping via `account_id`.

## Package Location

- **Package**: `packages/audit`
- **Main Export**: `@cvg-his/audit`

## Usage

### Basic Import

```typescript
import { append, type AppendAuditInput, type AppendedAudit } from '@cvg-his/audit';
```

### Recording an Audit Event

```typescript
import { append } from '@cvg-his/audit';

const auditResult = await append({
  accountId: 'the-account-id',           // REQUIRED: Tenant scoping
  actorUserId: 'the-user-id',            // Optional: User performing the action
  roles: ['admin', 'vet'],               // Required: Roles of the actor
  action: 'patient.updated',             // Required: Action type (entity.action)
  entityType: 'patient',                 // Required: Type of entity
  entityId: 'patient-uuid',              // Required: ID of the entity
  beforeJson: { name: 'Old Name' },      // Optional: State before change
  afterJson: { name: 'New Name' },       // Optional: State after change
  reason: 'Patient name correction',     // Optional: Reason for change
  requestId: 'request-correlation-id'    // Required: Request ID for tracing
});
```

### In API Routes

```typescript
import { append } from '@cvg-his/audit';
import { requireAccountId } from '../../lib/tenant.js';

// In your route handler
const accountId = requireAccountId(request);

// After performing the action
await append({
  accountId,
  actorUserId: request.requestContext.actor?.userId,
  roles: request.requestContext.actor?.roles ?? [],
  action: 'medication_order.created',
  entityType: 'medication_order',
  entityId: order.id,
  beforeJson: null,
  afterJson: order,
  requestId: request.id
});
```

## Action Naming Convention

Actions follow the pattern: `{entity_type}.{action}`

Common actions:
- `patient.created`
- `patient.updated`
- `patient.deleted`
- `medication_order.created`
- `medication_order.discontinued`
- `encounter.opened`
- `encounter.closed`
- `inpatient_stay.admitted`
- `inpatient_stay.discharged`

## Entity Types

Standard entity types (use snake_case):
- `patient`
- `owner`
- `encounter`
- `inpatient_stay`
- `medication_order`
- `medication_administration`
- `clinical_note`
- `protocol`
- `user`

## Diff Calculation

The audit package automatically calculates diffs between `beforeJson` and `afterJson`:

```typescript
import { diffJson } from '@cvg-his/audit';

const diff = diffJson(
  { name: 'Old', age: 10 },
  { name: 'New', age: 10 }
);
// Result: { added: {}, removed: {}, changed: { name: { from: 'Old', to: 'New' } } }
```

## Database Schema

The `audit_events` table contains:
- `id`: UUID primary key
- `account_id`: UUID (tenant scoping) - REQUIRED
- `actor_user_id`: UUID (user who performed the action)
- `actor_role`: TEXT (primary role)
- `actor_roles`: TEXT[] (all roles)
- `action`: TEXT (action type)
- `entity_type`: TEXT
- `entity_id`: UUID
- `before_json`: JSONB
- `after_json`: JSONB
- `reason`: TEXT
- `request_id`: TEXT
- `created_at`: TIMESTAMPTZ

## Querying Audit Events

```typescript
import { listAuditEvents } from '@cvg-his/db';

const events = await listAuditEvents({
  accountId,
  entityType: 'patient',
  entityId: patientId,
  limit: 50,
  offset: 0
});
```

## Best Practices

1. **Always include accountId**: Tenant scoping is mandatory for all audit events
2. **Include before/after states**: When available, include both states for complete audit trail
3. **Use consistent action names**: Follow the `entity.action` naming convention
4. **Include requestId**: Always pass the request ID for distributed tracing
5. **Handle missing users gracefully**: The system handles cases where `actorUserId` doesn't exist in the users table
6. **Don't fail on audit errors**: Audit failures should not break the main operation (consider wrapping in try-catch)

## Error Handling

The audit package handles FK constraint errors for `actor_user_id` gracefully - if the user doesn't exist, it will retry without the user ID.

```typescript
try {
  await append({ ... });
} catch (error) {
  // Log but don't fail the main operation
  logger.error({ err: error }, 'Failed to record audit event');
}
```
