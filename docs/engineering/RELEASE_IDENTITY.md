# CVG-HIS V4 — Release and Deploy Identity

This file is the canonical transition contract for release/deploy naming. It
prevents a repository rename from being confused with a safe runtime
canonicalization. Existing package and image names are compatibility surfaces
until their consumers are migrated and independently verified.

```text
PROJECT_ID=CVG-HIS-V4
REPOSITORY_ID=cvg-his-v4
CANONICAL_COMPOSE=docker-compose.v2.yml
CANONICAL_HELM_SURFACE=infra/helm/cvg-his-v2
LEGACY_HELM_SURFACE=charts/helm
LEGACY_HELM_STATUS=NON_CANONICAL
CANONICAL_HEALTH_PATHS=/health,/ready,/live,/health/ready,/health/live
```

## Active surfaces

- The production-like Compose/deploy contract is `docker-compose.v2.yml`.
- The only active Helm track is `infra/helm/cvg-his-v2`; `pnpm validate:helm`
  and the CI repository guard both point there.
- `packages/db` remains the canonical migration and seed rail.
- API and worker health contracts are `/health`, `/ready`, `/live`, with the
  `/health/ready` and `/health/live` aliases retained for compatibility.

## Compatibility and legacy policy

- The current package namespace `@cvg-his-v2/*`, Docker names and Helm chart
  name are compatibility identifiers. A global rename is not authorized by
  this document.
- `charts/helm` is retained as a legacy artifact for migration history only.
  It is not a deploy surface, is not referenced by CI or active scripts, and
  must not be installed or used for release decisions.
- Any future removal or alignment of legacy files requires a consumer scan,
  migration notes, targeted validation and an explicit re-audit. No deletion
  is implied by this policy.

## Required checks

```bash
pnpm validate:deploy-surface
pnpm validate:helm
pnpm deploy:check
```

`validate:deploy-surface` rejects active references to the legacy Helm track,
missing identity markers, stale executable instructions and CI drift. It does
not claim that a target cluster, remote GitHub runner or production release
has been executed.

## Executable Helm policy

The repository guard requires the CI workflow to install Helm v3.15.4 with the
pin
11400fecfc07fd6f034863e4e0c4c4445594673fd2a129e701fe41f31170cfa9 and to run
REQUIRE_HELM=1 pnpm validate:helm. The required mode fails closed if the
binary is absent or has a different version. Local development may use the
static fallback explicitly when the required mode is not requested.

For the CI proof, the validator is invoked as
`HELM_BIN=/usr/local/bin/helm REQUIRE_HELM=1 pnpm validate:helm` after the
workflow verifies the official archive checksum and the installed executable
path. This prevents a different PATH entry from silently satisfying the
release gate; it still does not prove a remote run or a target deployment.
