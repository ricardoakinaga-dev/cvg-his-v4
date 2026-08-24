-- Marketing delivery claims and tenant-safe campaign hierarchy.
--
-- This migration deliberately fails before replacing the legacy single-column
-- foreign keys when any existing row is missing its tenant-local parent. That
-- makes the migration safe to run against installations created before the
-- composite tenant boundary was introduced: operators get a repairable error
-- instead of silently accepting a cross-tenant reference.

ALTER TABLE marketing_campaign_deliveries
  ADD COLUMN IF NOT EXISTS lease_owner TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM marketing_campaigns campaign
      LEFT JOIN marketing_segments segment
        ON segment.account_id = campaign.account_id
       AND segment.id = campaign.segment_id
     WHERE segment.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Marketing migration 0137 preflight failed: campaign segment references are missing or cross-tenant';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM marketing_campaigns campaign
      LEFT JOIN marketing_templates template
        ON template.account_id = campaign.account_id
       AND template.id = campaign.template_id
     WHERE template.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Marketing migration 0137 preflight failed: campaign template references are missing or cross-tenant';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM marketing_campaign_deliveries delivery
      LEFT JOIN marketing_campaigns campaign
        ON campaign.account_id = delivery.account_id
       AND campaign.id = delivery.campaign_id
     WHERE campaign.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Marketing migration 0137 preflight failed: delivery campaign references are missing or cross-tenant';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM marketing_campaign_deliveries
     WHERE status = 'sending'
       AND (
         NULLIF(BTRIM(lease_owner), '') IS NULL
         OR lease_expires_at IS NULL
       )
  ) THEN
    RAISE EXCEPTION
      'Marketing migration 0137 preflight failed: sending deliveries need a lease owner and expiry before upgrade';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_segments_account_id_id_unique
  ON marketing_segments (account_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_templates_account_id_id_unique
  ON marketing_templates (account_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaigns_account_id_id_unique
  ON marketing_campaigns (account_id, id);

-- Drop every legacy one-column FK for these hierarchy edges, regardless of
-- the constraint name chosen by the original schema or an older deployment.
ALTER TABLE marketing_campaigns
  DROP CONSTRAINT IF EXISTS marketing_campaigns_segment_id_fkey,
  DROP CONSTRAINT IF EXISTS marketing_campaigns_template_id_fkey;

ALTER TABLE marketing_campaign_deliveries
  DROP CONSTRAINT IF EXISTS marketing_campaign_deliveries_campaign_id_fkey;

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT constraint_name
      FROM information_schema.referential_constraints
     WHERE constraint_schema = current_schema()
       AND unique_constraint_schema = current_schema()
       AND constraint_name IN (
         SELECT constraint_name
           FROM information_schema.key_column_usage
          WHERE table_schema = current_schema()
            AND table_name = 'marketing_campaigns'
            AND column_name IN ('segment_id', 'template_id')
       )
  LOOP
    EXECUTE format(
      'ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS %I',
      constraint_row.constraint_name
    );
  END LOOP;

  FOR constraint_row IN
    SELECT constraint_name
      FROM information_schema.referential_constraints
     WHERE constraint_schema = current_schema()
       AND unique_constraint_schema = current_schema()
       AND constraint_name IN (
         SELECT constraint_name
           FROM information_schema.key_column_usage
          WHERE table_schema = current_schema()
            AND table_name = 'marketing_campaign_deliveries'
            AND column_name = 'campaign_id'
       )
  LOOP
    EXECUTE format(
      'ALTER TABLE marketing_campaign_deliveries DROP CONSTRAINT IF EXISTS %I',
      constraint_row.constraint_name
    );
  END LOOP;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'marketing_campaigns_account_segment_fk'
       AND conrelid = 'marketing_campaigns'::regclass
  ) THEN
    ALTER TABLE marketing_campaigns
      ADD CONSTRAINT marketing_campaigns_account_segment_fk
      FOREIGN KEY (account_id, segment_id)
      REFERENCES marketing_segments (account_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'marketing_campaigns_account_template_fk'
       AND conrelid = 'marketing_campaigns'::regclass
  ) THEN
    ALTER TABLE marketing_campaigns
      ADD CONSTRAINT marketing_campaigns_account_template_fk
      FOREIGN KEY (account_id, template_id)
      REFERENCES marketing_templates (account_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'marketing_deliveries_account_campaign_fk'
       AND conrelid = 'marketing_campaign_deliveries'::regclass
  ) THEN
    ALTER TABLE marketing_campaign_deliveries
      ADD CONSTRAINT marketing_deliveries_account_campaign_fk
      FOREIGN KEY (account_id, campaign_id)
      REFERENCES marketing_campaigns (account_id, id)
      ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE marketing_campaign_deliveries
  DROP CONSTRAINT IF EXISTS marketing_campaign_deliveries_status_chk;

ALTER TABLE marketing_campaign_deliveries
  ADD CONSTRAINT marketing_campaign_deliveries_status_chk
  CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'skipped'));

ALTER TABLE marketing_campaign_deliveries
  DROP CONSTRAINT IF EXISTS marketing_campaign_deliveries_lease_state_chk;

ALTER TABLE marketing_campaign_deliveries
  ADD CONSTRAINT marketing_campaign_deliveries_lease_state_chk
  CHECK (
    (
      status = 'sending'
      AND NULLIF(BTRIM(lease_owner), '') IS NOT NULL
      AND lease_expires_at IS NOT NULL
    )
    OR (
      status <> 'sending'
      AND lease_owner IS NULL
      AND lease_expires_at IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS marketing_campaign_deliveries_claim_idx
  ON marketing_campaign_deliveries (
    account_id,
    status,
    next_attempt_at,
    lease_expires_at,
    updated_at
  )
  WHERE status IN ('queued', 'failed', 'sending');

COMMENT ON COLUMN marketing_campaign_deliveries.lease_owner IS
  'Worker token that owns the current sending claim.';

COMMENT ON COLUMN marketing_campaign_deliveries.lease_expires_at IS
  'Time after which an abandoned sending claim may be reclaimed.';
