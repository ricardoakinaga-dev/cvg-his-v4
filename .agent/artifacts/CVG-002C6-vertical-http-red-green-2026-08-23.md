# CVG-002C6 — vertical HTTP/PostgreSQL boundary (2026-08-23)

## Gate result

**GREEN bounded / no global promotion.** A disposable PostgreSQL database was
used with two tenants, two API instances and public HTTP calls through
admission, handoff/ack, inventory consumption with charge capture, daily
charge/billing, billing-open, discharge, close and cash receipt.

## Fresh evidence

Command:

```text
pnpm exec vitest run tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts --config vitest.integration.config.ts --reporter=verbose
```

Result: **4/4 tests passed**.

- The main journey passed admission → handoff/ack → inventory consumption →
  daily charge → daily billing → public billing-open → discharge → close →
  cash receipt.
- Same-key replays returned the same response and divergent payloads returned
  `409`; the resulting billing, receipt, payment, cash movement and balanced
  journal were reconciled from PostgreSQL.
- Two API instances converged on one concurrent daily billing result.
- A SQL close constraint produced `500` without encounter closure, audit,
  outbox or idempotency residue.
- A bearer from tenant A could not admit tenant B's encounter/patient even
  with falsified tenant/account headers; neither tenant received a stay.

The first run was intentionally provisional (`1/4`, with fixture defects): it
had omitted the public billing-open transition, compared `varchar` to `uuid`
in a rollback assertion and used a legitimate tenant-B bearer/resource pair in
the spoof case. The corrected run changed only the test fixture and passed
`4/4`; no production code or financial rows were seeded to hide the boundary.

## Test boundary and residuals

This is a bounded public HTTP/PostgreSQL journey, not certification of the
whole ERP or a release gate. The fixture uses the test harness/admin pool for
setup and observer queries; it does **not** yet prove every clinical/financial
mutation under a real restricted `NOBYPASSRLS` runtime role. It also does not
prove process SIGKILL/restart between every domain boundary, full cross-domain
failpoint coverage, global `FORCE ROW LEVEL SECURITY`, all handoff/discharge
fields, stock-lot reconciliation, or asynchronous multi-instance hydration.
SPA/B2c, provider, Redis, Vetus parity, WCAG, coverage, operations,
deploy/restore and release remain open.

## Reproduction file

`tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts`
