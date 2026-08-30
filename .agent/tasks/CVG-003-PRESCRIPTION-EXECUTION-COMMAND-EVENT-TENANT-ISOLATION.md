# CVG-003 — prescription-execution command and administration-event tenant isolation

**Status:** `PASS_BOUNDED` — bounded gate passed with global non-promotion  
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical cross-tenant read/write  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-IR-001`

## Problem

`PrescriptionExecutionsService` is hydrated for multiple accounts in one
runtime map, but its administration-event detail and state-transition methods
currently accept only an execution identifier. `getByIdForAccount` is used by
the HTTP controller as a pre-check, while the service methods themselves call
unscoped `getById`. A direct service caller can therefore read events or issue
an execute, suspend, resume or log command for an execution belonging to a
different account. The controller pre-check is not an authorization boundary.

## Frozen bounded contract

1. `getEvents`, `execute`, `suspend`, `resume` and `logEvent` require a
   principal-derived `AccountId` in their TypeScript signatures and runtime
   boundary.
2. Each method validates a non-empty account context and resolves the target
   through the account-scoped lookup before reading, validating transitions,
   mutating in-memory state or enqueueing persistence. A foreign execution is
   indistinguishable from a missing execution through `NotFoundError`.
3. `GET /prescription-executions/:executionId` and all four command routes pass
   the authenticated principal account to the service boundary. Route-level
   pre-checks may not be the only tenant guard and no unscoped command call may
   remain.
4. A wrong-account or missing-account direct call must not disclose events,
   change execution state, append an event, enqueue persistence or create an
   audit side effect. Same-account behavior, CAS, transition validation,
   rollback and durable audit semantics remain unchanged.
5. All first-party callers and existing tests are migrated to the scoped
   signatures. The change remains repository-local and reversible.

## TDD acceptance

### RED

- A new service regression calls every detail/command boundary with missing or
  foreign account context and fails against the current unscoped methods.
- A route regression asserts that the principal account is the first argument
  forwarded to detail and command/event service methods; the current route
  fails this forwarding contract.

The fresh RED run recorded the expected failures: the module suite was `27
passed / 1 failed` because the current unscoped `getEvents` accepted missing
scope, and the route suite was `4 passed / 1 failed` because the current
execute route forwarded `pe_1` as the first service argument instead of
`account-1`.

The correction then passed module `28/28`, focused HTTP routes `7/7`, the
canonical PostgreSQL runtime `1/1` after explicit disposable database reset
and seed, and the complete API package `476/476`. Module/API typechecks,
Prettier, ESLint and `git diff --check` also passed. Independent review and
final bounded reconciliation passed. The official `pnpm test:coverage` run
also passed with `80.09%` statements, `80.93%` branches, `88.26%` functions
and `80.09%` lines across `121` instrumented files. Two fresh read-only reviewers
returned `APPROVE_BOUNDED`, with no P0, P1 or P2 findings; both confirmed the
AccountId-first service guard, principal forwarding, first-party compatibility
and preserved persistence rollback path. Fresh global audits then remained
non-promoting: Vetus `4/11`, clinical `2/3`, enterprise readiness `95/100`
with `42 PASS`, `3 WARN` and `1 FAIL`, and promotion `BLOCKED`.

### GREEN

- Same-account detail and all four commands remain functional.
- Missing account context fails with `ValidationError` before any state or
  event mutation; foreign account context fails with `NotFoundError` and leaves
  the owning execution unchanged.
- Module, API route and canonical-runtime regressions pass, followed by
  formatting, lint, typecheck, security and diff hygiene checks.
- Global security, parity, target, provider, operations and release states
  remain `IN_PROGRESS`/`PARTIAL` or `BLOCKED`.

## Explicit non-claims

This slice proves only the repository-local application-service and HTTP
command/detail boundary. It does not certify direct SQL or privileged writers,
database rollout, target RLS, provider behavior, credentials, distributed
operations, accessibility, LGPD, Vetus parity, backup/restore, production or
release readiness.

## Bounded result

The AccountId-first service and route correction passed the verified bounded
gate with `PASS_WITH_CONDITIONS`. Focused module evidence is `28/28`, focused
HTTP evidence is `7/7`, canonical PostgreSQL runtime evidence is `1/1`, and
the complete API package is `476/476`. Module/API typechecks, formatting,
lint, diff hygiene, secret scan and RLS scan passed. Two fresh independent
read-only reviews returned `APPROVE_BOUNDED` with no P0/P1/P2 findings.

The gate is strictly local. Global Vetus remains `4/11`, clinical parity
remains `2/3`, enterprise readiness remains `95/100` (`42 PASS`, `3 WARN`,
`1 FAIL`) and promotion remains `BLOCKED`.

## Revalidation triggers

- Any new prescription-execution command, event detail or event query path.
- Changes to runtime hydration, principal/account propagation,
  authorization, persistence or transition semantics.
- Any expansion to direct SQL, migrations, target, provider, credential,
  production, deployment or release acceptance.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-prescription-execution-command-event-tenant-isolation.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-COVERAGE-001`

## Decision

`IMPLEMENTATION_READY` with residual risk `HIGH`. Proceed to intentional RED,
then implement only the scoped account propagation and service-boundary
correction. Do not promote CVG-003 or global readiness from this slice.
