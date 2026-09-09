-- Durable cross-module clinical task/reminder control plane.
-- This migration is append-only and tenant-scoped; task payloads must remain
-- operational metadata and must not duplicate clinical narrative/PHI.
CREATE TABLE IF NOT EXISTS clinical_workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_type VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  execution_mode VARCHAR(16) NOT NULL DEFAULT 'manual',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  patient_id UUID,
  encounter_id UUID,
  owner_type VARCHAR(24),
  owner_id VARCHAR(160),
  due_at TIMESTAMPTZ NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  fingerprint VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL,
  lease_owner VARCHAR(160),
  lease_token UUID,
  lease_version BIGINT NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0,
  lease_expires_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  acknowledged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  cancelled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  last_escalated_at TIMESTAMPTZ,
  correlation_id VARCHAR(255) NOT NULL,
  causation_id VARCHAR(255),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinical_workflow_tasks_status_chk CHECK (status IN ('pending', 'processing', 'retrying', 'acknowledged', 'completed', 'cancelled', 'dlq')),
  CONSTRAINT clinical_workflow_tasks_execution_mode_chk CHECK (execution_mode IN ('manual', 'worker')),
  CONSTRAINT clinical_workflow_tasks_priority_chk CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  CONSTRAINT clinical_workflow_tasks_attempts_chk CHECK (attempts >= 0 AND max_attempts BETWEEN 1 AND 50),
  CONSTRAINT clinical_workflow_tasks_escalation_chk CHECK (escalation_level >= 0),
  CONSTRAINT clinical_workflow_tasks_patient_account_fk FOREIGN KEY (account_id, patient_id) REFERENCES patients(account_id, id),
  CONSTRAINT clinical_workflow_tasks_encounter_account_fk FOREIGN KEY (account_id, encounter_id) REFERENCES encounters(account_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinical_workflow_tasks_account_idempotency
  ON clinical_workflow_tasks (account_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clinical_workflow_tasks_account_id
  ON clinical_workflow_tasks (account_id, id);
CREATE INDEX IF NOT EXISTS idx_clinical_workflow_tasks_account_due
  ON clinical_workflow_tasks (account_id, status, next_attempt_at, lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_clinical_workflow_tasks_account_patient
  ON clinical_workflow_tasks (account_id, patient_id, due_at);
CREATE INDEX IF NOT EXISTS idx_clinical_workflow_tasks_account_encounter
  ON clinical_workflow_tasks (account_id, encounter_id, due_at);

CREATE TABLE IF NOT EXISTS clinical_workflow_task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES clinical_workflow_tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(48) NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  correlation_id VARCHAR(255) NOT NULL,
  causation_id VARCHAR(255),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinical_workflow_task_events_task_account_fk
    FOREIGN KEY (account_id, task_id) REFERENCES clinical_workflow_tasks(account_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_clinical_workflow_task_events_account_task
  ON clinical_workflow_task_events (account_id, task_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_clinical_workflow_task_events_account_occurred
  ON clinical_workflow_task_events (account_id, occurred_at);

ALTER TABLE clinical_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_workflow_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinical_workflow_tasks_tenant_isolation ON clinical_workflow_tasks;
CREATE POLICY clinical_workflow_tasks_tenant_isolation ON clinical_workflow_tasks
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE clinical_workflow_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_workflow_task_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinical_workflow_task_events_tenant_isolation ON clinical_workflow_task_events;
CREATE POLICY clinical_workflow_task_events_tenant_isolation ON clinical_workflow_task_events
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.guard_clinical_workflow_task_events_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $guard$
BEGIN
  RAISE EXCEPTION 'Clinical workflow task lifecycle events are append-only'
    USING ERRCODE = '55000';
  RETURN NULL;
END;
$guard$;

DROP TRIGGER IF EXISTS clinical_workflow_task_events_immutability_trigger
  ON clinical_workflow_task_events;
CREATE TRIGGER clinical_workflow_task_events_immutability_trigger
  BEFORE UPDATE OR DELETE ON clinical_workflow_task_events
  FOR EACH ROW
  EXECUTE FUNCTION app.guard_clinical_workflow_task_events_immutability();

COMMENT ON TABLE clinical_workflow_tasks IS
  'Tenant-scoped durable workflow tasks/reminders with idempotency, lease fencing, bounded retry and DLQ.';
COMMENT ON TABLE clinical_workflow_task_events IS
  'Append-only lifecycle projection for clinical workflow task audit and replay evidence.';
COMMENT ON FUNCTION app.guard_clinical_workflow_task_events_immutability() IS
  'Prevents mutation or deletion of clinical workflow lifecycle evidence.';
