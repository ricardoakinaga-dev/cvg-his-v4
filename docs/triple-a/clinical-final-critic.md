# Final clinical safety critic

**Candidate scope:** workflow control plane and clinical closure surface,
2026-09-09. **Verdict:** `BLOCKED / NOT PROVEN`.

## Fresh observations

- Workflow tasks have tenant-scoped idempotency, lifecycle events, lease
  fencing, retry/DLQ/replay and API authorization tests.
- A real PostgreSQL integration suite now covers schema/RLS, concurrent create
  and claim, lease takeover, fencing, retry/DLQ/replay, lifecycle races and
  append-only history. It is executable in CI but cannot be claimed as run here
  because the local Docker/PostgreSQL service is unavailable.
- The discharge producer creates a manual follow-up task. The current worker
  handler registry is deliberately empty, so unknown worker task types fail
  closed instead of silently acknowledging them.
- An independent-process `SIGKILL`/lease-takeover/fencing test for workflow
  tasks is now listed in the critical process manifest. Its runtime result is
  still unproven until it runs against disposable PostgreSQL with dedicated
  credentials.

## Blocking findings

1. No current candidate artifact proves the complete HTTP/UI clinical journey
   from check-in through inpatient care, diagnostics, workflow, discharge and
   follow-up with audit/timeline/notification assertions.
2. No current runtime evidence proves API and worker roles enforce the same
   tenant boundary under PostgreSQL credentials.
3. No current candidate artifact proves the workflow process test actually ran
   successfully against PostgreSQL; manifest membership and source inspection
   are not substitutes for the runtime result.
4. Human clinical UAT has not occurred and must remain `no-go` until real
   hospital users sign the SHA-bound package.

## Required closure evidence

Run the database suite with disposable PostgreSQL, execute the workflow child
process crash/restart proof, execute critical HTTP/UI negative cases, inspect
audit/timeline/notification output, and attach the
human UAT package described in
[`HOSPITAL_UAT_PROTOCOL.md`](../operations/HOSPITAL_UAT_PROTOCOL.md).
