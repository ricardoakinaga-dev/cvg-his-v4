# Redis Failure Runbook

## Scenario

Redis becomes unavailable, causing the rate limiter to fall back to in-memory mode and potentially affecting other cache-dependent features.

**Related Experiments:**
- `redis-failure` — Chaos experiment that simulates Redis unavailability

**Metrics to Monitor:**
- `chaos_experiment_active{experiment="redis-failure"}` — Experiment running
- `app_redis_healthy` — Redis health status
- `app_rate_limiter_mode{mode="in-memory-fallback"}` — Rate limiter fallback gauge

---

## Symptoms

- Rate limiter falls back to in-memory mode
- `app_rate_limiter_mode{mode="in-memory-fallback"}` switches to 1
- Rate limiting may be less effective (in-memory limits are per-instance)
- Cache misses increase (if cache is Redis-backed)
- Possible increased database load due to cache misses

---

## Detection

### Automatic Alerts
- PagerDuty alert: `RedisFallback = true` for > 1 minute
- Grafana dashboard: `grafana.internal/d/redis-overview` shows Redis down

### Manual Verification
```bash
# Check Redis health
curl http://localhost:3001/metrics | grep -E "app_redis_healthy|app_rate_limiter_mode"

# Check effective chaos/runtime state
curl http://localhost:3001/chaos/experiments | jq '.runtimeState'

# View Redis connection metrics
redis-cli ping  # Should return PONG if healthy
```

---

## Immediate Actions (First 5 Minutes)

### 1. Verify it's not a planned chaos experiment

```bash
# Check if a chaos experiment is intentionally running
curl http://localhost:3001/chaos/experiments | jq '.runtimeState, (.experiments[] | select(.id == "redis-failure"))'

# If intentional chaos experiment and NOT part of game day:
# Stop it immediately
curl -X POST http://localhost:3001/chaos/experiments/redis-failure/stop
```

### 2. Check Redis connectivity

```bash
# Try connecting to Redis
redis-cli ping
# Expected: PONG

# Check Redis logs
kubectl logs -n cache -l app=redis --tail=100

# View connection errors
redis-cli client list | grep -i error
```

### 3. Identify the root cause

| Symptom | Likely Cause | Next Step |
|---------|--------------|-----------|
| Connection refused | Redis pod down / Firewall | Check pod status, restart if needed |
| Connection timeout | Network partition | Check network policies, verify DNS |
| Out of memory | Redis memory limit exceeded | Check memory usage, adjust maxmemory |
| Authentication failure | Credential rotation | Verify REDIS_URL secret |
| Cluster node failure | Redis Cluster issue | Check cluster health, failover if needed |

---

## Mitigation Strategies

### Strategy A: Redis Recovers Automatically
If Redis issue is transient:
1. Monitor `app_rate_limiter_mode` - should return from `in-memory-fallback` to `redis`
2. Rate limiter automatically switches back when Redis responds
3. In-memory state is discarded, fresh state loaded from Redis

### Strategy B: Redis Requires Restart

**Option 1: Restart Redis Pod**
```bash
# Find Redis pod
kubectl get pods -n cache | grep redis

# Restart the pod
kubectl delete pod redis-0 -n cache
# (StatefulSet will reschedule with persistence)
```

**Option 2: Redis Cluster Failover**
```bash
# Check cluster health
redis-cli cluster info

# If a master is down, promote replica
redis-cli cluster failover FORCE
```

### Strategy C: Extended Outage (> 10 minutes)

1. **Monitor Database Load**: In-memory rate limiting may increase DB load
   ```bash
   # Watch database connections
   # If connection pool approaches limit, consider scaling down workers
   kubectl scale deployment/cvghis-worker -n production --replicas=1
   ```

2. **Rate Limiting Impact Assessment**:
   - In-memory rate limits are per-process, not global
   - Multi-instance deployments will have separate limits per instance
   - Abuse detection may be less effective

3. **Consider Temporary Measures**:
   - Block high-risk endpoints if abuse increases
   - Enable stricter global rate limits at API gateway level

---

## In-Memory Rate Limiter Behavior

When `app_rate_limiter_mode{mode="in-memory-fallback"} = 1`:

| Aspect | Normal (Redis) | Fallback (In-Memory) |
|--------|---------------|---------------------|
| Limit scope | Global across all instances | Per-instance only |
| Limit accuracy | Exact | Approximate (sliding window) |
| State after restart | Preserved | Lost (starts fresh) |
| Distributed attack protection | Yes | No (per-instance limits) |
| Performance impact | Low | Minimal |

**Risk**: In a multi-instance deployment, an attacker could get `N` times the normal rate limit where `N` is the number of instances.

---

## Recovery Verification

1. **Redis Health Restored**
   ```bash
   redis-cli ping
   # Expected: PONG

   curl http://localhost:3001/metrics | grep -E "app_redis_healthy|app_rate_limiter_mode"
   # Expected: app_redis_healthy 1 and app_rate_limiter_mode{mode="redis"} 1
   ```

2. **Rate Limiter Switches Back**
   ```bash
   curl http://localhost:3001/chaos/experiments | jq '.runtimeState'
   ```

3. **Monitor for 5 Minutes**:
   - Error rate should be normal
   - No spike in rate limiter activity

---

## Impact by Feature

| Feature | Impact During Redis Outage | Mitigation |
|---------|---------------------------|------------|
| Rate Limiting | Reduced effectiveness | Monitor for abuse patterns |
| Session Cache | Cache misses, re-auth required | Users may need to re-login |
| Job Queue | Workers may reconnect repeatedly | Workers handle gracefully |
| Feature Flags | Fall back to defaults | Some features may behave differently |

---

## Post-Incident Actions

1. **Analyze Root Cause**
   ```bash
   # Review Redis memory usage before failure
   redis-cli info memory

   # Review recent Redis config changes
   # Check for large keys causing memory pressure
   redis-cli --bigkeys
   ```

2. **Assess Abuse Risk**
   - Review logs for suspicious patterns during fallback
   - Check if rate limits were circumvented
   - Consider adding anomaly detection for future incidents

3. **Update Monitoring**
   - Add alert for `app_rate_limiter_mode{mode="in-memory-fallback"} == 1`
   - Consider adding Redis memory usage alert before OOM

4. **Capacity Planning**
   - If Redis was overwhelmed by load, consider:
     - Increasing Redis memory
     - Adding read replicas
     - Implementing cache warming strategies

---

## Related Documents

- [Incident Response Runbook](./incident-response.md)
- [Database Failure Runbook](./database-failure-runbook.md)
- [API Failure Runbook](./api-failure-runbook.md)
- [Rate Limiter Architecture](../docs/rate-limiter-architecture.md) (if exists)
