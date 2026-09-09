# Clinical Safety Invariants

These invariants are the safety contract for the CVG HIS clinical surface. They are intentionally stated as properties that can be tested or inspected, not as a declaration that all properties are already proven.

1. Every clinical read and write is bound to an authenticated account/tenant; missing or ambiguous context fails closed.
2. A clinical mutation cannot be replayed by an actor whose current authorization no longer permits the operation.
3. An idempotent replay must return the original result only after the current request is authenticated, tenant-bound and authorized.
4. A diagnostic/laboratory order must use an explicit encounter/patient context; a UI convenience default cannot silently select a different clinical subject.
5. A state transition must validate the current persisted state, allowed next state, actor permission, tenant ownership and correlation identity in one durable boundary.
6. A clinical mutation and its audit/outbox/idempotency facts are atomic or the request fails visibly and is retryable according to policy.
7. Immutable clinical facts and audit events cannot be overwritten by a later request; corrections append a new fact with reason and actor.
8. Cross-tenant identifiers, foreign encounter IDs and mismatched event envelopes are rejected before mutation and do not disclose existence.
9. A prescription execution, payment settlement, discharge and webhook side effect has a stable dedupe key and bounded replay behavior.
10. A worker failure cannot cause another tenant's job to be skipped indefinitely; per-account fairness and lease fencing are required.
11. Partial failure in a multi-step clinical screen must expose the incomplete operation and permit safe reconciliation; it must not report success for only one side of an intended atomic action.
12. Restore and migration procedures must preserve tenant boundaries, audit durability, idempotency records and attachment references before accepting traffic.

## Executable coverage map

| Invariant family | Executable evidence | Status |
|---|---|---|
| Tenant/RLS and foreign identifiers | `tests/integration/database/clinical-workflow-postgres.test.ts`, `tests/integration/rls/rls-isolation.test.ts` | Source ready; current PostgreSQL run required |
| Idempotency and duplicate effects | `packages/modules/workflows/src/workflows.test.ts`, prescription/payment integration suites | Local/unit coverage; full candidate runtime evidence open |
| Lifecycle, stale lease and fencing | `apps/worker/src/workflow-task-runner.test.ts`, workflow PostgreSQL suite | Local PASS; killed-child recovery artifact open |
| Append-only audit/event history | workflow event trigger assertions and audit module tests | Local/source PASS; target artifact open |
| Authorization and replay | workflow route tests and idempotency authorization tests | Local PASS; revoked-actor runtime evidence open |
| Restore/migration integrity | `tests/integration/database/migration-integrity-runtime.test.ts`, restore-drill contracts | Contract/source coverage; timed target drill open |

Every new P0 invariant must add or reference an executable test before the
invariant is marked complete. A source mapping is not a runtime PASS.

## Evidence status

Static source and unit tests cover many invariants. New idempotency records bind the actor, legacy completed records fail closed, and critical clinical route families re-run authorization before replay; the targeted unit suite passes. Live HTTP replay with a revoked permission, live RLS isolation, failure injection, recovery timing and clinical UAT remain required evidence in the current baseline.
