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

The `BruteForceProtection` is integrated into `AuthService` via the `bruteForce` option in `AuthServiceOptions`. It is wired into:

- `AuthService.login()` — checks lockout before credential verification, records failures, resets on success
- `AuthService.completeMfaLogin()` — checks MFA lockout before TOTP verification, records failures, resets on success
- `AuthService.logout()` — clears all failure counters for the user via `recordSuccess()`

To enable, pass a `BruteForceProtection` instance when constructing `AuthService`:

```typescript
const auth = new AuthService({
  // ... other options
  bruteForce: new BruteForceProtection()
});
```

### Login Flow (with Brute Force Protection)

1. Check if identifier is password-locked → throw `"Account temporarily locked due to too many failed attempts"` (HTTP 401)
2. Verify credentials
3. On failure → record password failure, throw generic `"Invalid username or password"`
4. On success → reset password failure counter

### MFA Flow (with Brute Force Protection)

1. Check if identifier is MFA-locked → throw `"Account temporarily locked due to too many failed MFA attempts"` (HTTP 401)
2. Verify MFA token
3. On failure → record MFA failure, throw generic `"Invalid MFA code"`
4. On success → reset MFA failure counter

## Seed Credentials — Environment Isolation

Seed users with predictable passwords (e.g., `admin`/`seed_admin`) are **automatically disabled in production and staging environments**.

The `UsersService` constructor accepts a `seedUsersEnabled` option:

```typescript
// Defaults to true in development/test, false in production/staging
const users = new UsersService({ seedUsersEnabled: false });
```

Additionally, the `comparePassword()` function refuses to use the seed backdoor when `NODE_ENV` is `production`, `staging`, `prod`, or `stage` — even if a seed user somehow exists in the database.

**Seed users are only operational in `development` and `test` environments.**

## Storage Key Unification

Storage keys for auth tokens are now centralized in `@cvg-his-v2/shared-auth-sdk`:

```typescript
import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';
// AUTH_STORAGE_KEYS.accessToken = 'cvg-his-v2:access_token'
// AUTH_STORAGE_KEYS.refreshToken = 'cvg-his-v2:refresh_token'
// AUTH_STORAGE_KEYS.mfaRequired = 'cvg-his-v2:mfa_required'
// AUTH_STORAGE_KEYS.mfaSetupRequired = 'cvg-his-v2:mfa_setup_required'
```

Both `apps/spa/src/stores/auth.ts` and `apps/spa/src/services/api.ts` import from this SDK, eliminating the previous drift where the SPA used `cvg-his-v2:access_token` (colon-separated) and the SDK used `cvg_his_v2_access_token` (underscore-separated).

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
