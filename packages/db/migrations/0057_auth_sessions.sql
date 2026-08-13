CREATE TABLE IF NOT EXISTS sessions (
  id varchar(255) PRIMARY KEY,
  account_id varchar(255) NOT NULL,
  user_id varchar(255) NOT NULL,
  token_hash varchar(255) NOT NULL,
  refresh_token_hash varchar(255),
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
