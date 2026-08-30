# CVG-004 — bounded inventory-consumption transaction-context repair

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and direct regression evidence
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`
**Authority:** `AUTH-CVG-004-INVENTORY-CONSUMPTION-TRANSACTION-CONTEXT-IR-001`.
This record covers only the repository-local correction discovered by the
critical HTTP regression; it does not authorize target, provider or production
operations.

## Objective

Restore the canonical database transaction context for inventory consumption
mutations that use the tenant-command runner's non-idempotent fallback. The
observed failure was a real `503 TRANSACTION_REQUIRED`: the fallback opened a
tenant database transaction but installed only the scoped database client, not
the `TenantTransactionContext` required by the inventory route's fail-closed
guard.

## Frozen contract

1. The tenant-command fallback forwards the authenticated actor and request
   correlation ID to the transaction callback.
2. The API composition root passes that metadata to
   `withTenantTransaction`.
3. When metadata is present, `withTenantTransaction` uses the existing
   `runInTenantTransactionContext` boundary, preserving account, actor and
   correlation context for audit/outbox-aware commands. Calls without metadata
   retain the existing scoped-client behavior.
4. No route contract, schema, migration, provider, credential, worker,
   target, production or external behavior is added by this repair.

## TDD and verification

### RED

- The new helper contract test first failed at TypeScript compilation because
  the transaction callback accepted only two arguments.
- The fresh critical HTTP run reproduced the product failure: 10/11 flows
  passed and Flow 7 inventory consumption returned `503 TRANSACTION_REQUIRED`.

### GREEN

- `TenantTransactionMetadata` is propagated through the fallback and API
  composition roots.
- The context-aware shared database helper installs the canonical transaction
  context only when the command supplies authenticated metadata.

### REGRESSION

- Direct compiled tenant-command test: 8/8.
- Full API package suite after rebuilding shared-database types: 383/383.
- Fresh disposable PostgreSQL/Redis Flow 7 rerun: 1/1.
- Fresh disposable PostgreSQL/Redis critical HTTP suite: 11/11.
- The full Docker SPA suite and authoritative global controls are recorded in
  the linked verification/artifact records after the final rerun.

## Limits and review boundary

This is `PASS_BOUNDED` for the no-idempotency-key tenant-command fallback used
by the inventory consumption path. It does not prove every mutation route has
the same composition, nor complete Owner→Patient→Encounter parity, all seven
access profiles, target RLS/restore/RTO-RPO, Redis failover, providers,
accessibility, operations or release readiness. The requested fresh
independent reviewer was unavailable because the configured agent capacity/model
could not start; no reviewer approval is inferred. Direct inspection and
executable regression evidence remain the basis for this bounded result.

No commit, push, deploy, migration, provider, credential, target or production
action occurred.
