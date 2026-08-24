# CVG-002C6 — stale-owner fencing with process A alive (2026-08-24)

## Frozen quality bar

- `STF-01` — a real child process A claims the outbox event and remains alive
  while paused at `after_claim` and `after_domain_command_before_cas`; the
  lease expires and a different process B claims `leaseVersion = 2`.
- `STF-02` — B completes the event; releasing A makes its late CAS return
  `outboxCompletion = false` and expose `leaseLost = true`.
- `STF-03` — PostgreSQL reconciliation has exactly one inventory consumption,
  one inventory billing item, two expected audit rows, one derived outbox
  event, stock `8`, idempotency `1`, original outbox `completed`, attempts `2`
  and `lease_version = 2`.
- `STF-04` — the existing SIGKILL/takeover checkpoints remain green in the same
  integration file.

## RED

Command:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=stale_owner_red \
pnpm exec vitest run tests/integration/process/inpatient-domain-sigkill.test.ts \
  --config vitest.integration.config.ts --reporter=verbose --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000 \
  -t 'fences a stale owner'
```

Result: `FAIL`, 2 tests failed. B completed the takeover, but the child
fixture did not emit the `leaseLost` field, so the new assertions rejected the
unobserved stale-owner contract at both checkpoints. This was the expected
pre-implementation failure.

## Implementation

- `apps/worker/test-fixtures/inpatient-domain-process.ts`
  - supports a test-only `SIGUSR2` resume barrier;
  - keeps the child alive after the checkpoint until the lead releases it;
  - emits `leaseLost` from the actual fenced `completeClaim` result.
- `tests/integration/process/inpatient-domain-sigkill.test.ts`
  - adds RED/GREEN cases for both checkpoints;
  - asserts real PIDs, lease versions `1 → 2`, A is alive after B exits,
    B completion, A stale completion rejection and SQL reconciliation;
  - asserts the original SIGKILL cases still reconcile to one side-effect
    graph.

## GREEN

Command:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=stale_owner_assertions \
pnpm exec vitest run tests/integration/process/inpatient-domain-sigkill.test.ts \
  --config vitest.integration.config.ts --reporter=verbose --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000
```

Result: `PASS`, one file and `4/4` tests, exit `0`, duration `233.66s`.
Both SIGKILL cases and both stale-owner-A-alive cases passed against a fresh
ephemeral PostgreSQL database with migrations `0000`–`0123`.

Static checks:

```text
pnpm exec prettier --check tests/integration/process/inpatient-domain-sigkill.test.ts apps/worker/test-fixtures/inpatient-domain-process.ts  -> PASS
pnpm exec eslint tests/integration/process/inpatient-domain-sigkill.test.ts apps/worker/test-fixtures/inpatient-domain-process.ts        -> PASS
```

## Limitations

This closes the stale-owner evidence gap only for the bounded child-process
fixture and one tenant. It does not prove the production worker consumer,
two-tenant A/B spoofing, API rebootstrap/cross-instance hydration, full
admission-to-receipt failpoints, PIX/RLS, webhook retry/DLQ, or global ERP and
production readiness.
