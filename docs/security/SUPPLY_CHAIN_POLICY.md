# Supply Chain Policy

## GitHub Actions

Every external action in `.github/workflows` must use a full 40-character commit SHA. Human-readable release tags remain comments only. `pnpm validate:supply-chain` is a blocking check and must be updated whenever a workflow adds or changes an action.

The current repository pins checkout, setup-node, pnpm, cache, artifact upload, Semgrep, CodeQL, Docker Buildx/login/build-push and provenance attestation actions. A pin update must record the upstream tag, commit SHA, reason and review date in the pull request.

## Dependencies and images

- `pnpm-lock.yaml` is the install source of truth; CI uses frozen installs.
- Dependency audit, secret scan, SAST and SBOM output are release inputs; a report must reflect the real command exit status.
- Production images must be tied to a candidate SHA and registry digest; mutable tags are not sufficient for deployment identity.
- Base image updates require vulnerability/license review and a rebuild of API, worker and SPA images.
- Signatures/provenance and registry scan results must be linked to the release manifest before certification.

## Exceptions

An exception is a time-bounded residual-risk decision in `.agent/authority.jsonl` with owner, compensating control, expiry and revalidation trigger. A documentation-only exception cannot make a release gate PASS.
