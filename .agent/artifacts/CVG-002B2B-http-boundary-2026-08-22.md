# CVG-002B2B — HTTP callback boundary checkpoint

**Checkpoint:** EVT-0052

**Date:** 2026-08-22 21:45 BRT

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

The integration suite uses a real Node HTTP server/request and covers split chunks, authentication failure, authenticated invalid payload, duplicate `Content-Type`, oversized body and rate limiting. It does not replace the required manual `node:net` framing/abort harness.

## Remaining acceptance work

1. Add raw `node:net` framing tests and the deferred-ACK barrier.
2. Add OpenAPI documentation and validate it.
3. Map repository conflicts/failures to opaque boundary responses and freeze CORS/origin behavior.
4. Run HTTP → real PostgreSQL receipt/delivery integration.
5. Implement and verify service-principal exclusions, shared fenced worker UoW and B1 consumer.

No real provider credentials or production capability were enabled. The pre-existing design-system TypeScript build cache remains outside scope.
