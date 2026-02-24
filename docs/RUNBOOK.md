# CVG-HIS Operational Runbook

> **Last Updated:** 2026-02-21
> **Version:** 1.0.0

This runbook provides operational procedures for diagnosing and resolving issues in the CVG-HIS system.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Health Endpoints](#health-endpoints)
3. [Common Issues](#common-issues)
4. [Incident Response](#incident-response)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Recovery Procedures](#recovery-procedures)

---

## Quick Reference

### Service Ports

| Service | Default Port | Health Endpoint |
|---------|-------------|-----------------|
| his-api | 3000 | `/health` |
| his-web | 3001 | `/api/health` |
| his-worker | 3100 | `/health` |

### Key Commands

```bash
# Check all services health
curl -s http://localhost:3000/health | jq
curl -s http://localhost:3100/health | jq

# Check Redis connectivity
redis-cli -u $REDIS_URL ping

# Check PostgreSQL connectivity
psql $DATABASE_URL -c "SELECT 1"

# View worker logs (Docker)
docker logs his-worker --tail 100 -f

# View queue status
redis-cli -u $REDIS_URL keys "bull:*"
```

---

## Health Endpoints

### his-api `/health`

Returns overall API health including database and Redis connectivity.

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600,
  "db": "ok",
  "redis": "ok"
}
```

**Status Codes:**
- `200` - Service is healthy
- `503` - Service is unhealthy (check `db` or `redis` fields)

### his-api `/health/db`

Isolated database health check.

### his-api `/health/redis`

Isolated Redis health check.

### his-worker `/health`

Returns worker health including cron job status.

```json
{
  "status": "ok",
  "uptime": 3600,
  "crons": {
    "medication-overdue-scan": {
      "lastRunAt": "2026-02-21T00:15:00.000Z",
      "lastSuccessAt": "2026-02-21T00:15:00.000Z",
      "lastFailureAt": null,
      "consecutiveFailures": 0,
      "lastError": null
    }
  },
  "queues": {},
  "checkedAt": "2026-02-21T00:20:00.000Z"
}
```

**Status Values:**
- `ok` - All crons running within expected intervals
- `degraded` - Some crons delayed or occasional failures
- `unhealthy` - Cron not running or too many consecutive failures

### his-worker `/health/live`

Liveness probe - confirms process is running.

### his-worker `/health/ready`

Readiness probe - confirms Redis connectivity.

---

## Common Issues

### 1. Queue Backlog / Jobs Not Processing

**Symptoms:**
- Medication overdue alerts not being generated
- Handover PDFs not building
- Protocol publish jobs stuck

**Diagnosis:**

```bash
# Check worker health
curl -s http://localhost:3100/health | jq '.crons'

# Check Redis queue lengths
redis-cli -u $REDIS_URL llen "bull:medication-overdue:wait"
redis-cli -u $REDIS_URL llen "bull:handover-build:wait"
redis-cli -u $REDIS_URL zcard "bull:medication-overdue:delayed"

# Check failed jobs
redis-cli -u $REDIS_URL zrange "bull:medication-overdue:failed" 0 -1

# Check worker process
docker ps | grep his-worker
docker logs his-worker --tail 50
```

**Actions:**

1. **Worker not running:**
   ```bash
   docker restart his-worker
   ```

2. **Jobs stuck in failed state:**
   ```bash
   # View failed job details
   redis-cli -u $REDIS_URL get "bull:medication-overdue:job:JOB_ID"
   
   # Option A: Retry via API (preferred)
   curl -X POST http://localhost:3000/admin/queues/retry \
     -H "Content-Type: application/json" \
     -d '{"queue": "medication-overdue", "jobId": "JOB_ID"}'
   
   # Option B: Clear failed jobs (use with caution)
   redis-cli -u $REDIS_URL del "bull:medication-overdue:failed"
   ```

3. **Queue backlog too large:**
   ```bash
   # Check if worker is processing
   docker logs his-worker --tail 100 | grep "job completed"
   
   # Scale workers if needed
   docker-compose up -d --scale his-worker=3
   ```

---

### 2. Redis Connection Failure

**Symptoms:**
- API returns `{"redis": "fail"}` on health check
- Worker logs show "ECONNREFUSED" or "NOAUTH"
- Queue operations timeout

**Diagnosis:**

```bash
# Test Redis connectivity
redis-cli -u $REDIS_URL ping

# Check Redis server status
redis-cli -u $REDIS_URL info server

# Check memory usage
redis-cli -u $REDIS_URL info memory

# Check connected clients
redis-cli -u $REDIS_URL client list
```

**Actions:**

1. **Redis not running:**
   ```bash
   # Docker
   docker restart redis
   
   # Systemd
   sudo systemctl restart redis
   ```

2. **Authentication failure:**
   ```bash
   # Verify REDIS_URL format
   echo $REDIS_URL
   # Should be: redis://:password@host:port/db
   
   # Test with correct credentials
   redis-cli -h HOST -p PORT -a PASSWORD ping
   ```

3. **Redis memory full:**
   ```bash
   # Check memory policy
   redis-cli -u $REDIS_URL config get maxmemory-policy
   
   # Set eviction policy (if appropriate)
   redis-cli -u $REDIS_URL config set maxmemory-policy allkeys-lru
   
   # Clear old queue data (use with caution)
   redis-cli -u $REDIS_URL --scan --pattern "bull:*:completed" | xargs redis-cli -u $REDIS_URL del
   ```

4. **Connection pool exhausted:**
   - Check for connection leaks in application logs
   - Restart affected services
   - Review `maxRetriesPerRequest` settings

---

### 3. Database Connection Failure

**Symptoms:**
- API returns `{"db": "fail"}` on health check
- Queries timeout
- "Connection refused" errors in logs

**Diagnosis:**

```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# Check for locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()))"
```

**Actions:**

1. **Database not running:**
   ```bash
   # Docker
   docker restart postgres
   
   # Systemd
   sudo systemctl restart postgresql
   ```

2. **Connection pool exhausted:**
   ```bash
   # Kill idle connections
   psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes'"
   
   # Restart API to reset pool
   docker restart his-api
   ```

3. **Database disk full:**
   ```bash
   # Check disk space
   df -h /var/lib/postgresql
   
   # Vacuum to reclaim space
   psql $DATABASE_URL -c "VACUUM FULL ANALYZE"
   ```

4. **Migration pending:**
   ```bash
   # Check migration status
   psql $DATABASE_URL -c "SELECT * FROM _migrations ORDER BY id DESC LIMIT 5"
   
   # Run migrations
   cd packages/db && pnpm migrate
   ```

---

### 4. Cron Job Not Running

**Symptoms:**
- Worker health shows `lastRunAt` is old
- Medication overdue scans not happening
- `consecutiveFailures > 0` in health check

**Diagnosis:**

```bash
# Check worker health
curl -s http://localhost:3100/health | jq '.crons'

# Check leader lock
redis-cli -u $REDIS_URL get "QUEUE_PREFIX:cron:medication-overdue-scan:leader:v1"

# Check worker logs for cron errors
docker logs his-worker 2>&1 | grep -i "cron"
```

**Actions:**

1. **Leader lock stuck:**
   ```bash
   # Check lock TTL
   redis-cli -u $REDIS_URL ttl "QUEUE_PREFIX:cron:medication-overdue-scan:leader:v1"
   
   # Force release lock (if worker crashed)
   redis-cli -u $REDIS_URL del "QUEUE_PREFIX:cron:medication-overdue-scan:leader:v1"
   ```

2. **Cron disabled:**
   ```bash
   # Check environment
   docker exec his-worker env | grep MEDICATION_OVERDUE_AUTO_SCAN
   
   # Should be "true" for production
   ```

3. **Cron interval too long:**
   ```bash
   # Check interval setting
   docker exec his-worker env | grep MEDICATION_OVERDUE_SCAN_INTERVAL_MS
   
   # Default is 60000 (60 seconds)
   ```

---

### 5. High Memory Usage

**Symptoms:**
- OOM kills in container logs
- Slow response times
- Container restarts frequently

**Diagnosis:**

```bash
# Check container memory
docker stats --no-stream his-api his-worker

# Check Node.js memory (if accessible)
docker exec his-api node -e "console.log(process.memoryUsage())"

# Check system memory
free -h
```

**Actions:**

1. **Increase container memory:**
   ```yaml
   # docker-compose.yml
   services:
     his-api:
       deploy:
         resources:
           limits:
             memory: 1G
   ```

2. **Set Node.js memory limit:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=768"
   ```

3. **Check for memory leaks:**
   ```bash
   # Generate heap snapshot
   docker exec his-api kill -USR2 1
   
   # Analyze with Chrome DevTools
   ```

---

### 6. Authentication/Session Issues

**Symptoms:**
- Users logged out unexpectedly
- "Session expired" errors
- Login fails silently

**Diagnosis:**

```bash
# Check Redis session keys
redis-cli -u $REDIS_URL keys "sess:*"

# Check session TTL
redis-cli -u $REDIS_URL ttl "sess:SESSION_ID"

# Check auth service logs
docker logs his-api 2>&1 | grep -i "auth\|session\|token"
```

**Actions:**

1. **Session store issue:**
   ```bash
   # Clear all sessions (will log out all users)
   redis-cli -u $REDIS_URL --scan --pattern "sess:*" | xargs redis-cli -u $REDIS_URL del
   ```

2. **JWT secret mismatch:**
   - Verify `JWT_SECRET` is same across all services
   - Check `JWT_EXPIRES_IN` setting

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 - Critical | System down, data loss risk | 15 minutes |
| P2 - High | Major feature broken | 1 hour |
| P3 - Medium | Feature degraded | 4 hours |
| P4 - Low | Minor issue, workaround exists | 24 hours |

### Incident Checklist

1. **Acknowledge** - Confirm incident is being investigated
2. **Assess** - Determine severity and impact
3. **Communicate** - Notify stakeholders
4. **Mitigate** - Apply temporary fix if available
5. **Resolve** - Implement permanent fix
6. **Post-mortem** - Document lessons learned

### Escalation Path

1. On-call engineer →
2. Team lead →
3. Engineering manager →
4. CTO

---

## Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| API response time (p99) | > 500ms | > 2000ms |
| Error rate | > 1% | > 5% |
| Queue depth | > 100 | > 1000 |
| Worker cron lag | > 2x interval | > 3x interval |
| Redis memory | > 80% | > 95% |
| DB connections | > 80% pool | > 95% pool |
| Container memory | > 80% | > 95% |

### Alert Rules (Prometheus/Grafana)

```yaml
# Example alert rules
groups:
  - name: cvg-his
    rules:
      - alert: APIHealthCheckFailing
        expr: up{job="his-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "his-api health check failing"

      - alert: WorkerCronLag
        expr: time() - worker_last_cron_run_seconds > 180
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Worker cron job lagging"

      - alert: QueueBacklog
        expr: bullmq_queue_waiting > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Queue backlog building up"

      - alert: RedisDown
        expr: redis_up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
```

### Log Markers

Look for these log markers in production:

```
# Worker health markers
"cron started"                    # Cron job initialized
"cron tick skipped"               # Leader lock not acquired
"cron tick failed"                # Cron execution error
"job completed"                   # Job processed successfully
"job failed"                      # Job processing failed

# API health markers
"request received"                # Incoming request
"request completed"               # Request finished
"redis health check failed"       # Redis connectivity issue
"db health check failed"          # Database connectivity issue
```

---

## Recovery Procedures

### Full System Recovery

1. **Verify infrastructure:**
   ```bash
   # Check all containers
   docker ps -a
   
   # Check network
   docker network ls
   docker network inspect cvg-his_default
   ```

2. **Start services in order:**
   ```bash
   # 1. Database
   docker-compose up -d postgres
   
   # 2. Redis
   docker-compose up -d redis
   
   # 3. Wait for dependencies
   sleep 10
   
   # 4. API
   docker-compose up -d his-api
   
   # 5. Worker
   docker-compose up -d his-worker
   
   # 6. Web
   docker-compose up -d his-web
   ```

3. **Verify health:**
   ```bash
   # Check all health endpoints
   curl -s http://localhost:3000/health | jq
   curl -s http://localhost:3100/health | jq
   ```

### Data Recovery

1. **Database restore:**
   ```bash
   # From backup
   pg_restore -d cvg_his backup.dump
   
   # Point-in-time recovery (if WAL archiving enabled)
   # Consult PostgreSQL documentation
   ```

2. **Redis restore:**
   ```bash
   # From RDB snapshot
   redis-cli -u $REDIS_URL SHUTDOWN NOSAVE
   cp /backup/dump.rdb /var/lib/redis/dump.rdb
   redis-server /etc/redis/redis.conf
   ```

### Disaster Recovery

1. **Failover to backup region:**
   - Update DNS to point to backup region
   - Verify all services healthy
   - Notify users of potential data loss window

2. **Communication template:**
   ```
   [INCIDENT] CVG-HIS Service Disruption
   
   Status: [Investigating/Identified/Monitoring/Resolved]
   Impact: [Description of user impact]
   Timeline: [Key events and times]
   Next Update: [Expected time]
   ```

---

## Appendix

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `QUEUE_PREFIX` | BullMQ queue prefix | `cvg-his` |
| `HEALTH_PORT` | Worker health server port | `3100` |
| `MEDICATION_OVERDUE_AUTO_SCAN` | Enable cron job | `true` |
| `MEDICATION_OVERDUE_SCAN_INTERVAL_MS` | Cron interval | `60000` |
| `MEDICATION_OVERDUE_GRACE_MINUTES` | Overdue grace period | `30` |

### Useful Scripts

```bash
# Quick health check all services
#!/bin/bash
echo "=== his-api ==="
curl -s http://localhost:3000/health | jq -c '{status, db, redis}'
echo "=== his-worker ==="
curl -s http://localhost:3100/health | jq -c '{status, crons}'
echo "=== Redis ==="
redis-cli -u $REDIS_URL ping
echo "=== PostgreSQL ==="
psql $DATABASE_URL -c "SELECT 1 as db" -t

# Clear all queues (dangerous!)
#!/bin/bash
redis-cli -u $REDIS_URL --scan --pattern "bull:*" | xargs redis-cli -u $REDIS_URL del

# Export queue stats
#!/bin/bash
redis-cli -u $REDIS_URL --scan --pattern "bull:*:wait" | while read key; do
  echo "$key: $(redis-cli -u $REDIS_URL llen $key)"
done
```

---

## Contact

- **On-call:** [Configure in PagerDuty]
- **Slack:** #cvg-his-incidents
- **Documentation:** /docs
- **Repository:** [Git repository URL]
