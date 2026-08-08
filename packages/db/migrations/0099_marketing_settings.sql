-- MKT-002: tenant-scoped settings for preventive communication automation.

CREATE TABLE IF NOT EXISTS marketing_settings (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  setting_key VARCHAR(80) NOT NULL,
  channel VARCHAR(16) NOT NULL CHECK (channel IN ('sms', 'email')),
  values_json JSONB NOT NULL,
  updated_by_user_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, setting_key),
  CONSTRAINT marketing_settings_account_user_fk
    FOREIGN KEY (account_id, updated_by_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT marketing_settings_key_channel_ck CHECK (
    (setting_key = 'sms_automations' AND channel = 'sms')
    OR (setting_key = 'vaccine_email' AND channel = 'email')
  )
);

CREATE INDEX IF NOT EXISTS idx_marketing_settings_account_channel
  ON marketing_settings(account_id, channel);

ALTER TABLE marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_settings_tenant_isolation ON marketing_settings;
CREATE POLICY marketing_settings_tenant_isolation ON marketing_settings
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
