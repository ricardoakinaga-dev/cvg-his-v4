# CVG-001 — durable WebAuthn MFA state

**Status:** `COMPLETE_BOUNDED` — durable state and production fail-closed guard are green  
**Stage/activity:** `VERIFY` / `CLOSE`  
**Owner:** root integrator with TDD, security and compatibility review  
**Parent:** CVG-001 secure installation-to-session lifecycle  
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / cross-process authentication state
**Authority:** `.agent/authority.jsonl#AUTH-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-IR-001`

## Problem

The API currently creates an `InMemoryWebAuthnRepository` and a process-local
challenge `Map` unconditionally. A restart or a second API process therefore
loses registered credentials and pending registration/authentication
challenges. This makes the enabled WebAuthn path unsuitable for a shared
runtime and can make authentication behavior depend on process affinity.

## Frozen bounded contract

1. Add durable PostgreSQL state for WebAuthn credentials and pending challenges.
   Every row is scoped by `account_id` and `user_id`; credentials are looked up,
   counter-updated and deleted with both scopes included. Registration and
   authentication challenges use separate per-user purposes and are keyed by
   account, user and purpose.
2. Make challenge issuance replace the current purpose-specific challenge and
   challenge consumption atomic, single-use and TTL-bound in PostgreSQL. An
   expired, missing or already-consumed durable challenge must not be accepted.
3. Wire database repositories through the existing runtime/bootstrap repository
   seam. Development/test in-memory doubles remain available only for explicit
   non-production use and must use immutable replacement on counter updates.
4. Pass the authenticated principal's account and user scope from auth routes
   into the WebAuthn service/repository boundary. Preserve existing handler Map
   fixtures only as a compatibility fallback for local tests; durable runtime
   mode must use the shared challenge store.
5. When WebAuthn is enabled outside explicit local development/test, fail closed
   if durable credential/challenge repositories are absent or if the full FIDO2
   verifier is not configured. Do not silently substitute in-memory state.
   Database bootstrap must expose the durable repositories only after both
   required tables exist, and production repository readiness includes both.
6. Add forward migration/schema, RLS, runtime ACL/grant policy, focused RED and
   GREEN tests, cross-process/restart durable-state evidence, and matching
   control-plane artifacts. Keep the existing FIDO attestation/signature
   verifier hardening, provider selection, target runtime, deployment and
   production release evidence outside this slice.

## Explicit non-scope

This task does not implement a full FIDO2 verifier, attestation-chain
validation, origin/RP-ID policy redesign, external identity provider, backup or
restore evidence, target deployment, credential rotation, production rollout,
or global CVG-001/ERP completion.

## TDD acceptance

### RED

- A durable-state test must fail against the current process-local challenge
  Map when one service instance issues a challenge and another instance (or a
  post-restart repository instance) consumes it.
- A durable credential test must require account/user-scoped lookups and reject
  a credential addressed through another account or another user in the same
  account.
- A challenge test must require atomic single-use consumption and reject an
  expired challenge without accepting stale state.
- A production-like server test must fail against the current unconditional
  in-memory setup when WebAuthn is enabled without durable repositories or the
  full FIDO2 verifier.

### GREEN

- PostgreSQL schema and RLS preserve tenant isolation and durable credential /
  challenge state across repository instances.
- Database challenge consume is one atomic conditional update with TTL and
  consumed-state guards; concurrent consumers cannot both succeed.
- Credential counter advancement is account/user-scoped, monotonic and
  compare-and-swap; a lost concurrent update is reported as failure.
- Auth routes use account/user-scoped WebAuthn service calls and the configured
  durable challenge store, while existing local Map fixtures remain compatible.
- Non-local WebAuthn startup fails closed without both durable stores and a full
  FIDO2 verifier; local/test mode remains usable with explicit in-memory doubles.
- Module, API, database/RLS, coverage and static quality gates pass without
  promoting global ERP readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-001-webauthn-durable-mfa-state.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-RED-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-INTEGRATION-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-REGRESSION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-SECURITY-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-001-WEBAUTHN-DURABLE-MFA-STATE-FINAL-001`
- `.agent/gates/verified-CVG-001-webauthn-durable-mfa-state.json`
- `.agent/artifacts/CVG-001-webauthn-durable-mfa-state-2026-08-29.md`

## Review-driven amendments — 2026-08-29

The first independent review returned `REQUEST_CHANGES`. The bounded contract
was tightened without expanding into FIDO verification: credential lookup,
counter advancement and deletion now require account plus user scope; database
counter writes use monotonic compare-and-swap and return false after a lost
race; normalized non-local environments cannot enable the foundational verifier;
and production repository readiness includes both durable WebAuthn repositories.
The final independent review found no P0/P1 issue; its remaining P2 monotonic
counter finding was fixed and covered by the PostgreSQL integration test.

## Decision

`COMPLETE_BOUNDED` under
`.agent/gates/verified-CVG-001-webauthn-durable-mfa-state.json`.
This closes only durable WebAuthn state, tenant/user isolation, atomic
challenge state, runtime wiring and non-local fail-closed behavior. The full
FIDO2 verifier remains explicitly open, so the feature cannot be enabled in a
production-like environment. Global ERP remains `IN_PROGRESS/PARTIAL` and
promotion remains `BLOCKED`.
