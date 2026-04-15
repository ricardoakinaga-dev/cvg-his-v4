# API Failure Runbook

## Scenario

The API experiences severe latency degradation or partial failure, affecting client applications' ability to communicate with the system.

**Related Experiments:**
- `api-latency` — Chaos experiment that injects extra HTTP response latency
- `network-latency` — Chaos experiment that injects delays in async operations

**Metrics to Monitor:**
- `chaos_experiment_active{experiment="api-latency"}` — API latency experiment running
- `chaos_experiment_active{experiment="network-latency"}` — Network latency experiment running
- `http_request_duration_seconds_p99` — API latency P99
- `http_requests_total{status="5xx"}` — 5xx error count
- `app_active_requests` — Currently active requests

---

## Symptoms

- Client applications experiencing timeouts
- `http_request_duration_seconds_p99` elevated significantly
- `http_requests_total{status="504"}` increasing (Gateway Timeout)
- Clients reporting "Service Unavailable" or "Request Timeout"
- Health checks may still pass (liveness) while service is degraded (readiness fails)

---

## Detection

### Automatic Alerts
- PagerDuty alert: `APILatencyP99 > 10s` for > 2 minutes
- PagerDuty alert: `API5xxErrorRate > 5%` for > 1 minute
- Grafana dashboard: `grafana.internal/d/api-overview` shows latency spike

### Manual Verification
```bash
# Check API latency metrics
curl http://localhost:3001/metrics | grep "http_request_duration"

# Check for 5xx errors
curl http://localhost:3001/metrics | grep "http_requests_total" | grep "5xx"

# View recent error logs
kubectl logs -n production -l app=cvghis-api --tail=200 | grep -i "timeout\|error\|500"

# Test API responsiveness manually
time curl -w "\n" http://localhost:3001/health
```

---

## Immediate Actions (First 5 Minutes)

### 1. Check for Active Chaos Experiments

```bash
# Check if latency experiment is intentionally running
curl http://localhost:3001/chaos/experiments | jq '.runtimeState'
curl http://localhost:3001/chaos/experiments | jq '.experiments[] | select(.id == "api-latency" and .active == true)'
curl http://localhost:3001/chaos/experiments | jq '.experiments[] | select(.id == "network-latency" and .active == true)'

# If intentional and NOT part of game day, stop immediately
curl -X POST http://localhost:3001/chaos/experiments/api-latency/stop
curl -X POST http://localhost:3001/chaos/experiments/network-latency/stop
```

### 2. Distinguish Between Latency and Outage

```bash
# Test various endpoints with timing
echo "Testing /health:" && time curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health
echo "Testing /ready:" && time curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ready
echo "Testing /metrics:" && time curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/metrics
```

| Test | Possible Cause |
|------|----------------|
| /health slow but responds | API handler issue |
| /ready times out | Database or Redis blocking |
| /metrics times out | System-wide resource exhaustion |
| All endpoints timeout | Network or infrastructure issue |

### 3. Identify Root Cause

**Check Resource Utilization:**
```bash
# CPU and memory
kubectl top pods -n production -l app=cvghis-api

# Check for OOM kills
kubectl get events -n production | grep -i "oom\|evicted"

# Disk space
kubectl exec -it cvghis-api-xxx -n production -- df -h
```

**Check Database Connection Pool:**
```bash
# If using pg_stat_activity, check via admin pod
kubectl exec -it cvghis-api-xxx -n production -- psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

**Check EventBus Backpressure:**
```bash
# Check if worker queue is backing up
kubectl get pods -n production | grep worker
kubectl logs -n production -l app=cvghis-worker --tail=100 | grep -i "queue\|backlog\|retry"
```

---

## Latency Scenarios

### Scenario A: Garbage Collection Pauses

**Symptoms:** Intermittent long pauses, latency spikes on specific endpoints

**Verification:**
```bash
# Check for GC pauses in application logs
kubectl logs -n production -l app=cvghis-api --tail=500 | grep -i "gc\|pause\|heap"
```

**Mitigation:**
1. Force GC if running with heap issues (not recommended in production)
2. Restart affected pods to get fresh heap
   ```bash
   kubectl rollout restart deployment/cvghis-api -n production
   ```
3. Review memory usage patterns

### Scenario B: Database Query Slowdown

**Symptoms:** All endpoints slow, especially data-heavy ones

**Verification:**
```bash
# Check for slow queries
kubectl exec -it cvghis-api-xxx -n production -- psql $DATABASE_URL -c \
  "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 seconds';"
