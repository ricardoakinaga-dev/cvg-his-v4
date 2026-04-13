# Rate Limiting - CVG-HIS-V2

## Overview

Rate limiting protects critical API routes from abuse, brute force attacks, and excessive usage. The implementation is in-memory and does not require external infrastructure.

## Algorithm

**Fixed Window Counter** with automatic cleanup.

Each rate limiter instance maintains an independent counter for each unique key within a configurable time window. When the window expires, the counter resets.

## Package Location

`packages/shared/rate-limiter/src/index.ts`

## Key Strategy

Rate limit keys are built with the following priority:

1. **Authenticated user** (`userId`): Most specific, used when user is logged in
2. **Verified account** (`accountId`): Used when authenticated but `accountId` is not `'pending'`
3. **IP address** (`ip`): Fallback for unauthenticated requests
4. **Tenant ID** (`t:tenantId`): Final fallback when no IP available

Important: `accountId = 'pending'` (the default for unauthenticated requests) is **ignored** and falls through to IP-based limiting. This prevents different unauthenticated clients from sharing the same rate limit bucket.

### Key Format per Scenario

| Scenario                         | Key Format                | Example                        |
| -------------------------------- | ------------------------- | ------------------------------ |
| Authenticated user               | `u:{userId}:r:{route}`    | `u:user123:r:/auth/login`      |
| Authenticated (account verified) | `a:{accountId}:r:{route}` | `a:acc_abc:r:/lgpd/consent`    |
| Unauthenticated                  | `ip:{ip}:r:{route}`       | `ip:192.168.1.1:r:/auth/login` |
| No IP available                  | `t:{tenantId}:r:{route}`  | `t:tenant1:r:/health`          |

## Rate Limit Configuration

| Route                | Window | Max Requests | Limiter Name   |
| -------------------- | ------ | ------------ | -------------- |
| `/auth/login`        | 60s    | 5            | `auth-login`   |
| `/auth/login/mfa`    | 60s    | 5            | `auth-mfa`     |
| `/auth/refresh`      | 60min  | 30           | `auth-refresh` |
| `/mfa/setup`         | 60min  | 10           | `mfa-setup`    |
| `/mfa/setup/confirm` | 60min  | 10           | `mfa-setup`    |
| `/mfa/disable`       | 60min  | 10           | `mfa-setup`    |
| `/lgpd/*`            | 60s    | 30           | `lgpd`         |

## Response Headers

All rate-limited routes include headers:

- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: Seconds until retry (only when blocked, HTTP 429 only)

### Rate Limit Exceeded Response

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many login attempts. Please try again later.",
  "correlationId": "<id>",
  "retryAfterSeconds": <seconds>
}
```

HTTP Status: **429 Too Many Requests**

## Metrics

Metric: `rate_limit_hits_total`

- Labels: `route`, `limited` (true/false)
- Exposed via `/metrics` endpoint

## Testing

### Unit Tests

`packages/shared/rate-limiter/src/rate-limiter.test.ts`

- 12 tests: limits, key isolation, reset, window expiration

### Integration Tests

`tests/integration/rate-limiting.test.ts`

- Tests RateLimiter class behavior including:
  - Independent limits per user/IP/route
  - User takes precedence over IP
  - Reset clears specific keys
  - Correct header info values

## Limitations

1. **In-memory storage**: State lost on restart
2. **Per-process isolation**: Each process has independent limits
3. **Fixed window**: Race condition at window boundary (counter resets, allowing burst)
4. **No distributed coordination**: Multi-instance deployments have independent limits

## Future Enhancements

- Redis-backed rate limiter for multi-process deployments
- Sliding window algorithm for smoother limiting
- Per-tenant configurable limits
- Progressive limiting after violations
