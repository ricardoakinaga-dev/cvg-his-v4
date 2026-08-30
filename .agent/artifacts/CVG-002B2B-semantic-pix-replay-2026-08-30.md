# CVG-002B2B — semantic PIX replay convergence

## Bounded outcome

The dedicated signed PIX worker now transports the persisted
`claims_fingerprint` into the shared B1 settlement primitive. Equivalent
distinct provider event IDs are serialized after the billing lock and return
the existing settlement proof, while their append-only receipts and deliveries
remain individually observable. The duplicate delivery is finalized as
`applied` with the sanitized operational marker
`PIX_SETTLEMENT_CANONICAL_REPLAY`.

Divergent claims remain terminal as
`PIX_SETTLEMENT_CLAIMS_DIVERGENT`. Same-event replay remains compatible, and
legacy direct callers without a fingerprint retain their existing contract.
No migration or provider behavior was changed.

## TDD and implementation evidence

- RED: `.agent/verification.jsonl#VFY-CVG-002B2B-SEMANTIC-PIX-REPLAY-RED-001` —
  the baseline applied the first equal-claims receipt and moved the second
  distinct event to `reconciliation_required`.
- GREEN: `.agent/verification.jsonl#VFY-CVG-002B2B-SEMANTIC-PIX-REPLAY-GREEN-001` —
  sequential and concurrent equivalent events converge to one financial set of
  effects; real ingress divergence fails closed; same-ID replay is idempotent.
- The B1 lookup checks account, provider, transaction, billing, amount,
  currency, confirmation time, attempt binding and claims fingerprint before
  returning the canonical proof.

## Verification

- Dedicated PostgreSQL consumer suite: `11/11` against disposable migrations
  `0000`–`0157`.
- Confirmed-settlement integration suite: `19/19`.
- `@cvg-his-v2/module-pix` tests: `9/9`.
- `@cvg-his-v2/worker` tests: `17/17`.
- Workspace typecheck completed; `module-pix` and worker builds completed.
- OpenAPI validation passed (`354` paths, `40` tags, `413` schemas).
- RLS validation passed (`165/166` tenant tables protected, one documented
  exception); namespace validation, secret scan, targeted ESLint and
  `git diff --check` passed.
- Full workspace lint remains non-zero only for the pre-existing
  `no-control-regex` findings at
  `packages/contracts/src/counterSales.ts:38,77`. Prettier reports existing
  formatting drift in the touched legacy files; no formatter-wide rewrite was
  applied.
- Independent compatible re-review confirmed all three prior findings were
  resolved and reported no remaining material finding.

## Files in scope

- `apps/worker/src/jobs/pix-provider-event-delivery-repository.ts`
- `apps/worker/src/jobs/pix-provider-settlement-consumer.ts`
- `packages/modules/pix/src/confirmed-settlement/confirmed-pix-settlement-command.ts`
- `packages/modules/pix/src/confirmed-settlement/confirmed-pix-settlement-repository.ts`
- `packages/modules/pix/src/pix.test.ts`
- `tests/integration/database/pix-provider-settlement-consumer.test.ts`
- `tests/integration/database/confirmed-pix-settlement-command.test.ts`

## Review and promotion boundary

This is `COMPLETE_BOUNDED/PASS_BOUNDED` for the repository-local dedicated
signed PIX worker/B1 seam. It does not certify external providers, target
operations, production, deployment, release, backup/restore, Vetus/clinical
parity or global ERP readiness. The global ERP remains `IN_PROGRESS/PARTIAL`
and promotion remains `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-002B2B-semantic-pix-replay.json`,
`.agent/tasks/CVG-002B2B-SEMANTIC-PIX-REPLAY.md`,
`.agent/verification.jsonl` and `.agent/execution-log.jsonl`.
