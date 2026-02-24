# PR-0: Build Proof + Debug Visibility

## Scope

- Added web build endpoint: `GET /api/build`
  - File: `apps/his-web/src/app/api/build/route.ts`
- Exposed `buildId` in shell footer stamp
  - File: `apps/his-web/src/lib/buildStamp.ts`

## Why

- Operators need deterministic evidence that a new frontend build is actually running.
- `buildId` + `gitSha` + `buildTime` in the running UI/API avoids false-positive deploys.

## How To Test (Local)

1. Start `his-web`.
2. Call:
   - `curl -s http://localhost:3001/api/build`
3. Expect JSON with:
   - `service: \"his-web\"`
   - `buildId`
   - `gitSha`
   - `buildTime`
   - `env`
4. Open any protected page and confirm footer includes `build: <buildId>`.

## How To Test (EasyPanel)

1. Trigger a **new image build** and deploy `his-web`.
2. After deploy:
   - `curl -s https://<web-domain>/api/build`
3. Validate returned `buildId/gitSha/buildTime` match expected release.
4. Open UI and verify footer stamp matches `/api/build`.

## Rebuild Rules (Critical)

- Changing any `NEXT_PUBLIC_*` value requires **rebuild** of `his-web` image.
- Changing runtime-only vars (example: `HIS_API_INTERNAL_URL`) requires redeploy/restart, not necessarily rebuild.
- If `/api/build` output did not change, the new frontend build was not applied.
