# Failure Mode and Effects Analysis

| Failure mode | Effect | Severity | Detection | Control/mitigation | Evidence status |
|---|---|---:|---|---|---|
| Wrong tenant/account context | Cross-tenant disclosure/mutation | 10 | RLS/role probes, negative route tests, audit | fail-closed context, RLS, transaction binding | PARTIAL |
| Idempotency replay after permission revocation | Unauthorized mutation/result disclosure | 10 | replay actor test, authorization audit | revalidate actor before cached result | OPEN |
| Duplicate provider/webhook delivery | Duplicate payment/clinical side effect | 9 | dedupe/reconciliation metrics | stable idempotency, inbox/outbox, fencing | PARTIAL |
| Worker account starvation | Delayed clinical/financial jobs | 8 | freshness/error-budget alert | per-account isolation and bounded fairness | OPEN |
| Partial clinical screen write | Incomplete record/order with false success | 9 | transaction/audit consistency | atomic command or explicit reconciliation | OPEN |
| Corrupt/incomplete backup | Failed or unsafe recovery | 10 | checksum/TOC/graph probes | immutable backup and timed restore drill | NOT RUN |
| Mutable image/action dependency | Supply-chain compromise or non-reproducibility | 8 | digest/pinning validator and scan | SHA pinning, SBOM, signature | OPEN |
| Alert/telemetry outage | Delayed incident response | 8 | synthetic alert delivery | durable backend, route and degraded-mode test | NOT RUN |
| Wrong clinical context in UI | Order/result attached to wrong encounter | 10 | context negative tests and UAT | require explicit encounter context | OPEN |

Severity 9–10 modes are P0 for certification. Each row needs an owner, test/monitor, runbook and current evidence before final release.
