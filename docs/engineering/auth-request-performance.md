# Auth request-path performance decision

Status: implemented; remote performance gate remains the acceptance check.

## Current behavior

Protected HTTP requests need an account and user before tenant resolution. The
server therefore performs an early authoritative session synchronization and
the final authorization guard performs a second authoritative read. The final
read is required: it prevents a request from authorizing against a session or
profile assembled before a concurrent revocation.

## Decision

When the production `DatabaseSessionRepository` is in use, the authoritative
session, user and role reads now run inside one tenant-scoped database
transaction. The existing in-memory and test-repository paths retain their
previous behavior. The final guard still re-reads the repository on every
protected request; only connection and transaction setup between the related
reads is consolidated.

## Rejected alternative

Reusing the early `SessionSummary` at the final guard was rejected. The
critical revocation race test demonstrated that this can authorize a request
with a session snapshot captured before the final guard's synchronization
point.

## Remaining evidence

Local auth tests, API build and the native API server suite are green. The
GitHub k6 profile is the acceptance evidence for the latency targets; it must
pass without changing thresholds or removing scenarios.
