# Local automated closure — 2026-09-18

## Scope and candidate binding

This record covers only the locally automatable PostgreSQL/migration contract
for the current functional candidate
`28043455f12cf2ef076eafcf09516ffd67007c74`.

The test processes ran from the documentation-only descendant
`42902e95f696e8c9456cee7c11afa192c149fefd`. The candidate-binding checker
classified that descendant as `DOCUMENTATION_ONLY_DESCENDANT`; no source,
workflow, migration or threshold change occurred after the functional
candidate. This record therefore does not promote CI, target, recovery, UAT,
attestation or release-authority evidence.

## Evidence

| Criterion | Command / producer | Result | Evidence |
| --- | --- | --- | --- |
| Migration source and checksum rail | `pnpm validate:migration-source` | PASS | 17 canonical-source checks, including runner, CI, Compose, cutover, Helm and absence of alternate active rails |
| SQL migration behavior | `scripts/run-sql-migration-evidence.mjs` | PASS | run `c43c3222-6973-4031-9276-bd33f7e011b3`; 175 active migrations, 7 historical artifacts; manifest digest `987b3a9c8e8c...`; candidate head `28043455...` |
| Disposable PostgreSQL critical integration | `TEST_DB_EPHEMERAL=1` integration shard | PASS | run `2c101787-344c-40d4-bb3e-d1c00df4f6f8`; 105/105 files and 933/933 tests |
| Aggregate critical coverage | `node scripts/check-critical-coverage.mjs` | PASS | R05-010; no errors; all frozen component thresholds met; SQL and Vue consumers PASS |

The promoted critical shards use manifest revision 79 and digest
`987b3a9c8e8cbbc0670b0ed45b06d00fbaa91676f1b608363effda4a9b7f5dbd1`:

- unit: `0e4e7132-f0dd-4c54-9506-3104ed0b3d23`;
- integration: `2c101787-344c-40d4-bb3e-d1c00df4f6f8`;
- native API: `526e31f5-b152-43c5-93a2-98d5a200f6d8`;
- native worker: `7c3442b7-a250-4a29-ab6d-64a87a635e38`;
- critical process: `ddfb1587-c34c-4cda-a6c3-572789001891`;
- specialized Vue: `6935d8c0-1b34-41e6-a4be-717f8e0c4d63`.

## Decision

`P0-DATA-POSTGRESQL-RUNTIME` is closed because both required criteria have
fresh, candidate-bound local evidence. This closure is deliberately narrower
than production assurance: runtime tenant isolation in the approved target,
restore/RPO/RTO, hosted CI and release authority remain open P0 gates.
