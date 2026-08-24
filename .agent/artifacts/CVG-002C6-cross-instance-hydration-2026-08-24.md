# CVG-002C6 — cross-instance hydration and tenant-scoped reads (2026-08-24)

## Frozen quality bar

- `HYD-01` — an API instance initialized before a mutation in another API
  instance reads the committed inpatient stay through `GET /inpatient` after
  the mutation, including its discharged status.
- `HYD-02` — the same warm secondary instance reads the newly created discharge
  through `GET /discharges` (and detail reads refresh the same account slice).
- `TEN-01` — a bearer from tenant B cannot observe tenant A's refreshed stay or
  discharge, including when querying the secondary instance.
- `REG-01` — the vertical journey, close/receipt and discharge regression
  suites remain green, with typecheck and secret scanning unchanged.

## RED / root cause

The new public-boundary assertions were added before the runtime change and
run against `vertical_hydration_red`:

```text
1 file, 4 passed, 1 failed, exit 1, 33.11s
```

The secondary API had been `ready` before the primary instance admitted,
discharged and closed the encounter. Its inpatient cache therefore returned
`items=[]` for the committed stay. The failure was a real stale-cache
observation, not a fixture-only SQL assertion.

## Implementation

- `GET /inpatient` now calls `inpatient.refreshAccount(accountId)` before
  listing, rebuilding the account slice from committed PostgreSQL rows.
- `GET /discharges` and `GET /discharges/:id` now refresh the account slice
  before serving list/detail reads.
- The refresh is account-scoped and remains fail-closed: a repository error is
  visible as a failed request rather than silently returning a stale board.
- The vertical HTTP test now reads from the secondary instance after the
  primary journey and asserts that bearer B receives empty A-scoped results.

## GREEN and regression evidence

Fresh disposable PostgreSQL runs:

```text
vertical_hydration_green2:       1 file, 5/5 tests, exit 0, 36.06s
vertical_hydration_close_reg:    1 file, 5/5 tests, exit 0, 50.35s
vertical_hydration_discharge_reg:1 file, 5/5 tests, exit 0, 44.93s
```

Additional checks:

```text
pnpm typecheck       -> 70/70 scoped workspace projects passed, exit 0
pnpm security:secrets -> exit 0
Prettier (route/test) -> PASS
ESLint (route/test)   -> PASS
git diff --check      -> PASS
```

The expected conflict, failpoint and not-found logs remain asserted behavior
inside the regression suites; none caused a test failure.

## Independent critique

Fresh read-only review reran
`vertical_hydration_review_20260824` and returned **APPROVE bounded**:

- `HYD-01`, `HYD-02`, `TEN-01` and `REG-01` all approved;
- direct inspection confirmed account-scoped repository queries and the
  secondary-instance assertions;
- no P0/P1 or blocking regression was found.

## Limitations

This closes only the read-after-commit stale-cache boundary for inpatient and
discharge list/detail routes. It does not prove concurrent requests while a
refresh is in flight (the critic classified this as P2), distributed Redis
invalidation, every cached domain, production worker composition, full
admission-to-receipt failpoints, PIX/webhook, Vetus parity or global
production/release readiness. Those gates remain `IN_PROGRESS/PARTIAL`.
