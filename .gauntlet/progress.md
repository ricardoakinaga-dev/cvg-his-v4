# Gauntlet Progress

- Goal: Deliver a behaviorally proven Premium Enterprise veterinary ERP MVP.
- Phase: BUILD
- Current round: 8
- Active workstreams: `CVG-002` encounter-to-receipt; bounded `CVG-002A`, `CVG-002B1`, durable outbound `CVG-002B2a` and the B2b parser/receipt/delivery ingress checkpoint are verified only within their stated boundaries.
- Largest current gap: the bounded PIX callback/worker slice still needs a safe pre-context database API-key capability, operational DLQ/runbook/alerts and separately gated SPA integration; card, inventory linkage and the complete scheduled/walk-in E2E remain later milestones.
- Latest verification: B2b parser/ingress passed focused 77/77 and PostgreSQL 11/11, B1 regression 18/18 and B2a regression 33/33; the independent reviewer approved this sub-slice. The preceding B2a VERIFIED gate records coverage 1.646/1.646 with 83% lines and 80,3% branches, typecheck/lint, OpenAPI, RLS, dependency audit, secret scan, diff check and two independent approvals.
- Blockers: Target environment, provider decisions and production authority block only their dependent future work.
- Planning checkpoint: architecture, security, official-source and TDD reviews plus the parser/receipt/delivery implementation are consolidated in `.agent/tasks/CVG-002B2B.md` and `docs/2026-08-22-handoff-cvg-002b2.md`; the implementation gate is still not a full B2b VERIFIED gate.
- Latest bounded local increment: EVT-0055 through EVT-0059 adds the raw `node:net` callback harness, deferred-ACK and opaque-error checks, CORS decision and OpenAPI contract. An independent review found two medium contract mismatches; follow-up `705052b` aligned the key ID/timestamp/signature regexes and webhook correlation schema. Fresh evidence is HTTP 13/13, verifier/keyring 35/35, shared-config 32/32, startup 6/6 and OpenAPI 334/385. This is evidence for the HTTP seam only; it does not satisfy HTTP-to-PostgreSQL, principal or worker requirements.
- Next action: fix the API-key pre-context/RLS boundary, publish the recovery/DLQ/legacy checkpoint, add the operational DLQ surface, then rerun bounded regressions; SPA remains separately gated `B2c` work.

## Checkpoint 2026-08-22 — EVT-0060…EVT-0065

- HTTP→PostgreSQL receipt/delivery proof passed 2/2 with a separate observer connection and rollback failpoint.
- Service-principal migration/schema passed 5/5 PostgreSQL integration and 3/3 schema unit checks; auth/cache/MFA guard passed 7/7, users 13/13 and auth 30/30.
- Runtime ACL/RLS passed 7/7 unit + 1/1 integration. The worker remains read-only for identity; the attempted `FOR UPDATE` principal lock was removed instead of widening privileges.
- B1 consumer passed 6/6 unit, 3/3 PostgreSQL integration and worker suite 47/47. It is default-off and synthetic-provider capability is explicit; no `idempotency_requests` path is used.
- Remaining gate gaps: shared transaction helper, real worker-role query, transient database/transport retry, restart/takeover/redrive/DLQ, legacy `410`, provider/SPA/E2E, Vetus parity, WCAG, operations and production.
- Publication: implementation checkpoint `26f3281` and documentation synchronization `3cba876` are pushed to `origin/agent/sync-v4-full-program`; the next session can resume from `3cba876`. The design-system tsbuildinfo cache remains unstaged.

## Checkpoint 2026-08-22 — EVT-0068…EVT-0071

- Shared `runInTenantTransactionContext` now owns the canonical tenant UoW used by B1 and the final delivery CAS; shared context unit evidence is 3/3 and the real worker integration is included in the 5/5 PostgreSQL result.
- Transient PostgreSQL/transport errors are explicitly allowlisted for retry; unknown or divergent errors remain terminal. The internal `reconciliation_required` redrive is bounded, audited and a no-op after the state transition.
- The actual worker-role principal query passed under `SET ROLE` with `FORCE RLS`; identity access remains read-only and `password_hash` is denied. Runtime ACL/RLS evidence is 8/8.
- Attempt-linked legacy PIX confirmation returns `410 LEGACY_PIX_CONFIRMATION_DISABLED` before gateway/event; route evidence is 3/3, repository evidence 5/5 and OpenAPI is 335 paths/386 schemas.
- Implementation `46b84cb` is pushed. The detailed continuation artifact is `.agent/artifacts/CVG-002B2B-worker-uow-legacy-410-2026-08-22.md`; the handoff and audit have matching sections. The broad goal remains `IN_PROGRESS/PARTIAL`.
- Remaining gate work: process crash/restart and multi-pool takeover, DLQ/observability, HTTP-to-PostgreSQL proof for the 410 barrier, provider/SPA/E2E, Vetus parity, WCAG, operations and release. Preserve the design-system tsbuildinfo cache outside scope.

## Checkpoint 2026-08-22 — EVT-0072…EVT-0076

- Worker observability now covers retry/applied/lease-lost/idle, terminal failures and automatic `attempts_exhausted` promotions. Metrics are aggregate-only and telemetry errors are best-effort; worker suite is 54/54.
- Two independent PostgreSQL pools prove lease expiry, stale-fence rejection, takeover and one B1/receipt after the first worker loses its pool. The result is 6/6, but it is not a SIGKILL or full crash matrix.
- HTTP→PostgreSQL legacy evidence is 3/3: persisted attempt-linked owner gets 410 before gateway/outbox, foreign account gets opaque 404, direct legacy path remains 200 with one gateway and one outbox. The API-key adapter exposes a production gap in the default JSONB/pre-context repository path.
- Service-principal/RLS integration is 5/5 with non-vacuous backfill reconstruction and cross-tenant negatives; the nested shared UoW direct test is 4/4; API route is 4/4; API-key module is 10/10; OpenAPI is 335/386 and secret/diff checks pass.
- Broad objective remains `IN_PROGRESS/PARTIAL`. Next session should repair the safe pre-context API-key capability, add DLQ/runbook/alerts and keep B2c/SPA, providers, Vetus parity, WCAG, operations and release as separate gates.
