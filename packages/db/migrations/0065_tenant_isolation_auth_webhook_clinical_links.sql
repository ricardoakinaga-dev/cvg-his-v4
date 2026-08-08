-- Close tenant-isolation gaps in authentication, webhook delivery and core clinical links.
-- Backfills are derived from canonical parent records; no tenant default is permitted.

ALTER TABLE mfa_credentials ADD COLUMN IF NOT EXISTS account_id uuid;

UPDATE mfa_credentials AS credential
SET account_id = app_user.account_id
FROM users AS app_user
WHERE app_user.id = credential.user_id
  AND credential.account_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM mfa_credentials WHERE account_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot scope MFA credentials: user is missing';
  END IF;
END $$;

ALTER TABLE mfa_credentials ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mfa_credentials_account_user
  ON mfa_credentials(account_id, user_id);

ALTER TABLE mfa_credentials
  ADD CONSTRAINT mfa_credentials_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE mfa_credentials
  ADD CONSTRAINT mfa_credentials_account_user_fk
  FOREIGN KEY (account_id, user_id) REFERENCES users(account_id, id) ON DELETE CASCADE;

ALTER TABLE mfa_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mfa_credentials_tenant_isolation ON mfa_credentials;
CREATE POLICY mfa_credentials_tenant_isolation ON mfa_credentials
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Webhook account identifiers predate the UUID account contract. Validate before conversion.
DROP POLICY IF EXISTS webhooks_tenant_isolation ON webhooks;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM webhooks AS webhook
    LEFT JOIN accounts AS account ON account.id::text = webhook.account_id
    WHERE account.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot scope webhooks: invalid or missing account';
  END IF;
END $$;

ALTER TABLE webhooks
  ALTER COLUMN account_id TYPE uuid USING account_id::uuid;
ALTER TABLE webhooks
  ADD CONSTRAINT webhooks_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhooks_account_id_id_unique
  ON webhooks(account_id, id);

ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS account_id uuid;
UPDATE webhook_deliveries AS delivery
SET account_id = webhook.account_id
FROM webhooks AS webhook
WHERE webhook.id = delivery.webhook_id
  AND delivery.account_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM webhook_deliveries WHERE account_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot scope webhook deliveries: webhook is missing';
  END IF;
END $$;

ALTER TABLE webhook_deliveries ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE webhook_deliveries
  ADD CONSTRAINT webhook_deliveries_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE webhook_deliveries
  ADD CONSTRAINT webhook_deliveries_account_webhook_fk
  FOREIGN KEY (account_id, webhook_id) REFERENCES webhooks(account_id, id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_account_status_retry
  ON webhook_deliveries(account_id, status, next_retry_at, created_at);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhooks_tenant_isolation ON webhooks
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_deliveries_tenant_isolation ON webhook_deliveries;
CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Timeline tenant is always inherited from its encounter.
ALTER TABLE encounter_timeline ADD COLUMN IF NOT EXISTS account_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM encounter_timeline AS event
    LEFT JOIN encounters AS encounter ON encounter.id::text = event.encounter_id
    WHERE encounter.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot scope encounter timeline: encounter is missing';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM encounter_timeline AS event
    LEFT JOIN users AS app_user ON app_user.id::text = event.actor_user_id
    WHERE event.actor_user_id IS NOT NULL AND app_user.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot scope encounter timeline: actor is missing';
  END IF;
END $$;

UPDATE encounter_timeline AS event
SET account_id = encounter.account_id
FROM encounters AS encounter
WHERE encounter.id::text = event.encounter_id
  AND event.account_id IS NULL;

ALTER TABLE encounter_timeline
  ALTER COLUMN encounter_id TYPE uuid USING encounter_id::uuid,
  ALTER COLUMN actor_user_id TYPE uuid USING actor_user_id::uuid,
  ALTER COLUMN account_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_encounters_account_id_id_unique
  ON encounters(account_id, id);
CREATE INDEX IF NOT EXISTS idx_encounter_timeline_account_encounter_occurred
  ON encounter_timeline(account_id, encounter_id, occurred_at DESC);
ALTER TABLE encounter_timeline
  ADD CONSTRAINT encounter_timeline_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE encounter_timeline
  ADD CONSTRAINT encounter_timeline_account_encounter_fk
  FOREIGN KEY (account_id, encounter_id) REFERENCES encounters(account_id, id) ON DELETE CASCADE;
ALTER TABLE encounter_timeline
  ADD CONSTRAINT encounter_timeline_account_actor_fk
  FOREIGN KEY (account_id, actor_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT;

ALTER TABLE encounter_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS encounter_timeline_tenant_isolation ON encounter_timeline;
CREATE POLICY encounter_timeline_tenant_isolation ON encounter_timeline
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- A patient may have multiple responsible people, but one primary relationship.
CREATE TABLE owner_patient_links (
  id varchar(255) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  relationship varchar(50) NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  financial_responsible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_patient_links_relationship_chk
    CHECK (relationship IN ('primary', 'secondary', 'financial')),
  CONSTRAINT owner_patient_links_primary_consistency_chk
    CHECK (is_primary = (relationship = 'primary')),
  CONSTRAINT owner_patient_links_account_owner_fk
    FOREIGN KEY (account_id, owner_id) REFERENCES owners(account_id, id) ON DELETE CASCADE,
  CONSTRAINT owner_patient_links_account_patient_fk
    FOREIGN KEY (account_id, patient_id) REFERENCES patients(account_id, id) ON DELETE CASCADE,
  CONSTRAINT owner_patient_links_relation_unique
    UNIQUE (account_id, owner_id, patient_id, relationship)
);

INSERT INTO owner_patient_links (
  id, account_id, owner_id, patient_id, relationship, is_primary,
  financial_responsible, created_at
)
SELECT
  'link_primary_' || replace(patient.id::text, '-', ''),
  patient.account_id,
  patient.owner_id,
  patient.id,
  'primary',
  true,
  true,
  patient.created_at
FROM patients AS patient
ON CONFLICT (account_id, owner_id, patient_id, relationship) DO NOTHING;

CREATE UNIQUE INDEX owner_patient_links_one_primary_per_patient
  ON owner_patient_links(account_id, patient_id)
  WHERE is_primary;
CREATE INDEX idx_owner_patient_links_account_owner
  ON owner_patient_links(account_id, owner_id);
CREATE INDEX idx_owner_patient_links_account_patient
  ON owner_patient_links(account_id, patient_id);

ALTER TABLE owner_patient_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_patient_links_tenant_isolation ON owner_patient_links
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
