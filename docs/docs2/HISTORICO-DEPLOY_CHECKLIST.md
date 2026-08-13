# Deploy Checklist - EasyPanel

> **AVISO DE ARQUIVO HISTÓRICO**
>
> Este checklist reflete uma trilha antiga (`his-api`, `his-web`, `his-worker`) e **não deve ser usado como instrução operacional do deploy atual**.
>
> O deploy vigente do CVG-HIS-V2 usa exclusivamente:
>
> - `docker-compose.v2.yml`
> - `apps/api`, `apps/web`, `apps/worker`
> - serviços `cvg-his-v2-api`, `cvg-his-v2-web`, `cvg-his-v2-worker`
>
> Guias corretos para operação atual:
>
> - `README.md`
> - `INSTALACAO_V2_OPENCLAW.md`
> - `OPENCLAW_DEPLOY_DIRETRIZES.md`
> - `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
> - `docs/131-checklist-cutover-servidor.md`

**Generated:** 2026-02-20
**Project:** CVG HIS (Hospital Information System)

---

## 1. Environment Variables by Service

### 1.1 his-api (Fastify Backend)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | No | Server port (default: 3000) | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `<runtime-database-url>` |
| `REDIS_URL` | Yes | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | Yes | Secret for JWT signing | `min-32-char-secret` |
| `JWT_ISSUER` | Yes | JWT issuer | `cvg-his-api` |
| `JWT_AUDIENCE` | Yes | JWT audience (comma-separated) | `cvg-his-web,cvg-his-mobile` |
| `QUEUE_PREFIX` | No | BullMQ queue prefix | `cvg-his:` |
| `QDRANT_URL` | No | Qdrant vector DB URL | `http://qdrant:6333` |
| `QDRANT_COLLECTION` | No | Qdrant collection name | `protocols` |
| `QDRANT_API_KEY` | No | Qdrant API key | `your-api-key` |

### 1.2 his-web (Next.js Frontend)

| Variable | Required | Build-time | Description | Example |
|----------|----------|------------|-------------|---------|
| `NODE_ENV` | Yes | Yes | Environment mode | `production` |
| `PORT` | No | No | Server port (default: 3001) | `3001` |
| `NEXT_PUBLIC_HIS_API_BASE_URL` | Yes | **Yes** | API base URL for client | `/api/proxy` |
| `HIS_API_INTERNAL_URL` | Yes | No | Internal API URL for proxy | `http://his-api:3000` |
| `HIS_API_BASE_URL` | No | No | Fallback upstream URL | `http://his-api:3000` |

### 1.3 his-worker (BullMQ Worker)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `<runtime-database-url>` |
| `REDIS_URL` | Yes | Redis connection string | `redis://host:6379` |
| `QUEUE_PREFIX` | No | BullMQ queue prefix | `cvg-his:` |

---

## 2. Domain Configuration

### 2.1 Recommended Domain Structure

| Service | Domain | Notes |
|---------|--------|-------|
| his-web | `his.yourdomain.com` | Public-facing |
| his-api | `api.his.yourdomain.com` | Optional if using proxy |

### 2.2 Proxy Architecture

```
Browser → his-web (/api/proxy/*) → his-api (internal)
```

**Benefits:**
- No CORS issues
- Token in HTTP-only cookie
- Single domain for SSL

---

## 3. Build-time vs Runtime Variables

### 3.1 Critical: `NEXT_PUBLIC_*` Variables

⚠️ **IMPORTANT:** `NEXT_PUBLIC_HIS_API_BASE_URL` is embedded at **build time**.

**Default value:** `/api/proxy` (recommended for production)

**If you need to change it:**
1. Set the environment variable
2. **Rebuild** the his-web container
3. Redeploy

**⚠️ SEMPRE REBUILD QUANDO MUDAR `NEXT_PUBLIC_*`:**
- `NEXT_PUBLIC_HIS_API_BASE_URL`
- `NEXT_PUBLIC_BUILD_ID`
- `NEXT_PUBLIC_GIT_SHA`
- `NEXT_PUBLIC_BUILD_TIME`

Qualquer alteração em variáveis `NEXT_PUBLIC_*` requer rebuild completo do container his-web.

### 3.2 Runtime Variables (No Rebuild Needed)

