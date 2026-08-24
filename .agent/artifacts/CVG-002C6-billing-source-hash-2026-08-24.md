# CVG-002C6 — billing source identity and canonical idempotency hash (2026-08-24)

## Frozen quality bar

- `BILL-01` — the persisted billing item is explicitly typed as
  `inventory_consumption` and its `source_entity_id` equals the persisted
  `inventory_consumptions.id`.
- `BILL-02` — `idempotency_requests.request_hash` equals the exact SHA-256
  produced by the shared canonicalizer for the HTTP command envelope:
  `path`, `query`, and `body` (not only a 64-character shape check).
- `BILL-03` — replaying the same key with `quantity = 3` returns
  `409 IDEMPOTENCY_CONFLICT` and leaves the single-effect SQL graph unchanged.
- `BILL-04` — both legacy SIGKILL/takeover and stale-owner-A-alive cases remain
  green.

## RED / root-cause evidence

The first assertion pass intentionally used only the raw route body as the
canonical payload. The real HTTP dispatcher hashes
`{ path: '/inventory/consumptions', query: {}, body: <route body> }`, so the
new exact-hash assertion failed in all four process cases with a different
64-character digest. This exposed the missing contract detail rather than
silently accepting a length-only assertion.

The same run already emitted the expected `409 IDEMPOTENCY_CONFLICT` for the
divergent payload, proving the behavior existed but was previously unasserted
in the process/takeover journey.

## Implementation

No production code change was required: the route dispatcher and shared
`hashIdempotencyPayload` implementation already enforce the correct behavior.
The regression test now imports the shared canonicalizer, asserts the full
envelope hash, joins billing source identity to the consumption row, and sends
the divergent replay through the real HTTP boundary. This turns the former
review limitation into executable evidence.

## GREEN

Command:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=billing_hash_green \
pnpm exec vitest run tests/integration/process/inpatient-domain-sigkill.test.ts \
  --config vitest.integration.config.ts --reporter=verbose --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000
```

Result: `PASS`, one file and `4/4` tests, exit `0`, duration `125.96s`.
Both existing SIGKILL tests and both stale-owner-A-alive tests passed against a
fresh ephemeral PostgreSQL database with migrations `0000`–`0123`. The run
logged two expected application errors for the divergent replay; those
responses were asserted as HTTP 409 and did not add inventory/billing effects.

Static checks:

```text
pnpm exec prettier --write tests/integration/process/inpatient-domain-sigkill.test.ts -> PASS
pnpm exec eslint tests/integration/process/inpatient-domain-sigkill.test.ts       -> PASS
git diff --check                                                                  -> PASS
```

## Limitations

The proof remains bounded to the child-process inpatient inventory/outbox
fixture and one tenant. It does not certify the full admission-to-receipt
journey, two-tenant A/B spoofing, cross-instance hydration, production worker
composition, PIX/webhook or global ERP/production readiness.
