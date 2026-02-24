# PR-1: Networking Estavel (Proxy Same-Origin)

## Scope

- Enabled auth endpoints in proxy allowlist:
  - `apps/his-web/src/app/api/proxy/[...path]/route.ts`
- Added regression test for `/api/proxy/auth/login` path:
  - `apps/his-web/src/app/api/proxy/[...path]/route.test.ts`
- Updated EasyPanel checklist to the canonical env model:
  - `docs/EASYPANEL_CHECKLIST.md`

## Root Cause Fixed

- `his-web` login uses `/api/proxy/auth/login` (`apps/his-web/src/lib/auth.ts:121`), but `/auth` was not allowed in proxy path allowlist.
- Result in production/dev: 403 `PROXY_PATH_BLOCKED` before reaching `his-api`.

## How To Test (Local)

1. Run tests:
   - `npx vitest run --environment node src/app/api/proxy/[...path]/route.test.ts`
2. Start `his-web` + `his-api`.
3. Execute:
   - `curl -i -X POST http://localhost:3001/api/proxy/auth/login -H 'content-type: application/json' -d '{\"type\":\"email\",\"email\":\"admin@cvg.local\",\"password\":\"secret123\"}'`
4. Expected:
   - No `PROXY_PATH_BLOCKED`.
   - Response forwarded from `his-api` (200/401 depending credentials/env).

## How To Test (EasyPanel)

1. Confirm `his-web` env:
   - `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy`
   - `HIS_API_INTERNAL_URL=http://his-api:3000`
2. Redeploy `his-web`.
3. Validate:
   - `curl -i https://<web-domain>/api/proxy/health`
   - `curl -i -X POST https://<web-domain>/api/proxy/auth/login -H 'content-type: application/json' -d '{\"type\":\"email\",\"email\":\"...\",\"password\":\"...\"}'`
4. Open `/login` and verify login flow no longer fica travado por 403 do proxy.
