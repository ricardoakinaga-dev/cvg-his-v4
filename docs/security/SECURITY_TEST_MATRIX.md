# Security Test Matrix

| Control | Static/unit | Integration/runtime | Release evidence | Status |
|---|---|---|---|---|
| Authentication/session/MFA | auth, refresh, MFA suites | distributed role/session probes | CI artifact + target evidence | PARTIAL |
| RBAC/ABAC/service principals | access-control tests/catalog | revoked permission and service-principal replay | governance + negative tests | PARTIAL |
| Tenant isolation/RLS | migration/coverage validators | two-role/two-tenant positive and negative matrix | current DB evidence | PARTIAL |
| Idempotency/replay | module tests | actor revocation, duplicate provider and stale fence | release evidence | OPEN |
| Secrets and configuration | secretlint, startup fail-closed | Vault/rotation/absence behavior | security evidence + authority | PARTIAL |
| Supply chain | lockfile/action/base-image inspection | registry image scan and signature verify | SBOM/provenance/digest | OPEN |
| Attachments/webhooks | parser/scanner/signature tests | storage outage, replay and malware path | game-day/recovery evidence | PARTIAL |
| Audit/LGPD | audit/LGPD tests | immutability, retention and DSR authorization | governance artifact | PARTIAL |
| API/browser hardening | OpenAPI, headers and route tests | hostile payload/rate-limit/CORS/CSRF matrix | security run evidence | PARTIAL |

`PASS` in a local test column does not close the runtime or release column. A P0 control remains open until the complete row is evidenced for the candidate SHA.
