CREATE TABLE IF NOT EXISTS marketing_segments (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(5000),
  criteria TEXT NOT NULL,
  created_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_segments_account_name
  ON marketing_segments(account_id, name);

CREATE TABLE IF NOT EXISTS marketing_templates (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  body VARCHAR(5000) NOT NULL,
  created_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_templates_account_channel
  ON marketing_templates(account_id, channel, name);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  segment_id VARCHAR(255) NOT NULL,
  template_id VARCHAR(255) NOT NULL,
  scheduled_at TIMESTAMP,
  scheduled_by_user_id VARCHAR(255),
  estimated_audience INTEGER NOT NULL,
  created_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_account_status
  ON marketing_campaigns(account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_account_schedule
  ON marketing_campaigns(account_id, scheduled_at);

CREATE TABLE IF NOT EXISTS marketing_campaign_deliveries (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255),
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body VARCHAR(5000) NOT NULL,
  status VARCHAR(50) NOT NULL,
  provider VARCHAR(100),
  provider_message_id VARCHAR(255),
  failure_reason VARCHAR(5000),
  attempt_count INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  failed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_account_campaign
  ON marketing_campaign_deliveries(account_id, campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_account_status
  ON marketing_campaign_deliveries(account_id, status, updated_at DESC);
