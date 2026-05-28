-- Marketing premium: segmentos, templates e campanhas auditaveis.

CREATE TABLE IF NOT EXISTS marketing_segments (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_segments_criteria_json_chk CHECK (jsonb_typeof(criteria) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_marketing_segments_account_name
  ON marketing_segments (account_id, name);

CREATE TABLE IF NOT EXISTS marketing_templates (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_templates_channel_chk CHECK (channel IN ('sms', 'whatsapp', 'email')),
  CONSTRAINT marketing_templates_sms_body_chk CHECK (channel <> 'sms' OR char_length(body) <= 160)
);

CREATE INDEX IF NOT EXISTS idx_marketing_templates_account_channel
  ON marketing_templates (account_id, channel, name);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  segment_id TEXT NOT NULL REFERENCES marketing_segments(id) ON DELETE RESTRICT,
  template_id TEXT NOT NULL REFERENCES marketing_templates(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ,
  scheduled_by_user_id UUID REFERENCES users(id),
  estimated_audience INTEGER NOT NULL DEFAULT 0,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_campaigns_channel_chk CHECK (channel IN ('sms', 'whatsapp', 'email')),
  CONSTRAINT marketing_campaigns_status_chk CHECK (status IN ('draft', 'scheduled', 'running', 'sent', 'cancelled')),
  CONSTRAINT marketing_campaigns_estimated_audience_chk CHECK (estimated_audience >= 0)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_account_status
  ON marketing_campaigns (account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_account_schedule
  ON marketing_campaigns (account_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_campaign_deliveries (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  patient_id TEXT,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider TEXT,
  provider_message_id TEXT,
  failure_reason TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  CONSTRAINT marketing_campaign_deliveries_channel_chk CHECK (channel IN ('sms', 'whatsapp', 'email')),
  CONSTRAINT marketing_campaign_deliveries_status_chk CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  CONSTRAINT marketing_campaign_deliveries_attempt_count_chk CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_account_campaign
  ON marketing_campaign_deliveries (account_id, campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_account_status
  ON marketing_campaign_deliveries (account_id, status, updated_at DESC);

ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_segments_tenant_isolation ON marketing_segments;
CREATE POLICY marketing_segments_tenant_isolation ON marketing_segments
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_templates_tenant_isolation ON marketing_templates;
CREATE POLICY marketing_templates_tenant_isolation ON marketing_templates
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_campaigns_tenant_isolation ON marketing_campaigns;
CREATE POLICY marketing_campaigns_tenant_isolation ON marketing_campaigns
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE marketing_campaign_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_campaign_deliveries_tenant_isolation ON marketing_campaign_deliveries;
CREATE POLICY marketing_campaign_deliveries_tenant_isolation ON marketing_campaign_deliveries
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE marketing_segments IS
  'Segmentos de marketing premium com criterios de publico e consentimento.';

COMMENT ON TABLE marketing_templates IS
  'Templates multicanal para campanhas de SMS, WhatsApp e e-mail.';

COMMENT ON TABLE marketing_campaigns IS
  'Campanhas de marketing com segmento, template, audiencia estimada e agendamento.';

COMMENT ON TABLE marketing_campaign_deliveries IS
  'Entregas por destinatario das campanhas de marketing, com status, tentativas e rastreio do provedor.';
