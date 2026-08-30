# CVG-001 — lista autoritativa de sessões entre instâncias

**Status:** `COMPLETE_BOUNDED` — parent CVG-001 remains `IN_PROGRESS/PARTIAL`  
**Stage/activity:** `CLOSE` / `RECONCILED`  
**Owner:** root integrator with TDD and independent review  
**Parent:** CVG-001 secure installation-to-session lifecycle  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-001-AUTHORITATIVE-SESSION-LIST-IR-001`

## Problem

`GET /auth/sessions` currently calls the synchronous
`AuthService.listSessionsForUser()` method, which reads only the process-local
`#sessions` map. Login, refresh and revocation already persist through
`SessionRepository`, and `DatabaseSessionRepository.findByUserId()` already
has tenant/RLS context and an interactive-human predicate. A second API
instance can therefore create or revoke a session without the first instance's
session-list cache reflecting the durable state.

## Frozen bounded contract

1. When a `SessionRepository` is configured, `GET /auth/sessions` must read
   the authenticated user's sessions from the repository under the user's
   account context rather than trusting the process-local cache.
2. The response keeps the existing `{ items: SessionSummary[] }` envelope and
   deterministic newest-first ordering. It must not return another user's or
   another account's session, and it must preserve the existing session fields
   and active/revoked visibility semantics.
3. A repository-backed instance must observe a session created, refreshed or
   revoked by another instance without restart or cache hydration. Repository
   read failure must not silently fall back to stale process-local data.
4. The in-memory/no-repository path and existing route/service contracts remain
   compatible. No migration is authorized: the existing `sessions` table,
   account/user indexes, RLS policy and repository method are the persistence
   contract for this read.
5. Preserve the existing permission check, audit event, authentication
   fail-closed behavior, response shape, provider boundaries, target/RLS
   operations, deployment, production, release and global parity scope.

## Quality Bar and TDD

### RED

- Add an AuthService test that constructs two service instances over one
  repository, creates state through one instance and proves the other
  instance's authoritative list is stale or unavailable before the correction.
- Add a route contract assertion that the published endpoint awaits the
  authoritative method when present.
- Record the exact RED before production code changes.

### GREEN

- Add the smallest async authoritative list seam to AuthService and route it
  through `#runAsUser`/the existing repository contract.
- Sort a defensive copy newest-first and preserve in-memory compatibility.
- Keep repository errors visible/fail-closed; never use a stale cache fallback
  in repository mode.
- Run focused auth/route tests, disposable PostgreSQL two-instance proof,
  auth/server regressions, typecheck, build, static/security checks and
  official coverage.
- Obtain a fresh independent read-only review before bounded closure. Parent
  CVG-001/global ERP remain `IN_PROGRESS`/`PARTIAL`; promotion remains
  `BLOCKED`.

## Explicit non-claims

This slice proves only the repository-authoritative session-list read boundary.
It does not certify token verification, full MFA/WebAuthn/FIDO2 behavior,
session expiry policy, distributed cache invalidation, Redis readiness,
provider/target operations, production, deployment, release, accessibility,
Vetus parity or global ERP readiness.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-001-authoritative-session-list.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-001-AUTHORITATIVE-SESSION-LIST-001`
- `packages/modules/auth/src/index.ts`
- `packages/modules/auth/src/repositories/session.repository.ts`
- `packages/modules/auth/src/repositories/database-session.repository.ts`
- `apps/api/src/routes/auth-routes.ts`
- `apps/api/src/routes/auth-routes.test.ts`
- `packages/modules/auth/src/auth.test.ts`
- `tests/integration/process/setup-installation-to-session.test.ts`

## Decision boundary

Only the authenticated user's session-list read source and its tests are
authorized. Stop and request fresh authority before changing session schema,
token policy, revocation semantics, Redis/distributed state, MFA, providers,
target operations, deployment, production or global ERP behavior.

## Closure checkpoint

The bounded repository-authoritative session-list correction is closed as
`PASS_BOUNDED` / `COMPLETE_BOUNDED` under
`.agent/gates/verified-CVG-001-authoritative-session-list.json`.

- Artifact: `.agent/artifacts/CVG-001-authoritative-session-list-2026-08-30.md`
- Final verification: `VFY-CVG-001-AUTHORITATIVE-SESSION-LIST-FINAL-001`
- Independent review: `APPROVE_BOUNDED`
- Global boundary: `VFY-CVG-001-AUTHORITATIVE-SESSION-LIST-GLOBAL-NON-PROMOTION-001`
- Control-plane reconciliation: `VFY-CVG-001-AUTHORITATIVE-SESSION-LIST-CONTROL-PLANE-001`

The route now uses the repository-backed asynchronous read when persistence is
configured, projects only the public `SessionSummary` fields, preserves the
in-memory compatibility path, enforces account/user isolation and surfaces
repository synchronization failures without stale-cache fallback. No schema,
token, MFA, Redis, provider, target, deployment, production, release or global
ERP scope was promoted.
