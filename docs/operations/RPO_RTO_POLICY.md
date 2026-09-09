# RPO / RTO Policy

**Status:** targets require environment owner approval before certification.

| Asset | Target RPO | Target RTO | Measurement | Owner |
|---|---:|---:|---|---|
| PostgreSQL clinical/financial data | ≤ 15 min | ≤ 60 min | backup timestamp, restore completion, graph/integrity probes | Data/Platform |
| Attachment objects and metadata | ≤ 15 min | ≤ 90 min | object inventory/checksum and application references | Platform/Storage |
| Redis ephemeral/cache state | Best effort; no source of truth | ≤ 30 min | restart/rebuild and queue/rate-limit health | Platform |
| API/SPA/worker deployment | candidate SHA | ≤ 30 min | rollout, readiness, rollback and smoke tests | Release owner |
| Audit/outbox/idempotency records | same as PostgreSQL | ≤ 60 min | durable row counts, hash/sequence checks, replay safety | Clinical/Data |

Targets are proposed defaults, not proof. A target environment may tighten them but may not silently relax them. A measured drill that misses a target is a release-blocking finding until mitigated and accepted by the accountable authority.
