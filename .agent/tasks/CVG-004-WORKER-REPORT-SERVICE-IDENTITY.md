# CVG-004 — explicit worker report service identity

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-004 scheduled financial/report journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-WORKER-REPORT-SERVICE-IDENTITY-IR-001`

## Objective

Remove the worker's unsafe report-actor fallback. Scheduled and failed-delivery
report execution currently casts `accountId` to `UserId` when
`WORKER_REPORTS_USER_ID` is absent, although `report_executions` requires a
real user foreign key. The worker must require an explicit, validated actor and
must never turn an account identifier into an audit identity.

## Frozen bounded contract

1. Add `WORKER_REPORTS_USER_ID` to the canonical worker configuration. It is a
   trimmed UUID and is mandatory in production-like environments; malformed
   values fail configuration before worker execution.
2. Make both the continuous worker and `run-once` resolve the configured
   report actor through one small, tested boundary. Missing identity fails
   closed before the scheduled report path is entered; no account-id or other
   synthetic fallback is allowed.
3. Preserve tenant context, existing schedule claims, report exports,
   delivery retry behavior and current in-memory/unit-test seams. This slice
   does not invent credentials, create users, provision service principals or
   change report schema semantics.
4. Wire production-like Compose and canonical Helm worker deployments to an
   operator-managed Secret key. The repository must contain no user UUID;
   missing Secret/configuration remains a visible startup failure.
5. Prove explicit valid, missing, malformed and unknown-foreign-key actor
   behavior with focused tests and a disposable PostgreSQL process assertion
   that no `report_executions` row is written for an invalid database actor.
6. Keep report audit semantics, per-account service-principal mapping,
   historical data remediation, providers, target, credentials, production
   execution, deployment, external mutation and release acceptance outside
   this gate.

## TDD acceptance

### RED

- Configuration/identity tests fail against the absent worker config field and
  the current account-id fallback.
- A process/database contract fails when a valid-but-unknown report actor is
  used and requires zero report execution persistence.
- Helm/Compose contract tests fail until production-like worker identity is
  sourced from required operator configuration.

### GREEN

- Shared-config and worker identity tests pass for missing, malformed and
  explicit UUID values with stable fail-closed errors.
- Continuous and one-shot worker paths use the same explicit actor resolver;
  `WORKER_REPORTS_USER_ID` is the only source of the report actor.
- Real disposable PostgreSQL/run-once evidence proves a valid actor persists
  the report and an unknown actor leaves no execution row; tenant context and
  existing schedule behavior remain intact.
- Worker, reports, API compatibility, typecheck/build, security, static
  deployment, coverage and diff-hygiene regressions pass locally.

## Explicit non-claims

This slice hardens identity selection and deployment wiring only. It does not
certify the global report family, scheduled audit append, per-account service
principal provisioning, target roles/RLS, distributed worker operations,
providers, parity, accessibility, backup/restore, remote CI or release.

## Revalidation triggers

- Any report execution/export schema or audit identity change.
- Any change to worker account discovery, schedule claiming or delivery retry.
- Any service-principal provisioning, provider, target, production, deploy or
  release action.

## Bounded verification result — 2026-08-27

The frozen identity boundary is `PASS_BOUNDED`. Shared configuration and the
worker resolver now accept one canonical non-nil RFC 4122 UUID contract; both
continuous and one-shot entrypoints resolve the same explicit actor and fail
closed when it is absent or malformed. The disposable PostgreSQL run-once
proof passed 12/12, including persistence of `requested_by_user_id` for a
known actor and zero execution persistence for an unknown actor. Compose and
production-like Helm paths require operator-managed Secret configuration;
Helm binary rendering was unavailable locally, so the repository's static
chart validation is the asserted deployment evidence.

Independent reviewer Wegener found no Critical or High issue in this bounded
slice. The review remains conditional because the single configured actor is
not yet mapped per account and the existing `requested_by_user_id` foreign key
does not itself enforce actor/account membership. That residual is tracked as
`R-025` / `TD-028` and is outside this authority. Development Helm remains
fail-closed without an actor, intentionally; no UUID was added to the repo.

Evidence: `.agent/gates/verified-CVG-004-WORKER-REPORT-SERVICE-IDENTITY.json`,
`.agent/artifacts/CVG-004-worker-report-service-identity-2026-08-27.md` and
the linked `verification.jsonl` records. No provider, target, credential,
production, deployment or release claim is made.
