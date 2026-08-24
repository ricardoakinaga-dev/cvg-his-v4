-- Esteira laboratorial canonica. O status legado de diagnostic_orders permanece
-- intacto para consumidores antigos: resulted equivale a reported nesta tabela.

CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_orders_account_id_id_unique
  ON diagnostic_orders (account_id, id);

CREATE TABLE IF NOT EXISTS diagnostic_order_workflows (
  order_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  status TEXT NOT NULL,
  legacy_status TEXT,
  collection_attempt INTEGER NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ,
  collected_by_user_id TEXT,
  analysis_started_at TIMESTAMPTZ,
  analysis_started_by_user_id TEXT,
  reported_at TIMESTAMPTZ,
  reported_by_user_id TEXT,
  delivered_at TIMESTAMPTZ,
  delivered_by_user_id TEXT,
  delivery_channel TEXT,
  result_summary TEXT,
  result_attachment_id TEXT,
  signed_by_user_id TEXT,
  signature_hash TEXT,
  recollection_reason TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT diagnostic_order_workflows_account_order_unique UNIQUE (account_id, order_id),
  CONSTRAINT diagnostic_order_workflows_status_chk
    CHECK (status IN ('requested', 'collected', 'in_analysis', 'reported', 'delivered', 'cancelled')),
  CONSTRAINT diagnostic_order_workflows_attempt_chk
    CHECK (collection_attempt >= 0),
  CONSTRAINT diagnostic_order_workflows_legacy_status_chk
    CHECK (legacy_status IS NULL OR legacy_status = 'resulted'),
  CONSTRAINT diagnostic_order_workflows_account_order_fk
    FOREIGN KEY (account_id, order_id)
    REFERENCES diagnostic_orders (account_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS diagnostic_order_workflows_account_status_idx
  ON diagnostic_order_workflows (account_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS diagnostic_order_workflow_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  reason TEXT,
  actor_user_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT diagnostic_order_workflow_events_status_chk
    CHECK (status IN ('requested', 'collected', 'in_analysis', 'reported', 'delivered', 'cancelled')),
  CONSTRAINT diagnostic_order_workflow_events_attempt_chk
    CHECK (attempt >= 0),
  CONSTRAINT diagnostic_order_workflow_events_account_order_fk
    FOREIGN KEY (account_id, order_id)
    REFERENCES diagnostic_order_workflows (account_id, order_id)
    ON DELETE CASCADE,
  CONSTRAINT diagnostic_order_workflow_events_replay_key
    UNIQUE (account_id, order_id, event_type, occurred_at)
);

CREATE INDEX IF NOT EXISTS diagnostic_order_workflow_events_account_order_idx
  ON diagnostic_order_workflow_events (account_id, order_id, occurred_at ASC);

ALTER TABLE diagnostic_order_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diagnostic_order_workflows_tenant_isolation ON diagnostic_order_workflows;
CREATE POLICY diagnostic_order_workflows_tenant_isolation ON diagnostic_order_workflows
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE diagnostic_order_workflow_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diagnostic_order_workflow_events_tenant_isolation ON diagnostic_order_workflow_events;
CREATE POLICY diagnostic_order_workflow_events_tenant_isolation ON diagnostic_order_workflow_events
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

-- Expand/backfill: every old order gets a canonical projection. Existing rows
-- with status=resulted remain readable as resulted by legacy projections while
-- the canonical laboratory surface reads them as reported.
INSERT INTO diagnostic_order_workflows (
  order_id,
  account_id,
  status,
  legacy_status,
  collection_attempt,
  collected_at,
  collected_by_user_id,
  reported_at,
  reported_by_user_id,
  result_summary,
  result_attachment_id,
  signed_by_user_id,
  signature_hash,
  created_at,
  updated_at
)
SELECT
  id,
  account_id,
  CASE status
    WHEN 'requested' THEN 'requested'
    WHEN 'collected' THEN 'collected'
    WHEN 'resulted' THEN 'reported'
    WHEN 'cancelled' THEN 'cancelled'
  END,
  CASE WHEN status = 'resulted' THEN 'resulted' ELSE NULL END,
  CASE WHEN status = 'requested' THEN 0 ELSE 1 END,
  collected_at,
  collected_by_user_id,
  CASE WHEN status = 'resulted' THEN COALESCE(resulted_at, updated_at) ELSE NULL END,
  CASE WHEN status = 'resulted' THEN released_by_user_id ELSE NULL END,
  result_summary,
  result_attachment_id,
  signed_by_user_id,
  signature_hash,
  created_at,
  updated_at
FROM diagnostic_orders
WHERE status IN ('requested', 'collected', 'resulted', 'cancelled')
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO diagnostic_order_workflow_events (
  id,
  account_id,
  order_id,
  event_type,
  status,
  attempt,
  actor_user_id,
  occurred_at
)
SELECT
  'lab-legacy-' || id,
  account_id,
  id,
  'legacy_import',
  CASE status
    WHEN 'requested' THEN 'requested'
    WHEN 'collected' THEN 'collected'
    WHEN 'resulted' THEN 'reported'
    WHEN 'cancelled' THEN 'cancelled'
  END,
  CASE WHEN status = 'requested' THEN 0 ELSE 1 END,
  CASE WHEN status = 'resulted' THEN released_by_user_id ELSE collected_by_user_id END,
  updated_at
FROM diagnostic_orders
WHERE status IN ('requested', 'collected', 'resulted', 'cancelled')
ON CONFLICT (account_id, order_id, event_type, occurred_at) DO NOTHING;

COMMENT ON TABLE diagnostic_order_workflows IS
  'Canonical laboratory lifecycle; legacy diagnostic_orders.status=resulted maps to reported.';
COMMENT ON TABLE diagnostic_order_workflow_events IS
  'Immutable laboratory lifecycle and recollection history per tenant.';
