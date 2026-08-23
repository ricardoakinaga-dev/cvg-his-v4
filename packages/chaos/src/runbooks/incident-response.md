# Incident Response Runbook

## Overview

This runbook covers the general incident response process for CVG HIS production incidents. For specific failure scenarios, refer to the dedicated runbooks:
- [Database Failure Runbook](./database-failure-runbook.md)
- [Redis Failure Runbook](./redis-failure-runbook.md)
- [API Failure Runbook](./api-failure-runbook.md)

---

## Severity Levels

| Severity | Definition | Response Time | Example |
|----------|------------|---------------|---------|
| SEV-1 | Complete service outage affecting all users | 15 minutes | API down, database unreachable |
| SEV-2 | Major feature unavailable, >50% users affected | 30 minutes | Authentication failing, payments broken |
| SEV-3 | Degraded performance, partial outage | 2 hours | Slow API responses, intermittent errors |
| SEV-4 | Minor issue, single user impacted | Next business day | Non-critical bug, cosmetic issue |

---

## Incident Response Phases

### 1. Detection & Alerting

**Who:** On-call engineer, monitoring system

**Steps:**
1. Alert received via PagerDuty/Slack `#incidents` channel
2. Verify the alert is not a false positive (check metrics dashboard)
3. Confirm impact using Grafana dashboards:
   - `http_request_duration_seconds_p99` — API latency
   - `chaos_experiment_active` — active chaos experiments
   - `app_persistence_mode` — in-memory vs database mode
   - `app_rate_limiter_mode` — Redis rate limiter backend / fail-closed state

4. Confirm effective runtime state directly:
   ```bash
   curl -s http://localhost:3001/chaos/experiments | jq '.runtimeState'
   ```

**Key Dashboards:**
- Grafana: `grafana.internal/d/api-overview` — API health
- Grafana: `grafana.internal/d/database-overview` — PostgreSQL health
- Grafana: `grafana.internal/d/redis-overview` — Redis health

### 2. Triage

**Who:** Primary on-call engineer

**Steps:**
1. Acknowledge the incident in PagerDuty
2. Join `#incidents` Slack channel and post:
   ```
   :alert: Incident declared - [brief description]
   Primary: @yourname
   Impact: [who/what is affected]
   ```
3. Identify affected components using the metrics above
4. Determine severity level (see table above)
5. For SEV-1/SEV-2: Page secondary on-call immediately

**Triage Questions:**
- Is this a planned maintenance window? (check `#releases` channel)
- Is this related to a recent deployment? (check git history)
- Are chaos experiments active? (check `chaos_experiment_active` metric)
- Is the database reachable? (check `app_database_healthy` metric)
- Is Redis reachable? (check `app_redis_healthy` and `app_rate_limiter_mode`)

### 3. Escalation

**Escalation Path:**
```
SEV-4 → Team lead (optional)
SEV-3 → Team lead + On-call
SEV-2 → Engineering Manager + VP Engineering + On-call
SEV-1 → CTO + Engineering Manager + VP Engineering + All available engineers
```

**Escalation Criteria:**
- Initial response SLA breached
- Incident scope expanding
- Root cause unknown after 30 minutes
- Resolution requires cross-team coordination

### 4. Mitigation

**Who:** Primary on-call with team support

**Immediate Actions (first 15 minutes):**
1. If chaos experiment is active and unintended:
   ```bash
   # Stop the chaos experiment immediately
   curl -X POST http://localhost:3001/chaos/experiments/<experiment-id>/stop
   ```
2. Check for recent deployments and consider rollback if correlated
   ```bash
   # Check recent deployments
   git log --oneline -20

   # Rollback to previous version (if deployment is the cause)
   helm rollback cvghis-api -n production
   ```
3. Enable maintenance mode if service is unstable
   ```bash
   # Enable maintenance mode via feature flag
   # Contact platform team to enable maintenance page
   ```

4. For database issues: Check connection pool exhaustion
   ```bash
   # View database connection metrics
   # Check pg_stat_activity for blocked queries
   ```

5. For Redis issues: Verify the rate limiter is fail-closed
   ```bash
   # Check if app_rate_limiter_mode moved to fail-closed
   curl -s http://localhost:3001/chaos/experiments | jq '.runtimeState'
   ```

### 5. Communication

**Stakeholder Communication:**

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| Internal engineers | `#incidents` | Every 15 min | Status updates, actions taken |
| Engineering leadership | Slack DM | Every 30 min | Brief status summary |
| All-hands | StatusPage | Every 60 min | Public status update |
| Customers | StatusPage | At resolution | Detailed post-mortem |

**Status Update Template:**
```
[HH:MM UTC] Status Update #N
Impact: [specific user/system impact]
Current Actions: [what we're doing right now]
Next Update: [time]
ETA for Resolution: [if known]
```

### 6. Resolution & Recovery

**Steps:**
1. Verify metrics return to normal:
   - Error rate < 1%
   - Latency P99 < 2s
   - All health checks passing
2. Confirm no data loss or corruption
3. For database incidents: Run consistency checks
   ```bash
   # Verify data integrity
   # Replay any missed events from EventBus DLQ
   ```
4. Disable any temporary workarounds (maintenance mode, etc.)
5. Confirm stable for 15 minutes before declaring resolved

### 7. Post-Incident Review

**Within 48 hours:**
1. Create incident report document
2. Schedule post-mortem meeting (within 5 business days)
3. Identify root cause and contributing factors
4. Create action items with owners and deadlines
5. Update runbooks if gaps found

**Post-Mortem Template:**
```
# Incident Post-Mortem: [Incident Name]
Date: [YYYY-MM-DD]
Duration: [X hours Y minutes]
Severity: [SEV-X]

## Summary
[2-3 sentence overview]

## Impact
- Users affected: [number/percentage]
- Revenue impact: [if applicable]
- SLA impact: [if applicable]

## Root Cause
[Detailed explanation of what went wrong]

## Contributing Factors
1. [Factor 1]
2. [Factor 2]

## Detection Timeline
- [Time] - Alert triggered
- [Time] - Engineer acknowledged
- [Time] - Root cause identified
- [Time] - Mitigation applied
- [Time] - Service restored

## Action Items
| Item | Owner | Due Date |
|------|-------|----------|
| [Description] | @name | YYYY-MM-DD |
```

---

## Emergency Contacts

| Role | Contact | Backup |
|------|---------|--------|
| On-call Primary | PagerDuty | PagerDuty escalation |
| Engineering Manager | [DM in Slack] | [Phone] |
| VP Engineering | [DM in Slack] | [Phone] |
| CTO | [Phone] | N/A |
| Database Admin | [Phone] | [Phone] |
| Platform/Infrastructure | [Phone] | [Phone] |

---

## Useful Commands

```bash
# Check chaos experiment status
curl http://localhost:3001/chaos/experiments

# Inspect effective runtime state
curl http://localhost:3001/chaos/experiments | jq '.runtimeState'

# List active chaos experiments
curl http://localhost:3001/chaos/experiments | jq '.experiments[] | select(.active == true)'

# View recent logs
kubectl logs -n production -l app=cvghis-api --tail=100 | grep -i error

# Check database health
curl http://localhost:3001/health | jq '.database'

# View Prometheus metrics
curl http://localhost:3001/metrics | grep -E "^chaos_|^app_"

# Force stop all chaos experiments
for exp in database-failure redis-failure network-latency worker-failure api-latency; do
  curl -X POST http://localhost:3001/chaos/experiments/$exp/stop
done
```
