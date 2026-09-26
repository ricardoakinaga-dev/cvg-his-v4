-- R2-SEC-01: unsalted SHA-256 password hashes (legacy Drizzle seeds and
-- imports) are no longer accepted by the API. Flag them so login answers
-- PASSWORD_RESET_REQUIRED until an administrator assigns a new password that
-- satisfies the unified policy (12+ characters, no common or leaked values).
UPDATE users
   SET password_hash = 'legacy-sha256-reset-required:' || password_hash,
       updated_at = now()
 WHERE password_hash ~ '^[0-9a-fA-F]{64}$';
