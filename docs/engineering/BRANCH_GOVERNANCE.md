# Branch Governance — `main`

**Status:** `NOT PROVEN` until authenticated GitHub evidence is attached to the
candidate SHA.  
**Owner:** repository owner / release authority.  
**Scope:** pull-request merge protection and release promotion for
`ricardoakinaga-dev/cvg-his-v4`.

## Required configuration

The owner must configure the `main` branch so that:

- direct pushes are restricted to the owner/release automation;
- pull requests require at least one independent review;
- stale approvals are dismissed when the protected diff changes;
- the branch is required to be up to date before merge;
- force-push and deletion are disabled;
- all required CI checks are selected by their exact job names;
- bypass actors/teams are explicit, minimal, and audited;
- release promotion requires the strict Triple-A gate and immutable candidate
  identity.

The repository's workflow job names are the source for required-check selection;
the visible workflow names are not sufficient. At minimum the owner must review
these exact check names in the completed run for the candidate:

`Typecheck`, `Lint`, `SAST (Semgrep)`, `Secret Scan`, `Validate OpenAPI`,
`Repository Guards`, `API Contract Tests`, `Build`, `Unit Tests`,
`Critical Process Runner (Windows contract)`, `Integration Tests`, `Coverage`,
`Performance (k6 SLOs)`, `E2E Tests (SPA)`, `Visual Regression`, and
`Dependency Audit (CVE Scan)`.

The list is intentionally tied to the current workflow job display names. If a
job is renamed, added or removed, the branch rules and this document must be
updated together; a similar-looking workflow name is not an equivalent check.

## Evidence contract

An acceptable governance artifact must contain:

```json
{
  "schema_version": 1,
  "repository": "ricardoakinaga-dev/cvg-his-v4",
  "branch": "main",
  "commit_sha": "<40 lowercase hex characters>",
  "status": "PASS",
  "source": "authenticated GitHub API",
  "observed_at": "<ISO-8601 timestamp>",
  "required_status_checks": [
    "Typecheck",
    "Lint",
    "SAST (Semgrep)",
    "Secret Scan",
    "Validate OpenAPI",
    "Repository Guards",
    "API Contract Tests",
    "Build",
    "Unit Tests",
    "Critical Process Runner (Windows contract)",
    "Integration Tests",
    "Coverage",
    "Performance (k6 SLOs)",
    "E2E Tests (SPA)",
    "Visual Regression",
    "Dependency Audit (CVE Scan)"
  ],
  "enforce_admins": true,
  "required_pull_request_reviews": true,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "verified_by": "<owner/admin identity>"
}
```

The artifact must be accompanied by the API response digest or an equivalent
immutable export and must be regenerated after any branch-rule change. A URL or
an unauthenticated `401` response is not a PASS.

## Current probe

On 2026-09-09, unauthenticated public probes returned:

- `GET /repos/ricardoakinaga-dev/cvg-his-v4/branches/main/protection` → `401
  Requires authentication`;
- `GET /repos/ricardoakinaga-dev/cvg-his-v4/rulesets` → `200` with an empty
  visible list.

This does not establish whether rules exist or whether they are complete. The
current evidence is recorded in the ignored generated artifact
`artifacts/release/branch-governance-evidence.json` and remains `BLOCKED / NOT
PROVEN`.

## Release behavior

The strict release gate must fail closed when this artifact is absent, stale,
not bound to the exact candidate SHA, unauthenticated, or reports anything
other than `PASS`. Local policy, a clean checkout, or a successful CI job cannot
substitute for branch governance.

No organization-level setting was changed by this execution. Configuring these
rules requires authenticated owner/admin authority and should be recorded in
`.agent/authority.jsonl` before the final release decision.
