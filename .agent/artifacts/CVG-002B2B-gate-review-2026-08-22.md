# CVG-002B2B implementation-readiness review — 2026-08-22

Status: `REJECTED` on the first fresh independent review; no implementation authority or gate was created.

## Independent findings

- Architecture/security review (`/root/cvg002b2b_arch_gate_compatible`): `REJECT`. HIGH: the contract simultaneously required an immediate attempt FK and treated a missing attempt as a retry; the delivery retry/lease/fencing machine was not deterministic; service-principal non-interactive login lacked REDs across username/email/cache/session/MFA. MEDIUM: payload canonicalization and runtime grants were underspecified. The review confirmed the billing-first lock direction and that only PIX correlation can be absent after B2a dispatch.
- TDD/verifiability review (`/root/cvg002b2b_tdd_gate_compatible`): `REJECT`. HIGH: existing coverage configuration excludes worker, API routes and `packages/modules/pix`; service-principal authentication paths lack REDs; broad harness grants cannot prove least privilege. MEDIUM: raw socket framing/dummy-key comparison, deterministic revocation barriers, invalid-event-A/corrective-event-B, and production bootstrap fail-closed cases were not explicit.

## Contract corrections applied

`.agent/tasks/CVG-002B2B.md` now freezes: attempt existence as an ingress precondition (only PIX correlation is retryable); canonical payload/media/duplicate-key rules; delivery claim/lease/attempt/backoff/CAS/max-attempt transitions; service-principal filtering across every interactive/cache/MFA path; disposable-role ACL expectations; raw `node:net` HTTP tests; production bootstrap REDs; and dedicated coverage for the extracted module, worker and API routes.

The contract remains `TODO/NO-GO` pending a new blind independent approval after these changes. The previous rejection is evidence about the planning quality only, not behavioral evidence.

## Recheck after first corrections

- Fresh blind gate reviewer (`/root/cvg002b2b_gate_recheck`): `REJECT`. HIGH: broad grants in the runtime-role reconciler, init script and Helm maintenance could restore forbidden receipt mutations; the generic `createTenantUnitOfWork` can replay a completed response before principal/inbox/B1/CAS and conflicts with controlled redrive; accepted “active attempt” states and exact semantic equivalence/fingerprint were not frozen.

The contract was extended again to make reconciler/init/Helm revocation durable, require disposable-role tests after reconciliation, mandate a shared `runPixProviderSettlementTransaction` primitive without generic response idempotency, enumerate accepted attempt states, and define literal raw/claims fingerprint domains plus canonical claim field order. A new blind approval is still required; no authority or implementation gate has been recorded.

## Final readiness recheck

- Fresh blind reviewer (`/root/cvg002b2b_gate_recheck_fast`): `APPROVE` for readiness only. The reviewer confirmed explicit coverage of durable ACL re-enforcement, the shared no-replay worker transaction, attempt states, exact fingerprint domains, prior protocol/security/tenant/principal/rollback/legacy requirements, and dedicated coverage requirements.
- Limitations retained for later verification: current broad runtime grants, generic UoW and API-local B1 are not yet changed; dedicated coverage and all listed REDs are not yet executed. These are implementation/revalidation triggers, not claims of delivered behavior.

This approval supports a bounded `IMPLEMENTATION_READY` gate only for reversible repository code, disposable PostgreSQL and the explicit local synthetic provider. It does not authorize production, credentials, real provider mutation, deployment or release.

## B1 GREEN diff review and correction

- Independent diff reviewer (`/root/cvg002b2b_b1_green_review`): `REJECT` on the first GREEN revision.
- HIGH: an attempt-linked PIX already marked `completed` could bypass timestamp equality and have its authoritative `completed_at` overwritten by the caller payload.
- MEDIUM: the locked attempt did not validate `provider_key` or the billing `active_payment_attempt_id`; canonical replay did not bind the event to the attempt; the three new checkpoints were not in the rollback matrix.
- Corrections: completed attempt-linked PIX rows now require the exact provider timestamp and preserve the database timestamp; attempt provider and active reservation are checked under lock; canonical replay joins the PIX row and compares `attemptId`; the attempt staging/transition checkpoints have dedicated rollback coverage.
- Focused disposable PostgreSQL suite after correction: `18/18` tests passed, including the original B1 baseline, the pending-attempt GREEN, timestamp/provider/replay REDs turned GREEN, and all three attempt-path rollback checkpoints.

The B1 extension is now ready for extraction review, but remains only a partial B2b behavior slice. Callback ingress, migration 0111, service principal, shared worker transaction, raw-socket protocol and production-like ACL evidence are still absent.

## Extraction boundary verification

- The implementation was moved to `packages/modules/pix/src/confirmed-settlement/` and exported from `module-pix`.
- `apps/api/src/commands/confirmed-pix-settlement.ts` and `apps/api/src/confirmed-pix-settlement-repository.ts` contain only compatibility reexports; `tests/unit/architecture/pix-b2b-boundaries.test.ts` verifies runtime identity.
- `shared-database` and `shared-errors` are explicit module dependencies; the lockfile was refreshed.
- `pnpm --filter @cvg-his-v2/module-pix... build`, `pnpm --filter @cvg-his-v2/api lint`, module PIX tests (`8/8`), boundary identity (`1/1`) and the PostgreSQL regression (`18/18`) passed.
- A fresh specialized external reviewer could not be started in this environment because the configured reviewer model is unsupported; this is bounded build/static evidence only. The final independent code/security review and `VERIFIED` gate remain pending.
