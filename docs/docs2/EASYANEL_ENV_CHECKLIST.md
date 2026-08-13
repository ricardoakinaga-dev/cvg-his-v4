# EasyPanel Environment Variables Checklist

## his-web (Next.js Frontend)

### Required Environment Variables

| Variable | Value | Description | Set At |
|----------|-------|-------------|--------|
| `NEXT_PUBLIC_HIS_API_BASE_URL` | `/api/proxy` | Public API base URL (client-side). Must be `/api/proxy` for the proxy route. | **Build time** |
| `HIS_API_INTERNAL_URL` | `http://his-api:3000` | Internal URL to reach his-api. Use the Docker service name. | **Runtime** |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HIS_AUTH_COOKIE_DOMAIN` | (empty) | Domain for auth cookie |
| `HIS_AUTH_COOKIE_MAX_AGE_SECONDS` | `28800` | Auth cookie max age (8 hours) |
| `HIS_PROXY_TIMEOUT_MS` | `30000` | Proxy request timeout in milliseconds |

### Build-time Variables (Optional)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BUILD_ID` | Build identifier |
| `NEXT_PUBLIC_GIT_SHA` | Git commit SHA |
| `NEXT_PUBLIC_BUILD_TIME` | Build timestamp |

---

## his-api (Fastify Backend)

### Required Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | `<runtime-database-url>` | PostgreSQL connection string |
| `REDIS_URL` | `redis://host:6379` | Redis connection string |
| `JWT_SECRET` | (secure random) | JWT signing secret |
| `JWT_ISSUER` | `cvg-his` | JWT issuer |
| `JWT_AUDIENCE` | `cvg-his-api` | JWT audience |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level |
| `QUEUE_PREFIX` | `cvg-his` | Queue name prefix |
| `DEFAULT_TIMEZONE` | `America/Sao_Paulo` | Default timezone |
| `QDRANT_URL` | (empty) | Qdrant URL for protocol search |
| `QDRANT_COLLECTION` | `professor` | Qdrant collection name |
| `QDRANT_API_KEY` | (empty) | Qdrant API key |

---

## Deprecated Variables (DO NOT USE)

These variables are ignored and will trigger a warning in the logs:

- ~~`NEXT_PUBLIC_API_BASE_URL`~~ - Removed, use `NEXT_PUBLIC_HIS_API_BASE_URL`
- ~~`NEXT_PUBLIC_API_URL`~~ - Removed, use `NEXT_PUBLIC_HIS_API_BASE_URL`
- ~~`NEXT_PUBLIC_HIS_API_URL`~~ - Removed, use `NEXT_PUBLIC_HIS_API_BASE_URL`
- ~~`HIS_API_BASE_URL`~~ - Removed, use `HIS_API_INTERNAL_URL`

---

## EasyPanel Configuration Steps

### 1. his-web App

1. Go to **App Settings** → **Environment**
2. Add the following:
   ```
   NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy
   HIS_API_INTERNAL_URL=http://his-api:3000
   ```
3. **Important**: `NEXT_PUBLIC_HIS_API_BASE_URL` must be set at **build time**. In EasyPanel, add it to the build settings or ensure it's available during the build process.

### 2. his-api App

1. Go to **App Settings** → **Environment**
2. Add all required variables from the his-api section above
3. Ensure `DATABASE_URL` and `REDIS_URL` point to the correct services

### 3. Network Configuration

- his-web must be able to reach his-api via Docker network
- Use the Docker service name (`his-api`) in `HIS_API_INTERNAL_URL`
- Do NOT use `localhost` or `127.0.0.1` in production Docker environments

---

## Error Messages Reference

### Missing `NEXT_PUBLIC_HIS_API_BASE_URL`

```
[his-web][env] FATAL: Missing required environment variable NEXT_PUBLIC_HIS_API_BASE_URL.
  Expected value: "/api/proxy"
  This variable must be set at build time.
```

**Solution**: Set `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy` in build environment.

### Missing `HIS_API_INTERNAL_URL`

```
[his-web][env] FATAL: Missing required environment variable HIS_API_INTERNAL_URL.
  Expected: Internal URL to reach his-api (e.g., http://his-api:3000)
  This variable is required in production for the proxy route to work.
```

**Solution**: Set `HIS_API_INTERNAL_URL=http://his-api:3000` in runtime environment.

### Deprecated Variables Warning

```
[his-web][env] WARNING: Deprecated env vars detected: HIS_API_BASE_URL, NEXT_PUBLIC_API_URL.
  These are ignored. Use NEXT_PUBLIC_HIS_API_BASE_URL="/api/proxy" and HIS_API_INTERNAL_URL=<internal-url> instead.
```

**Solution**: Remove deprecated variables and use the correct ones.
