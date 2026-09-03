# Game Day - CVG HIS Chaos Engineering

## Overview

Game Day is a planned exercise to validate system resilience by deliberately injecting failures and observing how the system responds. This document outlines the procedure for conducting Game Day exercises for the CVG HIS platform.

**Audience:** Site Reliability Engineers, Platform Engineers, Backend Engineers

**Frequency:** Quarterly (recommended) or before major architecture changes

**Automated baseline:** `pnpm ops:game-day:ephemeral` exercises all six fault
families (API, network, Redis, worker, external provider and database) against a loopback-only test runtime and writes
`artifacts/game-day/game-day-report.json`. The quarterly/manual workflow
`.github/workflows/ephemeral-game-day.yml` runs the same contract from an exact
`main` SHA with disposable PostgreSQL and Redis. This automation validates the
mechanism; an environment-target exercise, alert delivery and human incident
response remain separate approval evidence.

---

## Objectives

1. Validate fault-tolerance mechanisms work as designed
2. Verify monitoring and alerting correctly detects failures
3. Test incident response procedures and runbooks
4. Identify hidden weaknesses before they cause real outages
5. Train engineers on failure scenarios in a safe environment

---

## Pre-Game Checklist

### 1. Environment & Timing

| Item                                            | Status | Notes                                   |
| ----------------------------------------------- | ------ | --------------------------------------- |
| Running on STAGING environment (NOT production) | [ ]    | Game days never conducted in production |
| Scheduled during low-traffic window             | [ ]    | Recommended: Weekday 10:00-16:00        |
| No conflicting deployments scheduled            | [ ]    | Check `#releases` channel               |
| Duration allocated: 2-4 hours                   | [ ]    | Includes setup, experiments, cleanup    |

### 2. Team Preparation

| Person                       | Role   | Notified |
| ---------------------------- | ------ | -------- |
| Primary experiment conductor | [Name] | [ ]      |
| Secondary / scribe           | [Name] | [ ]      |
| On-call engineer (standby)   | [Name] | [ ]      |
| Engineering Manager          | [Name] | [ ]      |

### 3. Backup & Recovery

| Item                                 | Status | Verified                     |
| ------------------------------------ | ------ | ---------------------------- |
| Database backup completed            | [ ]    | Last backup within 24 hours  |
| Rollback procedure documented        | [ ]    | Helm rollback commands ready |
| Data recovery tested (if applicable) | [ ]    | Backup restoration verified  |

### 4. Monitoring & Alerts

| Item                          | Status | Verified                                                |
| ----------------------------- | ------ | ------------------------------------------------------- |
| Grafana dashboards accessible | [ ]    | `grafana.internal/d/api-overview`                       |
| PagerDuty alerts working      | [ ]    | Test alert sent                                         |
| Chaos metrics visible         | [ ]    | `chaos_experiment_active`, `chaos_fault_injected_total` |
| Logging aggregation working   | [ ]    | Kibana/CloudWatch accessible                            |
| Runbooks accessible           | [ ]    | Linked from this doc                                    |

### 5. Communication

| Action                                       | Status | Done                                      |
| -------------------------------------------- | ------ | ----------------------------------------- |
| Team notified via `#game-day` channel        | [ ]    | Posted 24h before                         |
| Stakeholders informed of potential impact    | [ ]    | Even staging can affect demo environments |
| StatusPage updated to "Degraded" (if needed) | [ ]    | Optional for staging                      |

### 6. Baseline Metrics

Record these metrics before starting experiments:

| Metric               | Baseline Value  |
| -------------------- | --------------- |
| API P99 Latency      | **\_** ms       |
| API Error Rate       | \_\_\_\_ %      |
| Database Connections | **\_** / **\_** |
| Redis Connections    | **\_** / **\_** |
| EventBus DLQ Depth   | **\_**          |
| Worker Queue Depth   | **\_**          |

---

## Experiments

### Experiment Execution Order

Experiments should be run in this order, from least to most impactful:

| Order | Experiment        | Risk Level | Duration | Purpose                                  |
| ----- | ----------------- | ---------- | -------- | ---------------------------------------- |
| 1     | API Latency Spike | Low        | 60s      | Validate timeout handling                |
| 2     | Network Latency   | Medium     | 60s      | Test async operation resilience          |
| 3     | Redis Failure     | Medium     | 60s      | Verify rate limiter fail-closed behavior |
| 4     | Worker Failure    | Medium     | 60s      | Check DLQ behavior                       |
| 5     | Database Failure  | High       | 60s      | Validate fail-closed unavailable mode    |

---

## Experiment 1: API Latency Spike

**ID:** `api-latency`

**Purpose:** Validate that clients and API gateway handle slow responses gracefully.

### Start

```bash
curl -X POST http://localhost:3001/chaos/experiments/api-latency/start \
  -H "Content-Type: application/json" \
  -d '{"minDelayMs": 2000, "maxDelayMs": 5000, "probability": 0.5, "durationMs": 60000}'
```

### Expected Behavior

