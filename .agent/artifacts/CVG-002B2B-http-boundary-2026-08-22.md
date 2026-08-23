# CVG-002B2B — HTTP callback boundary checkpoint

**Checkpoint:** EVT-0059

**Date:** 2026-08-22 22:10 BRT

**Task:** CVG-002B2B
**Status:** bounded implementation evidence only; parent remains `IN_PROGRESS/PARTIAL`

## Scope

This artifact records the explicit local/test synthetic callback capability. It does not certify the full B2b contract, production readiness or a real provider.

Implemented seams:

- `POST /webhooks/pix/synthetic/v1` behind `PIX_SYNTHETIC_WEBHOOK_ENABLED`.
- IP rate limiting before body consumption.
- Exact raw-body read with a 65,536-byte limit.
- HMAC-SHA-256, key-to-account binding, freshness and duplicate-critical-header rejection.
- Strict authenticated payload parsing and durable receipt/delivery persistence before opaque `202`.
- Fail-closed readiness for production-like environments and missing keyring/repository.
- Strict operator keyring parser and local/dev configuration defaults.

## Fresh commands and results

| Command | Result |
| --- | --- |
| `pnpm --filter @cvg-his-v2/shared-config build` | PASS |
| `pnpm --filter @cvg-his-v2/shared-config test` | 32/32 PASS |
| `pnpm --filter @cvg-his-v2/api lint` | PASS |
| `pnpm exec vitest run tests/unit/api/pix-provider-webhook-verifier.test.ts tests/unit/api/pix-provider-webhook-keyring.test.ts --config vitest.config.ts --reporter=dot` | 35/35 PASS |
| `pnpm exec vitest run tests/unit/api/startup-secrets-runtime.test.ts apps/api/src/startup-secrets.test.ts --config vitest.config.ts --reporter=dot` | 6/6 PASS |
| `pnpm exec vitest run tests/integration/pix-provider-webhook-http.test.ts --config vitest.integration.config.ts --reporter=dot` | 6/6 PASS |
| `pnpm exec vitest run tests/integration/pix-provider-webhook-http.test.ts --config vitest.integration.config.ts --reporter=dot` (fresh raw-socket refresh) | 13/13 PASS |
| `pnpm validate:openapi` | 334 paths, 40 tags, 385 schemas; PASS |

The integration suite now uses both a real Node HTTP server/request and a raw `node:net` socket. It covers split chunks, real chunked framing, authentication failure, authenticated invalid payload, duplicate critical headers, oversized body, short `Content-Length`, abort without a complete body, rate limiting, browser-only headers and a deferred-ACK barrier. A truncated `Content-Length` can be rejected by Node's HTTP parser before application JSON is available; the test asserts `400` with an empty body and zero persistence.

## Remaining acceptance work

1. Run HTTP → real PostgreSQL receipt/delivery integration on another connection, including failpoint rollback.
2. Implement and verify service-principal exclusions, shared fenced worker UoW and B1 consumer.
3. Re-run the full B2b gate, including dedicated coverage, restart/concurrency, legacy `410` and release evidence.

No real provider credentials or production capability were enabled. The pre-existing design-system TypeScript build cache remains outside scope.

## Current implementation notes

- Commit `bbbf902` (`feat: harden PIX webhook boundary`) contains the raw-socket harness, opaque conflict mapping, canonical repository interface and CORS decision. Follow-up commit `705052b` aligns the OpenAPI regexes and webhook error correlation schema with runtime behavior.
- The route remains non-production synthetic capability only; it is explicitly disabled by default and production-like readiness remains fail-closed.
- Independent review initially rejected the published contract for two MEDIUM mismatches; the follow-up is now green for this bounded slice with no CRITICAL/HIGH finding.
- The parent `CVG-002B2B` is still `IN_PROGRESS/PARTIAL`; this artifact is not a VERIFIED or production-readiness claim.
