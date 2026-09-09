# SLO / SLI Policy

**Status:** target contract; production target sign-off pending.
**Owner:** Platform Operations.

## Service indicators

- API availability: successful health/readiness and non-error request ratio, excluding controlled client validation responses.
- API latency: p50/p95/p99 by critical route class, with clinical writes and read-heavy routes separated.
- Worker freshness: age of oldest eligible job, successful completion ratio, retry ratio, DLQ growth and lease-loss count.
- Database: connection pool saturation, query latency/error rate, migration duration and RLS/role probe status.
- Redis: command latency, availability and rate-limit fallback/deny behavior.
- Storage/integrations: attachment scan/delivery latency, webhook/provider success, retry and reconciliation backlog.
- Frontend: critical navigation success, JS error rate, LCP/INP/CLS and accessibility regression status.

## Error budget

The release gate must consume target-specific SLO thresholds and a signed/current budget report. A local build or unit suite does not establish a production SLO. When the error budget is exhausted, non-essential rollout is paused, incident ownership is assigned and the next release requires explicit authority.

## Alerting and retention

Alerts need a severity, owner, runbook, dedupe key, notification route and retention. The current repository has Prometheus rules and a local OTEL collector configuration; delivery, retention, Alertmanager/on-call routing and target capacity remain `NOT_RUN` until proven in the environment.