- API responses take 2-5 seconds extra
- Error rate should remain < 1%
- Health checks should still pass
- No data loss or corruption

### Success Criteria

- [ ] API remains responsive during latency injection
- [ ] No client timeouts observed (or observed and handled gracefully)
- [ ] Latency returns to normal after experiment stops
- [ ] Metrics show latency increase: `http_request_duration_seconds_p99` increases

### Rollback

```bash
curl -X POST http://localhost:3001/chaos/experiments/api-latency/stop
```

---

## Experiment 2: Network Latency

**ID:** `network-latency`

**Purpose:** Simulate network partition affecting EventBus and webhook delivery.

### Start

```bash
curl -X POST http://localhost:3001/chaos/experiments/network-latency/start \
  -H "Content-Type: application/json" \
  -d '{"minDelayMs": 1000, "maxDelayMs": 3000, "durationMs": 60000}'
```

### Expected Behavior

- Webhook deliveries delayed by 1-3 seconds
- EventBus message processing slower
- DLQ depth may increase if messages retry
- No immediate client impact (async operations)

### Success Criteria

- [ ] Webhooks eventually deliver (possibly delayed)
- [ ] DLQ handles retries correctly
- [ ] No message loss (DLQ captures failures)
- [ ] System recovers when latency stops

### Rollback

```bash
curl -X POST http://localhost:3001/chaos/experiments/network-latency/stop
```

---

## Experiment 3: Redis Failure

**ID:** `redis-failure`

**Purpose:** Verify rate limiter falls back to in-memory mode correctly.

### Start

```bash
curl -X POST http://localhost:3001/chaos/experiments/redis-failure/start \
  -H "Content-Type: application/json" \
  -d '{"durationMs": 60000}'
```

### Expected Behavior

- Production-like rate-limited requests fail closed while Redis is unavailable
- `app_rate_limiter_mode{mode="fail-closed"}` becomes active
- No per-instance fallback is promoted
- Recovery returns the mode to `redis` only after shared-backend health returns

### Success Criteria

- [ ] `app_rate_limiter_mode{mode="fail-closed"}` is observable
- [ ] Rate-limited requests are rejected without updating `last_used_at`
- [ ] No local process counter admits traffic during the outage
- [ ] Mode returns to `redis` only after recovery verification

### Rollback

```bash
curl -X POST http://localhost:3001/chaos/experiments/redis-failure/stop
```

### Observations to Record

- Any increase in database load
- Any anomalous traffic patterns
- Time to detect fallback activation

---

## Experiment 4: Worker Failure

**ID:** `worker-failure`

**Purpose:** Verify worker job failures are captured by DLQ.

### Start

```bash
curl -X POST http://localhost:3001/chaos/experiments/worker-failure/start \
  -H "Content-Type: application/json" \
  -d '{"faultDelayMs": 1000, "probability": 0.3, "durationMs": 60000}'
```

### Expected Behavior

- Some worker jobs fail intermittently
- DLQ depth increases as failed jobs are captured
- EventBus retries work correctly
- No data loss (DLQ preserves messages)

### Success Criteria

- [ ] DLQ captures failed jobs
- [ ] Jobs replay correctly after recovery
- [ ] DLQ depth returns to normal after experiment
- [ ] No orphan jobs or lost work

### Rollback

```bash
curl -X POST http://localhost:3001/chaos/experiments/worker-failure/stop
```

---

## Experiment 5: Database Failure

**ID:** `database-failure`

**Purpose:** Validate fail-closed database-unavailability detection and recovery without accepting non-durable writes.

**WARNING:** This is the highest-risk experiment. Ensure all other experiments are complete first.

### Start

```bash
curl -X POST http://localhost:3001/chaos/experiments/database-failure/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHAOS_ADMIN_TOKEN" \
  -d '{"durationMs": 60000}'
```

### Expected Behavior

- `persistenceMode` becomes `unavailable`
- `app_persistence_mode{mode="unavailable"}` = 1
- `/health` returns `200` with `ok=false`; `/ready` returns `503`
- Clinical and financial writes are rejected before route execution; they are never acknowledged as in-memory writes
- The API does not claim recovery until PostgreSQL health and readiness are freshly verified

### Success Criteria

- [ ] `app_persistence_mode{mode="unavailable"}` is visible
- [ ] `/health` exposes `ok=false` and `/ready` exposes `503`
- [ ] No clinical or financial write is accepted outside the database boundary
- [ ] Recovery is confirmed through fresh PostgreSQL health and readiness checks

### Observations to Record

- How quickly was the unavailable state detected?
- What was the error rate during containment?
- Any specific features that failed completely?
- Time to recovery after experiment ends

### Rollback

```bash
curl -X POST http://localhost:3001/chaos/experiments/database-failure/stop \
  -H "Authorization: Bearer $CHAOS_ADMIN_TOKEN"
```

In `production`, `prod`, `staging` and `stage`, chaos start/stop mutations are
disabled. Run this experiment only in an explicitly authorized local/test
game-day runtime; the endpoint must not be used against a production-like
target.

