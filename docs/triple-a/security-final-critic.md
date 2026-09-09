# Final security critic

**Candidate scope:** external assurance closure, current checkout on
2026-09-09. **Verdict:** `BLOCKED / NOT PROVEN`.

## Fresh observations

- The workflow control plane now carries `schemaVersion` and `source`, and the
  PostgreSQL migration adds constraints without rewriting historical rows.
- Runtime role policy explicitly separates `cvg_api`, `cvg_worker`, installer
  capability and the test role. Static/unit ACL coverage exists.
- Public branch-protection probes were unauthenticated (`401`) and the visible
  ruleset list did not prove effective protection. This is not a PASS.
- The CI SAST workflow was corrected to use the Semgrep container contract and
  pinned image digest, but the candidate still needs a fresh successful remote
  run.

## Blocking findings

1. No authenticated branch protection/ruleset export bound to the candidate.
2. PostgreSQL runtime role evidence is not attached to the current SHA; local
   tests and a superuser-backed test service are not equivalent.
3. Registry scan, provenance and `gh attestation verify` for the published
   images are not available in this workspace.
4. The dependency audit currently reports moderate advisories; no high/critical
   advisory was observed locally, but the release policy still requires the
   current candidate evidence.

## Required closure evidence

Attach authenticated API/ruleset JSON, API/worker role probes, registry scan,
SBOM/provenance and immutable artifact digests. Re-run the strict gate after
each critical change. Do not promote this critic to PASS by editing the
document; it is a record of the independent review state.
