# CVG-002B2B — auth login input boundary

## Bounded outcome

`POST /auth/login` now establishes a JSON-object boundary before reading
identity fields, extracts only safe object fields for the existing IP/identity
rate limiter, and validates `username`, `password` and optional `accountId`
before `AuthService.login`.

The frozen limits are:

- `username`: non-empty string, maximum 128 characters;
- `password`: non-empty string, maximum 128 characters;
- `accountId`: optional non-empty string, maximum 255 characters.

Invalid input returns the existing sanitized `400 VALIDATION_ERROR` envelope,
does not invoke authentication, does not create a session and does not echo
the raw body or credential markers. Rate limiting remains before validation and
the existing successful login, refresh cookie, MFA, WebAuthn, OIDC and session
paths are unchanged.

## TDD evidence

- RED: `pnpm exec tsx --test apps/api/src/routes/auth-routes.test.ts` — `25/26`,
  expected failure on `null` with an uncontrolled property access at the old
  route boundary.
- GREEN: the focused route suite passed `26/26`, later expanded to `27/27`.
- Boundary coverage includes top-level null/array/primitive, missing/blank/
  null/wrong-type fields, oversized fields, inclusive maximum values,
  rate-limit-before-auth ordering and raw-marker absence in response/log
  contexts.

## Regression and quality

- `pnpm --filter @cvg-his-v2/api test:auth-route`: `27/27`.
- `pnpm --filter @cvg-his-v2/api test`: `522/522`.
- `pnpm --filter @cvg-his-v2/module-auth test`: `46/46`.
- API build and workspace typecheck: pass (`70/71` scoped workspace projects).
- Targeted ESLint, Prettier, OpenAPI, RLS, namespace validation and
  `git diff --check`: pass.
- `pnpm security:enterprise`: pass; secret scan clean, high/critical
  advisories `0`, moderate advisories `0`.
- Full workspace lint: known unrelated baseline remains at
  `packages/contracts/src/counterSales.ts:38,77` (`no-control-regex`).

## Review and limits

The first independent review found no Critical or High code defect and asked
for broader field coverage, stronger secrecy assertions and an explicit route
test command. Those findings were remediated. The fresh independent review
returned `APPROVE_BOUNDED`.

This artifact proves only the repository-local interactive login input
boundary. It does not certify database/provider behavior, password hashing
cost, distributed rate-limit infrastructure, MFA/session/WebAuthn/OIDC policy,
Vetus parity, target operations, remote CI, production deployment, release or
global ERP readiness. Global ERP remains `IN_PROGRESS/PARTIAL`; promotion
remains `BLOCKED`.
