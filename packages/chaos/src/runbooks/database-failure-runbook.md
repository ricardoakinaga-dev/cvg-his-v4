# Database Failure Runbook

## Scenario

PostgreSQL database becomes unavailable or experiences severe degradation, causing the API to switch to in-memory fallback mode.

**Related Experiments:**
- `database-failure` — Chaos experiment that simulates this scenario

**Metrics to Monitor:**
- `chaos_experiment_active{experiment="database-failure"}` — Experiment running
- `app_database_healthy` — Database health status (0 = unhealthy)
- `app_persistence_mode{mode="in-memory"}` — 1 when in fallback mode
- `pg_stat_activity` — Connection pool status
- `postgresql_errors_total` — Database error count

---

## Symptoms

- API requests returning 500 or timeout errors
- `app_database_healthy` metric shows 0
- `app_persistence_mode{mode="in-memory"}` switches to 1
- EventBus DLQ (Dead Letter Queue) depth increasing
- Webhook delivery failures

---

## Detection

### Automatic Alerts
- PagerDuty alert: `DatabaseHealthy = false` for > 30 seconds
- Grafana dashboard: `grafana.internal/d/database-overview` shows red

### Manual Verification
```bash
# Check database health endpoint
curl http://localhost:3001/ready | jq '.database'

# Check effective chaos/runtime state
curl http://localhost:3001/chaos/experiments | jq '.runtimeState'

# View database-related metrics
curl http://localhost:3001/metrics | grep -E "database|persistence"

# Check if in-memory mode is active
curl http://localhost:3001/metrics | grep "app_persistence_mode"
```

---

## Immediate Actions (First 5 Minutes)

### 1. Verify it's not a planned chaos experiment

```bash
# Check if a chaos experiment is intentionally running
curl http://localhost:3001/chaos/experiments | jq '.runtimeState, (.experiments[] | select(.id == "database-failure"))'

# If intentional chaos experiment and NOT part of game day:
# Stop it immediately
curl -X POST http://localhost:3001/chaos/experiments/database-failure/stop
```

### 2. Check database connectivity

```bash
# Try connecting to database directly
psql $DATABASE_URL -c "SELECT 1;"

# Check recent database errors
kubectl logs -n production -l app=cvghis-api --tail=500 | grep -i "database\|postgres\|connection"

# View connection pool status
# (check pg_stat_activity via admin access)
```

### 3. Identify the root cause

| Symptom | Likely Cause | Next Step |
|---------|--------------|-----------|
| Connection timeout | Network partition / Firewall | Check network policies, verify DNS |
| Authentication failure | Credential rotation / config mismatch | Check secret version, verify DATABASE_URL |
| Connection pool exhausted | Query performance / Too many connections | Kill idle connections, optimize long queries |
| Disk full | Write-heavy operation / Bad query | Check disk space, identify large tables |
| Replication lag | replica lag > 30s | Promote new primary if primary is read-only |

---

## Mitigation Strategies

### Strategy A: Database Recovers Automatically
If the database issue is transient (e.g., brief network blip, OOM kill that restarted):
1. Monitor `app_database_healthy` metric
2. Wait for PostgreSQL to become healthy again
3. System will automatically switch back from in-memory mode
4. Verify `app_persistence_mode` returns to `database`

### Strategy B: Database Requires Intervention

**Option 1: Restart Database Pod (if using Kubernetes)**
```bash
# Find the database pod
kubectl get pods -n database | grep postgresql

# If connection pool issue, try restarting the API first to release connections
kubectl rollout restart deployment/cvghis-api -n production

# If that doesn't help, restart the database (last resort)
kubectl delete pod postgresql-0 -n database
```

**Option 2: Reduce Load to Let Database Recover**
```bash
# Enable maintenance mode to reduce write load
# Contact platform team

# Or scale down non-critical consumers
kubectl scale deployment/cvghis-worker -n production --replicas=1
```

**Option 3: Failover to Read Replica**
```bash
# If primary is down but replica is healthy
# Update DATABASE_URL to point to replica
# (requires platform team involvement)
```

### Strategy C: Extended Outage (Database Unavailable > 10 minutes)

1. **Activate Crisis Mode**: Follow [Incident Response Runbook](./incident-response.md) escalation path
2. **Enable Full Maintenance Mode**: Block all write operations
3. **Communicate Status**: Post to StatusPage about extended outage
4. **Plan for Data Recovery**: Work with DBA on recovery strategy

---

## In-Memory Mode Behavior

When `app_persistence_mode = in-memory`:

| Feature | Behavior |
|---------|----------|
| Patient records | Read from cache/memory (stale data possible) |
| New encounters | Created in memory, will be lost on restart |
| Prescriptions | Can be read, new ones created in memory |
| Billing | Queued for later processing |
| Webhooks | DLQ increased, will retry when DB recovers |
| EventBus events | Buffered in memory, may be lost on restart |

**Data Loss Risk**: Any writes made during in-memory mode will be lost when the system recovers and restarts with database persistence.

---

## Recovery Verification

1. **Database Health Restored**
   ```bash
   curl http://localhost:3001/ready | jq '.database'
   # Expected: {"status": "ok"}
   ```

2. **System Switched Back to Database Mode**
   ```bash
   curl http://localhost:3001/metrics | grep "app_persistence_mode"
   # Expected: app_persistence_mode{mode="database"} 1
   ```

3. **No Error Spike on Recovery**
   ```bash
   # Monitor for 5 minutes after recovery
   # Error rate should return to < 1%
   ```

4. **Replay EventBus DLQ (if events were queued)**
   ```bash
   # Check DLQ depth
   # Events should auto-retry once database is healthy

   # If manual replay needed (consult with team):
   # Replay events from DLQ
   ```

---

## Post-Incident Actions

1. **Data Audit**: Check if any data was lost during in-memory mode
   ```bash
   # Compare encounter counts before/after incident
   # Identify any orphaned records that need cleanup
   ```

2. **Performance Review**: Analyze what caused the database issue
   ```bash
   # Check slow query log
   # Review connection pool usage patterns
   # Identify long-running transactions
   ```

3. **Update Monitoring**: Add alerts if this incident revealed gaps
   - Consider adding alert for `app_persistence_mode` transitions
   - Consider alerting on EventBus DLQ depth > threshold

4. **Runbook Update**: If gaps found in this runbook, update accordingly

---

## Related Documents

- [Incident Response Runbook](./incident-response.md)
- [Redis Failure Runbook](./redis-failure-runbook.md)
- [API Failure Runbook](./api-failure-runbook.md)
- [Database Architecture](../docs/database-architecture.md) (if exists)
