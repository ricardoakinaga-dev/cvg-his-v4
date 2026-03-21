# Auth Routes Implementation Guide

## Overview

This document describes the minimal authentication routes implemented for CVG HIS, following an incremental approach that maintains backward compatibility.

## New Endpoints

### POST /auth/login

Authenticate with email+password or API key.

**Request Body (Email):**
```json
{
  "type": "email",
  "email": "admin@cvg.local",
  "password": "your-password"
}
```

**Request Body (API Key):**
```json
{
  "type": "key",
  "key": "your-32-character-minimum-api-key"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "actor": {
    "accountId": "00000000-0000-0000-0000-000000000001",
    "userId": "00000000-0000-0000-0000-000000000001",
    "role": "admin",
    "roles": ["admin"],
    "permissions": ["*"]
  },
  "expiresIn": 28800
}
```

### POST /auth/dev-login (Development Only)

Bypass authentication for development. **Blocked in production.**

**Request Body:**
```json
{
  "accountId": "00000000-0000-0000-0000-000000000001",
  "role": "admin",
  "userId": "00000000-0000-0000-0000-000000000001",
  "unitId": "00000000-0000-0000-0000-000000000001"
}
```

**Response:** Same as `/auth/login`

### POST /auth/verify

Verify a JWT token.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "valid": true,
  "actor": { ... }
}
```

### GET /auth/me

Get current authenticated actor from the request context.

**Response:**
```json
{
  "actor": { ... }
}
```

## Security Architecture

### JWT Token Derivation

The actor (user/account/roles) is derived from the JWT token, NOT from client-controlled headers:

1. Client authenticates via `/auth/login` or `/auth/dev-login`
2. Server issues a signed JWT containing actor claims
3. Client stores JWT in HttpOnly cookie via `/api/auth/session`
4. Proxy route forwards token as `Authorization: Bearer` header
5. Backend validates JWT and extracts actor from token claims

### Token Storage

- **HttpOnly Cookie**: Prevents XSS attacks from accessing the token
- **SameSite=Lax**: Prevents CSRF attacks
- **Secure flag**: Enabled in production (HTTPS only)

### Production Safeguards

1. `/auth/dev-login` returns 404 in production
2. Email authentication requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars
3. API key validation requires database lookup (TODO: implement)

## Files Changed

### Backend (his-api)

| File | Description |
|------|-------------|
| `apps/his-api/src/modules/auth/service.ts` | Added `signJwt()`, `verifyJwt()`, `generateApiKey()` functions |
| `apps/his-api/src/modules/auth/routes.ts` | New file with auth route handlers |
| `apps/his-api/src/routes/index.ts` | Registered auth routes under `/auth` prefix |

### Frontend (his-web)

| File | Description |
|------|-------------|
| `apps/his-web/src/lib/auth.ts` | Added `performLogin()`, `loginWithEmail()`, `loginWithKey()`, `devLogin()` |
| `apps/his-web/src/app/login/page.tsx` | Updated login UI with email/dev modes |

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWTs | `change-me-to-random-32-chars` |
| `JWT_ISSUER` | Token issuer identifier | `cvg-his` |
| `JWT_AUDIENCE` | Token audience | `cvg-his-api` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin email for email auth | - |
| `ADMIN_PASSWORD` | Admin password for email auth | - |
| `HIS_AUTH_COOKIE_MAX_AGE_SECONDS` | Cookie expiration | `28800` (8 hours) |
| `HIS_AUTH_COOKIE_DOMAIN` | Cookie domain | - |

## Migration from Header-Based Auth

### Before (Insecure)

```typescript
// Client sent actor context in headers
headers.set('x-account-id', session.accountId);
headers.set('x-role', session.role);
```

### After (Secure)

```typescript
// Actor derived from JWT token by backend
// Client only sends token via HttpOnly cookie
// Proxy route adds Authorization header
```

## Testing

### Manual Testing

```bash
# Dev login (development only)
curl -X POST http://localhost:3000/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"accountId":"00000000-0000-0000-0000-000000000001","role":"admin"}'

# Verify token
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"<your-token>"}'

# Get current actor
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <your-token>"
```

### Automated Tests

See `apps/his-api/src/modules/auth/routes.test.ts` (TODO: create)

## Future Improvements

1. **Database-backed API keys**: Store and validate API keys from database
2. **User accounts**: Full user registration and authentication
3. **Refresh tokens**: Implement refresh token rotation
4. **Rate limiting**: Add rate limiting to login endpoints
5. **Audit logging**: Log all authentication events
