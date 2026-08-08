CREATE TABLE IF NOT EXISTS staff_time_off (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_time_off_interval_chk CHECK (ends_at > starts_at),
  CONSTRAINT staff_time_off_status_chk CHECK (status IN ('scheduled', 'cancelled')),
  CONSTRAINT staff_time_off_account_staff_fk
    FOREIGN KEY (account_id, staff_id) REFERENCES staff(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_staff_time_off_account_interval
  ON staff_time_off (account_id, staff_id, starts_at, ends_at);

ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_time_off_tenant_isolation ON staff_time_off;
CREATE POLICY staff_time_off_tenant_isolation ON staff_time_off
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE staff_time_off IS
  'Tenant-scoped staff absences/leave intervals used to block scheduling conflicts.';
