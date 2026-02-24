# EasyPanel Deployment Checklist

> **Last Updated:** 2026-02-21
> **Version:** 1.0.0

This checklist guides deployment and configuration of CVG-HIS services in EasyPanel.

---

## Pre-Deployment Checklist

### 1. Infrastructure Requirements

- [ ] PostgreSQL 15+ database created
- [ ] Redis 7+ instance created
- [ ] Persistent storage volume configured (for handover PDFs)
- [ ] SSL certificates configured for domains
- [ ] Network policies configured (services can reach each other)

### 2. Environment Variables

#### his-api

```env
# Required
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@postgres:5432/cvg_his
REDIS_URL=redis://:password@redis:6379/0
QUEUE_PREFIX=cvg-his-prod

# Authentication
JWT_SECRET=<generate-secure-secret>
JWT_EXPIRES_IN=7d

# Optional
DEFAULT_TIMEZONE=America/Sao_Paulo
MEDICATION_SCHEDULE_DEFAULT_TIMEZONE=America/Sao_Paulo
```

#### his-worker

```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/cvg_his
REDIS_URL=redis://:password@redis:6379/0
QUEUE_PREFIX=cvg-his-prod

# Worker Configuration
HEALTH_PORT=3100
HANDOVER_STORAGE_DIR=/data/handovers
MEDICATION_OVERDUE_AUTO_SCAN=true
MEDICATION_OVERDUE_SCAN_INTERVAL_MS=60000
MEDICATION_OVERDUE_GRACE_MINUTES=30

# Optional
DEFAULT_TIMEZONE=America/Sao_Paulo
CRON_LEADER_LOCK_TTL_MS=180000
```

#### his-web

```env
# Required
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy
HIS_API_INTERNAL_URL=http://his-api:3000

# Optional
NEXT_PUBLIC_DEFAULT_TIMEZONE=America/Sao_Paulo
HIS_PROXY_TIMEOUT_MS=30000
HIS_AUTH_COOKIE_DOMAIN=.example.com
HIS_AUTH_COOKIE_MAX_AGE_SECONDS=28800
```

---

## Service Configuration

### his-api

| Setting | Value |
|---------|-------|
| **Image** | `cvg-his-api:latest` |
| **Port** | 3000 |
| **Health Check Path** | `/health` |
| **Health Check Interval** | 30s |
| **Health Check Timeout** | 10s |
| **Memory Limit** | 512MB |
| **CPU Limit** | 0.5 |
| **Replicas** | 2+ (production) |

**Health Check Configuration:**
```json
{
  "path": "/health",
  "interval": "30s",
  "timeout": "10s",
  "unhealthyThreshold": 3,
  "healthyThreshold": 1
}
```

### his-worker

| Setting | Value |
|---------|-------|
| **Image** | `cvg-his-worker:latest` |
| **Port** | 3100 (health) |
| **Health Check Path** | `/health` |
| **Health Check Interval** | 60s |
| **Health Check Timeout** | 10s |
| **Memory Limit** | 1GB |
| **CPU Limit** | 1.0 |
| **Replicas** | 1 (with leader election) |

**Health Check Configuration:**
```json
{
  "path": "/health",
  "interval": "60s",
  "timeout": "10s",
  "unhealthyThreshold": 5,
  "healthyThreshold": 1
}
```

**Liveness Probe:**
```json
{
  "path": "/health/live",
  "interval": "10s",
  "timeout": "5s"
}
```

**Readiness Probe:**
```json
{
  "path": "/health/ready",
  "interval": "10s",
  "timeout": "5s"
}
```

### his-web

| Setting | Value |
|---------|-------|
| **Image** | `cvg-his-web:latest` |
| **Port** | 3001 |
| **Health Check Path** | `/api/health` |
| **Health Check Interval** | 30s |
| **Health Check Timeout** | 10s |
| **Memory Limit** | 512MB |
| **CPU Limit** | 0.5 |
| **Replicas** | 2+ (production) |

---

## Deployment Steps

### Step 1: Database Setup

```bash
# 1. Create database
psql -c "CREATE DATABASE cvg_his;"

# 2. Run migrations
docker run --rm \
  -e DATABASE_URL=postgresql://user:pass@postgres:5432/cvg_his \
  cvg-his-api:latest \
  sh -c "pnpm migrate"

# 3. Verify migrations
psql $DATABASE_URL -c "SELECT * FROM _migrations ORDER BY id DESC LIMIT 5;"
```

### Step 2: Deploy Services (in order)

1. **Deploy Redis**
   - [ ] Create Redis service in EasyPanel
   - [ ] Set password
   - [ ] Verify connectivity: `redis-cli -u $REDIS_URL ping`

2. **Deploy his-api**
   - [ ] Create service from image
   - [ ] Configure environment variables
   - [ ] Set health check
   - [ ] Configure domain/SSL
   - [ ] Deploy
   - [ ] Verify: `curl https://api.example.com/health`

3. **Deploy his-worker**
   - [ ] Create service from image
   - [ ] Configure environment variables
   - [ ] Mount persistent volume at `/data/handovers`
   - [ ] Set health check
   - [ ] Deploy
   - [ ] Verify: `curl http://worker-internal:3100/health`

