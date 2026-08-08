ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(128);

WITH username_candidates AS (
  SELECT
    id,
    account_id,
    left(split_part(email, '@', 1), 119) AS base_username
  FROM users
  WHERE username IS NULL OR btrim(username) = ''
), ranked_usernames AS (
  SELECT
    id,
    base_username,
    row_number() OVER (
      PARTITION BY account_id, base_username
      ORDER BY id
    ) AS username_rank
  FROM username_candidates
)
UPDATE users
SET username = CASE
  WHEN ranked_usernames.username_rank = 1 THEN ranked_usernames.base_username
  ELSE ranked_usernames.base_username || '_' || left(replace(users.id::text, '-', ''), 8)
END
FROM ranked_usernames
WHERE users.id = ranked_usernames.id;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_account_username_unique
  ON users(account_id, username);
