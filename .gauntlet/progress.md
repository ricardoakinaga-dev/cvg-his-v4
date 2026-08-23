# Gauntlet Progress

- Goal: Deliver a behaviorally proven Premium Enterprise veterinary ERP MVP.
- Phase: BUILD
- Current round: 7
- Active workstreams: `CVG-002` encounter-to-receipt; bounded `CVG-002A`, `CVG-002B1`, durable outbound `CVG-002B2a` and the B2b parser/receipt/delivery ingress checkpoint are verified only within their stated boundaries.
- Largest current gap: PIX still lacks the separately gated signed callback, durable B1 settlement consumer and coherent SPA integration; card, inventory linkage and the complete scheduled/walk-in E2E remain later milestones.
- Latest verification: B2b parser/ingress passed focused 77/77 and PostgreSQL 11/11, B1 regression 18/18 and B2a regression 33/33; the independent reviewer approved this sub-slice. The preceding B2a VERIFIED gate records coverage 1.646/1.646 with 83% lines and 80,3% branches, typecheck/lint, OpenAPI, RLS, dependency audit, secret scan, diff check and two independent approvals.
- Blockers: Target environment, provider decisions and production authority block only their dependent future work.
- Planning checkpoint: architecture, security, official-source and TDD reviews plus the parser/receipt/delivery implementation are consolidated in `.agent/tasks/CVG-002B2B.md` and `docs/2026-08-22-handoff-cvg-002b2.md`; the implementation gate is still not a full B2b VERIFIED gate.
- Latest bounded local increment: EVT-0055 through EVT-0059 adds the raw `node:net` callback harness, deferred-ACK and opaque-error checks, CORS decision and OpenAPI contract. An independent review found two medium contract mismatches; follow-up `705052b` aligned the key ID/timestamp/signature regexes and webhook correlation schema. Fresh evidence is HTTP 13/13, verifier/keyring 35/35, shared-config 32/32, startup 6/6 and OpenAPI 334/385. This is evidence for the HTTP seam only; it does not satisfy HTTP-to-PostgreSQL, principal or worker requirements.
- Next action: extract/verify the shared fenced worker UoW under the read-only worker role, then add transient retry, restart/takeover/redrive and the legacy `410`; SPA remains separately gated `B2c` work.

## Checkpoint 2026-08-22 — EVT-0060…EVT-0065

- HTTP→PostgreSQL receipt/delivery proof passed 2/2 with a separate observer connection and rollback failpoint.
- Service-principal migration/schema passed 5/5 PostgreSQL integration and 3/3 schema unit checks; auth/cache/MFA guard passed 7/7, users 13/13 and auth 30/30.
- Runtime ACL/RLS passed 7/7 unit + 1/1 integration. The worker remains read-only for identity; the attempted `FOR UPDATE` principal lock was removed instead of widening privileges.
- B1 consumer passed 6/6 unit, 3/3 PostgreSQL integration and worker suite 47/47. It is default-off and synthetic-provider capability is explicit; no `idempotency_requests` path is used.
- Remaining gate gaps: shared transaction helper, real worker-role query, transient database/transport retry, restart/takeover/redrive/DLQ, legacy `410`, provider/SPA/E2E, Vetus parity, WCAG, operations and production.
- Publication: implementation checkpoint `26f3281` and documentation synchronization `3cba876` are pushed to `origin/agent/sync-v4-full-program`; the next session can resume from `3cba876`. The design-system tsbuildinfo cache remains unstaged.
