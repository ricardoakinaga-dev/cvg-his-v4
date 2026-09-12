# Dependency Policy — CVG HIS

**Status:** canonical
**Owner:** Engineering / Security
**Validated at:** 2026-09-09
**Scope:** runtime, development, GitHub Actions and container base dependencies

## Rules

1. `pnpm-lock.yaml` is the installation source of truth and CI uses
   `pnpm install --frozen-lockfile`.
2. Workspace packages use `workspace:` references. External dependencies must
   resolve through the configured registry and may not use `file:`, `link:`,
   `git:`, `git+`, raw HTTP URLs, `*` or `latest` in package manifests.
3. Security fixes take priority over grouping or release convenience. A major
   update requires explicit Dependency Dashboard approval in Renovate.
4. GitHub Actions, workflow service images, Compose images, Helm static images
   and container bases remain pinned by immutable commit/image digest and are
   checked by `pnpm validate:supply-chain`. Compose images built by this
   repository are allowed only under the explicit `cvg-his-v2-*`/`cvg-his-v4-*`
   local-image namespace; external images never use a mutable tag.
5. New packages require a review of vulnerability exposure, provenance,
   licensing, maintenance signal and whether an existing workspace capability
   already solves the problem. The review belongs in the pull request; the
   repository gate proves only the mechanical policy.
6. `pnpm security:enterprise` and the CI SAST/secret gates are complementary;
   a clean dependency policy check is not a security certification.

## Automation

`pnpm validate:dependencies` scans every active workspace manifest, validates
the exact package-manager contract and confirms the lockfile is present and
tracked. Renovate is configured in [`renovate.json`](../../renovate.json) with
digest pinning and no automatic merges. The check is required by repository
guards and the Triple-A release gate.

## Exceptions

An exception requires a dated ADR or pull-request decision naming the package,
reason, scope, owner, expiry and compensating control. Do not weaken the
validator to accommodate an undocumented exception.