These can be changed without rebuilding:
- `HIS_API_INTERNAL_URL` (his-web)
- `HIS_API_BASE_URL` (his-web)
- `DATABASE_URL` (all services)
- `REDIS_URL` (all services)
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` (his-api)

---

## 4. Health Checks

### 4.1 his-api Health Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Full health check | `{"status":"ok","db":"ok","redis":"ok"}` |
| `GET /health/db` | Database only | `{"db":"ok"}` |
| `GET /health/redis` | Redis only | `{"redis":"ok"}` |

### 4.2 EasyPanel Health Check Configuration

**his-api:**
- Path: `/health`
- Interval: 30s
- Timeout: 10s
- Start period: 30s

**his-web:**
- Path: `/` (or create a dedicated `/api/health` endpoint)
- Interval: 30s
- Timeout: 10s
- Start period: 30s

---

## 5. Deployment Order

1. **Database & Redis** (external services)
   - Ensure PostgreSQL is running and accessible
   - Ensure Redis is running and accessible
   - Run migrations if needed

2. **his-api**
   - Set all required environment variables
   - Deploy and verify health check

3. **his-worker**
   - Set all required environment variables
   - Deploy (no health check needed, uses BullMQ)

4. **his-web**
   - Set `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy` (build-time)
   - Set `HIS_API_INTERNAL_URL=http://his-api:3000` (runtime)
   - Deploy and verify

---

## 6. Post-Deploy Verification

### 6.1 API Health Check

```bash
curl https://his.yourdomain.com/api/proxy/health
# Expected: {"status":"ok","version":"x.x.x","uptime":123,"db":"ok","redis":"ok"}
```

### 6.2 Authentication Flow

```bash
# 1. Login page should load
curl -I https://his.yourdomain.com/login
# Expected: HTTP/2 200

# 2. After login, session cookie should be set
# 3. API calls should work via proxy
```

### 6.3 Build Stamp Verification

```bash
# Check build stamp via API
curl https://his.yourdomain.com/api/proxy/build
# Expected: {"buildId":"<git-sha>","gitSha":"<full-sha>","buildTime":"<iso-date>"}

# Check build stamp in browser footer
# Open any page and look at the bottom-right footer
# Expected: "build: <short-sha> | env: production"
```

### 6.4 Patient Context (Critical Fix)

```bash
# This should NOT return 403 after the fix
curl -H "Authorization: Bearer <token>" \
  https://his.yourdomain.com/api/proxy/patient-context/by-patient/<uuid>
# Expected: Patient context JSON or 404 if not found
```

---

## 7. Rollback Procedure

### 7.1 If his-web fails

1. Revert to previous container image
2. If `NEXT_PUBLIC_*` changed, rebuild is required
3. Check logs: `docker logs his-web`

### 7.2 If his-api fails

1. Revert to previous container image
2. Check database connectivity
3. Check Redis connectivity
4. Check logs: `docker logs his-api`

---

## 8. Security Checklist

- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `JWT_SECRET` is different per environment
- [ ] Database credentials are strong
- [ ] Redis is not publicly accessible
- [ ] HTTPS is enabled on all domains
- [ ] Cookie settings: `Secure; HttpOnly; SameSite=Strict`

---

## 9. Monitoring & Alerts

### 9.1 Recommended Metrics

| Metric | Service | Alert Threshold |
|--------|---------|-----------------|
| Response time | his-api | > 500ms p95 |
| Error rate | his-api | > 1% |
| Queue backlog | his-worker | > 100 jobs |
| Memory usage | all | > 80% |
| CPU usage | all | > 80% |

### 9.2 Log Aggregation

- Configure EasyPanel log collection
- Forward to external service if needed (e.g., Loki, Elasticsearch)

---

## 10. Quick Reference

### Full Deploy Command Sequence

```bash
# 1. Build his-web with correct env
docker build --build-arg NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy \
  -t his-web:latest ./apps/his-web

# 2. Deploy in order
# - his-api first
# - his-worker second
# - his-web last

# 3. Verify
curl https://his.yourdomain.com/api/proxy/health
```

### Environment Variable Summary

```
# his-api
NODE_ENV=production
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_SECRET=<32+ chars>
JWT_ISSUER=cvg-his-api
JWT_AUDIENCE=cvg-his-web

# his-web (build-time)
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy

# his-web (runtime)
HIS_API_INTERNAL_URL=http://his-api:3000

# his-worker
NODE_ENV=production
DATABASE_URL=postgres://...
REDIS_URL=redis://...
```