### Post-Experiment Recovery Audit

After stopping the database failure experiment, verify durable recovery before
resuming writes:

```bash
# Verify /ready is 200 and persistenceMode is database
# Verify a read-only health check and a controlled durable transaction
# Reconcile any pending durable delivery through its own runbook
```

---

## Cleanup Procedure

After all experiments complete:

### 1. Stop All Active Experiments

```bash
# Stop any experiments still running
for exp in api-latency network-latency redis-failure worker-failure database-failure; do
  curl -X POST http://localhost:3001/chaos/experiments/$exp/stop
done

# Verify no experiments active
curl http://localhost:3001/chaos/experiments | jq '.experiments[].active | any'
# Should return: false
```

### 2. Verify System Health

```bash
# Check all experiments are stopped
curl http://localhost:3001/chaos/experiments

# Verify metrics return to baseline
# - API P99 Latency
# - Error Rate
# - Database healthy
# - Redis healthy

# Run smoke tests
curl http://localhost:3001/health
curl http://localhost:3001/ready
```

### 3. Restore Normal Operations

```bash
# If any feature flags were changed, restore them
# If maintenance mode was enabled, disable it
# Notify team that game day is complete
```

---

## Post-Game Report Template

```markdown
# Game Day Report - CVG HIS

**Date:** YYYY-MM-DD
**Environment:** Staging
**Conducted by:** [Names]
**Duration:** X hours

## Executive Summary

[2-3 sentences on overall outcome]

## Experiments Conducted

| Experiment        | Duration | Outcome                        | Issues Found  |
| ----------------- | -------- | ------------------------------ | ------------- |
| API Latency Spike | mm:ss    | ✅ Pass / ⚠️ Warning / ❌ Fail | [Description] |
| Network Latency   | mm:ss    | ✅ Pass / ⚠️ Warning / ❌ Fail | [Description] |
| Redis Failure     | mm:ss    | ✅ Pass / ⚠️ Warning / ❌ Fail | [Description] |
| Worker Failure    | mm:ss    | ✅ Pass / ⚠️ Warning / ❌ Fail | [Description] |
| Database Failure  | mm:ss    | ✅ Pass / ⚠️ Warning / ❌ Fail | [Description] |

## Findings

### What Worked Well

1. [Observation]
2. [Observation]

### Issues Discovered

1. **[Severity]** [Issue description]
   - **Impact:** [What was affected]
   - **Root Cause:** [If identified]
   - **Fix:** [Recommendation]

### Surprises

1. [Unexpected behavior that needs follow-up]

## Metrics Comparison

| Metric          | Pre-Game | Post-Game | Delta           |
| --------------- | -------- | --------- | --------------- |
| API P99 Latency | xxx ms   | xxx ms    | +xx% / -xx%     |
| Error Rate      | x.x%     | x.x%      | +x.xpp / -x.xpp |
| [Other metric]  | xxx      | xxx       | +/-xxx          |

## Action Items

| Priority | Action         | Owner | Due Date   |
| -------- | -------------- | ----- | ---------- |
| P1       | [Critical fix] | @name | YYYY-MM-DD |
| P2       | [Improvement]  | @name | YYYY-MM-DD |
| P3       | [Nice to have] | @name | YYYY-MM-DD |

## Recommendations

1. **[Change/improvement recommendation]**
2. **[Process update]**
3. **[Runbook update]**

## Sign-Off

| Role                | Name | Date |
| ------------------- | ---- | ---- |
| Primary Conductor   |      |      |
| SRE Lead            |      |      |
| Engineering Manager |      |      |

## Next Game Day

**Recommended date:** [Quarterly target]
**Focus areas:** [Based on findings from this session]
```

---

## Useful Commands Reference

```bash
# List all chaos experiments
curl http://localhost:3001/chaos/experiments

# Start an experiment
curl -X POST http://localhost:3001/chaos/experiments/<id>/start \
  -H "Content-Type: application/json" \
  -d '{"durationMs": 60000}'

# Stop an experiment
curl -X POST http://localhost:3001/chaos/experiments/<id>/stop

# View chaos metrics
curl http://localhost:3001/metrics | grep "^chaos_"

# View all active experiments
curl http://localhost:3001/chaos/experiments | jq '.experiments[] | select(.active == true)'

# Stop ALL experiments (emergency)
for exp in api-latency network-latency redis-failure worker-failure database-failure; do
  curl -X POST http://localhost:3001/chaos/experiments/$exp/stop
done
```

---

## Related Documents

- [Incident Response Runbook](../../packages/chaos/src/runbooks/incident-response.md)
- [Database Failure Runbook](../../packages/chaos/src/runbooks/database-failure-runbook.md)
- [Redis Failure Runbook](../../packages/chaos/src/runbooks/redis-failure-runbook.md)
- [API Failure Runbook](../../packages/chaos/src/runbooks/api-failure-runbook.md)
- [Roadmap vigente do produto](../2026-07-11-relatorio-auditoria-produto-ux-paridade-vetus.md)
