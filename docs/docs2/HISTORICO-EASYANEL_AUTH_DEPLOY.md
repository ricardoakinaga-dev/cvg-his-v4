# EasyPanel Deployment Guide - Auth Routes

> **AVISO DE ARQUIVO HISTÓRICO**
>
> Este guia pertence à trilha anterior e **não deve ser usado para deploy atual** do CVG-HIS-V2.
>
> Para a stack vigente, usar somente:
>
> - `docker-compose.v2.yml`
> - `apps/api`, `apps/web`, `apps/worker`
> - serviços `cvg-his-v2-api`, `cvg-his-v2-web`, `cvg-his-v2-worker`
>
> Referências operacionais corretas:
>
> - `README.md`
> - `INSTALACAO_V2_OPENCLAW.md`
> - `OPENCLAW_DEPLOY_DIRETRIZES.md`
> - `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
> - `docs/131-checklist-cutover-servidor.md`

## Overview

This guide covers deploying the CVG HIS authentication routes to EasyPanel, including JWT configuration and security considerations.

## Prerequisites

- EasyPanel account with project access
- PostgreSQL database configured
- Redis instance configured
- Domain with SSL certificate

## Environment Variables

### his-api Service

Navigate to your `his-api` service in EasyPanel and configure these environment variables:

#### Required Variables

```bash
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=postgres://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# JWT Configuration (CRITICAL)
JWT_SECRET=<generate-32-char-random-string>
JWT_ISSUER=cvg-his
JWT_AUDIENCE=cvg-his-api

# Admin Credentials (for email login)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<secure-password>
```

#### Generating JWT_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -hex 32
```

Or use Node.js:

```javascript
console.log(require('crypto').randomBytes(32).toString('hex'));
```

### his-web Service

Configure these environment variables for the frontend:

```bash
# Node Environment
NODE_ENV=production

# Client-side API base (MUST be /api/proxy)
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy

# Server-side internal API URL
HIS_API_INTERNAL_URL=http://his-api:3000

# Auth cookie settings
HIS_AUTH_COOKIE_DOMAIN=.yourdomain.com
HIS_AUTH_COOKIE_MAX_AGE_SECONDS=28800
```

## Deployment Steps

### 1. Update Environment Variables

In EasyPanel dashboard:

1. Go to **his-api** service
2. Click **Environment** tab
3. Add/update the JWT variables
4. Click **Save & Deploy**

### 2. Verify JWT Configuration

After deployment, verify the configuration:

```bash
# Check health endpoint
curl https://api.yourdomain.com/health

# Test dev-login should return 404 in production
curl -X POST https://api.yourdomain.com/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"accountId":"test","role":"admin"}'
# Expected: {"error":"NOT_FOUND","message":"Endpoint not found"}
```

### 3. Test Authentication Flow

```bash
# Test email login
curl -X POST https://api.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"type":"email","email":"admin@yourdomain.com","password":"your-password"}'
# Expected: {"token":"...","actor":{...},"expiresIn":28800}
```

## Security Checklist

### Before Deployment

- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `JWT_SECRET` is not the default value
- [ ] `ADMIN_PASSWORD` is strong (12+ chars, mixed case, numbers, symbols)
- [ ] `NODE_ENV=production` is set
- [ ] `HIS_AUTH_COOKIE_DOMAIN` is configured for your domain

### After Deployment

- [ ] `/auth/dev-login` returns 404
- [ ] Email login works with configured credentials
- [ ] JWT token is returned on successful login
- [ ] Token verification works (`POST /auth/verify`)
- [ ] Cookie is set with `HttpOnly`, `Secure`, `SameSite=Lax`

## Cookie Configuration

The auth cookie is configured with these security settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `httpOnly` | `true` | Prevents JavaScript access (XSS protection) |
| `secure` | `true` in production | Only sent over HTTPS |
| `sameSite` | `lax` | CSRF protection |
| `maxAge` | 28800 (8 hours) | Session duration |

### Domain Configuration

For single domain:
```bash
HIS_AUTH_COOKIE_DOMAIN=yourdomain.com
```

For subdomains:
```bash
HIS_AUTH_COOKIE_DOMAIN=.yourdomain.com
```

## Troubleshooting

### "Invalid or expired token"

1. Check `JWT_SECRET` matches between services
2. Verify `JWT_ISSUER` and `JWT_AUDIENCE` are consistent
3. Check token hasn't expired (default 8 hours)

### "Endpoint not found" for /auth/login

1. Verify the service is running
2. Check routes are registered
3. Review deployment logs

### Cookie not being set

1. Verify `HIS_AUTH_COOKIE_DOMAIN` matches your domain
2. Check browser console for cookie errors
3. Ensure HTTPS is enabled

### Dev login works in production

This is a critical security issue. Verify:
1. `NODE_ENV=production` is set
2. Restart the service after changing env vars

## Monitoring

### Key Metrics to Monitor

1. **Authentication failures** - High rate may indicate attack
2. **Token verification failures** - May indicate configuration issue
3. **Login latency** - Should be < 500ms

### Log Patterns

Successful login:
```
[info] request received method=POST url=/auth/login
[info] request completed method=POST url=/auth/login statusCode=200 responseTimeMs=123
```

Failed login:
```
[info] request received method=POST url=/auth/login
[info] request completed method=POST url=/auth/login statusCode=401 responseTimeMs=45
```

## Rollback

If issues occur after deployment:

1. In EasyPanel, go to **his-api** service
2. Click **Deployments** tab
3. Find the previous working deployment
4. Click **Rollback**

## Support

For issues specific to:
- **EasyPanel**: Contact EasyPanel support
- **CVG HIS**: Create an issue in the project repository
- **Authentication**: Review this guide and `AUTH_ROUTES_GUIDE.md`
