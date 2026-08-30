# CVG-003 — prescription execution clinical integrity

**Status:** `PASS_BOUNDED` — bounded clinical-integrity slice reconciled  
**Stage/activity:** `VERIFY` / `RECONCILE`  
**Owner:** root integrator with TDD and independent security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical medication administration

## Problem

The prescription-execution route accepts a free-form `clinicalEntryId`, patient,
encounter, medication and dosage without proving that the referenced clinical
entry is a signed, active prescription belonging to the same account, patient
and encounter. The service also persists an execution and its administration
event as two sequential repository calls, and the database update does not
compare the stored version. Two API replicas can therefore create an orphaned
execution, lose a concurrent state transition, or leave the clinical state and
its event trail divergent after a failure between writes.

## Frozen bounded contract

1. `PrescriptionExecutionsService.create` receives an account-scoped
   prescription source. The source must resolve the referenced prescription;
   missing, archived or unsigned prescriptions are rejected. The prescription
   account, patient and encounter must match the command. Medication, dosage,
   route and frequency are checked against the signed prescription, and the
   persisted execution uses the canonical prescription values rather than
   caller-supplied substitutions.
2. `execute`, `suspend` and `resume` accept an optional `expectedVersion`.
   When omitted, the service still persists the version observed by the
   command as a compare-and-swap precondition. A stale database row maps to a
   stable `409 CONFLICT`; no lost update is accepted.
3. The database execution repository exposes compound create/update paths that
   write the execution and administration event on one tenant-scoped database
   transaction. A failure in either statement rolls back both. The in-memory
   repository retains equivalent atomic behavior for unit tests.
4. Existing HTTP tenant UoW behavior remains authoritative: production-like
   mutations require `Idempotency-Key`, replay returns the original response,
   different payloads conflict, and the route audit/outbox work remains inside
   the same surrounding transaction when the durable runtime is enabled.
5. Existing canonical PostgreSQL migration/RLS/FK boundaries remain in force;
   no provider, credential, target, deployment, external-system or release
   decision is part of this slice.

## Ownership and allowed surface

- `packages/shared/contracts/src/index.ts` — optional expected-version request
  fields.
- `packages/modules/prescriptions/src/index.ts` — account-scoped prescription
  lookup used by the execution boundary.
- `packages/modules/prescription-executions/src/**` — source contract, invariant
  checks, CAS, compound repository writes and tests.
- `apps/api/src/runtime.ts` and `apps/api/src/routes/prescription-executions-routes.ts`
  — composition and validated HTTP request forwarding.
- Focused module/API/database integration tests, OpenAPI text and control-plane
  evidence required by the implementation.

## TDD and Quality Bar

### RED

- unsigned, archived, missing, cross-account, cross-patient and
  cross-encounter prescriptions fail before an execution is persisted;
- medication/dosage substitution fails;
- stale expected version fails with `ConflictError`;
- a repository failpoint between execution/event writes leaves no partial
  durable state;
- two runtimes racing the same execution produce one accepted transition and
  one conflict.

### GREEN

- signed active prescriptions create canonical executions;
- execute/suspend/resume persist with CAS and append exactly one corresponding
  event atomically;
- API idempotency replay returns one durable execution/event result;
- PostgreSQL/RLS two-account integration proves non-disclosure and rollback;
- focused module/API/database tests, typecheck, build, lint, security and
  formatting pass without reducing existing coverage below 80%.

## Explicit non-claims

This slice does not certify the whole clinical journey, prescribing authority
or professional licensing, dose-safety decision support, target RLS, external
providers, accessibility, worker crash recovery, Vetus parity, restore/RTO-RPO,
production deployment or release readiness. The ERP/global program remains
`IN_PROGRESS`/`PARTIAL` until its separate gates close.

## Revalidation triggers

- any new prescription, execution or administration-event writer;
- changes to clinical-entry signing/archive semantics, hydration or tenant
  authorization;
- changes to the idempotency UoW, audit/outbox composition or canonical
  PostgreSQL migrations;
- any expansion to target, provider, credential, deployment or release scope.

## Final decision target

`PASS_BOUNDED` only after RED/GREEN evidence, disposable PostgreSQL proof,
independent read-only review and control-plane reconciliation. Residual risk
must remain `HIGH` until the broader clinical and enterprise gates close.

## Reconciliation — 2026-08-27

The frozen contract is implemented and locally verified as `PASS_BOUNDED`.
Signed active prescriptions are resolved through the account-scoped source;
patient, encounter, medication, dosage, route and frequency coherence is
enforced; transitions use expected-version CAS; and execution plus
administration-event writes are compound and transactional in PostgreSQL with
an equivalent locked/rollback-safe in-memory test repository. HTTP action
matching is exact, identifiers/date-times are validated, authorization is
checked before idempotency replay, and commit/rollback refresh the disposable
process cache.

Fresh evidence: module `27/27`, route `5/5`, API integration `1/1`,
PostgreSQL integrity/RLS/FK `5/5`, compiled API server `45/45` including
permission-revoked replay rejection, and workspace `pnpm test` exit `0`.
Builds, OpenAPI, RLS, migration-source, security and `git diff --check` also
passed. Official coverage is `80.51%` statements/lines, `80.22%` branches and
`87.70%` functions; the global coverage configuration excludes this slice's
primary source files, so that aggregate is not presented as proof of changed
code coverage.

The independent review found no technical Critical or High finding; its only
Medium finding was the control-plane state still being RED at review time and
is addressed by the verified gate and ledger reconciliation. Global Vetus
parity remains `98/100` (`4/11`), clinical parity `100/100` (`2/3`, laboratory
provider/homologation open), and enterprise readiness `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`). This slice does not promote CVG-003, the ERP, production
or release readiness; target RLS/ownership, providers, restore/RTO-RPO,
distributed worker operations, remote CI, accessibility, operational LGPD and
remaining parity remain open.