4. **Deploy his-web**
   - [ ] Create service from image
   - [ ] Configure environment variables
   - [ ] Set health check
   - [ ] Configure domain/SSL
   - [ ] Deploy
   - [ ] Verify: `curl https://app.example.com`

### Step 3: Post-Deployment Verification

```bash
# API health
curl -s https://api.example.com/health | jq

# Worker health
curl -s http://worker-internal:3100/health | jq

# Web health
curl -s https://app.example.com/api/health | jq

# Test authentication
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"test"}'
```

---

## Monitoring Setup

### 1. Configure Alerts

In EasyPanel, set up notifications for:

- [ ] Container restart events
- [ ] Health check failures
- [ ] High memory usage (>80%)
- [ ] High CPU usage (>80%)

### 2. Log Aggregation

- [ ] Enable log collection for all services
- [ ] Configure log retention (recommended: 30 days)
- [ ] Set up log search for error patterns

### 3. Metrics Collection

Key metrics to track:

| Metric | his-api | his-worker | his-web |
|--------|---------|------------|---------|
| Request rate | ✅ | - | ✅ |
| Response time | ✅ | - | ✅ |
| Error rate | ✅ | ✅ | ✅ |
| Memory usage | ✅ | ✅ | ✅ |
| CPU usage | ✅ | ✅ | ✅ |
| Queue depth | - | ✅ | - |
| Cron lag | - | ✅ | - |

---

## Scaling Guidelines

### When to Scale

| Indicator | Action |
|-----------|--------|
| API response time > 500ms | Add his-api replicas |
| Queue backlog > 100 jobs | Add his-worker replicas |
| Memory usage > 80% | Increase memory limit |
| CPU usage > 80% | Increase CPU limit |

### Horizontal Scaling

**his-api:**
- Can scale to multiple replicas
- Stateless - no session affinity required
- Recommended: 2+ replicas for production

**his-worker:**
- Can scale, but leader election prevents duplicate cron runs
- Each replica processes jobs independently
- Recommended: Start with 1, scale if queue backlog grows

**his-web:**
- Can scale to multiple replicas
- Stateless
- Recommended: 2+ replicas for production

---

## Backup & Recovery

### Database Backups

- [ ] Enable automated daily backups
- [ ] Configure backup retention (recommended: 7 days)
- [ ] Test restore procedure monthly

### Redis Persistence

- [ ] Enable RDB snapshots (every 5 minutes)
- [ ] Enable AOF for durability
- [ ] Configure backup of RDB files

### Application Data

- [ ] Backup handover storage volume (`/data/handovers`)
- [ ] Configure backup retention

---

## Security Checklist

### Network Security

- [ ] his-api: Expose only port 3000
- [ ] his-worker: Do not expose health port externally
- [ ] his-web: Expose only port 3001
- [ ] Redis: No external access
- [ ] PostgreSQL: No external access

### Secrets Management

- [ ] Use EasyPanel secrets for sensitive values
- [ ] Rotate JWT_SECRET periodically
- [ ] Rotate database passwords periodically
- [ ] Rotate Redis password periodically

### Access Control

- [ ] Configure RBAC in EasyPanel
- [ ] Limit who can deploy to production
- [ ] Enable audit logging

---

## Troubleshooting Quick Reference

### Service Won't Start

1. Check logs: `docker logs SERVICE_NAME`
2. Verify environment variables
3. Check database/Redis connectivity
4. Verify migrations ran

### Health Check Failing

1. Check service logs
2. Verify dependencies are healthy
3. Check resource limits
4. Verify network connectivity

### High Resource Usage

1. Check for memory leaks
2. Review request patterns
3. Scale horizontally
4. Increase resource limits

### Queue Not Processing

1. Check worker health: `curl http://worker:3100/health`
2. Check Redis connectivity
3. Check worker logs for errors
4. Verify leader lock status

---

## Rollback Procedure

### Quick Rollback

```bash
# 1. Identify previous image version
docker images | grep cvg-his

# 2. Update service to previous image
# In EasyPanel: Service → Settings → Image → Select previous version

# 3. Force redeploy
# In EasyPanel: Service → Actions → Redeploy

# 4. Verify health
curl -s https://api.example.com/health | jq
```

### Database Rollback

```bash
# If migration caused issues
# 1. Restore from backup
pg_restore -d cvg_his backup.dump

# 2. Or run down migration (if available)
pnpm migrate:down
```

---

## Maintenance Windows

### Scheduled Maintenance

1. **Notify users** 24h in advance
2. **Enable maintenance mode** (if applicable)
3. **Stop worker** to prevent job processing
4. **Perform maintenance**
5. **Verify all services healthy**
6. **Disable maintenance mode**
7. **Notify users** of completion

### Zero-Downtime Deployment

1. Deploy new version alongside old
2. Run health checks on new version
3. Switch traffic to new version
4. Monitor for errors
5. Rollback if issues detected

---

## Contact & Escalation

- **EasyPanel Support:** support@easypanel.io
- **On-call Engineer:** [Configure in alerting system]
- **Slack Channel:** #cvg-his-deployments
