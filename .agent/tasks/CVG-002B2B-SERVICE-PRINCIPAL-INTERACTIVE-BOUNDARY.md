# CVG-002B2B — service-principal interactive-login boundary

**Status:** `PASS_BOUNDED`; parent CVG-002B2B remains `IN_PROGRESS`.
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`.
**Owner:** root integrator with TDD and security review.
**Parent:** CVG-002B2B signed synthetic PIX settlement.
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`.
**Authority:** `.agent/authority.jsonl#AUTH-CVG-002B2B-SERVICE-PRINCIPAL-INTERACTIVE-BOUNDARY-IR-001`.

## Objective

Close the repository-local identity boundary left by the signed PIX settlement
slice: a non-interactive service principal must never be materialized by the
interactive `UsersService` resolver or remain in its interactive cache. The
dedicated worker service-principal resolver remains the only authorized path
for settlement actors.

## Frozen contract

1. Repository-backed `UsersService.resolveInteractiveById` is the interactive
   resolver used by authentication. It returns only an active
   `principal_kind='human'` user with `interactive_login_enabled=true`; service,
   inactive or disabled users are evicted from the interactive process cache
   and return `undefined`.
2. The existing generic `UsersService.resolveById` remains available for
   account/user administration and is not used as an authentication guard.
   Authentication must not silently fall back to that generic materializer.
3. Existing username lookup, hydration, refresh/session and MFA protections
   remain unchanged and continue to reject service principals without
   disclosing whether the service identity exists.
4. The dedicated worker resolver may still return a mapped non-interactive
   service actor for its purpose-scoped account mapping; this slice must not
   weaken that boundary or route it through the interactive cache.
5. Unit tests cover a service principal that has username/email credentials,
   cold and warm cache resolution, bearer/session refresh and MFA paths. The
   existing human principal behavior remains green.
6. No migration, provider credential, target, production, deployment,
   external mutation or release acceptance is authorized.

## TDD acceptance

### RED

- Authentication's repository-backed ID refresh currently calls the generic
  resolver; the new regression must fail before it uses the interactive-only
  resolver/cache boundary.

### GREEN

- Service/inactive/disabled principals are absent from
  `resolveInteractiveById`, the interactive cache and interactive
  login/session/MFA flows.
- Mapped service settlement resolution remains available through the dedicated
  worker path.
- Focused auth/users tests, API regression, typecheck, lint, coverage and
  independent review pass without broadening the PIX settlement contract.

## Implemented bounded correction

- Added `UsersService.resolveInteractiveById` as the repository-backed
  interactive resolver; the generic `resolveById` contract remains available
  for administration.
- Routed persisted bearer/session refresh, session mutation, MFA challenge,
  and access-token paths through the interactive boundary or a generic
  authentication error guard. `getSession` and
  `getPendingMfaEnrollmentUser` are asynchronous authoritative helpers, and
  API request guards await `getSession` before using the returned session.
- Kept the worker's purpose-scoped service-principal resolver unchanged.

## Evidence collected

- Intentional RED before the final correction: the new stale-session and
  stale-MFA tests produced `7` passes and `2` expected failures because the
  public helpers were still synchronous/cache-only.
- Focused interactive-principal suite: `11/11` passed after the authoritative
  asynchronous correction and explicit warm-cache regressions; the current
  Auth/Users regression is `3 files / 54 tests`.
- Disposable PostgreSQL worker service-principal regression: `1 file / 9
  tests` passed with migrations through `0154` and clean teardown.
- API package regression: `474/474` passed; official Worker regression: `116`
  tests passed; Users/Auth typecheck and build plus API/Worker lint passed.
- Current path-matched Users/Auth coverage passed at `88.32%` statements,
  `82.45%` branches, `95.65%` functions and `88.32%` lines. RLS validation
  passed `163/164` tenant tables with one documented exception and the secret
  scan reported no findings.
- Earlier independent reviews rejected cache-only public helpers, stale
  control-plane pointers, incomplete warm-cache coverage and superseded
  task/backlog totals. All findings were corrected and the final independent
  review returned `APPROVE_BOUNDED` with no P0/P1/P2 finding.

## Explicit exclusions and non-claims

This authority excludes changes to the PIX settlement UoW, provider callbacks,
worker fencing, service-principal provisioning UI, external providers,
credentials, target/production operations, migration, backup/restore,
accessibility, LGPD acceptance, complete CVG-002B2B, Vetus parity and release
approval. A local interactive-principal test is not proof of production
identity governance.

## Bounded closure

This task closes as `PASS_BOUNDED` only for the repository-local interactive
principal resolver and its Auth/session/MFA boundary under
`.agent/gates/verified-CVG-002B2B-service-principal-interactive-boundary.json`.
It does not close parent CVG-002B2B, service-principal provisioning, global ERP
parity or release readiness. Global ERP remains `IN_PROGRESS/PARTIAL` and
promotion remains `BLOCKED`.

## Revalidation triggers

- Any new interactive user resolver or authentication cache.
- Any change to service-principal mapping, worker settlement identity or MFA.
- Any expansion to target, provider, production, deployment or release scope.