```

**Mitigation:**
1. Kill long-running queries if safe
2. Check for missing indexes on frequently queried tables
3. Consider connection pool exhaustion - restart API pods to reset connections

### Scenario C: External Dependency Timeout

**Symptoms:** Endpoints calling external services (webhooks, payment gateway) slow

**Verification:**
```bash
# Check for external service timeouts in logs
kubectl logs -n production -l app=cvghis-api --tail=500 | grep -i "timeout\|webhook\|payment\|external"
```

**Mitigation:**
1. Enable circuit breaker if not already (check feature flags)
2. Reduce timeout values temporarily via feature flag
3. Disable non-critical external integrations

### Scenario D: Connection Pool Exhaustion

**Symptoms:** Service suddenly stops responding, health checks pass

```bash
# Check database connections
kubectl exec -it cvghis-api-xxx -n production -- psql $DATABASE_URL -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Mitigation:**
```bash
# Restart API pods to release connections
kubectl rollout restart deployment/cvghis-api -n production
```

---

## Extended Outage (> 10 minutes)

1. **Enable Maintenance Mode**
   ```bash
   # Contact platform team to enable maintenance page
   # This prevents client retry storms
   ```

2. **Scale Strategy**
   ```bash
   # If resource-constrained, scale up API pods
   kubectl scale deployment/cvghis-api -n production --replicas=5

   # If database-bound, scale up workers (they add DB load)
   # Better to scale down workers
   kubectl scale deployment/cvghis-worker -n production --replicas=1
   ```

3. **Communicate Status**
   - Post to StatusPage about degraded performance
   - Provide ETA for resolution if known

---

## Recovery Verification

1. **Latency Returns to Normal**
   ```bash
   # P99 latency should be < 2s
   curl http://localhost:3001/metrics | grep "http_request_duration_seconds" | grep "quantile=\"0.99\""
   ```

2. **Error Rate Returns to Normal**
   ```bash
   # 5xx rate should be < 1%
   curl http://localhost:3001/metrics | grep "http_requests_total" | grep "5xx"
   ```

3. **All Endpoints Respond Quickly**
   ```bash
   # Test critical endpoints
   for endpoint in /health /ready /metrics; do
     echo -n "$endpoint: "
     time curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001$endpoint
   done
   ```

4. **Monitor for 10-15 Minutes**
   - Latency could spike again if root cause not fully resolved
   - Watch for correlation with normal traffic patterns

---

## Post-Incident Actions

1. **Identify Bottleneck**
   - Review which resource was the constraint (CPU, memory, connections, external)
   - Check if traffic spike or code change caused the issue

2. **Performance Review**
   ```bash
   # View slow request logs if enabled
   # Check for N+1 queries or inefficient data access patterns

   # Review recent code changes that might affect performance
   git log --oneline --since="6 hours ago"
   ```

3. **Capacity Planning**
   - If near resource limits, plan for horizontal scaling
   - Consider adding auto-scaling rules for production

4. **Update Monitoring**
   - Add latency P50/P95/P99 alerts if not present
   - Consider adding alerts for specific endpoint latency thresholds

---

## Prevention Recommendations

1. **Chaos Engineering**: Run latency experiments regularly via Game Days
2. **Load Testing**: Run load tests before major releases
3. **Auto-scaling**: Configure HPA (Horizontal Pod Autoscaler) for API pods
4. **Circuit Breakers**: Ensure all external calls use circuit breakers
5. **Connection Pool Tuning**: Right-size connection pools based on load tests

---

## Related Documents

- [Incident Response Runbook](./incident-response.md)
- [Database Failure Runbook](./database-failure-runbook.md)
- [Redis Failure Runbook](./redis-failure-runbook.md)
- [Game Day Procedure](../docs/game-day/README.md)
