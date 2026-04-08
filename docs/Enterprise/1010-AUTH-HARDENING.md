# Auth Hardening - Brute Force Protection

## Overview

Authentication hardening protects against brute force and credential stuffing attacks through progressive lockouts and unified error responses.

## BruteForceProtection

Located in `packages/modules/auth/src/brute-force.ts`.

### Configuration

```typescript
interface BruteForceConfig {
  maxAttempts: number; // failures before lockout (default: 5)
  lockoutDurationSeconds: number; // how long account is locked (default: 300)
  trackingWindowSeconds: number; // window to count failures (default: 900)
}
```

### Core Behavior

- Tracks password failures and MFA failures separately per identifier
- Locks account after `maxAttempts` failures within `trackingWindow`
- Lockout duration is `lockoutDurationSeconds`
- Case-insensitive identifier tracking
- Automatic cleanup of expired entries

### Key Methods

| Method                        | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `isPasswordLocked(id)`        | Check if identifier is locked for password auth |
| `isMfaLocked(id)`             | Check if identifier is locked for MFA           |
| `recordPasswordFailure(id)`   | Record failed password attempt                  |
| `recordMfaFailure(id)`        | Record failed MFA attempt                       |
| `recordPasswordSuccess(id)`   | Reset counter on successful password auth       |
| `recordMfaSuccess(id)`        | Reset counter on successful MFA                 |
| `getRemainingLockSeconds(id)` | Seconds until lockout expires                   |

## Integration with AuthService

The `AuthService` is configured with a `BruteForceProtection` instance in `runtime.ts`:

```typescript
const auth = new AuthService({
  // ... other options
  bruteForce: new BruteForceProtection()
});
```

### Login Flow

1. Check if identifier is locked → throw generic "Invalid username or password"
2. Verify credentials
3. On failure → record failure, throw generic "Invalid username or password"
4. On success → reset failure counter

### MFA Flow

1. Check if identifier is locked for MFA → throw generic "Invalid MFA code"
2. Verify MFA token
3. On failure → record MFA failure, throw generic "Invalid MFA code"
4. On success → reset MFA failure counter

## Security Properties

### Non-Enumeration

All authentication failures return the same error message: `"Invalid username or password"`. This prevents attackers from enumerating valid usernames based on error message differences.

### Progressive Lockout

| Failed Attempts    | Action                             |
| ------------------ | ---------------------------------- |
| 1 to maxAttempts-1 | Counter incremented, no lockout    |
| maxAttempts        | Account locked                     |
| maxAttempts × 2    | Possible brute force attack logged |

### Separate MFA Tracking

MFA failures are tracked separately from password failures, allowing independent lockouts.

## Audit Events

| Event                  | Risk Level | Description                  |
| ---------------------- | ---------- | ---------------------------- |
| `login_failed`         | medium     | Failed login attempt         |
| `login_blocked_locked` | high       | Login blocked due to lockout |
| `mfa_login_failed`     | high       | Failed MFA verification      |
| `mfa_blocked_locked`   | high       | MFA blocked due to lockout   |

## Limitations

- In-memory tracking (resets on server restart)
- No distributed locking (each instance tracks independently)
- No IP-based rate limiting
- No step-up authentication

## Future Enhancements

- Redis-backed tracking for distributed deployments
- IP-based blocking
- Progressive delays between attempts
- Step-up authentication for sensitive operations
- Anomaly detection based on geography/behavior
