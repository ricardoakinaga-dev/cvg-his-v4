CREATE TABLE IF NOT EXISTS sessions (
  id varchar(255) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auth_time timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  refresh_expires_at timestamp with time zone NOT NULL,
  active boolean NOT NULL DEFAULT true,
  role_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  refresh_nonce varchar(255) NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_account_id_idx ON sessions(account_id);
CREATE INDEX IF NOT EXISTS sessions_refresh_expiry_idx ON sessions(refresh_expires_at);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
