# CVG-003 — MedicalRecords tenant boundary

**Status:** VERIFY / COMPLETE_BOUNDED / PASS_BOUNDED  
**Priority:** P1  
**Owner:** root integrator  
**Date opened:** 2026-08-30

## Objective

Make the sensitive `MedicalRecordsService` account-aware at its public record,
clinical-entry and timeline boundary. A cached or repository-hydrated object
from another account must fail closed before disclosure, cache publication,
revision access or mutation. Authenticated API and first-party callbacks must
forward the principal account explicitly.

## Authorized scope

- Add explicit `AccountId` to account-sensitive record, entry, revision and
  timeline service methods, including cache snapshot/restore compensation.
- Validate encounter, medical-record and clinical-entry ownership before
  returning data, publishing it into the hot cache, or mutating memory,
  persistence queues and timeline effects.
- Filter repository-hydrated entries and timeline events by account and their
  parent record/encounter linkage; preserve authoritative empty reads.
- Migrate the authenticated medical-record HTTP routes, attachment target
  resolution, laboratory/inpatient callbacks and other first-party callers.
- Add focused direct-service and HTTP regressions for same-account behavior,
  cross-account non-disclosure and mutation/persistence non-residue.

## Explicit exclusions

- No schema, migration, RLS policy, repository SQL or provider changes.
- No rewrite of encounter, patient, prescription, triage, discharge or other
  clinical aggregates outside callers required by this boundary.
- No target, production, deployment, release, remote-CI or external mutation.
- No global ERP, Vetus parity or readiness promotion.

## Quality bar

Close only as `COMPLETE_BOUNDED` / `PASS_BOUNDED` after TDD RED/GREEN,
independent review or an explicit recorded availability limitation, focused
coverage at or above 80% for the changed service, relevant API/integration
regressions, workspace typecheck/build, targeted lint, security/static checks,
and control-plane reconciliation. Preserve the global ERP `IN_PROGRESS/PARTIAL`
state and promotion `BLOCKED`.

## Scout evidence

Fresh read-only scouting, including delegated scout Bacon, found that
`#loadRecordById`, `#loadRecordByEncounterId`, `getEntryOrThrowAsync`, list
methods, `updateEntry` and `archiveEntry` trust process-local cache/repository
objects without an explicit account. Authenticated routes currently provide
compensating checks, but that protection depends on every future caller
remembering them. The next safe step is the explicit service boundary and
first-party propagation described above.

Evidence: `.agent/verification.jsonl#VFY-SCOUT-CVG-003-MEDICAL-RECORDS-TENANT-BOUNDARY-001`.

## Closure evidence — 2026-08-31

- TDD RED contracts were executed for contaminated repository hydration,
  stale snapshot mappings, completed-record mutation, attachment collections,
  and revision/cache boundaries; the intentional failures were fixed by the
  bounded service and caller changes.
- TDD GREEN passed 36/36 focused medical-record tests, including the added
  cross-account and cache-preservation regressions. The changed
  `MedicalRecordsService` reached 88.1% statements/lines, 85.1% branches and
  92.85% functions under V8 coverage.
- The complete API package regression passed 555/555 tests. Workspace
  `typecheck`, `build` and `lint` passed; the static/security validators and
  deploy checks passed, with the documented Helm-binary and global-readiness
  limitations retained.
- The latest independent bounded review found no in-scope Critical, High or
  Medium finding and confirmed the service, HTTP and first-party account
  propagation plus the new adversarial tests.

## Residuals and non-promotion

- The compatibility `ensureRecord` path can still publish a cache entry before
  asynchronous persistence completes; canonical authenticated flows use the
  transaction/persistence wait path. Redesigning that lifecycle is outside
  this slice.
- Database adapter SQL/RLS behavior remains intentionally unchanged by this
  task; service-level filtering and caller propagation are the accepted
  boundary. Direct unscoped compatibility callers must not be treated as an
  authenticated authorization boundary.
- The global critical suite remains a separate baseline blocker: 539 tests
  passed, 4 failed and 13 were skipped, with failures in encounter-index
  isolation, PIX service-principal DDL cleanup, scheduled-report load and
  worker outbox tenant context outside this task's file/scope set.
- Global ERP readiness remains `IN_PROGRESS/PARTIAL`; enterprise readiness is
  still 95/100 with 42 PASS, 3 WARN and 1 FAIL, and promotion remains
  `BLOCKED`. No target, production, deployment, release, provider, parity or
  global ERP claim is made by this bounded closure.

Closure evidence: `.agent/gates/verified-CVG-003-medical-records-tenant-boundary.json`,
`.agent/artifacts/CVG-003-medical-records-tenant-boundary-2026-08-31.md`,
`.agent/verification.jsonl#VFY-CVG-003-MEDICAL-RECORDS-TENANT-BOUNDARY-FINAL-RETEST-002`,
`.agent/verification.jsonl#VFY-CVG-003-MEDICAL-RECORDS-TENANT-BOUNDARY-REVIEW-REVALIDATION-002`,
`.agent/verification.jsonl#VFY-CVG-003-MEDICAL-RECORDS-TENANT-BOUNDARY-FINAL-RECONCILIATION-003`,
and `.agent/verification.jsonl#VFY-CVG-003-MEDICAL-RECORDS-TENANT-BOUNDARY-FINAL-RECONCILIATION-004`.
